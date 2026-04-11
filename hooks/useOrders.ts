import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ordersService from '@/services/orders';
import { useAuth } from '@/context/AuthContext';
import type { OrderStatus, PaymentMethod } from '@/constants/statuses';

interface OrderFilters {
  status?: OrderStatus;
  paymentStatus?: string;
  dateFrom?: string;
  dateTo?: string;
  staffId?: string;
  search?: string;
}

export function useOrders(filters?: OrderFilters) {
  return useQuery({
    queryKey: ['orders', filters],
    queryFn: () => ordersService.getOrders(filters),
  });
}

export function useOrderById(id: string) {
  return useQuery({
    queryKey: ['orders', id],
    queryFn: () => ordersService.getOrderById(id),
    enabled: !!id,
  });
}

export function useOrderStatusHistory(orderId: string) {
  return useQuery({
    queryKey: ['order-status-history', orderId],
    queryFn: () => ordersService.getOrderStatusHistory(orderId),
    enabled: !!orderId,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (data: Parameters<typeof ordersService.createOrder>[0]) =>
      ordersService.createOrder(data, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ orderId, newStatus, note }: { orderId: string; newStatus: OrderStatus; note?: string }) =>
      ordersService.updateOrderStatus(orderId, newStatus, user!.id, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useRecordPayment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ orderId, amount, method }: { orderId: string; amount: number; method: PaymentMethod }) =>
      ordersService.recordPayment(orderId, amount, method, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ orderId, reason }: { orderId: string; reason: string }) =>
      ordersService.cancelOrder(orderId, reason, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
