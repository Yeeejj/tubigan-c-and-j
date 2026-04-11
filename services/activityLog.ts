import { supabase } from './supabase';

export async function logStaffActivity(
  userId: string,
  action: string,
  referenceTable?: string,
  referenceId?: string
) {
  const { error } = await supabase.from('staff_activity_logs').insert({
    user_id: userId,
    action,
    reference_table: referenceTable ?? null,
    reference_id: referenceId ?? null,
  });
  if (error) {
    console.error('Failed to log activity:', error);
  }
}
