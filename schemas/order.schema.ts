import { z } from 'zod';

export const createOrderSchema = z.object({
  customer_name: z.string().min(1, 'Customer name is required'),
  customer_phone: z.string().min(1, 'Phone number is required'),
  delivery_address: z.string().min(1, 'Delivery address is required'),
  delivery_date: z.string().nullable(),
  payment_method: z.enum(['cash', 'gcash', 'bank_transfer']),
  notes: z.string().nullable(),
  price_per_gallon: z.number().min(0.01, 'Price per gallon is required'),
  number_of_gallons: z.number().int().min(1, 'At least 1 gallon is required'),
});

export type CreateOrderFormData = z.infer<typeof createOrderSchema>;

export const editOrderSchema = z.object({
  customer_name: z.string().min(1, 'Customer name is required'),
  customer_phone: z.string().min(1, 'Phone number is required'),
  delivery_address: z.string().min(1, 'Delivery address is required'),
  payment_method: z.enum(['cash', 'gcash', 'bank_transfer']),
  notes: z.string().nullable(),
  price_per_gallon: z.number().min(0.01, 'Price per gallon is required'),
  number_of_gallons: z.number().int().min(1, 'At least 1 gallon is required'),
});

export type EditOrderFormData = z.infer<typeof editOrderSchema>;

export const recordPaymentSchema = z.object({
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  payment_method: z.enum(['cash', 'gcash', 'bank_transfer']),
});

export type RecordPaymentFormData = z.infer<typeof recordPaymentSchema>;
