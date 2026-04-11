import React from 'react';
import { View, Text } from 'react-native';
import { Button } from '@/components/ui/Button';

interface ErrorDisplayProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorDisplay({ message = 'Something went wrong', onRetry }: ErrorDisplayProps) {
  return (
    <View className="flex-1 items-center justify-center p-8">
      <Text className="text-xl font-bold text-red-500">Error</Text>
      <Text className="mt-2 text-center text-base text-gray-500">{message}</Text>
      {onRetry && (
        <View className="mt-4">
          <Button title="Retry" onPress={onRetry} variant="secondary" />
        </View>
      )}
    </View>
  );
}
