import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as inventoryService from '@/services/inventory';
import { useAuth } from '@/context/AuthContext';
import type { TransactionType } from '@/constants/statuses';

export function useInventoryDashboard() {
  return useQuery({
    queryKey: ['inventory-dashboard'],
    queryFn: () => inventoryService.getInventoryDashboard(),
  });
}

export function useInventoryItems() {
  return useQuery({
    queryKey: ['inventory-items'],
    queryFn: () => inventoryService.getInventoryItems(),
  });
}

export function useTransactionHistory(itemId?: string) {
  return useQuery({
    queryKey: ['inventory-transactions', itemId],
    queryFn: () => inventoryService.getTransactionHistory(itemId),
  });
}

export function useRecordTransaction() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({
      itemId,
      transactionType,
      quantityChange,
      notes,
      referenceId,
    }: {
      itemId: string;
      transactionType: TransactionType;
      quantityChange: number;
      notes?: string;
      referenceId?: string;
    }) =>
      inventoryService.recordTransaction(
        itemId,
        transactionType,
        quantityChange,
        user!.id,
        notes,
        referenceId
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] });
    },
  });
}
