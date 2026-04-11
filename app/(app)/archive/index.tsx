import React, { useState } from 'react';
import { View, Text, FlatList, TextInput, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useOrders } from '@/hooks/useOrders';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDateTime } from '@/utils/formatDate';
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
} from '@/constants/statuses';

type ArchiveTab = 'orders' | 'deliveries' | 'batches';

export default function ArchiveScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<ArchiveTab>('orders');

  // For simplicity, archive shows all orders (completed + cancelled)
  const { data: orders, isLoading } = useOrders({ search });

  if (isLoading) return <LoadingSpinner />;

  const archivedOrders = orders?.filter(
    (o) => o.order_status === 'completed' || o.order_status === 'cancelled'
  );

  return (
    <View className="flex-1 bg-gray-50">
      {/* Search */}
      <View className="bg-white px-4 py-3 shadow-sm">
        <TextInput
          className="mb-2 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-base"
          placeholder="Search archive..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#9ca3af"
        />
        <View className="flex-row gap-2">
          {(['orders', 'deliveries', 'batches'] as const).map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              className={`rounded-full px-3 py-1.5 ${activeTab === tab ? 'bg-brand-500' : 'bg-gray-100'}`}
            >
              <Text className={`text-sm font-medium ${activeTab === tab ? 'text-white' : 'text-gray-700'}`}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {activeTab === 'orders' && (
        !archivedOrders?.length ? (
          <EmptyState title="No Archive" message="No completed or cancelled orders found." />
        ) : (
          <FlatList
            data={archivedOrders}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16 }}
            ItemSeparatorComponent={() => <View className="h-3" />}
            renderItem={({ item: order }) => (
              <Card onPress={() => router.push(`/(app)/orders/${order.id}`)}>
                <View className="flex-row items-start justify-between">
                  <View className="flex-1">
                    <Text className="font-bold text-gray-900">{order.order_number}</Text>
                    <Text className="text-sm text-gray-500">{order.customer?.name}</Text>
                    <Text className="text-xs text-gray-400">{formatDateTime(order.created_at)}</Text>
                  </View>
                  <View className="items-end gap-1">
                    <Badge label={ORDER_STATUS_LABELS[order.order_status]} colorClass={ORDER_STATUS_COLORS[order.order_status]} />
                    <Badge label={PAYMENT_STATUS_LABELS[order.payment_status]} colorClass={PAYMENT_STATUS_COLORS[order.payment_status]} />
                    <Text className="text-sm font-bold text-gray-700">{formatCurrency(order.total_amount)}</Text>
                  </View>
                </View>
              </Card>
            )}
          />
        )
      )}

      {activeTab !== 'orders' && (
        <EmptyState title={`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Archive`} message="Archive view coming soon." />
      )}
    </View>
  );
}
