import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as processService from '@/services/process';
import { useAuth } from '@/context/AuthContext';
import type { BatchStatus } from '@/constants/statuses';

export function useBatches(filters?: { status?: BatchStatus }) {
  return useQuery({
    queryKey: ['batches', filters],
    queryFn: () => processService.getBatches(filters),
  });
}

export function useBatchById(id: string) {
  return useQuery({
    queryKey: ['batches', id],
    queryFn: () => processService.getBatchById(id),
    enabled: !!id,
  });
}

export function useCreateBatch() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (data: Parameters<typeof processService.createBatch>[0]) =>
      processService.createBatch(data, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
    },
  });
}

export function useUpdateBatchStatus() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ batchId, status }: { batchId: string; status: BatchStatus }) =>
      processService.updateBatchStatus(batchId, status, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
    },
  });
}

export function useCompleteProcessStep() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ batchId, stepName, result }: { batchId: string; stepName: string; result?: string }) =>
      processService.completeProcessStep(batchId, stepName, user!.id, result),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] });
    },
  });
}
