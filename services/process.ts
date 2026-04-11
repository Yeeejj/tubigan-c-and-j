import { supabase } from './supabase';
import { logStaffActivity } from './activityLog';
import type { ProductionBatch, ProcessStep } from '@/types/database';
import type { BatchStatus } from '@/constants/statuses';

export async function getBatches(filters?: { status?: BatchStatus }): Promise<ProductionBatch[]> {
  let query = supabase
    .from('production_batches')
    .select('*, started_by_user:users(*), process_steps(*)')
    .order('started_at', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as ProductionBatch[];
}

export async function getBatchById(id: string): Promise<ProductionBatch> {
  const { data, error } = await supabase
    .from('production_batches')
    .select('*, started_by_user:users(*), process_steps(*, performed_by_user:users(*))')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as unknown as ProductionBatch;
}

interface CreateBatchData {
  linked_orders: string[];
  water_volume_liters: number;
  notes: string | null;
}

export async function createBatch(data: CreateBatchData, userId: string): Promise<ProductionBatch> {
  const today = new Date().toISOString().split('T')[0];
  const { count } = await supabase
    .from('production_batches')
    .select('*', { count: 'exact', head: true })
    .gte('started_at', `${today}T00:00:00`);

  const batchNumber = `BATCH-${today.replace(/-/g, '')}-${String((count ?? 0) + 1).padStart(3, '0')}`;

  const { data: batch, error } = await supabase
    .from('production_batches')
    .insert({
      batch_number: batchNumber,
      started_by: userId,
      status: 'raw_water_in',
      linked_orders: data.linked_orders,
      water_volume_liters: data.water_volume_liters,
      notes: data.notes,
    })
    .select()
    .single();
  if (error) throw error;

  await logStaffActivity(userId, 'created production batch', 'production_batches', batch.id);
  return batch as unknown as ProductionBatch;
}

export async function updateBatchStatus(batchId: string, status: BatchStatus, userId: string): Promise<void> {
  const updates: Record<string, unknown> = { status };
  if (status === 'ready' || status === 'dispatched') {
    updates.completed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('production_batches')
    .update(updates)
    .eq('id', batchId);
  if (error) throw error;

  await logStaffActivity(userId, `updated batch status to ${status}`, 'production_batches', batchId);
}

export async function completeProcessStep(
  batchId: string,
  stepName: string,
  userId: string,
  result?: string
): Promise<ProcessStep> {
  const { data, error } = await supabase
    .from('process_steps')
    .insert({
      batch_id: batchId,
      step_name: stepName,
      performed_by: userId,
      completed_at: new Date().toISOString(),
      result: result ?? null,
    })
    .select()
    .single();
  if (error) throw error;

  await logStaffActivity(userId, `completed process step: ${stepName}`, 'production_batches', batchId);
  return data as unknown as ProcessStep;
}
