import React from 'react';
import { View, Text, ScrollView, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createBatchSchema, type CreateBatchFormData } from '@/schemas/batch.schema';
import { useCreateBatch } from '@/hooks/useProcess';
import { useOrders } from '@/hooks/useOrders';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

export default function NewBatchScreen() {
  const router = useRouter();
  const createBatch = useCreateBatch();
  const { data: pendingOrders, isLoading } = useOrders({ status: 'pending' });

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateBatchFormData>({
    resolver: zodResolver(createBatchSchema),
    defaultValues: { linked_orders: [], water_volume_liters: 0, notes: null },
  });

  const selectedOrders = watch('linked_orders');

  const onSubmit = async (data: CreateBatchFormData) => {
    try {
      await createBatch.mutateAsync(data);
      if (Platform.OS === 'web') window.alert('Batch created!');
      else Alert.alert('Success', 'Batch created!');
      router.back();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create batch';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Error', msg);
    }
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerStyle={{ padding: 16 }}>
      <Text className="mb-4 text-xl font-bold text-gray-900">New Production Batch</Text>

      <Card className="mb-4">
        <Text className="mb-2 text-base font-semibold text-gray-800">Link Orders</Text>
        {pendingOrders?.map((order) => {
          const isSelected = selectedOrders.includes(order.id);
          return (
            <Button
              key={order.id}
              title={`${order.order_number} - ${order.customer?.name ?? 'Unknown'}`}
              variant={isSelected ? 'primary' : 'secondary'}
              size="sm"
              className="mb-2"
              onPress={() => {
                const current = selectedOrders;
                if (isSelected) {
                  setValue('linked_orders', current.filter((id) => id !== order.id));
                } else {
                  setValue('linked_orders', [...current, order.id]);
                }
              }}
            />
          );
        })}
        {errors.linked_orders && (
          <Text className="text-sm text-red-500">{errors.linked_orders.message}</Text>
        )}
      </Card>

      <Card className="mb-4">
        <Controller
          control={control}
          name="water_volume_liters"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Water Volume (Liters)"
              keyboardType="numeric"
              onChangeText={(t) => onChange(parseFloat(t) || 0)}
              value={String(value)}
              error={errors.water_volume_liters?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="notes"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Notes (optional)"
              multiline
              numberOfLines={3}
              onChangeText={onChange}
              value={value ?? ''}
            />
          )}
        />
      </Card>

      <Button title="Create Batch" onPress={handleSubmit(onSubmit)} loading={isSubmitting} />
    </ScrollView>
  );
}
