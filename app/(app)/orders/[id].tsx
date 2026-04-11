import React, { useState } from 'react';
import { View, Text, ScrollView, Alert, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useOrderById, useOrderStatusHistory, useUpdateOrderStatus, useRecordPayment, useCancelOrder } from '@/hooks/useOrders';
import { useAuth } from '@/context/AuthContext';
import { Card, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ErrorDisplay } from '@/components/shared/ErrorDisplay';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDateTime } from '@/utils/formatDate';
import { canDeleteOrders, canAssignDelivery } from '@/utils/permissions';
import {
  ORDER_STATUS,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
  PAYMENT_METHOD_LABELS,
  type OrderStatus,
  type PaymentMethod,
} from '@/constants/statuses';

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const { data: order, isLoading, error, refetch } = useOrderById(id);
  const { data: statusHistory } = useOrderStatusHistory(id);
  const updateStatus = useUpdateOrderStatus();
  const recordPayment = useRecordPayment();
  const cancelOrder = useCancelOrder();

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  if (isLoading) return <LoadingSpinner />;
  if (error || !order) return <ErrorDisplay message={error?.message ?? 'Order not found'} onRetry={refetch} />;

  const statusFlow: OrderStatus[] = ['pending', 'processing', 'out_for_delivery', 'delivered', 'completed'];
  const currentIndex = statusFlow.indexOf(order.order_status);
  const nextStatus = currentIndex >= 0 && currentIndex < statusFlow.length - 1 ? statusFlow[currentIndex + 1] : null;

  const handleStatusAdvance = async () => {
    if (!nextStatus) return;
    try {
      await updateStatus.mutateAsync({ orderId: id, newStatus: nextStatus });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update status';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Error', msg);
    }
  };

  const handlePayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) return;
    try {
      await recordPayment.mutateAsync({ orderId: id, amount, method: paymentMethod });
      setShowPaymentModal(false);
      setPaymentAmount('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to record payment';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Error', msg);
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) return;
    try {
      await cancelOrder.mutateAsync({ orderId: id, reason: cancelReason });
      setShowCancelModal(false);
      setCancelReason('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to cancel order';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Error', msg);
    }
  };

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerStyle={{ padding: 16 }}>
      {/* Header */}
      <Card className="mb-4">
        <View className="flex-row items-start justify-between">
          <View>
            <Text className="text-xl font-bold text-gray-900">{order.order_number}</Text>
            <Text className="mt-1 text-sm text-gray-500">{formatDateTime(order.created_at)}</Text>
          </View>
          <View className="items-end gap-1">
            <Badge label={ORDER_STATUS_LABELS[order.order_status]} colorClass={ORDER_STATUS_COLORS[order.order_status]} />
            <Badge label={PAYMENT_STATUS_LABELS[order.payment_status]} colorClass={PAYMENT_STATUS_COLORS[order.payment_status]} />
          </View>
        </View>
      </Card>

      {/* Customer Info */}
      <Card className="mb-4">
        <CardTitle>Customer</CardTitle>
        <Text className="mt-1 text-base text-gray-700">{order.customer?.name ?? 'Unknown'}</Text>
        <Text className="text-sm text-gray-500">{order.customer?.phone}</Text>
        <Text className="mt-1 text-sm text-gray-500">{order.delivery_address}</Text>
      </Card>

      {/* Order Items */}
      <Card className="mb-4">
        <CardTitle>Items</CardTitle>
        {order.order_items?.map((item) => (
          <View key={item.id} className="mt-2 flex-row items-center justify-between border-b border-gray-50 pb-2">
            <View className="flex-1">
              <Text className="text-sm font-medium text-gray-800">{item.product?.name ?? 'Unknown'}</Text>
              <Text className="text-xs text-gray-500">
                {item.quantity} x {formatCurrency(item.unit_price)}
              </Text>
            </View>
            <Text className="text-sm font-semibold text-gray-900">{formatCurrency(item.subtotal)}</Text>
          </View>
        ))}
        <View className="mt-3 flex-row items-center justify-between border-t border-gray-200 pt-3">
          <Text className="text-base font-bold text-gray-900">Total</Text>
          <Text className="text-xl font-bold text-brand-600">{formatCurrency(order.total_amount)}</Text>
        </View>
        <View className="mt-1 flex-row items-center justify-between">
          <Text className="text-sm text-gray-500">Paid</Text>
          <Text className="text-sm font-medium text-green-600">{formatCurrency(order.amount_paid)}</Text>
        </View>
        {order.total_amount - order.amount_paid > 0 && (
          <View className="mt-1 flex-row items-center justify-between">
            <Text className="text-sm text-gray-500">Balance</Text>
            <Text className="text-sm font-medium text-red-600">
              {formatCurrency(order.total_amount - order.amount_paid)}
            </Text>
          </View>
        )}
      </Card>

      {/* Status Timeline */}
      <Card className="mb-4">
        <CardTitle>Status History</CardTitle>
        {statusHistory?.map((entry) => (
          <View key={entry.id} className="mt-2 flex-row items-start gap-3 border-b border-gray-50 pb-2">
            <View className="mt-1 h-2 w-2 rounded-full bg-brand-500" />
            <View className="flex-1">
              <Text className="text-sm font-medium text-gray-800">
                {ORDER_STATUS_LABELS[entry.new_status as OrderStatus] ?? entry.new_status}
              </Text>
              {entry.note && <Text className="text-xs text-gray-500">{entry.note}</Text>}
              <Text className="text-xs text-gray-400">{formatDateTime(entry.changed_at)}</Text>
            </View>
          </View>
        ))}
      </Card>

      {/* Actions */}
      {order.order_status !== 'cancelled' && order.order_status !== 'completed' && (
        <Card className="mb-8">
          <CardTitle>Actions</CardTitle>
          <View className="mt-3 gap-3">
            {nextStatus && (
              <Button
                title={`Advance to ${ORDER_STATUS_LABELS[nextStatus]}`}
                onPress={handleStatusAdvance}
                loading={updateStatus.isPending}
              />
            )}
            {order.payment_status !== 'paid' && (
              <Button title="Record Payment" onPress={() => setShowPaymentModal(true)} variant="secondary" />
            )}
            {canDeleteOrders(user?.role ?? 'delivery_staff') && (
              <Button title="Cancel Order" onPress={() => setShowCancelModal(true)} variant="danger" />
            )}
          </View>
        </Card>
      )}

      {/* Payment Modal */}
      <Modal visible={showPaymentModal} onClose={() => setShowPaymentModal(false)} title="Record Payment">
        <Input
          label="Amount"
          keyboardType="numeric"
          placeholder="0.00"
          value={paymentAmount}
          onChangeText={setPaymentAmount}
        />
        <Select
          label="Payment Method"
          options={Object.entries(PAYMENT_METHOD_LABELS).map(([v, l]) => ({ value: v, label: l }))}
          value={paymentMethod}
          onChange={(v) => setPaymentMethod(v as PaymentMethod)}
        />
        <Button title="Submit Payment" onPress={handlePayment} loading={recordPayment.isPending} className="mt-4" />
      </Modal>

      {/* Cancel Modal */}
      <Modal visible={showCancelModal} onClose={() => setShowCancelModal(false)} title="Cancel Order">
        <Input
          label="Reason for cancellation"
          placeholder="Enter reason..."
          multiline
          numberOfLines={3}
          value={cancelReason}
          onChangeText={setCancelReason}
        />
        <Button title="Confirm Cancel" onPress={handleCancel} variant="danger" loading={cancelOrder.isPending} className="mt-4" />
      </Modal>
    </ScrollView>
  );
}
