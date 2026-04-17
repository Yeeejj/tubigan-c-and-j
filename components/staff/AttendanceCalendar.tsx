import React from 'react';
import { View, Text, Pressable } from 'react-native';
import type { AttendanceLog } from '@/types/database';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface AttendanceCalendarProps {
  year: number;
  month: number;
  logs: AttendanceLog[];
  onDayPress?: (date: string) => void;
  isAdmin: boolean;
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatTime12h(isoStr: string): string {
  const d = new Date(isoStr);
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

export function AttendanceCalendar({ year, month, logs, onDayPress, isAdmin }: AttendanceCalendarProps) {
  const today = toDateKey(new Date());
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPadding = firstDay.getDay();
  const totalDays = lastDay.getDate();

  // Build log map by date
  const logMap: Record<string, AttendanceLog> = {};
  for (const log of logs) {
    logMap[log.date] = log;
  }

  // Build weeks
  const weeks: (number | null)[][] = [];
  let currentWeek: (number | null)[] = Array(startPadding).fill(null);

  for (let d = 1; d <= totalDays; d++) {
    currentWeek.push(d);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }

  // Count stats
  let onDutyCount = 0;
  let absentCount = 0;
  let notLoggedCount = 0;
  for (let d = 1; d <= totalDays; d++) {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const log = logMap[key];
    if (log?.status === 'on_duty') onDutyCount++;
    else if (log?.status === 'absent') absentCount++;
    else {
      // Only count as "not logged" if the date is today or in the past
      const dateObj = new Date(year, month, d);
      if (dateObj <= new Date()) notLoggedCount++;
    }
  }

  return (
    <View>
      {/* Day headers */}
      <View className="mb-1 flex-row">
        {DAY_LABELS.map((day) => (
          <View key={day} className="flex-1 items-center py-1">
            <Text className="text-xs font-semibold text-gray-500">{day}</Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      {weeks.map((week, wi) => (
        <View key={wi} className="flex-row">
          {week.map((day, di) => {
            if (day === null) {
              return <View key={`empty-${di}`} className="flex-1 p-0.5"><View className="h-16" /></View>;
            }

            const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const log = logMap[dateKey];
            const isToday = dateKey === today;
            const isFuture = new Date(dateKey) > new Date();

            let bgClass = 'bg-gray-100';
            let statusIcon = '';
            if (log?.status === 'on_duty') {
              bgClass = 'bg-green-100';
              statusIcon = '✓';
            } else if (log?.status === 'absent') {
              bgClass = 'bg-red-100';
              statusIcon = '✕';
            }

            const canPress = isAdmin && !isFuture;

            const cell = (
              <View
                className={`h-16 items-center justify-center rounded-lg ${bgClass} ${
                  isToday ? 'border-2 border-brand-500' : ''
                }`}
              >
                <Text className={`text-xs font-medium ${isToday ? 'text-brand-600' : 'text-gray-600'}`}>
                  {day}
                </Text>
                {statusIcon ? (
                  <Text className={`text-sm font-bold ${log?.status === 'on_duty' ? 'text-green-600' : 'text-red-500'}`}>
                    {statusIcon}
                  </Text>
                ) : null}
                {log?.marked_at && (
                  <Text className="text-[9px] text-gray-400">{formatTime12h(log.marked_at)}</Text>
                )}
                {log?.is_admin_override && (
                  <View className="absolute right-0.5 top-0.5 h-2.5 w-2.5 rounded-full bg-yellow-400" />
                )}
              </View>
            );

            return (
              <View key={dateKey} className="flex-1 p-0.5">
                {canPress ? (
                  <Pressable onPress={() => onDayPress?.(dateKey)}>
                    {cell}
                  </Pressable>
                ) : (
                  cell
                )}
              </View>
            );
          })}
        </View>
      ))}

      {/* Summary */}
      <View className="mt-3 flex-row justify-around rounded-lg bg-white p-3">
        <View className="items-center">
          <View className="mb-1 h-3 w-3 rounded-full bg-green-400" />
          <Text className="text-lg font-bold text-green-600">{onDutyCount}</Text>
          <Text className="text-xs text-gray-500">On Duty</Text>
        </View>
        <View className="items-center">
          <View className="mb-1 h-3 w-3 rounded-full bg-red-400" />
          <Text className="text-lg font-bold text-red-500">{absentCount}</Text>
          <Text className="text-xs text-gray-500">Absent</Text>
        </View>
        <View className="items-center">
          <View className="mb-1 h-3 w-3 rounded-full bg-gray-300" />
          <Text className="text-lg font-bold text-gray-500">{notLoggedCount}</Text>
          <Text className="text-xs text-gray-500">Not Logged</Text>
        </View>
      </View>
    </View>
  );
}
