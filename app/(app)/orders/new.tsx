import React from 'react';
import { View, Text, ScrollView, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createOrderSchema, type CreateOrderFormData } from '@/schemas/order.schema';
import { useCreateOrder } from '@/hooks/useOrders';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { formatCurrency } from '@/utils/formatCurrency';
import { PAYMENT_METHOD_LABELS } from '@/constants/statuses';

export default function NewOrderScreen() {
  const router = useRouter();
  const createOrder = useCreateOrder();

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateOrderFormData>({
    resolver: zodResolver(createOrderSchema),
    defaultValues: {
      customer_name: '',
      customer_phone: '',
      delivery_address: '',
      delivery_date: null,
      payment_method: 'cash',
      notes: null,
      price_per_gallon: 0,
      number_of_gallons: 1,
    },
  });

  const watchPrice = watch('price_per_gallon');
  const watchGallons = watch('number_of_gallons');
  const totalAmount = (watchPrice || 0) * (watchGallons || 0);

  const onSubmit = async (data: CreateOrderFormData) => {
    try {
      await createOrder.mutateAsync(data);
      const alertMsg = 'Order created successfully!';
      if (Platform.OS === 'web') {
        window.alert(alertMsg);
      } else {
        Alert.alert('Success', alertMsg);
      }
      router.back();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create order';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Error', msg);
      }
    }
  };

  const paymentOptions = Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => ({
    label,
    value,
  }));

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerStyle={{ padding: 16 }}>
      <Text className="mb-4 text-xl font-bold text-gray-900">New Order</Text>

      {/* Customer Info */}
      <Card className="mb-4">
        <Text className="mb-3 text-base font-semibold text-gray-800">Customer</Text>
        <Controller
          control={control}
          name="customer_name"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Customer Name"
              placeholder="Enter customer name"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={errors.customer_name?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="customer_phone"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Phone Number"
              placeholder="Enter phone number"
              keyboardType="phone-pad"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={errors.customer_phone?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="delivery_address"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Delivery Address"
              placeholder="Enter delivery address"
              multiline
              numberOfLines={2}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={errors.delivery_address?.message}
            />
          )}
        />
      </Card>

      {/* Price & Gallons */}
      <Card className="mb-4">
        <Text className="mb-3 text-base font-semibold text-gray-800">Order Details</Text>
        <Controller
          control={control}
          name="price_per_gallon"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Price per Gallon"
              placeholder="Enter price per gallon"
              keyboardType="numeric"
              onChangeText={(text) => onChange(parseFloat(text) || 0)}
              value={value ? String(value) : ''}
              error={errors.price_per_gallon?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="number_of_gallons"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Number of Gallons"
              placeholder="Enter number of gallons"
              keyboardType="numeric"
              onChangeText={(text) => onChange(parseInt(text) || 0)}
              value={value ? String(value) : ''}
              error={errors.number_of_gallons?.message}
            />
          )}
        />
        <Text className="mt-2 text-right text-sm font-medium text-gray-600">
          Subtotal: {formatCurrency(totalAmount)}
        </Text>
      </Card>

      {/* Payment Method */}
      <Card className="mb-4">
        <Controller
          control={control}
          name="payment_method"
          render={({ field: { value, onChange } }) => (
            <Select label="Payment Method" options={paymentOptions} value={value} onChange={onChange} />
          )}
        />
        <Controller
          control={control}
          name="notes"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Notes (optional)"
              placeholder="Any special instructions..."
              multiline
              numberOfLines={3}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value ?? ''}
            />
          )}
        />
      </Card>

      {/* Total and Submit */}
      <Card className="mb-8">
        <View className="flex-row items-center justify-between">
          <Text className="text-lg font-bold text-gray-900">Total</Text>
          <Text className="text-2xl font-bold text-brand-600">{formatCurrency(totalAmount)}</Text>
        </View>
        <Button
          title="Create Order"
          onPress={handleSubmit(onSubmit)}
          loading={isSubmitting}
          className="mt-4"
        />
      </Card>
    </ScrollView>
  );
}
