import { supabase } from './supabase';
import { logStaffActivity } from './activityLog';
import type { InventoryItem, InventoryStock, InventoryTransaction } from '@/types/database';
import type { TransactionType } from '@/constants/statuses';

export interface StockWithItem extends InventoryStock {
  item: InventoryItem;
  status: 'ok' | 'low' | 'critical';
}

export async function getInventoryDashboard(): Promise<StockWithItem[]> {
  const { data, error } = await supabase
    .from('inventory_stock')
    .select('*, item:inventory_items(*)')
    .order('last_updated', { ascending: false });
  if (error) throw error;

  return ((data ?? []) as unknown as (InventoryStock & { item: InventoryItem })[]).map((stock) => {
    let status: 'ok' | 'low' | 'critical' = 'ok';
    if (stock.current_quantity <= 0) {
      status = 'critical';
    } else if (stock.current_quantity <= stock.item.reorder_threshold) {
      status = 'low';
    }
    return { ...stock, status };
  });
}

export async function getInventoryItems(): Promise<InventoryItem[]> {
  const { data, error } = await supabase
    .from('inventory_items')
    .select('*')
    .order('name');
  if (error) throw error;
  return (data ?? []) as InventoryItem[];
}

export async function getTransactionHistory(itemId?: string): Promise<InventoryTransaction[]> {
  let query = supabase
    .from('inventory_transactions')
    .select('*, item:inventory_items(*), performed_by_user:users(*)')
    .order('created_at', { ascending: false });

  if (itemId) {
    query = query.eq('item_id', itemId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as InventoryTransaction[];
}

export async function recordTransaction(
  itemId: string,
  transactionType: TransactionType,
  quantityChange: number,
  userId: string,
  notes?: string,
  referenceId?: string
): Promise<void> {
  // Insert transaction
  const { error: txError } = await supabase.from('inventory_transactions').insert({
    item_id: itemId,
    transaction_type: transactionType,
    quantity_change: quantityChange,
    performed_by: userId,
    notes: notes ?? null,
    reference_id: referenceId ?? null,
  });
  if (txError) throw txError;

  // Update stock level
  const { data: stock } = await supabase
    .from('inventory_stock')
    .select('current_quantity')
    .eq('item_id', itemId)
    .single();

  const newQuantity = (stock?.current_quantity ?? 0) + quantityChange;

  await supabase
    .from('inventory_stock')
    .upsert({
      item_id: itemId,
      current_quantity: Math.max(0, newQuantity),
      last_updated: new Date().toISOString(),
      updated_by: userId,
    }, { onConflict: 'item_id' });

  await logStaffActivity(userId, `${transactionType} inventory: ${quantityChange}`, 'inventory_items', itemId);
}
