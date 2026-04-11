import React, { useState } from 'react';
import { View, Text, FlatList, Pressable, TextInput, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useOrders } from '@/hooks/useOrders';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorDisplay } from '@/components/shared/ErrorDisplay';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDateTime } from '@/utils/formatDate';
import { canCreateOrders } from '@/utils/permissions';
import {
  ORDER_STATUS,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
  type OrderStatus,
} from '@/constants/statuses';

export default function OrdersScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | undefined>();

  const { data: orders, isLoading, error, refetch } = useOrders({ status: statusFilter, search });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay message={error.message} onRetry={refetch} />;

  const statusFilters = [
    { label: 'All', value: undefined },
    ...Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => ({ label, value: value as OrderStatus })),
  ];

  return (
    <View className="flex-1 bg-gray-50">
      {/* Search and Filter Bar */}
      <View className="bg-white px-4 py-3 shadow-sm">
        <TextInput
          className="mb-3 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-base"
          placeholder="Search orders..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#9ca3af"
        />
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
              <Text
                className={`text-sm font-medium ${
                  statusFilter === item.value ? 'text-white' : 'text-gray-700'
                }`}
              >
                {item.label}
              </Text>
            </Pressable>
          )}
        />
      </View>

      {/* Order List */}
      {!orders?.length ? (
        <EmptyState
          title="No Orders"
          message="No orders found matching your filters."
          actionLabel={canCreateOrders(user?.role ?? 'delivery_staff') ? 'Create Order' : undefined}
          onAction={() => router.push('/(app)/orders/new')}
        />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          ItemSeparatorComponent={() => <View className="h-3" />}
          renderItem={({ item: order }) => (
            <Card onPress={() => router.push(`/(app)/orders/${order.id}`)}>
              <View className="flex-row items-start justify-between">
                <View className="flex-1">
                  <Text className="text-base font-bold text-gray-900">{order.order_number}</Text>
                  <Text className="mt-0.5 text-sm text-gray-600">{order.customer?.name ?? 'Unknown Customer'}</Text>
                  <Text className="mt-0.5 text-xs text-gray-400">{formatDateTime(order.created_at)}</Text>
                </View>
                <View className="items-end">
                  <Badge
                    label={ORDER_STATUS_LABELS[order.order_status]}
                    colorClass={ORDER_STATUS_COLORS[order.order_status]}
                  />
                  <Badge
                    label={PAYMENT_STATUS_LABELS[order.payment_status]}
                    colorClass={PAYMENT_STATUS_COLORS[order.payment_status]}
                    className="mt-1"
                  />
                </View>
              </View>
              <View className="mt-2 flex-row items-center justify-between border-t border-gray-50 pt-2">
                <Text className="text-sm text-gray-500">
                  {order.order_items?.length ?? 0} item(s)
                </Text>
                <Text className="text-base font-bold text-gray-900">
                  {formatCurrency(order.total_amount)}
                </Text>
              </View>
            </Card>
          )}
        />
      )}

      {/* FAB for creating orders */}
      {canCreateOrders(user?.role ?? 'delivery_staff') && (
        <Pressable
          onPress={() => router.push('/(app)/orders/new')}
          className="absolute bottom-24 right-6 h-14 w-14 items-center justify-center rounded-full bg-brand-500 shadow-lg"
        >
          <Text className="text-2xl text-white">+</Text>
        </Pressable>
      )}
    </View>
  );
}
