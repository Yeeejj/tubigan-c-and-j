import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useDailySummary, useSalesForRange, useUnpaidOrders, useTopProducts, usePaymentMethodBreakdown } from '@/hooks/useSales';
import { Card, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDate, toISODate } from '@/utils/formatDate';
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_COLORS, PAYMENT_STATUS_LABELS } from '@/constants/statuses';

export default function SalesScreen() {
  const today = toISODate(new Date());
  const weekAgo = toISODate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const monthAgo = toISODate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));

  const [rangeStart, setRangeStart] = useState(weekAgo);
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  const { data: dailySummary, isLoading: dailyLoading } = useDailySummary(today);
  const { data: salesRange } = useSalesForRange(
    activeTab === 'monthly' ? monthAgo : weekAgo,
    today
  );
  const { data: unpaidOrders } = useUnpaidOrders();
  const { data: topProducts } = useTopProducts(weekAgo, today);
  const { data: paymentBreakdown } = usePaymentMethodBreakdown(weekAgo, today);

  if (dailyLoading) return <LoadingSpinner />;

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerStyle={{ padding: 16 }}>
      {/* Daily Summary */}
      <Card className="mb-4">
        <CardTitle>Today's Summary</CardTitle>
        <View className="mt-3 flex-row flex-wrap gap-3">
          <View className="min-w-[100px] flex-1">
            <Text className="text-sm text-gray-500">Orders</Text>
            <Text className="text-2xl font-bold text-gray-900">{dailySummary?.total_orders ?? 0}</Text>
          </View>
          <View className="min-w-[100px] flex-1">
            <Text className="text-sm text-gray-500">Revenue</Text>
            <Text className="text-2xl font-bold text-green-600">{formatCurrency(dailySummary?.total_revenue ?? 0)}</Text>
          </View>
          <View className="min-w-[100px] flex-1">
            <Text className="text-sm text-gray-500">Collected</Text>
            <Text className="text-2xl font-bold text-brand-600">{formatCurrency(dailySummary?.total_collected ?? 0)}</Text>
          </View>
          <View className="min-w-[100px] flex-1">
            <Text className="text-sm text-gray-500">Uncollected</Text>
            <Text className="text-2xl font-bold text-red-500">{formatCurrency(dailySummary?.total_uncollected ?? 0)}</Text>
          </View>
        </View>
      </Card>

      {/* Period Toggle */}
      <View className="mb-4 flex-row gap-2">
        {(['daily', 'weekly', 'monthly'] as const).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            className={`rounded-full px-4 py-2 ${activeTab === tab ? 'bg-brand-500' : 'bg-gray-200'}`}
          >
            <Text className={`text-sm font-medium ${activeTab === tab ? 'text-white' : 'text-gray-700'}`}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Sales Chart Data */}
      <Card className="mb-4">
        <CardTitle>{activeTab === 'monthly' ? 'Last 30 Days' : 'Last 7 Days'} Revenue</CardTitle>
        {salesRange?.map((day) => (
          <View key={day.date} className="mt-2 flex-row items-center justify-between">
            <Text className="text-sm text-gray-600">{formatDate(day.date)}</Text>
            <View className="flex-row items-center gap-3">
              <Text className="text-xs text-gray-400">{day.total_orders} orders</Text>
              <Text className="text-sm font-bold text-gray-900">{formatCurrency(day.total_revenue)}</Text>
            </View>
          </View>
        ))}
        {!salesRange?.length && <Text className="mt-2 text-sm text-gray-400">No sales data for this period.</Text>}
      </Card>

      {/* Payment Breakdown */}
      <Card className="mb-4">
        <CardTitle>Payment Methods (7 days)</CardTitle>
        {paymentBreakdown?.map((item) => (
          <View key={item.method} className="mt-2 flex-row items-center justify-between">
            <Text className="text-sm text-gray-700">
              {PAYMENT_METHOD_LABELS[item.method as keyof typeof PAYMENT_METHOD_LABELS] ?? item.method}
            </Text>
            <Text className="text-sm font-bold text-gray-900">{formatCurrency(item.amount)}</Text>
          </View>
        ))}
      </Card>

      {/* Top Products */}
      <Card className="mb-4">
        <CardTitle>Top Products (7 days)</CardTitle>
        {topProducts?.slice(0, 5).map((product, i) => (
          <View key={product.name} className="mt-2 flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Text className="text-sm font-bold text-gray-400">#{i + 1}</Text>
              <Text className="text-sm text-gray-700">{product.name}</Text>
            </View>
            <View className="items-end">
              <Text className="text-sm font-bold text-gray-900">{formatCurrency(product.total_revenue)}</Text>
              <Text className="text-xs text-gray-500">{product.total_qty} units</Text>
            </View>
          </View>
        ))}
      </Card>

      {/* Unpaid Orders */}
      <Card className="mb-8">
        <CardTitle>Outstanding Receivables</CardTitle>
        {unpaidOrders?.slice(0, 10).map((order) => (
          <View key={order.id} className="mt-2 flex-row items-center justify-between border-b border-gray-50 pb-2">
            <View>
              <Text className="text-sm font-medium text-gray-900">{order.order_number}</Text>
              <Text className="text-xs text-gray-500">{order.customer?.name}</Text>
            </View>
            <View className="items-end">
              <Text className="text-sm font-bold text-red-600">
                {formatCurrency(order.total_amount - order.amount_paid)}
              </Text>
              <Badge
                label={PAYMENT_STATUS_LABELS[order.payment_status]}
                colorClass={PAYMENT_STATUS_COLORS[order.payment_status]}
              />
            </View>
          </View>
        ))}
        {!unpaidOrders?.length && <Text className="mt-2 text-sm text-gray-400">All orders are paid!</Text>}
      </Card>
    </ScrollView>
  );
}
