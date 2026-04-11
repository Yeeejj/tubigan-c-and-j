import React, { useState } from 'react';
import { View, Text, FlatList, Pressable, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useInventoryDashboard, useRecordTransaction } from '@/hooks/useInventory';
import { useAuth } from '@/context/AuthContext';
import { Card, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { canManageInventory } from '@/utils/permissions';
import type { TransactionType } from '@/constants/statuses';

const stockStatusColors = {
  ok: 'bg-green-100 text-green-800',
  low: 'bg-yellow-100 text-yellow-800',
  critical: 'bg-red-100 text-red-800',
};

export default function InventoryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: inventory, isLoading } = useInventoryDashboard();
  const recordTransaction = useRecordTransaction();

  const [showRestockModal, setShowRestockModal] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [txType, setTxType] = useState<TransactionType>('restock');
  const [notes, setNotes] = useState('');

  if (isLoading) return <LoadingSpinner />;

  const handleTransaction = async () => {
    const qty = parseFloat(quantity);
    if (!selectedItemId || isNaN(qty) || qty <= 0) return;
    const change = txType === 'restock' ? qty : -qty;
    try {
      await recordTransaction.mutateAsync({
        itemId: selectedItemId,
        transactionType: txType,
        quantityChange: change,
        notes: notes || undefined,
      });
      setShowRestockModal(false);
      setQuantity('');
      setNotes('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Error', msg);
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      {!inventory?.length ? (
        <EmptyState title="No Inventory" message="No inventory items configured." />
      ) : (
        <FlatList
          data={inventory}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          ItemSeparatorComponent={() => <View className="h-3" />}
          renderItem={({ item: stock }) => (
            <Card onPress={() => router.push(`/(app)/inventory/${stock.item_id}`)}>
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="font-bold text-gray-900">{stock.item?.name}</Text>
                  <Text className="text-sm text-gray-500">{stock.item?.category} · {stock.item?.unit}</Text>
                </View>
                <View className="items-end">
                  <Text className="text-2xl font-bold text-gray-900">{stock.current_quantity}</Text>
                  <Badge label={stock.status.toUpperCase()} colorClass={stockStatusColors[stock.status]} />
                </View>
              </View>
              {stock.status !== 'ok' && (
                <Text className="mt-1 text-xs text-gray-500">
                  Reorder at: {stock.item?.reorder_threshold} {stock.item?.unit}
                </Text>
              )}
            </Card>
          )}
        />
      )}

      {canManageInventory(user?.role ?? 'delivery_staff') && (
        <Pressable
          onPress={() => setShowRestockModal(true)}
          className="absolute bottom-24 right-6 h-14 w-14 items-center justify-center rounded-full bg-brand-500 shadow-lg"
        >
          <Text className="text-2xl text-white">+</Text>
        </Pressable>
      )}

      <Modal visible={showRestockModal} onClose={() => setShowRestockModal(false)} title="Stock Transaction">
        <Select
          label="Item"
          options={(inventory ?? []).map((s) => ({ label: s.item?.name ?? '', value: s.item_id }))}
          value={selectedItemId}
          onChange={setSelectedItemId}
        />
        <Select
          label="Transaction Type"
          options={[
            { label: 'Restock', value: 'restock' },
            { label: 'Consumed', value: 'consumed' },
            { label: 'Damaged', value: 'damaged' },
            { label: 'Adjustment', value: 'adjustment' },
          ]}
          value={txType}
          onChange={(v) => setTxType(v as TransactionType)}
        />
        <Input label="Quantity" keyboardType="numeric" value={quantity} onChangeText={setQuantity} />
        <Input label="Notes" value={notes} onChangeText={setNotes} placeholder="Reason..." />
        <Button title="Submit" onPress={handleTransaction} loading={recordTransaction.isPending} className="mt-4" />
      </Modal>
    </View>
  );
}
