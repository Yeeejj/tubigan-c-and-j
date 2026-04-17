import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Pressable, TextInput, Alert, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import {
  useOrders,
  useUpdateOrder,
  useUpdateOrderStatus,
  useRecordPayment,
  useCancelOrder,
  useDeleteOrder,
} from '@/hooks/useOrders';
import { useDeliveries } from '@/hooks/useDelivery';
import { useInventoryDashboard } from '@/hooks/useInventory';
import { Card, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorDisplay } from '@/components/shared/ErrorDisplay';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDateTime, toISODate } from '@/utils/formatDate';
import { canCreateOrders, canAccessModule } from '@/utils/permissions';
import type { Order } from '@/types/database';
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
  PAYMENT_METHOD_LABELS,
  type OrderStatus,
  type PaymentMethod,
} from '@/constants/statuses';

const STATUS_FLOW: OrderStatus[] = ['pending', 'processing', 'out_for_delivery', 'delivered', 'completed'];

const PAYMENT_OPTIONS = Object.entries(PAYMENT_METHOD_LABELS).map(([v, l]) => ({ value: v, label: l }));

// --- Live 12-Hour Clock ---
function LiveClock() {
  const [time, setTime] = useState(() => formatTime12());

  useEffect(() => {
    const interval = setInterval(() => setTime(formatTime12()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Set slightly smaller zoom on web
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      (document.documentElement.style as any).zoom = '90%';
    }
  }, []);

  return (
    <View className="items-center rounded-xl bg-white px-5 py-3 shadow-sm">
      <Text className="text-3xl font-bold text-brand-600">{time}</Text>
    </View>
  );
}

function formatTime12(): string {
  const now = new Date();
  let hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} ${ampm}`;
}

// --- Edit Order Modal ---
function EditOrderModal({
  order,
  visible,
  onClose,
  onSave,
  loading,
}: {
  order: Order | null;
  visible: boolean;
  onClose: () => void;
  onSave: (data: {
    customer_name: string;
    customer_phone: string;
    delivery_address: string;
    payment_method: PaymentMethod;
    notes: string | null;
    price_per_gallon: number;
    number_of_gallons: number;
  }) => void;
  loading: boolean;
}) {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [notes, setNotes] = useState('');
  const [pricePerGallon, setPricePerGallon] = useState('');
  const [numberOfGallons, setNumberOfGallons] = useState('');

  // Populate form when order changes
  React.useEffect(() => {
    if (order) {
      setCustomerName(order.customer?.name ?? '');
      setCustomerPhone(order.customer?.phone ?? '');
      setDeliveryAddress(order.delivery_address ?? '');
      setPaymentMethod(order.payment_method as PaymentMethod);
      setNotes(order.notes ?? '');
      const item = order.order_items?.[0];
      setPricePerGallon(item ? String(item.unit_price) : '');
      setNumberOfGallons(item ? String(item.quantity) : '');
    }
  }, [order]);

  const price = parseFloat(pricePerGallon) || 0;
  const gallons = parseInt(numberOfGallons) || 0;

  return (
    <Modal visible={visible} onClose={onClose} title="Edit Order">
      <Input label="Customer Name" value={customerName} onChangeText={setCustomerName} />
      <Input label="Phone Number" value={customerPhone} onChangeText={setCustomerPhone} keyboardType="phone-pad" />
      <Input label="Delivery Address" value={deliveryAddress} onChangeText={setDeliveryAddress} multiline numberOfLines={2} />
      <Input
        label="Price per Gallon"
        value={pricePerGallon}
        onChangeText={setPricePerGallon}
        keyboardType="numeric"
      />
      <Input
        label="Number of Gallons"
        value={numberOfGallons}
        onChangeText={setNumberOfGallons}
        keyboardType="numeric"
      />
      <Text className="mt-1 text-right text-sm font-medium text-gray-600">
        Total: {formatCurrency(price * gallons)}
      </Text>
      <Select
        label="Payment Method"
        options={PAYMENT_OPTIONS}
        value={paymentMethod}
        onChange={(v) => setPaymentMethod(v as PaymentMethod)}
      />
      <Input label="Notes (optional)" value={notes} onChangeText={setNotes} multiline numberOfLines={2} />
      <Button
        title="Save Changes"
        onPress={() => {
          if (!customerName.trim() || !customerPhone.trim() || !deliveryAddress.trim() || price <= 0 || gallons <= 0) {
            const msg = 'Please fill in all required fields.';
            Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Validation', msg);
            return;
          }
          onSave({
            customer_name: customerName,
            customer_phone: customerPhone,
            delivery_address: deliveryAddress,
            payment_method: paymentMethod,
            notes: notes || null,
            price_per_gallon: price,
            number_of_gallons: gallons,
          });
        }}
        loading={loading}
        className="mt-4"
      />
    </Modal>
  );
}

// --- Main Dashboard ---
export default function DashboardScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const today = toISODate(new Date());

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | undefined>();

  // CRUD mutations
  const updateOrder = useUpdateOrder();
  const updateStatus = useUpdateOrderStatus();
  const recordPayment = useRecordPayment();
  const cancelOrder = useCancelOrder();
  const deleteOrder = useDeleteOrder();

  // Edit modal state
  const [editOrder, setEditOrder] = useState<Order | null>(null);

  // Payment modal state
  const [paymentOrderId, setPaymentOrderId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');

  // Cancel modal state
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Data queries
  const { data: orders, isLoading, error, refetch } = useOrders({
    status: statusFilter,
    search,
    dateFrom: `${today}T00:00:00`,
    dateTo: `${today}T23:59:59`,
  });
  const { data: deliveries } = useDeliveries();
  const { data: inventory } = useInventoryDashboard();

  const role = user?.role ?? 'delivery_staff';
  const pendingOrders = orders?.filter((o) => o.order_status === 'pending').length ?? 0;
  const totalRevenue = orders?.reduce((sum, o) => sum + (o.total_amount ?? 0), 0) ?? 0;
  const totalPaid = orders?.reduce((sum, o) => sum + (o.amount_paid ?? 0), 0) ?? 0;
  const activeDeliveries = deliveries?.filter((d) => d.status !== 'delivered' && d.status !== 'failed').length ?? 0;
  const lowStockItems = inventory?.filter((s) => s.status === 'low' || s.status === 'critical').length ?? 0;

  // --- CRUD Handlers ---

  const handleEdit = (data: Parameters<typeof updateOrder.mutateAsync>[0]['data']) => {
    if (!editOrder) return;
    updateOrder.mutateAsync({ orderId: editOrder.id, data }).then(() => {
      setEditOrder(null);
    }).catch((err) => {
      const msg = err instanceof Error ? err.message : 'Failed to update order';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error', msg);
    });
  };

  const handleAdvanceStatus = async (orderId: string, currentStatus: OrderStatus) => {
    const idx = STATUS_FLOW.indexOf(currentStatus);
    const nextStatus = idx >= 0 && idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : null;
    if (!nextStatus) return;
    try {
      await updateStatus.mutateAsync({ orderId, newStatus: nextStatus });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update status';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error', msg);
    }
  };

  const handlePayment = async () => {
    if (!paymentOrderId) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) return;
    try {
      await recordPayment.mutateAsync({ orderId: paymentOrderId, amount, method: paymentMethod });
      setPaymentOrderId(null);
      setPaymentAmount('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to record payment';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error', msg);
    }
  };

  const handleCancel = async () => {
    if (!cancelOrderId || !cancelReason.trim()) return;
    try {
      await cancelOrder.mutateAsync({ orderId: cancelOrderId, reason: cancelReason });
      setCancelOrderId(null);
      setCancelReason('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to cancel order';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error', msg);
    }
  };

  const handleDelete = async (orderId: string) => {
    try {
      await deleteOrder.mutateAsync(orderId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete order';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error', msg);
    }
  };

  // --- Helpers ---

  const getNextStatusLabel = (status: OrderStatus): string | null => {
    const idx = STATUS_FLOW.indexOf(status);
    return idx >= 0 && idx < STATUS_FLOW.length - 1 ? ORDER_STATUS_LABELS[STATUS_FLOW[idx + 1]] : null;
  };

  const statusFilters: { label: string; value: OrderStatus | undefined }[] = [
    { label: 'All', value: undefined },
    { label: 'Pending', value: 'pending' },
    { label: 'Processing', value: 'processing' },
    { label: 'Out for Delivery', value: 'out_for_delivery' },
    { label: 'Delivered', value: 'delivered' },
    { label: 'Completed', value: 'completed' },
    { label: 'Cancelled', value: 'cancelled' },
  ];

  // --- Header ---

  const renderHeader = () => (
    <View>
      {/* Clock */}
      <View className="mb-4 items-center">
        <LiveClock />
      </View>

      {/* Welcome & Sign Out */}
      <View className="mb-4 flex-row items-center justify-between">
        <View>
          <Text className="text-xl font-bold text-gray-900">Welcome, {user?.full_name}</Text>
          <Text className="text-xs text-gray-500">{today}</Text>
        </View>
        <Button title="Sign Out" onPress={signOut} variant="ghost" size="sm" />
      </View>

      {/* Dashboard Stats */}
      <View className="mb-4 flex-row flex-wrap gap-3">
        <Card className="min-w-[140px] flex-1">
          <Text className="text-sm text-gray-500">Pending Orders</Text>
          <Text className="mt-1 text-2xl font-bold text-brand-600">{pendingOrders}</Text>
        </Card>
        <Card className="min-w-[140px] flex-1">
          <Text className="text-sm text-gray-500">Active Deliveries</Text>
          <Text className="mt-1 text-2xl font-bold text-purple-600">{activeDeliveries}</Text>
        </Card>
        {canAccessModule(role, 'inventory') && (
          <Card className="min-w-[140px] flex-1">
            <Text className="text-sm text-gray-500">Low Stock Items</Text>
            <Text className={`mt-1 text-2xl font-bold ${lowStockItems > 0 ? 'text-red-500' : 'text-green-500'}`}>
              {lowStockItems}
            </Text>
          </Card>
        )}
        <Card className="min-w-[140px] flex-1">
          <Text className="text-sm text-gray-500">Total Revenue</Text>
          <Text className="mt-1 text-2xl font-bold text-green-600">
            {formatCurrency(totalRevenue)}
          </Text>
        </Card>
        <Card className="min-w-[140px] flex-1">
          <Text className="text-sm text-gray-500">Total Paid</Text>
          <Text className="mt-1 text-2xl font-bold text-green-600">
            {formatCurrency(totalPaid)}
          </Text>
        </Card>
      </View>

      {/* Create Order */}
      {canCreateOrders(role) && (
        <Button title="+ New Order" onPress={() => router.push('/(app)/orders/new')} className="mb-4" />
      )}

      {/* Search */}
      <TextInput
        className="mb-3 rounded-lg border border-gray-300 bg-white px-3 py-2 text-base"
        placeholder="Search orders..."
        value={search}
        onChangeText={setSearch}
        placeholderTextColor="#9ca3af"
      />

      {/* Status Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
        {statusFilters.map((item) => (
          <Pressable
            key={item.value ?? 'all'}
            onPress={() => setStatusFilter(item.value)}
            className={`mr-2 rounded-full px-3 py-1.5 ${
              statusFilter === item.value ? 'bg-brand-500' : 'bg-gray-100'
            }`}
          >
            <Text
              className={`text-sm font-medium ${
                statusFilter === item.value ? 'text-white' : 'text-gray-700'
              }`}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Section Title */}
      <Text className="mb-2 text-base font-bold text-gray-900">
        Today's Orders ({orders?.length ?? 0})
      </Text>
    </View>
  );

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay message={error.message} onRetry={refetch} />;

  return (
    <View className="flex-1 bg-gray-50">
      <FlatList
        data={orders ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <EmptyState
            title="No Orders Today"
            message="No orders found for today. Create one to get started!"
            actionLabel={canCreateOrders(role) ? 'Create Order' : undefined}
            onAction={() => router.push('/(app)/orders/new')}
          />
        }
        ItemSeparatorComponent={() => <View className="h-3" />}
        renderItem={({ item: order }) => {
          const nextLabel = getNextStatusLabel(order.order_status);
          const isActive = order.order_status !== 'cancelled' && order.order_status !== 'completed';

          return (
            <Card onPress={() => router.push(`/(app)/orders/${order.id}`)}>
              {/* Order Info */}
              <View className="flex-row items-start justify-between">
                <View className="flex-1">
                  <Text className="text-base font-bold text-gray-900">{order.order_number}</Text>
                  <Text className="mt-0.5 text-sm text-gray-600">{order.customer?.name ?? 'Unknown Customer'}</Text>
                  <Text className="mt-0.5 text-xs text-gray-400">{formatDateTime(order.created_at)}</Text>
                </View>
                <View className="items-end">
                  <Badge label={ORDER_STATUS_LABELS[order.order_status]} colorClass={ORDER_STATUS_COLORS[order.order_status]} />
                  <Badge label={PAYMENT_STATUS_LABELS[order.payment_status]} colorClass={PAYMENT_STATUS_COLORS[order.payment_status]} className="mt-1" />
                </View>
              </View>

              {/* Amount Summary */}
              <View className="mt-2 flex-row items-center justify-between border-t border-gray-100 pt-2">
                <Text className="text-sm text-gray-500">{order.order_items?.length ?? 0} item(s)</Text>
                <View className="items-end">
                  <Text className="text-base font-bold text-gray-900">{formatCurrency(order.total_amount)}</Text>
                  {order.amount_paid > 0 && order.payment_status !== 'paid' && (
                    <Text className="text-xs text-green-600">Paid: {formatCurrency(order.amount_paid)}</Text>
                  )}
                </View>
              </View>

              {/* CRUD Action Buttons */}
              <View className="mt-3 flex-row flex-wrap gap-2 border-t border-gray-100 pt-3">
                {/* Update: Edit order details */}
                {isActive && (
                  <Button
                    title="Edit"
                    onPress={() => setEditOrder(order)}
                    variant="secondary"
                    size="sm"
                  />
                )}

                {/* Update: Advance status */}
                {isActive && nextLabel && (
                  <Button
                    title={nextLabel}
                    onPress={() => handleAdvanceStatus(order.id, order.order_status)}
                    size="sm"
                  />
                )}

                {/* Update: Record payment */}
                {isActive && order.payment_status !== 'paid' && (
                  <Button
                    title="Pay"
                    onPress={() => setPaymentOrderId(order.id)}
                    variant="secondary"
                    size="sm"
                  />
                )}

                {/* Update: Cancel */}
                {isActive && (
                  <Button
                    title="Cancel"
                    onPress={() => setCancelOrderId(order.id)}
                    variant="danger"
                    size="sm"
                  />
                )}

                {/* Delete */}
                <Button
                  title="Delete"
                  onPress={() => handleDelete(order.id)}
                  variant="danger"
                  size="sm"
                />
              </View>
            </Card>
          );
        }}
      />

      {/* Edit Order Modal */}
      <EditOrderModal
        order={editOrder}
        visible={!!editOrder}
        onClose={() => setEditOrder(null)}
        onSave={handleEdit}
        loading={updateOrder.isPending}
      />

      {/* Payment Modal */}
      <Modal visible={!!paymentOrderId} onClose={() => setPaymentOrderId(null)} title="Record Payment">
        <Input label="Amount" keyboardType="numeric" placeholder="0.00" value={paymentAmount} onChangeText={setPaymentAmount} />
        <Select label="Payment Method" options={PAYMENT_OPTIONS} value={paymentMethod} onChange={(v) => setPaymentMethod(v as PaymentMethod)} />
        <Button title="Submit Payment" onPress={handlePayment} loading={recordPayment.isPending} className="mt-4" />
      </Modal>

      {/* Cancel Modal */}
      <Modal visible={!!cancelOrderId} onClose={() => setCancelOrderId(null)} title="Cancel Order">
        <Input label="Reason for cancellation" placeholder="Enter reason..." multiline numberOfLines={3} value={cancelReason} onChangeText={setCancelReason} />
        <Button title="Confirm Cancel" onPress={handleCancel} variant="danger" loading={cancelOrder.isPending} className="mt-4" />
      </Modal>
    </View>
  );
}
