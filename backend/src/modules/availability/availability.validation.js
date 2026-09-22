import { z } from 'zod';
import { AVAILABILITY_STATUS } from '../../constants.js';

export const createAvailabilityRequestSchema = z.object({
  medicineId: z.string().uuid().nullable().optional(),
  medicineName: z.string().trim().min(1, 'Medicine name is required').max(300),
  searchedTerm: z.string().trim().max(300).optional(),
  message: z.string().trim().max(5000).optional(),
});

export const verifyAvailabilitySchema = z
  .object({
    status: z.enum([AVAILABILITY_STATUS.PHYSICALLY_AVAILABLE, AVAILABILITY_STATUS.PHYSICALLY_UNAVAILABLE]),
    physicalStockConfirmed: z.number().int().min(0).max(1000000).nullable().optional(),
    unitPrice: z.number().finite().min(0).max(100000000).nullable().optional(),
    notes: z.string().trim().max(5000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status === AVAILABILITY_STATUS.PHYSICALLY_AVAILABLE && (data.physicalStockConfirmed === null || data.physicalStockConfirmed === undefined)) {
      ctx.addIssue({ code: 'custom', path: ['physicalStockConfirmed'], message: 'Confirmed physical stock is required when available' });
    }
    if (
      data.status === AVAILABILITY_STATUS.PHYSICALLY_AVAILABLE &&
      data.physicalStockConfirmed !== null &&
      data.physicalStockConfirmed !== undefined &&
      data.physicalStockConfirmed <= 0
    ) {
      ctx.addIssue({ code: 'custom', path: ['physicalStockConfirmed'], message: 'At least one unit must be confirmed when available' });
    }
  })
  .transform((data) => ({
    ...data,
    physicalStockConfirmed:
      data.status === AVAILABILITY_STATUS.PHYSICALLY_AVAILABLE ? data.physicalStockConfirmed : null,
    unitPrice: data.status === AVAILABILITY_STATUS.PHYSICALLY_AVAILABLE ? data.unitPrice : null,
  }));

export const createAvailabilityOrderSchema = z
  .object({
    quantity: z.number().int().min(1).max(99).default(1),
    fulfilmentMethod: z.enum(['PICKUP', 'DELIVERY']).default('PICKUP'),
    deliveryAddress: z.string().trim().max(1000).optional(),
    consent: z.literal(true),
  })
  .superRefine((data, ctx) => {
    if (data.fulfilmentMethod === 'DELIVERY' && (!data.deliveryAddress || data.deliveryAddress.length < 10)) {
      ctx.addIssue({
        code: 'custom',
        path: ['deliveryAddress'],
        message: 'A delivery address of at least 10 characters is required',
      });
    }
  });

export const syncInventorySchema = z.object({
  physicalStock: z.number().int().min(0, 'Quantity cannot be negative').max(1000000),
});
