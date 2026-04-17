import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as staffService from '@/services/staff';
import { useAuth } from '@/context/AuthContext';
import type { UserProfile } from '@/types/database';

export function useStaffList() {
  return useQuery({
    queryKey: ['staff'],
    queryFn: () => staffService.getStaffList(),
  });
}

export function useStaffById(id: string) {
  return useQuery({
    queryKey: ['staff', id],
    queryFn: () => staffService.getStaffById(id),
    enabled: !!id,
  });
}

export function useDeliveryStaff() {
  return useQuery({
    queryKey: ['delivery-staff'],
    queryFn: () => staffService.getDeliveryStaff(),
  });
}

export function useUpdateStaffProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: { full_name: string; phone: string; role: 'in_shop_staff' | 'delivery_staff'; is_active: boolean } }) =>
      staffService.updateStaffProfile(id, updates, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    },
  });
}

export function useCreateStaff() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (data: {
      username: string;
      password: string;
      full_name: string;
      phone: string;
      role: 'in_shop_staff' | 'delivery_staff';
    }) => staffService.createStaff(data.username, data.password, data.full_name, data.phone, data.role, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    },
  });
}

export function useDeactivateStaff() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (staffId: string) => staffService.deactivateStaff(staffId, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    },
  });
}

export function useDeleteStaff() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (staffId: string) => staffService.deleteStaff(staffId, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    },
  });
}

export function useStaffActivityLogs(staffId?: string, dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ['staff-activity', staffId, dateFrom, dateTo],
    queryFn: () => staffService.getStaffActivityLogs(staffId, dateFrom, dateTo),
  });
}

export function useDeliveryMetrics(staffId: string, dateFrom: string, dateTo: string) {
  return useQuery({
    queryKey: ['delivery-metrics', staffId, dateFrom, dateTo],
    queryFn: () => staffService.getDeliveryMetrics(staffId, dateFrom, dateTo),
    enabled: !!staffId && !!dateFrom && !!dateTo,
  });
}

// ========== ATTENDANCE HOOKS ==========

export function useAttendanceForMonth(userId: string, year: number, month: number) {
  return useQuery({
    queryKey: ['attendance', userId, year, month],
    queryFn: () => staffService.getAttendanceForMonth(userId, year, month),
    enabled: !!userId,
  });
}

export function useTodayAttendance(userId: string) {
  return useQuery({
    queryKey: ['attendance-today', userId],
    queryFn: () => staffService.getTodayAttendance(userId),
    enabled: !!userId,
    refetchInterval: 30000,
  });
}

export function useAllTodayAttendance() {
  return useQuery({
    queryKey: ['attendance-today-all'],
    queryFn: () => staffService.getAllTodayAttendance(),
    refetchInterval: 30000,
  });
}

export function useMarkSelfOnDuty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => staffService.markSelfOnDuty(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-today-all'] });
    },
  });
}

export function useAdminOverrideAttendance() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ targetUserId, date, status, note }: {
      targetUserId: string;
      date: string;
      status: 'on_duty' | 'absent';
      note?: string;
    }) => staffService.adminOverrideAttendance(targetUserId, date, status, note, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-today-all'] });
    },
  });
}

// ========== ADVANCE PAY HOOKS ==========

export function useAdvancePayHistory(userId: string) {
  return useQuery({
    queryKey: ['advance-pay', userId],
    queryFn: () => staffService.getAdvancePayHistory(userId),
    enabled: !!userId,
  });
}

export function useAddAdvancePay() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ userId, amount, note }: { userId: string; amount: number; note?: string }) =>
      staffService.addAdvancePay(userId, amount, note, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advance-pay'] });
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    },
  });
}
