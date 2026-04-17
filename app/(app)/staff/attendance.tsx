import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Alert, Platform } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import {
  useTodayAttendance,
  useMarkSelfOnDuty,
  useAttendanceForMonth,
  useAdvancePayHistory,
} from '@/hooks/useStaff';
import { Card, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDateTime } from '@/utils/formatDate';

function formatTime12h(isoStr: string): string {
  const d = new Date(isoStr);
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m}:${s} ${ampm}`;
}

export default function SelfAttendanceScreen() {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const { data: todayLog, isLoading } = useTodayAttendance(userId);
  const markOnDuty = useMarkSelfOnDuty();

  // Live clock
  const [clock, setClock] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Last 7 days attendance
  const now = new Date();
  const { data: monthLogs } = useAttendanceForMonth(userId, now.getFullYear(), now.getMonth());

  // Advance pay history (read-only for staff)
  const { data: advanceHistory } = useAdvancePayHistory(userId);

  const last7Days = useMemo(() => {
    const days: { date: string; status: string | null }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const log = monthLogs?.find((l) => l.date === key);
      days.push({ date: key, status: log?.status ?? null });
    }
    return days;
  }, [monthLogs]);

  const handleMarkOnDuty = async () => {
    try {
      await markOnDuty.mutateAsync(userId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to mark attendance';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Error', msg);
    }
  };

  if (isLoading) return <LoadingSpinner />;

  const today = now.toLocaleDateString('en-PH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const clockH = clock.getHours() % 12 || 12;
  const clockStr = `${clockH}:${String(clock.getMinutes()).padStart(2, '0')}:${String(clock.getSeconds()).padStart(2, '0')} ${clock.getHours() >= 12 ? 'PM' : 'AM'}`;

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerStyle={{ padding: 16 }}>
      {/* Date and Clock */}
      <Card className="mb-4 items-center">
        <Text className="text-base text-gray-500">{today}</Text>
        <Text className="mt-1 text-4xl font-bold text-brand-600">{clockStr}</Text>
      </Card>

      {/* Attendance Status */}
      <Card className="mb-4 items-center">
        {!todayLog ? (
          <>
            <Text className="mb-4 text-base text-gray-600">You have not logged attendance today.</Text>
            <Button
              title="Mark On Duty"
              onPress={handleMarkOnDuty}
              loading={markOnDuty.isPending}
              size="lg"
            />
          </>
        ) : todayLog.status === 'on_duty' ? (
          <>
            <View className="mb-2 h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <Text className="text-3xl">✓</Text>
            </View>
            <Text className="text-lg font-bold text-green-600">You are marked On Duty</Text>
            <Text className="mt-1 text-sm text-gray-500">
              Logged at {formatTime12h(todayLog.marked_at)}
            </Text>
            {todayLog.is_admin_override && (
              <Text className="mt-1 text-xs text-yellow-600">Updated by admin</Text>
            )}
          </>
        ) : (
          <>
            <View className="mb-2 h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <Text className="text-3xl">✕</Text>
            </View>
            <Text className="text-lg font-bold text-red-500">You are marked Absent today</Text>
            <Text className="mt-1 text-sm text-gray-500">
              Set at {formatTime12h(todayLog.marked_at)}
            </Text>
            {todayLog.note && (
              <Text className="mt-1 text-sm text-gray-600">Reason: {todayLog.note}</Text>
            )}
          </>
        )}
      </Card>

      {/* Last 7 Days */}
      <Card className="mb-4">
        <CardTitle>Last 7 Days</CardTitle>
        <View className="mt-3 flex-row justify-around">
          {last7Days.map((day) => {
            const dayLabel = new Date(day.date + 'T12:00:00').toLocaleDateString('en-PH', { weekday: 'short' });
            let dotClass = 'bg-gray-300';
            if (day.status === 'on_duty') dotClass = 'bg-green-400';
            else if (day.status === 'absent') dotClass = 'bg-red-400';
            const dayNum = day.date.split('-')[2];

            return (
              <View key={day.date} className="items-center">
                <Text className="text-xs text-gray-500">{dayLabel}</Text>
                <View className={`my-1 h-4 w-4 rounded-full ${dotClass}`} />
                <Text className="text-xs text-gray-400">{parseInt(dayNum)}</Text>
              </View>
            );
          })}
        </View>
      </Card>

      {/* Advance Pay History (read-only) */}
      <Card className="mb-4">
        <CardTitle>Advance Pay</CardTitle>
        <Text className="mt-1 text-2xl font-bold text-brand-600">
          {formatCurrency(user?.advance_pay_balance ?? 0)}
        </Text>
        {advanceHistory?.length === 0 && (
          <Text className="mt-2 text-sm text-gray-400">No advance pay transactions.</Text>
        )}
        {advanceHistory?.slice(0, 10).map((tx) => (
          <View key={tx.id} className="mt-2 border-b border-gray-50 pb-2">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-bold text-green-600">+{formatCurrency(tx.amount)}</Text>
              <Text className="text-xs text-gray-400">{formatDateTime(tx.created_at)}</Text>
            </View>
            {tx.note && <Text className="text-xs text-gray-500">{tx.note}</Text>}
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}
