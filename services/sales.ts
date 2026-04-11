import { supabase } from './supabase';
import type { SalesRecord, Order } from '@/types/database';

interface DailySummary {
  date: string;
  total_orders: number;
  total_revenue: number;
  total_collected: number;
  total_uncollected: number;
}

export async function getDailySummary(date: string): Promise<DailySummary> {
  const { data, error } = await supabase
    .from('orders')
    .select('total_amount, amount_paid, payment_status')
    .gte('created_at', `${date}T00:00:00`)
    .lte('created_at', `${date}T23:59:59`)
    .neq('order_status', 'cancelled');
  if (error) throw error;

  const orders = (data ?? []) as { total_amount: number; amount_paid: number; payment_status: string }[];
  return {
    date,
    total_orders: orders.length,
    total_revenue: orders.reduce((sum, o) => sum + o.total_amount, 0),
    total_collected: orders.reduce((sum, o) => sum + o.amount_paid, 0),
    total_uncollected: orders.reduce((sum, o) => sum + (o.total_amount - o.amount_paid), 0),
  };
}

export async function getSalesForRange(dateFrom: string, dateTo: string): Promise<DailySummary[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('total_amount, amount_paid, payment_status, created_at')
    .gte('created_at', `${dateFrom}T00:00:00`)
    .lte('created_at', `${dateTo}T23:59:59`)
    .neq('order_status', 'cancelled')
    .order('created_at');
  if (error) throw error;

  // Group by date
  const grouped = new Map<string, typeof data>();
  for (const order of data ?? []) {
    const date = (order.created_at as string).split('T')[0];
    const existing = grouped.get(date) ?? [];
    existing.push(order);
    grouped.set(date, existing);
  }

  return Array.from(grouped.entries()).map(([date, orders]) => ({
    date,
    total_orders: orders.length,
    total_revenue: orders.reduce((sum, o) => sum + (o.total_amount as number), 0),
    total_collected: orders.reduce((sum, o) => sum + (o.amount_paid as number), 0),
    total_uncollected: orders.reduce((sum, o) => sum + ((o.total_amount as number) - (o.amount_paid as number)), 0),
  }));
}

export async function getUnpaidOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, customer:customers(*)')
    .in('payment_status', ['unpaid', 'partial'])
    .neq('order_status', 'cancelled')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as Order[];
}

export async function getTopProducts(dateFrom: string, dateTo: string) {
  const { data, error } = await supabase
    .from('order_items')
    .select(`
      quantity,
      subtotal,
      product:products(name),
      order:orders!inner(created_at, order_status)
    `)
    .gte('order.created_at', `${dateFrom}T00:00:00`)
    .lte('order.created_at', `${dateTo}T23:59:59`)
    .neq('order.order_status', 'cancelled');
  if (error) throw error;

  const productMap = new Map<string, { name: string; total_qty: number; total_revenue: number }>();
  for (const item of data ?? []) {
    const name = (item.product as unknown as { name: string })?.name ?? 'Unknown';
    const existing = productMap.get(name) ?? { name, total_qty: 0, total_revenue: 0 };
    existing.total_qty += item.quantity as number;
    existing.total_revenue += item.subtotal as number;
    productMap.set(name, existing);
  }

  return Array.from(productMap.values()).sort((a, b) => b.total_revenue - a.total_revenue);
}

export async function getPaymentMethodBreakdown(dateFrom: string, dateTo: string) {
  const { data, error } = await supabase
    .from('orders')
    .select('payment_method, amount_paid')
    .gte('created_at', `${dateFrom}T00:00:00`)
    .lte('created_at', `${dateTo}T23:59:59`)
    .neq('order_status', 'cancelled')
    .gt('amount_paid', 0);
  if (error) throw error;

  const breakdown = new Map<string, number>();
  for (const order of data ?? []) {
    const method = order.payment_method as string;
    breakdown.set(method, (breakdown.get(method) ?? 0) + (order.amount_paid as number));
  }

  return Array.from(breakdown.entries()).map(([method, amount]) => ({ method, amount }));
}
