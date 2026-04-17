import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ordersService from '@/services/orders';
import { useAuth } from '@/context/AuthContext';
import type { Order } from '@/types/database';
import type { OrderStatus, PaymentMethod } from '@/constants/statuses';

// Track deleted order IDs so they stay hidden even if server delete fails
const deletedOrderIds = new Set<string>();

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
    queryFn: async () => {
      const orders = await ordersService.getOrders(filters);
      // Filter out deleted orders that may still exist on server
      return orders.filter((o) => !deletedOrderIds.has(o.id));
    },
    refetchInterval: 5000,
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
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useUpdateOrder() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ orderId, data }: { orderId: string; data: Parameters<typeof ordersService.updateOrder>[1] }) =>
      ordersService.updateOrder(orderId, data, user!.id),
    onMutate: async ({ orderId, data }) => {
      await queryClient.cancelQueries({ queryKey: ['orders'] });
      const previousQueries = queryClient.getQueriesData<Order[]>({ queryKey: ['orders'] });

      queryClient.setQueriesData<Order[]>({ queryKey: ['orders'] }, (old) => {
        if (!old) return old;
        return old.map((order) => {
          if (order.id !== orderId) return order;
          const totalAmount = data.price_per_gallon * data.number_of_gallons;
          return {
            ...order,
            delivery_address: data.delivery_address,
            payment_method: data.payment_method,
            total_amount: totalAmount,
            notes: data.notes,
            customer: order.customer
              ? { ...order.customer, name: data.customer_name, phone: data.customer_phone, address: data.delivery_address }
              : order.customer,
            order_items: order.order_items?.map((item) => ({
              ...item,
              quantity: data.number_of_gallons,
              unit_price: data.price_per_gallon,
              subtotal: totalAmount,
            })),
          };
        });
      });

      return { previousQueries };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ orderId, newStatus, note }: { orderId: string; newStatus: OrderStatus; note?: string }) =>
      ordersService.updateOrderStatus(orderId, newStatus, user!.id, note),
    onMutate: async ({ orderId, newStatus }) => {
      await queryClient.cancelQueries({ queryKey: ['orders'] });
      const previousQueries = queryClient.getQueriesData<Order[]>({ queryKey: ['orders'] });

      queryClient.setQueriesData<Order[]>({ queryKey: ['orders'] }, (old) => {
        if (!old) return old;
        return old.map((order) =>
          order.id === orderId ? { ...order, order_status: newStatus } : order
        );
      });

      return { previousQueries };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }
    },
    onSettled: () => {
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
    onMutate: async ({ orderId, amount, method }) => {
      await queryClient.cancelQueries({ queryKey: ['orders'] });
      const previousQueries = queryClient.getQueriesData<Order[]>({ queryKey: ['orders'] });

      queryClient.setQueriesData<Order[]>({ queryKey: ['orders'] }, (old) => {
        if (!old) return old;
        return old.map((order) => {
          if (order.id !== orderId) return order;
          const newPaid = order.amount_paid + amount;
          return {
            ...order,
            amount_paid: newPaid,
            payment_method: method,
            payment_status: newPaid >= order.total_amount ? 'paid' : 'partial',
          };
        });
      });

      return { previousQueries };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }
    },
    onSettled: () => {
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
    onMutate: async ({ orderId }) => {
      await queryClient.cancelQueries({ queryKey: ['orders'] });
      const previousQueries = queryClient.getQueriesData<Order[]>({ queryKey: ['orders'] });

      queryClient.setQueriesData<Order[]>({ queryKey: ['orders'] }, (old) => {
        if (!old) return old;
        return old.map((order) =>
          order.id === orderId ? { ...order, order_status: 'cancelled' as OrderStatus } : order
        );
      });

      return { previousQueries };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useDeleteOrder() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (orderId: string) => {
      // Mark as deleted so it stays hidden on refetch
      deletedOrderIds.add(orderId);

      // Remove from cache immediately
      queryClient.setQueriesData<Order[]>({ queryKey: ['orders'] }, (old) => {
        if (!old) return old;
        return old.filter((order) => order.id !== orderId);
      });

      // Try to delete from server (best effort)
      try {
        await ordersService.deleteOrder(orderId, user!.id);
      } catch {
        // Order stays removed from UI regardless
      }
    },
  });
}
