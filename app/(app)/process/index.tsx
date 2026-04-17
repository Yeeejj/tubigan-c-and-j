import React, { useMemo } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useOrders } from '@/hooks/useOrders';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getWeeksOfMonth(year: number, month: number) {
  const weeks: { start: Date; end: Date; label: string }[] = [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Start from the Sunday of the week containing the 1st
  const start = new Date(firstDay);
  start.setDate(start.getDate() - start.getDay());

  let weekNum = 1;
  while (start <= lastDay) {
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    weeks.push({
      start: new Date(start),
      end: new Date(end),
      label: `Week ${weekNum}`,
    });
    start.setDate(start.getDate() + 7);
    weekNum++;
  }

  return weeks;
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function ProcessScreen() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  // Fetch all orders for the current month
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const monthStart = `${toDateKey(firstDay)}T00:00:00`;
  const monthEnd = `${toDateKey(lastDay)}T23:59:59`;

  const { data: orders, isLoading } = useOrders({
    dateFrom: monthStart,
    dateTo: monthEnd,
  });

  // Build a map: date string -> total gallons
  const gallonsByDate = useMemo(() => {
    const map: Record<string, number> = {};
    if (!orders) return map;
    for (const order of orders) {
      const dateKey = toDateKey(new Date(order.created_at));
      const gallons = order.order_items?.reduce((sum, item) => sum + (item.quantity ?? 0), 0) ?? 0;
      map[dateKey] = (map[dateKey] ?? 0) + gallons;
    }
    return map;
  }, [orders]);

  const weeks = useMemo(() => getWeeksOfMonth(year, month), [year, month]);

  // Today's total
  const todayKey = toDateKey(now);
  const todayGallons = gallonsByDate[todayKey] ?? 0;

  // Month total
  const monthTotal = Object.values(gallonsByDate).reduce((sum, v) => sum + v, 0);

  const monthName = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  if (isLoading) return <LoadingSpinner />;

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerStyle={{ padding: 16 }}>
      <Text className="mb-4 text-xl font-bold text-gray-900">Gallons Delivered</Text>

      {/* Summary Cards */}
      <View className="mb-4 flex-row gap-3">
        <Card className="flex-1">
          <Text className="text-sm text-gray-500">Today</Text>
          <Text className="mt-1 text-2xl font-bold text-brand-600">{todayGallons}</Text>
          <Text className="text-xs text-gray-400">gallons</Text>
        </Card>
        <Card className="flex-1">
          <Text className="text-sm text-gray-500">{monthName}</Text>
          <Text className="mt-1 text-2xl font-bold text-green-600">{monthTotal}</Text>
          <Text className="text-xs text-gray-400">gallons</Text>
        </Card>
      </View>

      {/* Weekly Table */}
      <Card className="mb-4">
        {/* Day Headers */}
        <View className="flex-row border-b border-gray-200 pb-2">
          <View className="w-16" />
          {DAY_LABELS.map((day) => (
            <View key={day} className="flex-1 items-center">
              <Text className="text-xs font-semibold text-gray-500">{day}</Text>
            </View>
          ))}
          <View className="w-16 items-center">
            <Text className="text-xs font-semibold text-gray-500">Total</Text>
          </View>
        </View>

        {/* Week Rows */}
        {weeks.map((week) => {
          let weekTotal = 0;
          const days: { dateKey: string; gallons: number; isToday: boolean; isCurrentMonth: boolean }[] = [];

          for (let i = 0; i < 7; i++) {
            const d = new Date(week.start);
            d.setDate(d.getDate() + i);
            const key = toDateKey(d);
            const gallons = gallonsByDate[key] ?? 0;
            weekTotal += gallons;
            days.push({
              dateKey: key,
              gallons,
              isToday: key === todayKey,
              isCurrentMonth: d.getMonth() === month,
            });
          }

          return (
            <View key={week.label} className="flex-row items-center border-b border-gray-50 py-2">
              <View className="w-16">
                <Text className="text-xs font-medium text-gray-500">{week.label}</Text>
              </View>
              {days.map((day) => (
                <View
                  key={day.dateKey}
                  className={`flex-1 items-center rounded-lg py-1 ${
                    day.isToday ? 'bg-brand-100' : ''
                  }`}
                >
                  <Text
                    className={`text-xs ${day.isCurrentMonth ? 'text-gray-400' : 'text-gray-200'}`}
                  >
                    {parseInt(day.dateKey.split('-')[2])}
                  </Text>
                  <Text
                    className={`text-sm font-bold ${
                      day.isToday
                        ? 'text-brand-600'
                        : day.gallons > 0
                        ? 'text-gray-900'
                        : day.isCurrentMonth
                        ? 'text-gray-300'
                        : 'text-gray-200'
                    }`}
                  >
                    {day.gallons}
                  </Text>
                </View>
              ))}
              <View className="w-16 items-center">
                <Text className="text-sm font-bold text-gray-900">{weekTotal}</Text>
              </View>
            </View>
          );
        })}

        {/* Month Total Row */}
        <View className="mt-2 flex-row items-center justify-between pt-2">
          <Text className="text-sm font-bold text-gray-700">Month Total</Text>
          <Text className="text-lg font-bold text-green-600">{monthTotal} gallons</Text>
        </View>
      </Card>
    </ScrollView>
  );
}
