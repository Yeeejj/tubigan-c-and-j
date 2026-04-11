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
    mutationFn: ({ id, updates }: { id: string; updates: Partial<UserProfile> }) =>
      staffService.updateStaffProfile(id, updates, user!.id),
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
