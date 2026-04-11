import { z } from 'zod';

export const orderItemSchema = z.object({
  product_id: z.string().uuid(),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  unit_price: z.number().min(0),
});

export const createOrderSchema = z.object({
  customer_id: z.string().uuid('Please select a customer'),
  delivery_address: z.string().min(1, 'Delivery address is required'),
  delivery_date: z.string().nullable(),
  payment_method: z.enum(['cash', 'gcash', 'bank_transfer']),
  notes: z.string().nullable(),
  items: z.array(orderItemSchema).min(1, 'At least one item is required'),
});

export type CreateOrderFormData = z.infer<typeof createOrderSchema>;

export const recordPaymentSchema = z.object({
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  payment_method: z.enum(['cash', 'gcash', 'bank_transfer']),
});

export type RecordPaymentFormData = z.infer<typeof recordPaymentSchema>;
