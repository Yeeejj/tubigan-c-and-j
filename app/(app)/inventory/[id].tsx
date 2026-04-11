import React from 'react';
import { View, Text, FlatList } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTransactionHistory } from '@/hooks/useInventory';
import { Card, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatDateTime } from '@/utils/formatDate';

const txTypeColors: Record<string, string> = {
  restock: 'bg-green-100 text-green-800',
  consumed: 'bg-blue-100 text-blue-800',
  damaged: 'bg-red-100 text-red-800',
  adjustment: 'bg-yellow-100 text-yellow-800',
};

export default function InventoryItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: transactions, isLoading } = useTransactionHistory(id);

  if (isLoading) return <LoadingSpinner />;

  const itemName = transactions?.[0]?.item?.name ?? 'Item';

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white px-4 py-4 shadow-sm">
        <Text className="text-xl font-bold text-gray-900">{itemName}</Text>
        <Text className="text-sm text-gray-500">Transaction History</Text>
      </View>

      {!transactions?.length ? (
        <EmptyState title="No Transactions" message="No transactions recorded for this item." />
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          ItemSeparatorComponent={() => <View className="h-3" />}
          renderItem={({ item: tx }) => (
            <Card>
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <View className="flex-row items-center gap-2">
                    <Badge
                      label={tx.transaction_type}
                      colorClass={txTypeColors[tx.transaction_type] ?? 'bg-gray-100 text-gray-800'}
                    />
                    <Text className={`text-lg font-bold ${tx.quantity_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.quantity_change > 0 ? '+' : ''}{tx.quantity_change}
                    </Text>
                  </View>
                  {tx.notes && <Text className="mt-1 text-sm text-gray-600">{tx.notes}</Text>}
                  <Text className="mt-0.5 text-xs text-gray-400">
                    {tx.performed_by_user?.full_name} · {formatDateTime(tx.created_at)}
                  </Text>
                </View>
              </View>
            </Card>
          )}
        />
      )}
    </View>
  );
}
