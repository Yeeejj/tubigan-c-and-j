import { useQuery } from '@tanstack/react-query';
import * as salesService from '@/services/sales';

export function useDailySummary(date: string) {
  return useQuery({
    queryKey: ['sales-daily', date],
    queryFn: () => salesService.getDailySummary(date),
    enabled: !!date,
  });
}

export function useSalesForRange(dateFrom: string, dateTo: string) {
  return useQuery({
    queryKey: ['sales-range', dateFrom, dateTo],
    queryFn: () => salesService.getSalesForRange(dateFrom, dateTo),
    enabled: !!dateFrom && !!dateTo,
  });
}

export function useUnpaidOrders() {
  return useQuery({
    queryKey: ['unpaid-orders'],
    queryFn: () => salesService.getUnpaidOrders(),
  });
}

export function useTopProducts(dateFrom: string, dateTo: string) {
  return useQuery({
    queryKey: ['top-products', dateFrom, dateTo],
    queryFn: () => salesService.getTopProducts(dateFrom, dateTo),
    enabled: !!dateFrom && !!dateTo,
  });
}

export function usePaymentMethodBreakdown(dateFrom: string, dateTo: string) {
  return useQuery({
    queryKey: ['payment-breakdown', dateFrom, dateTo],
    queryFn: () => salesService.getPaymentMethodBreakdown(dateFrom, dateTo),
    enabled: !!dateFrom && !!dateTo,
  });
}
