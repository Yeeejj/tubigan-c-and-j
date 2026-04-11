import React from 'react';
import { View, Text, ScrollView, Alert, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useBatchById, useCompleteProcessStep, useUpdateBatchStatus } from '@/hooks/useProcess';
import { Card, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ErrorDisplay } from '@/components/shared/ErrorDisplay';
import { formatDateTime } from '@/utils/formatDate';
import { PROCESS_STEPS, BATCH_STATUS_LABELS, type BatchStatus } from '@/constants/statuses';

const BATCH_STATUS_FLOW: BatchStatus[] = [
  'raw_water_in', 'filtering', 'purifying', 'filling', 'quality_check', 'ready', 'dispatched',
];

export default function BatchDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: batch, isLoading, error, refetch } = useBatchById(id);
  const completeStep = useCompleteProcessStep();
  const updateBatchStatus = useUpdateBatchStatus();

  if (isLoading) return <LoadingSpinner />;
  if (error || !batch) return <ErrorDisplay message="Batch not found" onRetry={refetch} />;

  const completedStepNames = new Set(batch.process_steps?.map((s) => s.step_name) ?? []);
  const currentBatchIndex = BATCH_STATUS_FLOW.indexOf(batch.status);
  const nextBatchStatus = currentBatchIndex < BATCH_STATUS_FLOW.length - 1 ? BATCH_STATUS_FLOW[currentBatchIndex + 1] : null;

  // Quality check gate
  const qualityStep = batch.process_steps?.find((s) => s.step_name === 'Quality check');
  const qualityPassed = qualityStep?.result === 'pass';
  const qualityFailed = qualityStep?.result === 'fail';

  const handleCompleteStep = async (stepName: string) => {
    const isQualityCheck = stepName === 'Quality check';
    try {
      await completeStep.mutateAsync({
        batchId: id,
        stepName,
        result: isQualityCheck ? 'pass' : undefined,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to complete step';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Error', msg);
    }
  };

  const handleFailQuality = async () => {
    try {
      await completeStep.mutateAsync({ batchId: id, stepName: 'Quality check', result: 'fail' });
    } catch {}
  };

  const handleAdvanceBatch = async () => {
    if (!nextBatchStatus) return;
    if (nextBatchStatus === 'ready' && !qualityPassed) {
      const msg = 'Quality check must pass before batch can be marked ready.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Warning', msg);
      return;
    }
    try {
      await updateBatchStatus.mutateAsync({ batchId: id, status: nextBatchStatus });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Error', msg);
    }
  };

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerStyle={{ padding: 16 }}>
      {/* Batch Info */}
      <Card className="mb-4">
        <View className="flex-row items-start justify-between">
          <View>
            <Text className="text-xl font-bold text-gray-900">{batch.batch_number}</Text>
            <Text className="text-sm text-gray-500">{batch.water_volume_liters}L</Text>
            <Text className="text-xs text-gray-400">{formatDateTime(batch.started_at)}</Text>
          </View>
          <Badge label={BATCH_STATUS_LABELS[batch.status]} colorClass="bg-blue-100 text-blue-800" />
        </View>
        <Text className="mt-2 text-xs text-gray-500">
          {batch.linked_orders.length} linked order(s) | Started by {batch.started_by_user?.full_name}
        </Text>
      </Card>

      {/* Process Steps Checklist */}
      <Card className="mb-4">
        <CardTitle>Process Steps</CardTitle>
        {PROCESS_STEPS.map((stepName) => {
          const completed = completedStepNames.has(stepName);
          const stepData = batch.process_steps?.find((s) => s.step_name === stepName);
          const isQualityCheck = stepName === 'Quality check';

          return (
            <View key={stepName} className="mt-3 flex-row items-center justify-between">
              <View className="flex-1 flex-row items-center gap-3">
                <View
                  className={`h-5 w-5 items-center justify-center rounded-full ${
                    completed ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                >
                  {completed && <Text className="text-xs text-white">✓</Text>}
                </View>
                <View>
                  <Text className={`text-sm ${completed ? 'text-gray-500 line-through' : 'font-medium text-gray-900'}`}>
                    {stepName}
                  </Text>
                  {stepData && (
                    <Text className="text-xs text-gray-400">
                      {stepData.performed_by_user?.full_name} - {formatDateTime(stepData.completed_at)}
                      {stepData.result ? ` (${stepData.result})` : ''}
                    </Text>
                  )}
                </View>
              </View>
              {!completed && (
                <View className="flex-row gap-2">
                  <Button title="Done" onPress={() => handleCompleteStep(stepName)} size="sm" loading={completeStep.isPending} />
                  {isQualityCheck && (
                    <Button title="Fail" onPress={handleFailQuality} size="sm" variant="danger" />
                  )}
                </View>
              )}
            </View>
          );
        })}
      </Card>

      {/* Quality Gate Warning */}
      {qualityFailed && (
        <Card className="mb-4 border-red-200 bg-red-50">
          <Text className="font-bold text-red-700">Quality Check Failed</Text>
          <Text className="mt-1 text-sm text-red-600">This batch cannot be dispatched.</Text>
        </Card>
      )}

      {/* Batch Status Control */}
      {batch.status !== 'dispatched' && !qualityFailed && (
        <Card className="mb-8">
          <CardTitle>Batch Status</CardTitle>
          <View className="mt-2">
            {BATCH_STATUS_FLOW.map((s, i) => (
              <View key={s} className="flex-row items-center gap-2 py-1">
                <View className={`h-2 w-2 rounded-full ${i <= currentBatchIndex ? 'bg-brand-500' : 'bg-gray-200'}`} />
                <Text className={`text-sm ${i <= currentBatchIndex ? 'font-medium text-gray-900' : 'text-gray-400'}`}>
                  {BATCH_STATUS_LABELS[s]}
                </Text>
              </View>
            ))}
          </View>
          {nextBatchStatus && (
            <Button
              title={`Advance to ${BATCH_STATUS_LABELS[nextBatchStatus]}`}
              onPress={handleAdvanceBatch}
              loading={updateBatchStatus.isPending}
              className="mt-4"
            />
          )}
        </Card>
      )}
    </ScrollView>
  );
}
