import { supabase } from './supabase';
import type { Product } from '@/types/database';

export async function getProducts(activeOnly = true): Promise<Product[]> {
  let query = supabase.from('products').select('*').order('name');
  if (activeOnly) {
    query = query.eq('is_active', true);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Product[];
}
