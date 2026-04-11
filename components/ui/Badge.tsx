import React from 'react';
import { View, Text } from 'react-native';

interface BadgeProps {
  label: string;
  colorClass?: string;
  className?: string;
}

export function Badge({ label, colorClass = 'bg-gray-100 text-gray-800', className = '' }: BadgeProps) {
  // Split the colorClass into bg and text portions
  const bgClass = colorClass.split(' ').find(c => c.startsWith('bg-')) ?? 'bg-gray-100';
  const textClass = colorClass.split(' ').find(c => c.startsWith('text-')) ?? 'text-gray-800';

  return (
    <View className={`self-start rounded-full px-2.5 py-0.5 ${bgClass} ${className}`}>
      <Text className={`text-xs font-medium ${textClass}`}>{label}</Text>
    </View>
  );
}
