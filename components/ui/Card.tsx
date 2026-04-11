import React from 'react';
import { View, Text, Pressable } from 'react-native';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onPress?: () => void;
}

export const Card = React.memo(function Card({ children, className = '', onPress }: CardProps) {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        className={`rounded-xl bg-white p-4 shadow-sm border border-gray-100 ${className}`}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View className={`rounded-xl bg-white p-4 shadow-sm border border-gray-100 ${className}`}>
      {children}
    </View>
  );
});

export const CardHeader = React.memo(function CardHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <View className={`mb-3 ${className}`}>{children}</View>;
});

export const CardTitle = React.memo(function CardTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <Text className={`text-lg font-bold text-gray-900 ${className}`}>{children}</Text>;
});
