import { z } from 'zod';

export const prescriptionItemSchema = z.object({
  medicineName: z.string().min(1, 'Medicine name is required'),
  medicineId: z.string().uuid().optional(),
  dosage: z.string().min(1, 'Dosage is required'),
  frequency: z.string().min(1, 'Frequency is required'),
  duration: z.string().optional(),
  quantity: z.number().int().positive('Quantity must be positive'),
  notes: z.string().optional(),
});

export const createPrescriptionSchema = z.object({
  patientName: z.string().min(1, 'Patient name is required').max(200),
  patientDob: z.string().optional(),
  patientGender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  patientPhone: z.string().optional(),
  patientEmail: z.string().email().optional().or(z.literal('')),
  patientAddress: z.string().optional(),
  doctorName: z.string().min(1, 'Doctor name is required').max(200),
  doctorLicenseNumber: z.string().optional(),
  hospitalName: z.string().optional(),
  diagnosis: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(prescriptionItemSchema).min(1, 'At least one item is required'),
  expiresAt: z.string().optional(),
});

export const patientSubmitSchema = z.object({
  doctorName: z.string().optional(),
  diagnosis: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    medicineName: z.string().min(1, 'Medicine name is required'),
    dosage: z.string().min(1, 'Dosage is required'),
    frequency: z.string().min(1, 'Frequency is required'),
    duration: z.string().optional(),
  })).optional(),
});

export const approvePrescriptionSchema = z.object({
  pharmacistNotes: z.string().optional(),
});

export const rejectPrescriptionSchema = z.object({
  rejectionReason: z.string().min(1, 'Rejection reason is required'),
});
