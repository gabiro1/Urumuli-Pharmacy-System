import { z } from 'zod';

export const addItemSchema = z.object({
  medicineId: z.string().uuid('A valid medicine id is required'),
  quantity: z.number().int().min(1).max(99).default(1),
});

export const updateQuantitySchema = z.object({
  quantity: z.number().int().min(0).max(99),
});