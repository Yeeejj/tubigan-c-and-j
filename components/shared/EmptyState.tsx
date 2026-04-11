import React from 'react';
import { View, Text } from 'react-native';
import { Button } from '@/components/ui/Button';

interface EmptyStateProps {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center p-8">
      <Text className="text-xl font-bold text-gray-400">{title}</Text>
      <Text className="mt-2 text-center text-base text-gray-500">{message}</Text>
      {actionLabel && onAction && (
        <View className="mt-4">
          <Button title={actionLabel} onPress={onAction} />
        </View>
      )}
    </View>
  );
}
