import React from 'react';
import { View, Text, ScrollView, Platform, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useOrders } from '@/hooks/useOrders';
import { useDeliveries } from '@/hooks/useDelivery';
import { useInventoryDashboard } from '@/hooks/useInventory';
import { useDailySummary } from '@/hooks/useSales';
import { Card, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { formatCurrency } from '@/utils/formatCurrency';
import { toISODate } from '@/utils/formatDate';
import { canViewSales, canAccessModule } from '@/utils/permissions';
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/constants/statuses';

export default function DashboardScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const today = toISODate(new Date());

  const { data: orders, isLoading: ordersLoading } = useOrders();
  const { data: deliveries } = useDeliveries();
  const { data: inventory } = useInventoryDashboard();
  const { data: salesSummary } = useDailySummary(today);

  if (ordersLoading) return <LoadingSpinner />;

  const pendingOrders = orders?.filter((o) => o.order_status === 'pending').length ?? 0;
  const activeDeliveries = deliveries?.filter((d) => d.status !== 'delivered' && d.status !== 'failed').length ?? 0;
  const lowStockItems = inventory?.filter((s) => s.status === 'low' || s.status === 'critical').length ?? 0;

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="p-4 md:p-6">
        {/* Welcome */}
        <View className="mb-6 flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-bold text-gray-900">Welcome, {user?.full_name}</Text>
            <Text className="text-sm text-gray-500">{today}</Text>
          </View>
          <Button title="Sign Out" onPress={signOut} variant="ghost" size="sm" />
        </View>

        {/* Quick Stats */}
        <View className="mb-6 flex-row flex-wrap gap-3">
          <Card className="min-w-[140px] flex-1" onPress={() => router.push('/(app)/orders')}>
            <Text className="text-sm text-gray-500">Pending Orders</Text>
            <Text className="mt-1 text-3xl font-bold text-brand-600">{pendingOrders}</Text>
          </Card>

          <Card className="min-w-[140px] flex-1" onPress={() => router.push('/(app)/delivery')}>
            <Text className="text-sm text-gray-500">Active Deliveries</Text>
            <Text className="mt-1 text-3xl font-bold text-purple-600">{activeDeliveries}</Text>
          </Card>

          {canAccessModule(user?.role ?? 'delivery_staff', 'inventory') && (
            <Card className="min-w-[140px] flex-1" onPress={() => router.push('/(app)/inventory')}>
              <Text className="text-sm text-gray-500">Low Stock Items</Text>
              <Text className={`mt-1 text-3xl font-bold ${lowStockItems > 0 ? 'text-red-500' : 'text-green-500'}`}>
                {lowStockItems}
              </Text>
            </Card>
          )}

          {canViewSales(user?.role ?? 'delivery_staff') && salesSummary && (
            <Card className="min-w-[140px] flex-1" onPress={() => router.push('/(app)/sales')}>
              <Text className="text-sm text-gray-500">Today's Revenue</Text>
              <Text className="mt-1 text-3xl font-bold text-green-600">
                {formatCurrency(salesSummary.total_revenue)}
              </Text>
            </Card>
          )}
        </View>

        {/* Recent Orders */}
        <Card className="mb-4">
          <View className="mb-3 flex-row items-center justify-between">
            <CardTitle>Recent Orders</CardTitle>
            <Pressable onPress={() => router.push('/(app)/orders')}>
              <Text className="text-sm font-medium text-brand-600">View All</Text>
            </Pressable>
          </View>
          {orders?.slice(0, 5).map((order) => (
            <Pressable
              key={order.id}
              onPress={() => router.push(`/(app)/orders/${order.id}`)}
              className="border-b border-gray-50 py-3"
            >
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="font-medium text-gray-900">{order.order_number}</Text>
                  <Text className="text-sm text-gray-500">{order.customer?.name ?? 'Unknown'}</Text>
                </View>
                <View className="items-end">
                  <Badge
                    label={ORDER_STATUS_LABELS[order.order_status]}
                    colorClass={ORDER_STATUS_COLORS[order.order_status]}
                  />
                  <Text className="mt-1 text-sm font-medium text-gray-700">
                    {formatCurrency(order.total_amount)}
                  </Text>
                </View>
              </View>
            </Pressable>
          ))}
        </Card>

        {/* Low Stock Alert */}
        {lowStockItems > 0 && (
          <Card className="mb-4 border-red-200 bg-red-50">
            <CardTitle className="text-red-700">Low Stock Alert</CardTitle>
            {inventory
              ?.filter((s) => s.status !== 'ok')
              .slice(0, 5)
              .map((stock) => (
                <View key={stock.id} className="mt-2 flex-row items-center justify-between">
                  <Text className="text-sm text-gray-700">{stock.item?.name}</Text>
                  <Badge
                    label={`${stock.current_quantity} ${stock.item?.unit}`}
                    colorClass={stock.status === 'critical' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}
                  />
                </View>
              ))}
          </Card>
        )}
      </View>
    </ScrollView>
  );
}
