import { supabase, supabaseAdmin } from './supabase';
import { logStaffActivity } from './activityLog';
import type { UserProfile, StaffActivityLog, AttendanceLog, AdvancePayTransaction } from '@/types/database';
import type { UserRole } from '@/constants/roles';

export async function getStaffList(): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .in('role', ['in_shop_staff', 'delivery_staff'])
    .order('full_name');
  if (error) throw error;
  return (data ?? []) as UserProfile[];
}

export async function getStaffById(id: string): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as UserProfile;
}

export async function getDeliveryStaff(): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'delivery_staff')
    .eq('is_active', true)
    .order('full_name');
  if (error) throw error;
  return (data ?? []) as UserProfile[];
}

export async function createStaff(
  username: string,
  password: string,
  fullName: string,
  phone: string,
  role: 'in_shop_staff' | 'delivery_staff',
  adminId: string
): Promise<void> {
  // Create auth user — use admin client to skip email verification
  const email = `${username.toLowerCase().replace(/\s+/g, '')}@cjwater.local`;
  let userId: string;

  if (supabaseAdmin) {
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (authError) throw authError;
    userId = authData.user.id;
  } else {
    // Fallback to signUp if service role key is not configured
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });
    if (authError) throw authError;
    if (!authData.user) throw new Error('Failed to create auth user');
    userId = authData.user.id;
  }

  // Create profile via RPC (bypasses RLS)
  const { error: profileError } = await supabase.rpc('create_staff_profile', {
    p_user_id: userId,
    p_full_name: fullName,
    p_phone: phone,
    p_role: role,
    p_is_active: true,
  });
  if (profileError) {
    // Fallback: direct insert
    const { error: insertError } = await supabase.from('users').insert({
      id: userId,
      full_name: fullName,
      phone,
      role,
      is_active: true,
      advance_pay_balance: 0,
    });
    if (insertError) throw insertError;
  }

  await logStaffActivity(adminId, `created staff account: ${fullName}`, 'users', userId);
}

export async function updateStaffProfile(
  id: string,
  updates: { full_name: string; phone: string; role: UserRole; is_active: boolean },
  userId: string
): Promise<void> {
  // Try RPC first (bypasses RLS)
  const { error: rpcError } = await supabase.rpc('update_staff_profile', {
    p_user_id: id,
    p_full_name: updates.full_name,
    p_phone: updates.phone,
    p_role: updates.role,
    p_is_active: updates.is_active,
  });
  if (!rpcError) {
    await logStaffActivity(userId, `updated profile for ${updates.full_name}`, 'users', id);
    return;
  }

  // Fallback: direct update
  const { error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', id);
  if (error) throw error;
  await logStaffActivity(userId, `updated profile for ${updates.full_name}`, 'users', id);
}

export async function deactivateStaff(id: string, userId: string): Promise<void> {
  // Get staff name for logging
  const { data: staff } = await supabase.from('users').select('full_name').eq('id', id).single();
  const { error } = await supabase
    .from('users')
    .update({ is_active: false })
    .eq('id', id);
  if (error) throw error;
  await logStaffActivity(userId, `deactivated staff account: ${staff?.full_name ?? id}`, 'users', id);
}

export async function deleteStaff(id: string, userId: string): Promise<void> {
  const { data: staff } = await supabase.from('users').select('full_name').eq('id', id).single();

  // Use RPC to bypass RLS
  const { error: rpcError } = await supabase.rpc('delete_staff', { p_user_id: id });
  if (rpcError) {
    // Fallback: direct deletes
    await supabase.from('advance_pay_transactions').delete().eq('user_id', id);
    await supabase.from('attendance_logs').delete().eq('user_id', id);
    await supabase.from('staff_activity_logs').delete().eq('user_id', id);
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) throw error;
  }

  await logStaffActivity(userId, `deleted staff account: ${staff?.full_name ?? id}`, 'users', id);
}

export async function getStaffActivityLogs(
  staffId?: string,
  dateFrom?: string,
  dateTo?: string
): Promise<StaffActivityLog[]> {
  let query = supabase
    .from('staff_activity_logs')
    .select('*, user:users(*)')
    .order('created_at', { ascending: false })
    .limit(100);

  if (staffId) {
    query = query.eq('user_id', staffId);
  }
  if (dateFrom) {
    query = query.gte('created_at', `${dateFrom}T00:00:00`);
  }
  if (dateTo) {
    query = query.lte('created_at', `${dateTo}T23:59:59`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as StaffActivityLog[];
}

export async function getDeliveryMetrics(staffId: string, dateFrom: string, dateTo: string) {
  const { data, error } = await supabase
    .from('deliveries')
    .select('status, delivered_at, created_at')
    .eq('assigned_to', staffId)
    .gte('created_at', `${dateFrom}T00:00:00`)
    .lte('created_at', `${dateTo}T23:59:59`);
  if (error) throw error;

  const deliveries = data ?? [];
  const total = deliveries.length;
  const completed = deliveries.filter((d) => d.status === 'delivered').length;
  const failed = deliveries.filter((d) => d.status === 'failed').length;

  return {
    total_deliveries: total,
    completed,
    failed,
    success_rate: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

// ========== ATTENDANCE ==========

export async function getAttendanceForMonth(
  userId: string,
  year: number,
  month: number
): Promise<AttendanceLog[]> {
  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const { data, error } = await supabase
    .from('attendance_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as AttendanceLog[];
}

export async function getTodayAttendance(userId: string): Promise<AttendanceLog | null> {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('attendance_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .maybeSingle();
  if (error) throw error;
  return data as AttendanceLog | null;
}

export async function markSelfOnDuty(userId: string): Promise<AttendanceLog> {
  const today = new Date().toISOString().split('T')[0];

  // Check if already logged today
  const existing = await getTodayAttendance(userId);
  if (existing) throw new Error('You have already logged attendance for today.');

  const { data, error } = await supabase
    .from('attendance_logs')
    .insert({
      user_id: userId,
      status: 'on_duty',
      logged_by: userId,
      marked_at: new Date().toISOString(),
      date: today,
      is_admin_override: false,
    })
    .select()
    .single();
  if (error) throw error;

  await logStaffActivity(userId, 'marked self on_duty', 'attendance_logs', data.id);
  return data as AttendanceLog;
}

export async function adminOverrideAttendance(
  targetUserId: string,
  date: string,
  status: 'on_duty' | 'absent',
  note: string | undefined,
  adminId: string
): Promise<void> {
  // Get staff name for logging
  const { data: staff } = await supabase.from('users').select('full_name').eq('id', targetUserId).single();

  // Upsert: insert or update for that user+date
  const { error } = await supabase
    .from('attendance_logs')
    .upsert(
      {
        user_id: targetUserId,
        status,
        logged_by: adminId,
        marked_at: new Date().toISOString(),
        date,
        note: note ?? null,
        is_admin_override: true,
      },
      { onConflict: 'user_id,date' }
    );
  if (error) throw error;

  await logStaffActivity(
    adminId,
    `overrode attendance for ${staff?.full_name ?? targetUserId} on ${date} to ${status}`,
    'attendance_logs',
    targetUserId
  );
}

// Get all staff attendance for today (for staff list view)
export async function getAllTodayAttendance(): Promise<AttendanceLog[]> {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('attendance_logs')
    .select('*')
    .eq('date', today);
  if (error) throw error;
  return (data ?? []) as AttendanceLog[];
}

// ========== ADVANCE PAY ==========

export async function getAdvancePayHistory(userId: string): Promise<AdvancePayTransaction[]> {
  const { data, error } = await supabase
    .from('advance_pay_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as AdvancePayTransaction[];
}

export async function addAdvancePay(
  userId: string,
  amount: number,
  note: string | undefined,
  adminId: string
): Promise<void> {
  // Get current balance
  const { data: user } = await supabase
    .from('users')
    .select('advance_pay_balance, full_name')
    .eq('id', userId)
    .single();
  if (!user) throw new Error('Staff not found');

  const currentBalance = (user.advance_pay_balance as number) ?? 0;
  const newBalance = currentBalance + amount;

  // Insert transaction (trigger will update user balance)
  const { error } = await supabase
    .from('advance_pay_transactions')
    .insert({
      user_id: userId,
      recorded_by: adminId,
      amount,
      running_balance: newBalance,
      note: note ?? null,
    });
  if (error) throw error;

  await logStaffActivity(
    adminId,
    `added advance pay of ₱${amount.toLocaleString()} to ${user.full_name}`,
    'advance_pay_transactions',
    userId
  );
}
