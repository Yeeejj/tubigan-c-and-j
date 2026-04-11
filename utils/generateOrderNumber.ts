import { toISODate } from './formatDate';

export function generateOrderNumber(sequenceNumber: number): string {
  const date = toISODate(new Date()).replace(/-/g, '');
  const seq = String(sequenceNumber).padStart(3, '0');
  return `CJ-${date}-${seq}`;
}
