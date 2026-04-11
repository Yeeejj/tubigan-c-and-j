import { z } from 'zod';

export const assignDeliverySchema = z.object({
  order_id: z.string().uuid(),
  assigned_to: z.string().uuid('Please select a delivery staff member'),
});

export type AssignDeliveryFormData = z.infer<typeof assignDeliverySchema>;

export const failDeliverySchema = z.object({
  failure_reason: z.string().min(1, 'Please provide a reason for the failed delivery'),
});

export type FailDeliveryFormData = z.infer<typeof failDeliverySchema>;
