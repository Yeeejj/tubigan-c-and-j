import React, { useState } from 'react';
import { View, Text, Pressable, FlatList } from 'react-native';
import { Modal } from './Modal';

interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps {
  label?: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
}

export function Select({ label, options, value, onChange, placeholder = 'Select...', error }: SelectProps) {
  const [showModal, setShowModal] = useState(false);
  const selectedLabel = options.find((o) => o.value === value)?.label ?? placeholder;

  return (
    <View className="mb-4">
      {label && <Text className="mb-1.5 text-sm font-medium text-gray-700">{label}</Text>}
      <Pressable
        onPress={() => setShowModal(true)}
        className={`rounded-lg border px-3 py-2.5 ${error ? 'border-red-500' : 'border-gray-300'} bg-white`}
      >
        <Text className={value ? 'text-base text-gray-900' : 'text-base text-gray-400'}>{selectedLabel}</Text>
      </Pressable>
      {error && <Text className="mt-1 text-sm text-red-500">{error}</Text>}

      <Modal visible={showModal} onClose={() => setShowModal(false)} title={label ?? 'Select'}>
        <FlatList
          data={options}
          keyExtractor={(item) => item.value}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                onChange(item.value);
                setShowModal(false);
              }}
              className={`border-b border-gray-100 px-4 py-3 ${item.value === value ? 'bg-brand-50' : ''}`}
            >
              <Text className={`text-base ${item.value === value ? 'font-semibold text-brand-600' : 'text-gray-900'}`}>
                {item.label}
              </Text>
            </Pressable>
          )}
        />
      </Modal>
    </View>
  );
}
