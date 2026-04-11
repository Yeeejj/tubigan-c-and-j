import React from 'react';
import { View, Text, TextInput, type TextInputProps } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerClassName?: string;
}

export function Input({ label, error, containerClassName = '', ...props }: InputProps) {
  return (
    <View className={`mb-4 ${containerClassName}`}>
      {label && <Text className="mb-1.5 text-sm font-medium text-gray-700">{label}</Text>}
      <TextInput
        className={`rounded-lg border px-3 py-2.5 text-base text-gray-900 ${
          error ? 'border-red-500' : 'border-gray-300'
        } bg-white`}
        placeholderTextColor="#9ca3af"
        {...props}
      />
      {error && <Text className="mt-1 text-sm text-red-500">{error}</Text>}
    </View>
  );
}
