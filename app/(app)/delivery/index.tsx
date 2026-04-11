import React, { useState } from 'react';
import { View, Text, FlatList, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useDeliveries, useAssignDelivery } from '@/hooks/useDelivery';
import { useDeliveryStaff } from '@/hooks/useStaff';
import { useOrders } from '@/hooks/useOrders';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDateTime } from '@/utils/formatDate';
import { canAssignDelivery } from '@/utils/permissions';
import { DELIVERY_STATUS_LABELS, DELIVERY_STATUS_COLORS, type DeliveryStatus } from '@/constants/statuses';

export default function DeliveryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const isDeliveryStaff = user?.role === 'delivery_staff';

  const { data: deliveries, isLoading } = useDeliveries(
    isDeliveryStaff ? { assignedTo: user?.id } : undefined
  );
  const { data: pendingOrders } = useOrders({ status: 'processing' });
  const { data: deliveryStaffList } = useDeliveryStaff();
  const assignDelivery = useAssignDelivery();

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [statusFilter, setStatusFilter] = useState<DeliveryStatus | undefined>();

  if (isLoading) return <LoadingSpinner />;

  const filteredDeliveries = statusFilter
    ? deliveries?.filter((d) => d.status === statusFilter)
    : deliveries;

  const handleAssign = async () => {
    if (!selectedOrderId || !selectedStaffId) return;
    await assignDelivery.mutateAsync({ orderId: selectedOrderId, assignedTo: selectedStaffId });
    setShowAssignModal(false);
    setSelectedOrderId('');
    setSelectedStaffId('');
  };

  const statusFilters = [
    { label: 'All', value: undefined },
    ...Object.entries(DELIVERY_STATUS_LABELS).map(([value, label]) => ({
      label,
      value: value as DeliveryStatus,
    })),
  ];

  return (
    <View className="flex-1 bg-gray-50">
      {/* Filters */}
      <View className="bg-white px-4 py-3 shadow-sm">
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={statusFilters}
          keyExtractor={(item) => item.value ?? 'all'}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setStatusFilter(item.value)}
              className={`mr-2 rounded-full px-3 py-1.5 ${
                statusFilter === item.value ? 'bg-brand-500' : 'bg-gray-100'
              }`}
            >
              <Text className={`text-sm font-medium ${statusFilter === item.value ? 'text-white' : 'text-gray-700'}`}>
                {item.label}
              </Text>
            </Pressable>
          )}
        />
      </View>

      {!filteredDeliveries?.length ? (
        <EmptyState title="No Deliveries" message="No deliveries found." />
      ) : (
        <FlatList
          data={filteredDeliveries}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          ItemSeparatorComponent={() => <View className="h-3" />}
          renderItem={({ item: delivery }) => (
            <Card onPress={() => router.push(`/(app)/delivery/${delivery.id}`)}>
              <View className="flex-row items-start justify-between">
                <View className="flex-1">
                  <Text className="font-bold text-gray-900">{delivery.order?.order_number ?? 'Unknown'}</Text>
                  <Text className="text-sm text-gray-600">{delivery.order?.customer?.name}</Text>
                  <Text className="text-xs text-gray-400">{delivery.order?.delivery_address}</Text>
                  <Text className="mt-1 text-xs text-gray-500">
                    Staff: {delivery.assigned_to_user?.full_name ?? 'Unassigned'}
                  </Text>
                </View>
                <View className="items-end">
                  <Badge
                    label={DELIVERY_STATUS_LABELS[delivery.status]}
                    colorClass={DELIVERY_STATUS_COLORS[delivery.status]}
                  />
                  <Text className="mt-1 text-sm font-medium text-gray-700">
                    {formatCurrency(delivery.order?.total_amount ?? 0)}
                  </Text>
                </View>
              </View>
            </Card>
          )}
        />
      )}

      {/* Assign delivery FAB (admin/owner only) */}
      {canAssignDelivery(user?.role ?? 'delivery_staff') && (
        <Pressable
          onPress={() => setShowAssignModal(true)}
          className="absolute bottom-24 right-6 h-14 w-14 items-center justify-center rounded-full bg-brand-500 shadow-lg"
        >
          <Text className="text-2xl text-white">+</Text>
        </Pressable>
      )}

      {/* Assign Modal */}
      <Modal visible={showAssignModal} onClose={() => setShowAssignModal(false)} title="Assign Delivery">
        <Select
          label="Select Order"
          options={(pendingOrders ?? []).map((o) => ({
            label: `${o.order_number} - ${o.customer?.name}`,
            value: o.id,
          }))}
          value={selectedOrderId}
          onChange={setSelectedOrderId}
        />
        <Select
          label="Assign to Staff"
          options={(deliveryStaffList ?? []).map((s) => ({
            label: s.full_name,
            value: s.id,
          }))}
          value={selectedStaffId}
          onChange={setSelectedStaffId}
        />
        <Button
          title="Assign Delivery"
          onPress={handleAssign}
          loading={assignDelivery.isPending}
          className="mt-4"
        />
      </Modal>
    </View>
  );
}
