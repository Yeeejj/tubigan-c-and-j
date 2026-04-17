import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, Pressable, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useStaffList, useAllTodayAttendance, useCreateStaff, useDeleteStaff } from '@/hooks/useStaff';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { formatCurrency } from '@/utils/formatCurrency';
import { ROLE_LABELS } from '@/constants/roles';
import { createStaffSchema, type CreateStaffData } from '@/schemas/staff.schema';

type FilterType = 'all' | 'on_duty' | 'absent' | 'not_logged';

export default function StaffScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: staff, isLoading } = useStaffList();
  const { data: todayAttendance } = useAllTodayAttendance();
  const createStaff = useCreateStaff();
  const deleteStaff = useDeleteStaff();
  const [filter, setFilter] = useState<FilterType>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  const form = useForm<CreateStaffData>({
    resolver: zodResolver(createStaffSchema),
    defaultValues: {
      username: '',
      password: '',
      full_name: '',
      phone: '',
      role: 'in_shop_staff',
    },
  });

  const attendanceMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (todayAttendance) {
      for (const log of todayAttendance) {
        map[log.user_id] = log.status;
      }
    }
    return map;
  }, [todayAttendance]);

  const filteredStaff = useMemo(() => {
    if (!staff) return [];
    if (filter === 'all') return staff;
    return staff.filter((s) => {
      const status = attendanceMap[s.id];
      if (filter === 'on_duty') return status === 'on_duty';
      if (filter === 'absent') return status === 'absent';
      if (filter === 'not_logged') return !status;
      return true;
    });
  }, [staff, filter, attendanceMap]);

  const handleAddStaff = async (data: CreateStaffData) => {
    try {
      await createStaff.mutateAsync(data);
      setShowAddModal(false);
      form.reset();
      if (Platform.OS === 'web') window.alert('Staff account created successfully');
      else Alert.alert('Success', 'Staff account created successfully');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create staff';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Error', msg);
    }
  };

  const handleDelete = (memberId: string, memberName: string) => {
    const doDelete = async () => {
      try {
        await deleteStaff.mutateAsync(memberId);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to delete';
        if (Platform.OS === 'web') window.alert(msg);
        else Alert.alert('Error', msg);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Delete ${memberName}? This cannot be undone.`)) doDelete();
    } else {
      Alert.alert('Delete Staff', `Delete ${memberName}? This cannot be undone.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  if (isLoading) return <LoadingSpinner />;

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'on_duty', label: 'On Duty' },
    { key: 'absent', label: 'Absent' },
    { key: 'not_logged', label: 'Not Logged' },
  ];

  return (
    <View className="flex-1 bg-gray-50">
      {/* Filter row + Add button */}
      <View className="flex-row items-center justify-between px-4 pt-4">
        <View className="flex-row gap-2">
          {filters.map((f) => (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              className={`rounded-full px-3 py-1.5 ${
                filter === f.key ? 'bg-brand-500' : 'bg-gray-200'
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  filter === f.key ? 'text-white' : 'text-gray-700'
                }`}
              >
                {f.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Button
          title="+ Add"
          onPress={() => setShowAddModal(true)}
          size="sm"
        />
      </View>

      <FlatList
        data={filteredStaff}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        ItemSeparatorComponent={() => <View className="h-3" />}
        ListEmptyComponent={
          <Text className="mt-8 text-center text-sm text-gray-400">No staff found.</Text>
        }
        renderItem={({ item: member }) => {
          const todayStatus = attendanceMap[member.id];
          let attendanceBadge = { label: 'Not Logged', color: 'bg-gray-100 text-gray-600' };
          if (todayStatus === 'on_duty') {
            attendanceBadge = { label: 'On Duty', color: 'bg-green-100 text-green-800' };
          } else if (todayStatus === 'absent') {
            attendanceBadge = { label: 'Absent', color: 'bg-red-100 text-red-800' };
          }

          const canDelete = member.id !== user?.id;

          return (
            <Card onPress={() => router.push(`/(app)/staff/${member.id}`)}>
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-base font-bold text-gray-900">{member.full_name}</Text>
                  <Text className="text-sm text-gray-500">{member.phone}</Text>
                  <Text className="mt-1 text-xs text-gray-400">
                    Advance: {formatCurrency(member.advance_pay_balance ?? 0)}
                  </Text>
                </View>
                <View className="items-end gap-1">
                  <Badge label={ROLE_LABELS[member.role]} colorClass="bg-brand-100 text-brand-800" />
                  <Badge label={attendanceBadge.label} colorClass={attendanceBadge.color} />
                  {!member.is_active && (
                    <Badge label="Inactive" colorClass="bg-gray-100 text-gray-800" />
                  )}
                  {canDelete && (
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation?.();
                        handleDelete(member.id, member.full_name);
                      }}
                      className="mt-1 rounded-md bg-red-50 px-2 py-1"
                    >
                      <Text className="text-xs font-medium text-red-600">Delete</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            </Card>
          );
        }}
      />

      {/* Add Staff Modal */}
      <Modal
        visible={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          form.reset();
        }}
        title="Add New Staff"
      >
        <Controller
          control={form.control}
          name="full_name"
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <Input label="Full Name" value={value} onChangeText={onChange} error={error?.message} placeholder="Juan Dela Cruz" />
          )}
        />
        <Controller
          control={form.control}
          name="username"
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <Input label="Username" value={value} onChangeText={onChange} error={error?.message} placeholder="juandc" autoCapitalize="none" />
          )}
        />
        <Controller
          control={form.control}
          name="password"
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <Input label="Password" value={value} onChangeText={onChange} error={error?.message} placeholder="Min 6 characters" secureTextEntry />
          )}
        />
        <Controller
          control={form.control}
          name="phone"
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <Input label="Phone" value={value} onChangeText={onChange} error={error?.message} placeholder="09171234567" keyboardType="phone-pad" />
          )}
        />
        <Controller
          control={form.control}
          name="role"
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <Select
              label="Role"
              options={[
                { label: 'In-Shop Staff', value: 'in_shop_staff' },
                { label: 'Delivery Staff', value: 'delivery_staff' },
              ]}
              value={value}
              onChange={onChange}
              error={error?.message}
            />
          )}
        />
        <Button
          title="Create Staff Account"
          onPress={form.handleSubmit(handleAddStaff)}
          loading={createStaff.isPending}
          className="mt-2"
        />
      </Modal>
    </View>
  );
}
