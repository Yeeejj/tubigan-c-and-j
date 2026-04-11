import { useEffect, useCallback } from 'react';
import { useNetworkStatus } from './useNetworkStatus';
import { getQueue, removeFromQueue, incrementRetryCount } from '@/services/offline-queue';
import { updateDeliveryStatus, uploadDeliveryPhoto } from '@/services/delivery';
import { recordTransaction } from '@/services/inventory';
import { APP_CONFIG } from '@/constants/config';

export function useOfflineSync() {
  const { isConnected } = useNetworkStatus();

  const drainQueue = useCallback(async () => {
    const queue = await getQueue();
    if (queue.length === 0) return;

    for (const op of queue) {
      if (op.retry_count >= APP_CONFIG.OFFLINE_QUEUE_MAX_RETRIES) {
        console.warn(`Dropping operation ${op.id} after ${op.retry_count} retries`);
        await removeFromQueue(op.id);
        continue;
      }

      try {
        switch (op.type) {
          case 'delivery_update':
            await updateDeliveryStatus(
              op.payload.deliveryId as string,
              op.payload.status as Parameters<typeof updateDeliveryStatus>[1],
              op.payload.userId as string,
              op.payload.extras as Parameters<typeof updateDeliveryStatus>[3]
            );
            break;
          case 'photo_upload':
            await uploadDeliveryPhoto(
              op.payload.deliveryId as string,
              op.payload.photoUri as string
            );
            break;
          case 'container_return':
            await recordTransaction(
              op.payload.itemId as string,
              'restock',
              op.payload.quantity as number,
              op.payload.userId as string,
              'Returned container from delivery'
            );
            break;
        }
        await removeFromQueue(op.id);
      } catch (err) {
        console.error(`Failed to sync operation ${op.id}:`, err);
        await incrementRetryCount(op.id);
      }
    }
  }, []);

  useEffect(() => {
    if (isConnected) {
      drainQueue();
    }
  }, [isConnected, drainQueue]);

  return { isConnected };
}
