// Order statuses
export const ORDER_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending',
  processing: 'Processing',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  out_for_delivery: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  completed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
};

// Payment statuses
export const PAYMENT_STATUS = {
  UNPAID: 'unpaid',
  PARTIAL: 'partial',
  PAID: 'paid',
} as const;

export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: 'Unpaid',
  partial: 'Partial',
  paid: 'Paid',
};

export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  unpaid: 'bg-red-100 text-red-800',
  partial: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
};

// Payment methods
export const PAYMENT_METHOD = {
  CASH: 'cash',
  GCASH: 'gcash',
  BANK_TRANSFER: 'bank_transfer',
} as const;

export type PaymentMethod = (typeof PAYMENT_METHOD)[keyof typeof PAYMENT_METHOD];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  gcash: 'GCash',
  bank_transfer: 'Bank Transfer',
};

// Delivery statuses
export const DELIVERY_STATUS = {
  ASSIGNED: 'assigned',
  PICKED_UP: 'picked_up',
  EN_ROUTE: 'en_route',
  ARRIVED: 'arrived',
  DELIVERED: 'delivered',
  FAILED: 'failed',
} as const;

export type DeliveryStatus = (typeof DELIVERY_STATUS)[keyof typeof DELIVERY_STATUS];

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  assigned: 'Assigned',
  picked_up: 'Picked Up',
  en_route: 'En Route',
  arrived: 'Arrived',
  delivered: 'Delivered',
  failed: 'Failed',
};

export const DELIVERY_STATUS_COLORS: Record<DeliveryStatus, string> = {
  assigned: 'bg-gray-100 text-gray-800',
  picked_up: 'bg-blue-100 text-blue-800',
  en_route: 'bg-purple-100 text-purple-800',
  arrived: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
};

// Batch statuses
export const BATCH_STATUS = {
  RAW_WATER_IN: 'raw_water_in',
  FILTERING: 'filtering',
  PURIFYING: 'purifying',
  FILLING: 'filling',
  QUALITY_CHECK: 'quality_check',
  READY: 'ready',
  DISPATCHED: 'dispatched',
} as const;

export type BatchStatus = (typeof BATCH_STATUS)[keyof typeof BATCH_STATUS];

export const BATCH_STATUS_LABELS: Record<BatchStatus, string> = {
  raw_water_in: 'Raw Water In',
  filtering: 'Filtering',
  purifying: 'Purifying',
  filling: 'Filling',
  quality_check: 'Quality Check',
  ready: 'Ready',
  dispatched: 'Dispatched',
};

// Inventory categories
export const INVENTORY_CATEGORY = {
  CONSUMABLE: 'consumable',
  CONTAINER: 'container',
  PACKAGING: 'packaging',
  EQUIPMENT: 'equipment',
} as const;

export type InventoryCategory = (typeof INVENTORY_CATEGORY)[keyof typeof INVENTORY_CATEGORY];

// Inventory transaction types
export const TRANSACTION_TYPE = {
  RESTOCK: 'restock',
  CONSUMED: 'consumed',
  DAMAGED: 'damaged',
  ADJUSTMENT: 'adjustment',
} as const;

export type TransactionType = (typeof TRANSACTION_TYPE)[keyof typeof TRANSACTION_TYPE];

// Process step names (default sequence)
export const PROCESS_STEPS = [
  'Raw water intake',
  'Pre-filtration',
  'Reverse osmosis / purification',
  'UV sterilization',
  'Filling into jugs',
  'Capping and sealing',
  'Quality check',
  'Batch ready for dispatch',
] as const;
