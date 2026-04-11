import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const QUEUE_KEY = 'cj_offline_queue';

export interface QueuedOperation {
  id: string;
  type: 'delivery_update' | 'photo_upload' | 'container_return' | 'gps_stamp';
  payload: Record<string, unknown>;
  created_at: string;
  retry_count: number;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export async function getQueue(): Promise<QueuedOperation[]> {
  if (Platform.OS === 'web') return [];
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function addToQueue(
  type: QueuedOperation['type'],
  payload: Record<string, unknown>
): Promise<void> {
  if (Platform.OS === 'web') return;
  const queue = await getQueue();
  queue.push({
    id: generateId(),
    type,
    payload,
    created_at: new Date().toISOString(),
    retry_count: 0,
  });
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function removeFromQueue(operationId: string): Promise<void> {
  const queue = await getQueue();
  const filtered = queue.filter((op) => op.id !== operationId);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
}

export async function incrementRetryCount(operationId: string): Promise<void> {
  const queue = await getQueue();
  const op = queue.find((o) => o.id === operationId);
  if (op) {
    op.retry_count += 1;
  }
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function clearQueue(): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify([]));
}
