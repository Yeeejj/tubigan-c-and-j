import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as deliveryService from '@/services/delivery';
import { useAuth } from '@/context/AuthContext';
import type { DeliveryStatus } from '@/constants/statuses';

export function useDeliveries(filters?: { status?: DeliveryStatus; assignedTo?: string }) {
  return useQuery({
    queryKey: ['deliveries', filters],
    queryFn: () => deliveryService.getDeliveries(filters),
  });
}

export function useDeliveryByOrderId(orderId: string) {
  return useQuery({
    queryKey: ['delivery', orderId],
    queryFn: () => deliveryService.getDeliveryByOrderId(orderId),
    enabled: !!orderId,
  });
}

export function useAssignDelivery() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ orderId, assignedTo }: { orderId: string; assignedTo: string }) =>
      deliveryService.assignDelivery(orderId, assignedTo, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useUpdateDeliveryStatus() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({
      deliveryId,
      status,
      extras,
    }: {
      deliveryId: string;
      status: DeliveryStatus;
      extras?: {
        delivery_photo_url?: string;
        failure_reason?: string;
        gps_lat?: number;
        gps_lng?: number;
      };
    }) => deliveryService.updateDeliveryStatus(deliveryId, status, user!.id, extras),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useUploadDeliveryPhoto() {
  return useMutation({
    mutationFn: ({ deliveryId, photoUri }: { deliveryId: string; photoUri: string }) =>
      deliveryService.uploadDeliveryPhoto(deliveryId, photoUri),
  });
}
