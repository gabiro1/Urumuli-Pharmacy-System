import { Router } from 'express';
import multer from 'multer';
import * as authController from './auth.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize, authorizeAccess } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import { authLimiter } from '../../middlewares/rateLimiter.js';
import {
  loginSchema,
  registerSchema,
  patientRegisterSchema,
  refreshTokenSchema,
  changePasswordSchema,
  createUserSchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
  inviteStaffSchema,
  acceptInvitationSchema,
  patientSettingsSchema,
  patientProfileUpdateSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyTwoFactorSchema,
  verifyTwoFactorSetupSchema,
  googleSignInSchema,
  verifyEmailSchema,
  createRoleSchema,
  updateRoleSchema,
} from './auth.validation.js';
import { ROLES } from '../../constants.js';

const router = Router();
const profileAvatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/google', authLimiter, validate(googleSignInSchema), authController.googleSignIn);
router.post('/verify-email', authLimiter, validate(verifyEmailSchema), authController.verifyEmail);
// Second factor verification after a login that requires 2FA (uses a temp token).
router.post('/verify-2fa', authLimiter, validate(verifyTwoFactorSchema), authController.verifyTwoFactorLogin);
// Staff 2FA management (setup / verify / disable).
router.post('/2fa/setup', authenticate, authController.setupTwoFactor);
router.post('/2fa/verify', authenticate, validate(verifyTwoFactorSetupSchema), authController.verifyTwoFactorSetup);
router.delete('/2fa', authenticate, authController.disableTwoFactor);
// Public registration creates PATIENT accounts only.
// Staff accounts must be created via the invitation flow.
router.post('/register', validate(registerSchema), authController.register);
router.post('/register/patient', validate(patientRegisterSchema), authController.registerPatient);
router.post('/refresh-token', validate(refreshTokenSchema), authController.refreshToken);
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), authController.resetPassword);
router.post('/logout', authenticate, authController.logout);
router.post('/change-password', authenticate, validate(changePasswordSchema), authController.changePassword);
router.get('/profile', authenticate, authController.getProfile);
router.get('/patient/profile', authenticate, authorize(ROLES.PATIENT), authController.getPatientProfile);
router.put('/patient/profile', authenticate, authorize(ROLES.PATIENT), validate(patientProfileUpdateSchema), authController.updatePatientProfile);
router.post('/patient/profile/avatar', authenticate, authorize(ROLES.PATIENT), profileAvatarUpload.single('avatar'), authController.uploadPatientAvatar);
router.get('/patient/settings', authenticate, authorize(ROLES.PATIENT), authController.getPatientSettings);
router.put('/patient/settings', authenticate, authorize(ROLES.PATIENT), validate(patientSettingsSchema), authController.updatePatientSettings);
// Data protection: portable copy of the patient's own data (GDPR art. 20).
router.get('/patient/data-export', authenticate, authorize(ROLES.PATIENT), authController.exportPatientData);
// Right to erasure (GDPR art. 17): anonymizes identity and strips PHI fields.
router.delete('/patient/account', authenticate, authorize(ROLES.PATIENT), authController.deletePatientAccount);
router.get('/users', authenticate, authorizeAccess({ roles: [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.AUDITOR], permissions: ['team:view'] }), authController.listUsers);
// Public role catalog (name / description / permissions). Used by the Roles manager UI.
router.get('/roles', authController.listRoles);
router.post('/roles', authenticate, authorizeAccess({ roles: [ROLES.ADMIN, ROLES.SUPER_ADMIN], permissions: ['role:manage'] }), validate(createRoleSchema), authController.createRole);
router.patch('/roles/:name', authenticate, authorizeAccess({ roles: [ROLES.ADMIN, ROLES.SUPER_ADMIN], permissions: ['role:manage'] }), validate(updateRoleSchema), authController.updateRole);
router.delete('/roles/:name', authenticate, authorizeAccess({ roles: [ROLES.ADMIN, ROLES.SUPER_ADMIN], permissions: ['role:manage'] }), authController.deleteRole);
router.post('/users', authenticate, authorizeAccess({ roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER], permissions: ['team:manage'] }), validate(createUserSchema), authController.createUser);
router.patch('/users/:id/role', authenticate, authorizeAccess({ roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MANAGER], permissions: ['team:manage'] }), validate(updateUserRoleSchema), authController.updateUserRole);
router.patch('/users/:id/status', authenticate, authorizeAccess({ roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN], permissions: ['team:manage'] }), validate(updateUserStatusSchema), authController.updateUserActiveStatus);
  router.delete('/users/:id', authenticate, authorizeAccess({ roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN], permissions: ['team:manage'] }), authController.deleteUser);
router.get('/invitations', authenticate, authorizeAccess({ roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN], permissions: ['team:invite'] }), authController.listInvitations);
router.post('/invitations', authenticate, authorizeAccess({ roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN], permissions: ['team:invite'] }), validate(inviteStaffSchema), authController.createInvitation);
router.post('/invitations/accept', authLimiter, validate(acceptInvitationSchema), authController.acceptInvitation);
router.patch('/invitations/:id/revoke', authenticate, authorizeAccess({ roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN], permissions: ['team:invite'] }), authController.revokeInvitation);
router.post('/invitations/:id/resend', authenticate, authorizeAccess({ roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN], permissions: ['team:invite'] }), authController.resendInvitation);
router.delete('/invitations/:id', authenticate, authorizeAccess({ roles: [ROLES.SUPER_ADMIN, ROLES.ADMIN], permissions: ['team:invite'] }), authController.deleteInvitation);

export default router;
