import { Router } from 'express';
import * as authController from './auth.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
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
  patientSettingsSchema,
  patientProfileUpdateSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './auth.validation.js';
import { ROLES } from '../../constants.js';

const router = Router();

router.post('/login', authLimiter, validate(loginSchema), authController.login);
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
router.get('/patient/settings', authenticate, authorize(ROLES.PATIENT), authController.getPatientSettings);
router.put('/patient/settings', authenticate, authorize(ROLES.PATIENT), validate(patientSettingsSchema), authController.updatePatientSettings);
router.get('/users', authenticate, authorize(ROLES.ADMIN, ROLES.AUDITOR), authController.listUsers);
router.get('/roles', authController.listRoles);
router.post('/users', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), validate(createUserSchema), authController.createUser);
router.patch('/users/:id/role', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), validate(updateUserRoleSchema), authController.updateUserRole);
router.patch('/users/:id/status', authenticate, authorize(ROLES.ADMIN), authController.updateUserActiveStatus);

export default router;
