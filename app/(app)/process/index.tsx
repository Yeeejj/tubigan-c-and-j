import React from 'react';
import { View, Text, FlatList, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useBatches } from '@/hooks/useProcess';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatDateTime } from '@/utils/formatDate';
import { BATCH_STATUS_LABELS } from '@/constants/statuses';

export default function ProcessScreen() {
  const router = useRouter();
  const { data: batches, isLoading } = useBatches();

  if (isLoading) return <LoadingSpinner />;

  return (
    <View className="flex-1 bg-gray-50">
      {!batches?.length ? (
        <EmptyState
          title="No Batches"
          message="No production batches yet."
          actionLabel="Create Batch"
          onAction={() => router.push('/(app)/process/new')}
        />
      ) : (
        <FlatList
          data={batches}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          ItemSeparatorComponent={() => <View className="h-3" />}
          renderItem={({ item: batch }) => (
            <Card onPress={() => router.push(`/(app)/process/${batch.id}`)}>
              <View className="flex-row items-start justify-between">
                <View>
                  <Text className="font-bold text-gray-900">{batch.batch_number}</Text>
                  <Text className="text-sm text-gray-500">{batch.water_volume_liters}L</Text>
                  <Text className="text-xs text-gray-400">{formatDateTime(batch.started_at)}</Text>
                </View>
                <Badge
                  label={BATCH_STATUS_LABELS[batch.status]}
                  colorClass="bg-blue-100 text-blue-800"
                />
              </View>
              <Text className="mt-1 text-xs text-gray-500">
                {batch.process_steps?.length ?? 0} / 8 steps completed
              </Text>
              <Text className="text-xs text-gray-500">
                {batch.linked_orders.length} linked order(s)
              </Text>
            </Card>
          )}
        />
      )}

      <Pressable
        onPress={() => router.push('/(app)/process/new')}
        className="absolute bottom-24 right-6 h-14 w-14 items-center justify-center rounded-full bg-brand-500 shadow-lg"
      >
        <Text className="text-2xl text-white">+</Text>
      </Pressable>
    </View>
  );
}
