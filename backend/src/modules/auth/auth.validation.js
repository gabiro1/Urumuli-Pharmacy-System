import { z } from 'zod';

const emptyStringToUndefined = (value) => {
  if (typeof value !== 'string') return value;

  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

const optionalPhoneSchema = (schema) =>
  z.preprocess(emptyStringToUndefined, schema.optional());

// Roles are dynamic (stored in the `roles` table, user-managed), so we no
// longer validate against a hard-coded enum. Structural rules only; the
// service layer confirms the role actually exists in the database.
const roleNameSchema = z.string()
  .trim()
  .min(2, 'Role name must be at least 2 characters')
  .max(50, 'Role name must be at most 50 characters')
  .regex(/^[A-Z][A-Z0-9_]*$/, 'Role name must be UPPERCASE letters, numbers, or underscores (e.g. STORE_MANAGER)');

export const createRoleSchema = z.object({
  name: roleNameSchema,
  description: z.string().trim().max(300, 'Description must be at most 300 characters').optional(),
  permissions: z.array(z.string().trim().min(1)).max(100).optional(),
});

export const updateRoleSchema = z.object({
  description: z.string().trim().max(300, 'Description must be at most 300 characters').optional(),
  permissions: z.array(z.string().trim().min(1)).max(100).optional(),
}).refine((data) => data.description !== undefined || data.permissions !== undefined, {
  message: 'Nothing to update',
});

export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z.object({
  email: z.string().trim().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  fullName: z.string().trim().min(2, 'Full name is required').max(200),
  phone: optionalPhoneSchema(
    z.string().regex(/^\+?[0-9\s\-().]+$/, 'Invalid phone number')
  ),
});

export const patientRegisterSchema = z.object({
  email: z.string().trim().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  fullName: z.string().trim().min(2, 'Full name is required').max(200),
  phone: optionalPhoneSchema(
    z.string()
      .min(10, 'Phone number must be at least 10 digits')
      .regex(/^\+?[0-9\s\-().]+$/, 'Invalid phone number')
  ),
  dateOfBirth: z.preprocess(emptyStringToUndefined, z.string().optional()),
  gender: z.preprocess(emptyStringToUndefined, z.enum(['MALE', 'FEMALE', 'OTHER']).optional()),
  address: z.preprocess(emptyStringToUndefined, z.string().optional()),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Invalid email format'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(32, 'Invalid reset token'),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
});

export const createUserSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name is required').max(200).optional(),
  name: z.string().trim().min(2, 'Full name is required').max(200).optional(),
  email: z.string().trim().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  phone: z.preprocess(emptyStringToUndefined, z.string().optional()),
  role: roleNameSchema,
}).refine((data) => data.fullName || data.name, {
  message: 'Full name is required',
  path: ['fullName'],
});

export const updateUserRoleSchema = z.object({
  role: roleNameSchema,
});

export const inviteStaffSchema = z.object({
  email: z.string().trim().email('Invalid email format'),
  role: roleNameSchema,
  fullName: z.string().trim().min(2, 'Full name is required').max(200).optional(),
});

export const acceptInvitationSchema = z.object({
  token: z.string().min(32, 'Invalid invitation token'),
  fullName: z.string().trim().min(2, 'Full name is required').max(200),
  phone: optionalPhoneSchema(
    z.string().regex(/^\+?[0-9\s\-().]+$/, 'Invalid phone number')
  ),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export const updateUserStatusSchema = z.object({
  isActive: z.boolean(),
});

export const patientSettingsSchema = z.object({
  prescriptionUpdates: z.boolean().optional(),
  messageAlerts: z.boolean().optional(),
  appointmentReminders: z.boolean().optional(),
  marketingEmails: z.boolean().optional(),
  shareReadReceipts: z.boolean().optional(),
  compactView: z.boolean().optional(),
}).strict().refine((data) => Object.keys(data).length > 0, {
  message: 'At least one setting must be provided',
});

export const patientProfileUpdateSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(100).optional(),
  lastName: z.string().trim().min(1, 'Last name is required').max(100).optional(),
  email: z.string().trim().email('Invalid email format').optional(),
  phone: optionalPhoneSchema(
    z.string().min(10, 'Phone number must be at least 10 digits')
      .max(30)
      .regex(/^\+?[0-9\s\-().]+$/, 'Invalid phone number')
  ),
  dateOfBirth: z.preprocess(emptyStringToUndefined, z.string().optional()),
  gender: z.preprocess(emptyStringToUndefined, z.enum(['MALE', 'FEMALE', 'OTHER']).optional()),
  address: z.preprocess(emptyStringToUndefined, z.string().max(1000).optional()),
  emergencyContactName: z.preprocess(emptyStringToUndefined, z.string().max(200).optional()),
  emergencyContactPhone: optionalPhoneSchema(z.string().max(30).regex(/^\+?[0-9\s\-().]+$/, 'Invalid emergency phone number')),
  bloodGroup: z.preprocess(emptyStringToUndefined, z.string().max(5).optional()),
  allergiesNotes: z.preprocess(emptyStringToUndefined, z.string().max(5000).optional()),
  chronicConditions: z.preprocess(emptyStringToUndefined, z.string().max(5000).optional()),
}).strict().refine((data) => Object.keys(data).length > 0, {
  message: 'At least one profile field must be provided',
});

export const verifyTwoFactorSchema = z.object({
  tempToken: z.string().min(1, 'Two-factor session token is required'),
  code: z.string().trim().min(6, 'Code must be at least 6 characters').max(12),
});

export const verifyTwoFactorSetupSchema = z.object({
  code: z.string().trim().min(6, 'Code must be at least 6 characters').max(12),
});

export const googleSignInSchema = z.object({
  idToken: z.string().min(1, 'Google ID token is required'),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});
