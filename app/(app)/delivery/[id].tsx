import React, { useState } from 'react';
import { View, Text, ScrollView, Alert, Platform, Image } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import { useUpdateDeliveryStatus, useUploadDeliveryPhoto } from '@/hooks/useDelivery';
import { useAuth } from '@/context/AuthContext';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { addToQueue } from '@/services/offline-queue';
import { Card, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ErrorDisplay } from '@/components/shared/ErrorDisplay';
import { formatCurrency } from '@/utils/formatCurrency';
import { formatDateTime } from '@/utils/formatDate';
import {
  DELIVERY_STATUS_LABELS,
  DELIVERY_STATUS_COLORS,
  type DeliveryStatus,
} from '@/constants/statuses';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import type { Delivery } from '@/types/database';

export default function DeliveryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { isConnected } = useNetworkStatus();
  const updateStatus = useUpdateDeliveryStatus();
  const uploadPhoto = useUploadDeliveryPhoto();

  const [showFailModal, setShowFailModal] = useState(false);
  const [failReason, setFailReason] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const { data: delivery, isLoading, error, refetch } = useQuery({
    queryKey: ['delivery-detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deliveries')
        .select('*, order:orders(*, customer:customers(*), order_items(*, product:products(*))), assigned_to_user:users(*)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as unknown as Delivery;
    },
    enabled: !!id,
  });

  if (isLoading) return <LoadingSpinner />;
  if (error || !delivery) return <ErrorDisplay message="Delivery not found" onRetry={refetch} />;

  const statusFlow: DeliveryStatus[] = ['assigned', 'picked_up', 'en_route', 'arrived', 'delivered'];
  const currentIndex = statusFlow.indexOf(delivery.status);
  const nextStatus = currentIndex >= 0 && currentIndex < statusFlow.length - 1 ? statusFlow[currentIndex + 1] : null;

  const handleAdvance = async () => {
    if (!nextStatus) return;

    const extras: Record<string, unknown> = {};

    // If marking as delivered, capture photo and GPS
    if (nextStatus === 'delivered') {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          extras.gps_lat = loc.coords.latitude;
          extras.gps_lng = loc.coords.longitude;
        }
      } catch {}

      if (photoUri) {
        try {
          if (isConnected) {
            const url = await uploadPhoto.mutateAsync({ deliveryId: id, photoUri });
            extras.delivery_photo_url = url;
          } else {
            await addToQueue('photo_upload', { deliveryId: id, photoUri });
          }
        } catch {}
      }
    }

    if (!isConnected) {
      await addToQueue('delivery_update', {
        deliveryId: id,
        status: nextStatus,
        userId: user!.id,
        extras,
      });
      Alert.alert('Queued', 'Status update queued for sync when online.');
      return;
    }

    try {
      await updateStatus.mutateAsync({
        deliveryId: id,
        status: nextStatus,
        extras: extras as Parameters<typeof updateStatus.mutateAsync>[0]['extras'],
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Error', msg);
    }
  };

  const handleFail = async () => {
    if (!failReason.trim()) return;

    if (!isConnected) {
      await addToQueue('delivery_update', {
        deliveryId: id,
        status: 'failed',
        userId: user!.id,
        extras: { failure_reason: failReason },
      });
      setShowFailModal(false);
      Alert.alert('Queued', 'Failure report queued for sync.');
      return;
    }

    try {
      await updateStatus.mutateAsync({
        deliveryId: id,
        status: 'failed',
        extras: { failure_reason: failReason },
      });
      setShowFailModal(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to report';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Error', msg);
    }
  };

  const handleTakePhoto = async () => {
    if (Platform.OS === 'web') return;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerStyle={{ padding: 16 }}>
      {/* Connection Status */}
      {!isConnected && (
        <View className="mb-4 rounded-lg bg-yellow-50 p-3">
          <Text className="text-sm font-medium text-yellow-800">
            Offline - Changes will sync when reconnected
          </Text>
        </View>
      )}

      {/* Delivery Info */}
      <Card className="mb-4">
        <View className="flex-row items-start justify-between">
          <View>
            <Text className="text-xl font-bold text-gray-900">{delivery.order?.order_number}</Text>
            <Text className="text-sm text-gray-500">{delivery.assigned_to_user?.full_name}</Text>
          </View>
          <Badge
            label={DELIVERY_STATUS_LABELS[delivery.status]}
            colorClass={DELIVERY_STATUS_COLORS[delivery.status]}
          />
        </View>
      </Card>

      {/* Customer Info */}
      <Card className="mb-4">
        <CardTitle>Customer</CardTitle>
        <Text className="mt-1 text-base text-gray-700">{delivery.order?.customer?.name}</Text>
        <Text className="text-sm text-gray-500">{delivery.order?.customer?.phone}</Text>
        <Text className="mt-1 text-sm text-gray-500">{delivery.order?.delivery_address}</Text>
      </Card>

      {/* Order Items */}
      <Card className="mb-4">
        <CardTitle>Items</CardTitle>
        {delivery.order?.order_items?.map((item) => (
          <View key={item.id} className="mt-2 flex-row justify-between">
            <Text className="text-sm text-gray-700">{item.product?.name} x{item.quantity}</Text>
            <Text className="text-sm font-medium text-gray-900">{formatCurrency(item.subtotal)}</Text>
          </View>
        ))}
        <View className="mt-2 flex-row justify-between border-t border-gray-100 pt-2">
          <Text className="font-bold text-gray-900">Total</Text>
          <Text className="font-bold text-brand-600">{formatCurrency(delivery.order?.total_amount ?? 0)}</Text>
        </View>
      </Card>

      {/* Status Progress */}
      <Card className="mb-4">
        <CardTitle>Progress</CardTitle>
        {statusFlow.map((s, i) => (
          <View key={s} className="mt-2 flex-row items-center gap-3">
            <View
              className={`h-3 w-3 rounded-full ${
                i <= currentIndex ? 'bg-brand-500' : 'bg-gray-200'
              }`}
            />
            <Text className={`text-sm ${i <= currentIndex ? 'font-medium text-gray-900' : 'text-gray-400'}`}>
              {DELIVERY_STATUS_LABELS[s]}
            </Text>
          </View>
        ))}
        {delivery.delivered_at && (
          <Text className="mt-2 text-xs text-gray-500">Delivered at: {formatDateTime(delivery.delivered_at)}</Text>
        )}
      </Card>

      {/* Photo Proof */}
      {delivery.delivery_photo_url && (
        <Card className="mb-4">
          <CardTitle>Delivery Photo</CardTitle>
          <Image source={{ uri: delivery.delivery_photo_url }} className="mt-2 h-48 w-full rounded-lg" resizeMode="cover" />
        </Card>
      )}

      {/* Actions */}
      {delivery.status !== 'delivered' && delivery.status !== 'failed' && (
        <Card className="mb-8">
          <CardTitle>Actions</CardTitle>
          <View className="mt-3 gap-3">
            {nextStatus === 'delivered' && Platform.OS !== 'web' && (
              <Button
                title={photoUri ? 'Photo Captured' : 'Take Delivery Photo'}
                onPress={handleTakePhoto}
                variant="secondary"
              />
            )}
            {photoUri && (
              <Image source={{ uri: photoUri }} className="h-32 w-full rounded-lg" resizeMode="cover" />
            )}
            {nextStatus && (
              <Button
                title={`Mark as ${DELIVERY_STATUS_LABELS[nextStatus]}`}
                onPress={handleAdvance}
                loading={updateStatus.isPending}
              />
            )}
            <Button
              title="Report Failed Delivery"
              onPress={() => setShowFailModal(true)}
              variant="danger"
            />
          </View>
        </Card>
      )}

      {/* Fail Modal */}
      <Modal visible={showFailModal} onClose={() => setShowFailModal(false)} title="Failed Delivery">
        <Input
          label="Reason"
          placeholder="Why did the delivery fail?"
          multiline
          numberOfLines={3}
          value={failReason}
          onChangeText={setFailReason}
        />
        <Button title="Submit" onPress={handleFail} variant="danger" loading={updateStatus.isPending} className="mt-4" />
      </Modal>
    </ScrollView>
  );
}
