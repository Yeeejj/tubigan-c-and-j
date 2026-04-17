import { z } from 'zod';

export const createStaffSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(50),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  full_name: z.string().min(2, 'Full name is required').max(100),
  phone: z.string().min(7, 'Phone number is required').max(20),
  role: z.enum(['in_shop_staff', 'delivery_staff']),
});

export type CreateStaffData = z.infer<typeof createStaffSchema>;

export const markAttendanceSchema = z.object({
  status: z.enum(['on_duty', 'absent']),
  note: z.string().max(200).optional(),
});

export const adminOverrideSchema = z.object({
  targetUserId: z.string().uuid(),
  date: z.string(),
  status: z.enum(['on_duty', 'absent']),
  note: z.string().max(200).optional(),
});

export const addAdvancePaySchema = z.object({
  amount: z.number().positive({ message: 'Amount must be greater than zero' }),
  note: z.string().max(300).optional(),
});

export const updateStaffProfileSchema = z.object({
  full_name: z.string().min(2).max(100),
  phone: z.string().min(7).max(20),
  role: z.enum(['in_shop_staff', 'delivery_staff']),
  is_active: z.boolean(),
});

export type MarkAttendanceData = z.infer<typeof markAttendanceSchema>;
export type AdminOverrideData = z.infer<typeof adminOverrideSchema>;
export type AddAdvancePayData = z.infer<typeof addAdvancePaySchema>;
export type UpdateStaffProfileData = z.infer<typeof updateStaffProfileSchema>;
