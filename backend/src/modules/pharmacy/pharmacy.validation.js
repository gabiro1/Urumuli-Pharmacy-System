import { z } from 'zod';

const emptyStringToUndefined = (value) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

const optionalPhoneSchema = (schema) =>
  z.preprocess(emptyStringToUndefined, schema.optional());

export const createPharmacySchema = z.object({
  name: z.string().trim().min(2, 'Pharmacy name is required').max(300),
  registrationNumber: z.preprocess(emptyStringToUndefined, z.string().max(100).optional()),
  contactEmail: z.preprocess(emptyStringToUndefined, z.string().email('Invalid email').optional()),
  contactPhone: optionalPhoneSchema(z.string().regex(/^\+?[0-9\s\-().]+$/, 'Invalid phone number')),
  address: z.preprocess(emptyStringToUndefined, z.string().max(1000).optional()),
  city: z.preprocess(emptyStringToUndefined, z.string().max(100).optional()),
  province: z.preprocess(emptyStringToUndefined, z.string().max(100).optional()),
  country: z.preprocess(emptyStringToUndefined, z.string().max(100).optional()),
  description: z.preprocess(emptyStringToUndefined, z.string().max(2000).optional()),
}).strict();

export const updatePharmacyStatusSchema = z.object({
  status: z.enum(['PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED']),
  reason: z.preprocess(emptyStringToUndefined, z.string().max(500).optional()),
}).strict();

export const inviteStaffSchema = z.object({
  email: z.string().trim().email('Invalid email format'),
  role: z.enum(['PHARMACIST', 'CASHIER', 'INVENTORY_MANAGER', 'MANAGER', 'AUDITOR']),
}).strict();

export const submitProfessionalProfileSchema = z.object({
  professionalRegistrationNumber: z.preprocess(emptyStringToUndefined, z.string().max(100).optional()),
  licenseNumber: z.preprocess(emptyStringToUndefined, z.string().max(100).optional()),
  licenseExpiry: z.preprocess(emptyStringToUndefined, z.string().optional()),
  licenseIssuingAuthority: z.preprocess(emptyStringToUndefined, z.string().max(200).optional()),
  qualification: z.preprocess(emptyStringToUndefined, z.string().max(200).optional()),
  specialization: z.preprocess(emptyStringToUndefined, z.string().max(200).optional()),
  yearsOfExperience: z.preprocess(emptyStringToUndefined, z.coerce.number().int().min(0).max(100).optional()),
}).strict();

export const reviewVerificationSchema = z.object({
  status: z.enum(['VERIFIED', 'REJECTED', 'SUSPENDED']),
  notes: z.preprocess(emptyStringToUndefined, z.string().max(2000).optional()),
  rejectionReason: z.preprocess(emptyStringToUndefined, z.string().max(1000).optional()),
}).strict();

export const suspendStaffSchema = z.object({
  reason: z.preprocess(emptyStringToUndefined, z.string().max(500).optional()),
}).strict();
