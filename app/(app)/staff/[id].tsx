import React from 'react';
import { View, Text, ScrollView, Alert, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useStaffById, useStaffActivityLogs, useDeliveryMetrics, useDeactivateStaff } from '@/hooks/useStaff';
import { useAuth } from '@/context/AuthContext';
import { Card, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ErrorDisplay } from '@/components/shared/ErrorDisplay';
import { formatDateTime, toISODate } from '@/utils/formatDate';
import { canManageStaff } from '@/utils/permissions';
import { ROLE_LABELS } from '@/constants/roles';

export default function StaffDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { data: member, isLoading, error, refetch } = useStaffById(id);
  const weekAgo = toISODate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const today = toISODate(new Date());
  const { data: activityLogs } = useStaffActivityLogs(id, weekAgo, today);
  const { data: deliveryMetrics } = useDeliveryMetrics(id, weekAgo, today);
  const deactivate = useDeactivateStaff();

  if (isLoading) return <LoadingSpinner />;
  if (error || !member) return <ErrorDisplay message="Staff member not found" onRetry={refetch} />;

  const handleDeactivate = async () => {
    try {
      await deactivate.mutateAsync(id);
      if (Platform.OS === 'web') window.alert('Staff deactivated');
      else Alert.alert('Success', 'Staff deactivated');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Error', msg);
    }
  };

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerStyle={{ padding: 16 }}>
      {/* Profile */}
      <Card className="mb-4">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-xl font-bold text-gray-900">{member.full_name}</Text>
            <Text className="text-sm text-gray-500">{member.phone}</Text>
          </View>
          <View className="items-end gap-1">
            <Badge label={ROLE_LABELS[member.role]} colorClass="bg-brand-100 text-brand-800" />
            <Badge
              label={member.is_active ? 'Active' : 'Inactive'}
              colorClass={member.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
            />
          </View>
        </View>
      </Card>

      {/* Delivery Metrics (if delivery staff) */}
      {member.role === 'delivery_staff' && deliveryMetrics && (
        <Card className="mb-4">
          <CardTitle>Delivery Metrics (7 days)</CardTitle>
          <View className="mt-3 flex-row flex-wrap gap-3">
            <View className="flex-1">
              <Text className="text-sm text-gray-500">Total</Text>
              <Text className="text-2xl font-bold text-gray-900">{deliveryMetrics.total_deliveries}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-sm text-gray-500">Completed</Text>
              <Text className="text-2xl font-bold text-green-600">{deliveryMetrics.completed}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-sm text-gray-500">Failed</Text>
              <Text className="text-2xl font-bold text-red-500">{deliveryMetrics.failed}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-sm text-gray-500">Success Rate</Text>
              <Text className="text-2xl font-bold text-brand-600">{deliveryMetrics.success_rate}%</Text>
            </View>
          </View>
        </Card>
      )}

      {/* Activity Feed */}
      <Card className="mb-4">
        <CardTitle>Recent Activity</CardTitle>
        {activityLogs?.slice(0, 20).map((log) => (
          <View key={log.id} className="mt-2 border-b border-gray-50 pb-2">
            <Text className="text-sm text-gray-700">{log.action}</Text>
            <Text className="text-xs text-gray-400">{formatDateTime(log.created_at)}</Text>
          </View>
        ))}
        {!activityLogs?.length && <Text className="mt-2 text-sm text-gray-400">No recent activity.</Text>}
      </Card>

      {/* Actions */}
      {canManageStaff(user?.role ?? 'delivery_staff') && member.is_active && member.id !== user?.id && (
        <Card className="mb-8">
          <Button title="Deactivate Account" onPress={handleDeactivate} variant="danger" loading={deactivate.isPending} />
        </Card>
      )}
    </ScrollView>
  );
}
