import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createOrderSchema, type CreateOrderFormData } from '@/schemas/order.schema';
import { useCreateOrder } from '@/hooks/useOrders';
import { useQuery } from '@tanstack/react-query';
import { getCustomers } from '@/services/customers';
import { getProducts } from '@/services/products';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { formatCurrency } from '@/utils/formatCurrency';
import { PAYMENT_METHOD_LABELS } from '@/constants/statuses';

export default function NewOrderScreen() {
  const router = useRouter();
  const createOrder = useCreateOrder();
  const [customerSearch, setCustomerSearch] = useState('');

  const { data: customers, isLoading: customersLoading } = useQuery({
    queryKey: ['customers', customerSearch],
    queryFn: () => getCustomers(customerSearch),
  });

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => getProducts(),
  });

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateOrderFormData>({
    resolver: zodResolver(createOrderSchema),
    defaultValues: {
      customer_id: '',
      delivery_address: '',
      delivery_date: null,
      payment_method: 'cash',
      notes: null,
      items: [{ product_id: '', quantity: 1, unit_price: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const watchItems = watch('items');

  const totalAmount = watchItems.reduce(
    (sum, item) => sum + (item.quantity || 0) * (item.unit_price || 0),
    0
  );

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

  if (customersLoading || productsLoading) return <LoadingSpinner />;

  const customerOptions = (customers ?? []).map((c) => ({
    label: `${c.name} - ${c.phone}`,
    value: c.id,
  }));

  const productOptions = (products ?? []).map((p) => ({
    label: `${p.name} - ${formatCurrency(p.unit_price)}`,
    value: p.id,
  }));

  const paymentOptions = Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => ({
    label,
    value,
  }));

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerStyle={{ padding: 16 }}>
      <Text className="mb-4 text-xl font-bold text-gray-900">New Order</Text>

      {/* Customer Selection */}
      <Card className="mb-4">
        <Text className="mb-3 text-base font-semibold text-gray-800">Customer</Text>
        <Controller
          control={control}
          name="customer_id"
          render={({ field: { value, onChange } }) => (
            <Select
              label="Select Customer"
              options={customerOptions}
              value={value}
              onChange={(v) => {
                onChange(v);
                const customer = customers?.find((c) => c.id === v);
                if (customer) {
                  setValue('delivery_address', customer.address);
                }
              }}
              error={errors.customer_id?.message}
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

      {/* Order Items */}
      <Card className="mb-4">
        <Text className="mb-3 text-base font-semibold text-gray-800">Items</Text>
        {fields.map((field, index) => (
          <View key={field.id} className="mb-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
            <Controller
              control={control}
              name={`items.${index}.product_id`}
              render={({ field: { value, onChange } }) => (
                <Select
                  label="Product"
                  options={productOptions}
                  value={value}
                  onChange={(v) => {
                    onChange(v);
                    const product = products?.find((p) => p.id === v);
                    if (product) {
                      setValue(`items.${index}.unit_price`, product.unit_price);
                    }
                  }}
                  error={errors.items?.[index]?.product_id?.message}
                />
              )}
            />
            <Controller
              control={control}
              name={`items.${index}.quantity`}
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Quantity"
                  keyboardType="numeric"
                  onChangeText={(text) => onChange(parseInt(text) || 0)}
                  value={String(value)}
                  error={errors.items?.[index]?.quantity?.message}
                />
              )}
            />
            <Text className="text-right text-sm font-medium text-gray-600">
              Subtotal: {formatCurrency((watchItems[index]?.quantity || 0) * (watchItems[index]?.unit_price || 0))}
            </Text>
            {fields.length > 1 && (
              <Button title="Remove" onPress={() => remove(index)} variant="danger" size="sm" className="mt-2" />
            )}
          </View>
        ))}
        <Button
          title="+ Add Item"
          onPress={() => append({ product_id: '', quantity: 1, unit_price: 0 })}
          variant="secondary"
          size="sm"
        />
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
