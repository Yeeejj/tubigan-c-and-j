import React from 'react';
import { View, Text, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useStaffList } from '@/hooks/useStaff';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ROLE_LABELS } from '@/constants/roles';

export default function StaffScreen() {
  const router = useRouter();
  const { data: staff, isLoading } = useStaffList();

  if (isLoading) return <LoadingSpinner />;

  return (
    <View className="flex-1 bg-gray-50">
      <FlatList
        data={staff}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        ItemSeparatorComponent={() => <View className="h-3" />}
        renderItem={({ item: member }) => (
          <Card onPress={() => router.push(`/(app)/staff/${member.id}`)}>
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-base font-bold text-gray-900">{member.full_name}</Text>
                <Text className="text-sm text-gray-500">{member.phone}</Text>
              </View>
              <View className="items-end gap-1">
                <Badge
                  label={ROLE_LABELS[member.role]}
                  colorClass="bg-brand-100 text-brand-800"
                />
                <Badge
                  label={member.is_active ? 'Active' : 'Inactive'}
                  colorClass={member.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                />
              </View>
            </View>
          </Card>
        )}
      />
    </View>
  );
}
