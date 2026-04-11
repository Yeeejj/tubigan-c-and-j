import { z } from 'zod';

export const createBatchSchema = z.object({
  linked_orders: z.array(z.string().uuid()).min(1, 'Link at least one order'),
  water_volume_liters: z.number().min(1, 'Volume must be at least 1 liter'),
  notes: z.string().nullable(),
});

export type CreateBatchFormData = z.infer<typeof createBatchSchema>;

export const completeStepSchema = z.object({
  step_name: z.string(),
  result: z.string().nullable(),
});

export type CompleteStepFormData = z.infer<typeof completeStepSchema>;
