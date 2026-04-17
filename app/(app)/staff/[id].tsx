import React, { useState } from 'react';
import { View, Text, ScrollView, Alert, Platform, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  useStaffById,
  useAttendanceForMonth,
  useAdvancePayHistory,
  useAdminOverrideAttendance,
  useAddAdvancePay,
  useUpdateStaffProfile,
  useDeactivateStaff,
  useDeleteStaff,
} from '@/hooks/useStaff';
import { useAuth } from '@/context/AuthContext';
import { Card, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ErrorDisplay } from '@/components/shared/ErrorDisplay';
import { AttendanceCalendar } from '@/components/staff/AttendanceCalendar';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDateTime } from '@/utils/formatDate';
import { canManageStaff } from '@/utils/permissions';
import { ROLE_LABELS } from '@/constants/roles';
import {
  adminOverrideSchema,
  addAdvancePaySchema,
  updateStaffProfileSchema,
  type AdminOverrideData,
  type AddAdvancePayData,
  type UpdateStaffProfileData,
} from '@/schemas/staff.schema';

type TabName = 'attendance' | 'advance_pay' | 'profile';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function StaffDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = canManageStaff(user?.role ?? 'delivery_staff');

  // Data
  const { data: member, isLoading, error, refetch } = useStaffById(id);

  // Tab state
  const [activeTab, setActiveTab] = useState<TabName>('attendance');

  // Attendance state
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const { data: attendanceLogs } = useAttendanceForMonth(id, calYear, calMonth);

  // Advance pay
  const { data: advanceHistory } = useAdvancePayHistory(id);

  // Mutations
  const overrideAttendance = useAdminOverrideAttendance();
  const addAdvance = useAddAdvancePay();
  const updateProfile = useUpdateStaffProfile();
  const deactivate = useDeactivateStaff();
  const deleteStaff = useDeleteStaff();

  // Override modal
  const [overrideModal, setOverrideModal] = useState(false);
  const [overrideDate, setOverrideDate] = useState('');
  const [overrideStatus, setOverrideStatus] = useState<'on_duty' | 'absent'>('on_duty');
  const [overrideNote, setOverrideNote] = useState('');

  // Advance pay modal
  const [advanceModal, setAdvanceModal] = useState(false);
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [advanceNote, setAdvanceNote] = useState('');

  // Profile form
  const profileForm = useForm<UpdateStaffProfileData>({
    resolver: zodResolver(updateStaffProfileSchema),
    values: member
      ? {
          full_name: member.full_name,
          phone: member.phone,
          role: member.role as 'in_shop_staff' | 'delivery_staff',
          is_active: member.is_active,
        }
      : undefined,
  });

  if (isLoading) return <LoadingSpinner />;
  if (error || !member) return <ErrorDisplay message="Staff member not found" onRetry={refetch} />;

  const handleDayPress = (date: string) => {
    setOverrideDate(date);
    setOverrideStatus('on_duty');
    setOverrideNote('');
    setOverrideModal(true);
  };

  const handleOverrideSubmit = async () => {
    try {
      await overrideAttendance.mutateAsync({
        targetUserId: id,
        date: overrideDate,
        status: overrideStatus,
        note: overrideNote || undefined,
      });
      setOverrideModal(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to override attendance';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Error', msg);
    }
  };

  const handleAddAdvance = async () => {
    const amount = parseFloat(advanceAmount);
    if (!amount || amount <= 0) return;
    try {
      await addAdvance.mutateAsync({
        userId: id,
        amount,
        note: advanceNote || undefined,
      });
      setAdvanceModal(false);
      setAdvanceAmount('');
      setAdvanceNote('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add advance pay';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Error', msg);
    }
  };

  const handleProfileSave = async (data: UpdateStaffProfileData) => {
    try {
      await updateProfile.mutateAsync({ id, updates: data });
      if (Platform.OS === 'web') window.alert('Profile updated');
      else Alert.alert('Success', 'Profile updated');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Error', msg);
    }
  };

  const handleDeactivate = async () => {
    const doDeactivate = async () => {
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

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to deactivate this staff member?')) {
        await doDeactivate();
      }
    } else {
      Alert.alert('Confirm', 'Are you sure you want to deactivate this staff member?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Deactivate', style: 'destructive', onPress: doDeactivate },
      ]);
    }
  };

  const handleDeleteStaff = () => {
    const doDelete = async () => {
      try {
        await deleteStaff.mutateAsync(id);
        router.back();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to delete';
        if (Platform.OS === 'web') window.alert(msg);
        else Alert.alert('Error', msg);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Delete ${member?.full_name}? This cannot be undone.`)) doDelete();
    } else {
      Alert.alert('Delete Staff', `Delete ${member?.full_name}? This cannot be undone.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  const goToPrevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear(calYear - 1);
    } else {
      setCalMonth(calMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear(calYear + 1);
    } else {
      setCalMonth(calMonth + 1);
    }
  };

  const tabs: { key: TabName; label: string }[] = [
    { key: 'attendance', label: 'Attendance' },
    { key: 'advance_pay', label: 'Advance Pay' },
    { key: 'profile', label: 'Profile' },
  ];

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerStyle={{ padding: 16 }}>
      {/* Header */}
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

      {/* Tab Switcher */}
      <View className="mb-4 flex-row rounded-lg bg-gray-200 p-1">
        {tabs.map((tab) => (
          <Pressable
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            className={`flex-1 items-center rounded-md py-2 ${
              activeTab === tab.key ? 'bg-white shadow-sm' : ''
            }`}
          >
            <Text
              className={`text-sm font-medium ${
                activeTab === tab.key ? 'text-brand-600' : 'text-gray-500'
              }`}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* ===== ATTENDANCE TAB ===== */}
      {activeTab === 'attendance' && (
        <Card className="mb-4">
          {/* Month selector */}
          <View className="mb-3 flex-row items-center justify-between">
            <Pressable onPress={goToPrevMonth} className="rounded-lg bg-gray-100 px-3 py-1.5">
              <Text className="text-lg text-gray-600">‹</Text>
            </Pressable>
            <Text className="text-base font-bold text-gray-900">
              {MONTH_NAMES[calMonth]} {calYear}
            </Text>
            <Pressable onPress={goToNextMonth} className="rounded-lg bg-gray-100 px-3 py-1.5">
              <Text className="text-lg text-gray-600">›</Text>
            </Pressable>
          </View>

          <AttendanceCalendar
            year={calYear}
            month={calMonth}
            logs={attendanceLogs ?? []}
            onDayPress={handleDayPress}
            isAdmin={isAdmin}
          />
        </Card>
      )}

      {/* ===== ADVANCE PAY TAB ===== */}
      {activeTab === 'advance_pay' && (
        <>
          {/* Balance */}
          <Card className="mb-4">
            <Text className="text-sm text-gray-500">Current Balance</Text>
            <Text className="mt-1 text-3xl font-bold text-brand-600">
              {formatCurrency(member.advance_pay_balance ?? 0)}
            </Text>
            {isAdmin && (
              <Button
                title="Add Advance Pay"
                onPress={() => {
                  setAdvanceAmount('');
                  setAdvanceNote('');
                  setAdvanceModal(true);
                }}
                className="mt-3"
                size="sm"
              />
            )}
          </Card>

          {/* Transaction Ledger */}
          <Card className="mb-4">
            <CardTitle>Transaction History</CardTitle>
            {advanceHistory?.length === 0 && (
              <Text className="mt-2 text-sm text-gray-400">No transactions yet.</Text>
            )}
            {advanceHistory?.map((tx) => (
              <View key={tx.id} className="mt-3 border-b border-gray-50 pb-3">
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm font-bold text-green-600">
                    +{formatCurrency(tx.amount)}
                  </Text>
                  <Text className="text-xs text-gray-400">
                    Balance: {formatCurrency(tx.running_balance)}
                  </Text>
                </View>
                {tx.note && (
                  <Text className="mt-0.5 text-sm text-gray-600">{tx.note}</Text>
                )}
                <Text className="mt-0.5 text-xs text-gray-400">
                  {formatDateTime(tx.created_at)}
                  {tx.recorded_by_user ? ` · by ${tx.recorded_by_user.full_name}` : ''}
                </Text>
              </View>
            ))}
          </Card>
        </>
      )}

      {/* ===== PROFILE TAB ===== */}
      {activeTab === 'profile' && (
        <Card className="mb-4">
          {isAdmin ? (
            <>
              <Controller
                control={profileForm.control}
                name="full_name"
                render={({ field: { onChange, value }, fieldState: { error: err } }) => (
                  <Input
                    label="Full Name"
                    value={value}
                    onChangeText={onChange}
                    error={err?.message}
                  />
                )}
              />
              <Controller
                control={profileForm.control}
                name="phone"
                render={({ field: { onChange, value }, fieldState: { error: err } }) => (
                  <Input
                    label="Phone"
                    value={value}
                    onChangeText={onChange}
                    keyboardType="phone-pad"
                    error={err?.message}
                  />
                )}
              />
              <Controller
                control={profileForm.control}
                name="role"
                render={({ field: { onChange, value }, fieldState: { error: err } }) => (
                  <Select
                    label="Role"
                    options={[
                      { label: 'In-Shop Staff', value: 'in_shop_staff' },
                      { label: 'Delivery Staff', value: 'delivery_staff' },
                    ]}
                    value={value}
                    onChange={onChange}
                    error={err?.message}
                  />
                )}
              />
              <Controller
                control={profileForm.control}
                name="is_active"
                render={({ field: { onChange, value } }) => (
                  <View className="mb-4 flex-row items-center justify-between">
                    <Text className="text-sm font-medium text-gray-700">Active</Text>
                    <Pressable
                      onPress={() => onChange(!value)}
                      className={`h-6 w-11 items-center justify-center rounded-full ${
                        value ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    >
                      <View
                        className={`h-5 w-5 rounded-full bg-white shadow-sm ${
                          value ? 'ml-5' : 'mr-5'
                        }`}
                      />
                    </Pressable>
                  </View>
                )}
              />

              <Button
                title="Save Profile"
                onPress={profileForm.handleSubmit(handleProfileSave)}
                loading={updateProfile.isPending}
              />

              {member.id !== user?.id && (
                <>
                  {member.is_active && (
                    <Button
                      title="Deactivate Account"
                      onPress={handleDeactivate}
                      variant="secondary"
                      loading={deactivate.isPending}
                      className="mt-3"
                    />
                  )}
                  <Button
                    title="Delete Staff"
                    onPress={handleDeleteStaff}
                    variant="danger"
                    loading={deleteStaff.isPending}
                    className="mt-2"
                  />
                </>
              )}
            </>
          ) : (
            <>
              <View className="mb-3">
                <Text className="text-sm text-gray-500">Full Name</Text>
                <Text className="text-base font-medium text-gray-900">{member.full_name}</Text>
              </View>
              <View className="mb-3">
                <Text className="text-sm text-gray-500">Phone</Text>
                <Text className="text-base font-medium text-gray-900">{member.phone}</Text>
              </View>
              <View className="mb-3">
                <Text className="text-sm text-gray-500">Role</Text>
                <Text className="text-base font-medium text-gray-900">{ROLE_LABELS[member.role]}</Text>
              </View>
            </>
          )}
        </Card>
      )}

      {/* Override Attendance Modal */}
      <Modal
        visible={overrideModal}
        onClose={() => setOverrideModal(false)}
        title={`Override: ${overrideDate}`}
      >
        <Select
          label="Status"
          options={[
            { label: 'On Duty', value: 'on_duty' },
            { label: 'Absent', value: 'absent' },
          ]}
          value={overrideStatus}
          onChange={(v) => setOverrideStatus(v as 'on_duty' | 'absent')}
        />
        <Input
          label="Note (optional)"
          value={overrideNote}
          onChangeText={setOverrideNote}
          placeholder="Reason for correction..."
          multiline
        />
        <Button
          title="Confirm Override"
          onPress={handleOverrideSubmit}
          loading={overrideAttendance.isPending}
        />
      </Modal>

      {/* Add Advance Pay Modal */}
      <Modal
        visible={advanceModal}
        onClose={() => setAdvanceModal(false)}
        title="Add Advance Pay"
      >
        <Input
          label="Amount (₱)"
          value={advanceAmount}
          onChangeText={setAdvanceAmount}
          keyboardType="numeric"
          placeholder="0.00"
        />
        <Input
          label="Note (optional)"
          value={advanceNote}
          onChangeText={setAdvanceNote}
          placeholder="e.g. salary advance for April"
          multiline
        />
        <Button
          title="Add Advance"
          onPress={handleAddAdvance}
          loading={addAdvance.isPending}
        />
      </Modal>
    </ScrollView>
  );
}
