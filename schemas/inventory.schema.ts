import { z } from 'zod';

export const restockSchema = z.object({
  item_id: z.string().uuid(),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  notes: z.string().nullable(),
});

export type RestockFormData = z.infer<typeof restockSchema>;

export const adjustStockSchema = z.object({
  item_id: z.string().uuid(),
  quantity_change: z.number(),
  transaction_type: z.enum(['restock', 'consumed', 'damaged', 'adjustment']),
  notes: z.string().min(1, 'Reason is required for stock adjustments'),
});

export type AdjustStockFormData = z.infer<typeof adjustStockSchema>;
