import { supabase } from './supabase';
import { logStaffActivity } from './activityLog';
import type { Order, OrderItem, OrderStatusHistory } from '@/types/database';
import type { OrderStatus, PaymentMethod } from '@/constants/statuses';

interface OrderFilters {
  status?: OrderStatus;
  paymentStatus?: string;
  dateFrom?: string;
  dateTo?: string;
  staffId?: string;
  search?: string;
}

export async function getOrders(filters?: OrderFilters): Promise<Order[]> {
  let query = supabase
    .from('orders')
    .select(`
      *,
      customer:customers(*),
      created_by_user:users!orders_created_by_fkey(*),
      delivery_staff:users!orders_assigned_delivery_staff_fkey(*),
      order_items(*, product:products(*))
    `)
    .order('created_at', { ascending: false });

  if (filters?.status) {
    query = query.eq('order_status', filters.status);
  }
  if (filters?.paymentStatus) {
    query = query.eq('payment_status', filters.paymentStatus);
  }
  if (filters?.dateFrom) {
    query = query.gte('created_at', filters.dateFrom);
  }
  if (filters?.dateTo) {
    query = query.lte('created_at', filters.dateTo);
  }
  if (filters?.staffId) {
    query = query.eq('created_by', filters.staffId);
  }
  if (filters?.search) {
    query = query.or(`order_number.ilike.%${filters.search}%,delivery_address.ilike.%${filters.search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as Order[];
}

export async function getOrderById(id: string): Promise<Order> {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      customer:customers(*),
      created_by_user:users!orders_created_by_fkey(*),
      delivery_staff:users!orders_assigned_delivery_staff_fkey(*),
      order_items(*, product:products(*))
    `)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as unknown as Order;
}

interface CreateOrderData {
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  delivery_date: string | null;
  payment_method: PaymentMethod;
  notes: string | null;
  price_per_gallon: number;
  number_of_gallons: number;
}

async function getOrCreateDefaultProduct(): Promise<string> {
  // Try to find an existing active product
  const { data: existing } = await supabase
    .from('products')
    .select('id')
    .eq('is_active', true)
    .limit(1)
    .single();

  if (existing) return existing.id;

  // Create a default product if none exist
  const { data: created, error } = await supabase
    .from('products')
    .insert({ name: 'Gallon', unit_price: 0, is_active: true })
    .select()
    .single();
  if (error) throw error;
  return created.id;
}

export async function createOrder(data: CreateOrderData, userId: string): Promise<Order> {
  // Find existing customer by phone or create a new one
  const { data: existingCustomers } = await supabase
    .from('customers')
    .select('id')
    .eq('phone', data.customer_phone)
    .limit(1);

  let customerId: string;
  if (existingCustomers && existingCustomers.length > 0) {
    customerId = existingCustomers[0].id;
    // Update name and address in case they changed
    await supabase
      .from('customers')
      .update({ name: data.customer_name, address: data.delivery_address })
      .eq('id', customerId);
  } else {
    const { data: newCustomer, error: customerError } = await supabase
      .from('customers')
      .insert({ name: data.customer_name, phone: data.customer_phone, address: data.delivery_address })
      .select()
      .single();
    if (customerError) throw customerError;
    customerId = newCustomer.id;
  }

  const totalAmount = data.price_per_gallon * data.number_of_gallons;

  // Get today's order count for order number generation
  const today = new Date().toISOString().split('T')[0];
  const { count } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', `${today}T00:00:00`)
    .lte('created_at', `${today}T23:59:59`);

  const orderNumber = `CJ-${today.replace(/-/g, '')}-${String((count ?? 0) + 1).padStart(3, '0')}`;

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      order_number: orderNumber,
      customer_id: customerId,
      created_by: userId,
      order_status: 'pending',
      payment_status: 'unpaid',
      payment_method: data.payment_method,
      amount_paid: 0,
      total_amount: totalAmount,
      delivery_address: data.delivery_address,
      delivery_date: data.delivery_date,
      notes: data.notes,
    })
    .select()
    .single();
  if (orderError) throw orderError;

  // Get a valid product_id for the order item (FK constraint)
  const productId = await getOrCreateDefaultProduct();

  const { error: itemsError } = await supabase.from('order_items').insert({
    order_id: order.id,
    product_id: productId,
    quantity: data.number_of_gallons,
    unit_price: data.price_per_gallon,
    subtotal: totalAmount,
  });
  if (itemsError) throw itemsError;

  // Log status history
  await supabase.from('order_status_history').insert({
    order_id: order.id,
    changed_by: userId,
    old_status: '',
    new_status: 'pending',
    note: 'Order created',
  });

  await logStaffActivity(userId, 'created order', 'orders', order.id);

  return order as unknown as Order;
}

interface UpdateOrderData {
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  payment_method: PaymentMethod;
  notes: string | null;
  price_per_gallon: number;
  number_of_gallons: number;
}

export async function updateOrder(orderId: string, data: UpdateOrderData, userId: string): Promise<void> {
  // Update or create customer
  const { data: order } = await supabase
    .from('orders')
    .select('customer_id')
    .eq('id', orderId)
    .single();
  if (!order) throw new Error('Order not found');

  // Update customer info
  await supabase
    .from('customers')
    .update({ name: data.customer_name, phone: data.customer_phone, address: data.delivery_address })
    .eq('id', order.customer_id);

  const totalAmount = data.price_per_gallon * data.number_of_gallons;

  // Update order
  const { error: orderError } = await supabase
    .from('orders')
    .update({
      delivery_address: data.delivery_address,
      payment_method: data.payment_method,
      total_amount: totalAmount,
      notes: data.notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);
  if (orderError) throw orderError;

  // Update order items
  const productId = await getOrCreateDefaultProduct();
  const { error: itemsError } = await supabase
    .from('order_items')
    .update({
      quantity: data.number_of_gallons,
      unit_price: data.price_per_gallon,
      subtotal: totalAmount,
      product_id: productId,
    })
    .eq('order_id', orderId);
  if (itemsError) throw itemsError;

  await logStaffActivity(userId, 'updated order', 'orders', orderId);
}

export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  userId: string,
  note?: string
): Promise<void> {
  // Get current status
  const { data: current } = await supabase
    .from('orders')
    .select('order_status')
    .eq('id', orderId)
    .single();

  const { error } = await supabase
    .from('orders')
    .update({ order_status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', orderId);
  if (error) throw error;

  await supabase.from('order_status_history').insert({
    order_id: orderId,
    changed_by: userId,
    old_status: current?.order_status ?? '',
    new_status: newStatus,
    note: note ?? null,
  });

  await logStaffActivity(userId, `updated order status to ${newStatus}`, 'orders', orderId);
}

export async function recordPayment(
  orderId: string,
  amount: number,
  method: PaymentMethod,
  userId: string
): Promise<void> {
  const { data: order } = await supabase
    .from('orders')
    .select('amount_paid, total_amount')
    .eq('id', orderId)
    .single();
  if (!order) throw new Error('Order not found');

  const newAmountPaid = (order.amount_paid as number) + amount;
  const paymentStatus = newAmountPaid >= (order.total_amount as number) ? 'paid' : 'partial';

  const { error } = await supabase
    .from('orders')
    .update({
      amount_paid: newAmountPaid,
      payment_status: paymentStatus,
      payment_method: method,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);
  if (error) throw error;

  await logStaffActivity(userId, `recorded payment of ${amount}`, 'orders', orderId);
}

export async function cancelOrder(orderId: string, reason: string, userId: string): Promise<void> {
  await updateOrderStatus(orderId, 'cancelled', userId, reason);
}

export async function deleteOrder(orderId: string, _userId: string): Promise<void> {
  // Try RPC function first (bypasses RLS)
  const { error: rpcError } = await supabase.rpc('delete_order', { p_order_id: orderId });
  if (!rpcError) return;

  // Fallback: direct deletes
  await supabase.from('sales_records').delete().eq('order_id', orderId);
  await supabase.from('deliveries').delete().eq('order_id', orderId);
  await supabase.from('order_status_history').delete().eq('order_id', orderId);
  await supabase.from('order_items').delete().eq('order_id', orderId);
  await supabase.from('orders').delete().eq('id', orderId);
}

export async function getOrderStatusHistory(orderId: string): Promise<OrderStatusHistory[]> {
  const { data, error } = await supabase
    .from('order_status_history')
    .select('*, changed_by_user:users(*)')
    .eq('order_id', orderId)
    .order('changed_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as OrderStatusHistory[];
}
