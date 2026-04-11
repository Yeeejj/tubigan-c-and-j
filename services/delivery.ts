import { supabase } from './supabase';
import { logStaffActivity } from './activityLog';
import type { Delivery } from '@/types/database';
import type { DeliveryStatus } from '@/constants/statuses';

export async function getDeliveries(filters?: { status?: DeliveryStatus; assignedTo?: string }): Promise<Delivery[]> {
  let query = supabase
    .from('deliveries')
    .select(`
      *,
      order:orders(*, customer:customers(*), order_items(*, product:products(*))),
      assigned_to_user:users(*)
    `)
    .order('created_at', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.assignedTo) {
    query = query.eq('assigned_to', filters.assignedTo);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as Delivery[];
}

export async function getDeliveryByOrderId(orderId: string): Promise<Delivery | null> {
  const { data, error } = await supabase
    .from('deliveries')
    .select(`
      *,
      order:orders(*, customer:customers(*)),
      assigned_to_user:users(*)
    `)
    .eq('order_id', orderId)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as Delivery | null;
}

export async function assignDelivery(orderId: string, assignedTo: string, userId: string): Promise<Delivery> {
  // Update the order's assigned delivery staff
  await supabase
    .from('orders')
    .update({
      assigned_delivery_staff: assignedTo,
      order_status: 'out_for_delivery',
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  // Create or update delivery record
  const { data: existing } = await supabase
    .from('deliveries')
    .select('id')
    .eq('order_id', orderId)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from('deliveries')
      .update({ assigned_to: assignedTo, status: 'assigned' })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    await logStaffActivity(userId, 'reassigned delivery', 'deliveries', existing.id);
    return data as unknown as Delivery;
  }

  const { data, error } = await supabase
    .from('deliveries')
    .insert({
      order_id: orderId,
      assigned_to: assignedTo,
      status: 'assigned',
    })
    .select()
    .single();
  if (error) throw error;

  await logStaffActivity(userId, 'assigned delivery', 'deliveries', data.id);
  return data as unknown as Delivery;
}

export async function updateDeliveryStatus(
  deliveryId: string,
  status: DeliveryStatus,
  userId: string,
  extras?: {
    delivery_photo_url?: string;
    failure_reason?: string;
    gps_lat?: number;
    gps_lng?: number;
  }
): Promise<void> {
  const updates: Record<string, unknown> = { status };

  if (status === 'picked_up') {
    updates.picked_up_at = new Date().toISOString();
  }
  if (status === 'delivered') {
    updates.delivered_at = new Date().toISOString();
  }
  if (extras?.delivery_photo_url) {
    updates.delivery_photo_url = extras.delivery_photo_url;
  }
  if (extras?.failure_reason) {
    updates.failure_reason = extras.failure_reason;
  }
  if (extras?.gps_lat !== undefined) {
    updates.gps_lat = extras.gps_lat;
    updates.gps_lng = extras.gps_lng;
  }

  const { error } = await supabase
    .from('deliveries')
    .update(updates)
    .eq('id', deliveryId);
  if (error) throw error;

  // If delivered, also update the order status
  if (status === 'delivered') {
    const { data: delivery } = await supabase
      .from('deliveries')
      .select('order_id')
      .eq('id', deliveryId)
      .single();
    if (delivery) {
      await supabase
        .from('orders')
        .update({ order_status: 'delivered', updated_at: new Date().toISOString() })
        .eq('id', delivery.order_id);
    }
  }

  await logStaffActivity(userId, `updated delivery status to ${status}`, 'deliveries', deliveryId);
}

export async function uploadDeliveryPhoto(deliveryId: string, photoUri: string): Promise<string> {
  const fileName = `delivery-${deliveryId}-${Date.now()}.jpg`;
  const response = await fetch(photoUri);
  const blob = await response.blob();

  const { error } = await supabase.storage
    .from('delivery-photos')
    .upload(fileName, blob, { contentType: 'image/jpeg' });
  if (error) throw error;

  const { data } = supabase.storage.from('delivery-photos').getPublicUrl(fileName);
  return data.publicUrl;
}
