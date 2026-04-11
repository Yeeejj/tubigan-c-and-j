import { supabase } from './supabase';
import { logStaffActivity } from './activityLog';
import type { UserProfile, StaffActivityLog } from '@/types/database';
import type { UserRole } from '@/constants/roles';

export async function getStaffList(): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
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

export async function updateStaffProfile(id: string, updates: Partial<UserProfile>, userId: string): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', id);
  if (error) throw error;
  await logStaffActivity(userId, `updated staff profile for ${id}`, 'users', id);
}

export async function deactivateStaff(id: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ is_active: false })
    .eq('id', id);
  if (error) throw error;
  await logStaffActivity(userId, 'deactivated staff account', 'users', id);
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
