import { Router } from 'express';
import * as pharmacyController from './pharmacy.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import {
  createPharmacySchema,
  updatePharmacyStatusSchema,
  inviteStaffSchema,
  submitProfessionalProfileSchema,
  reviewVerificationSchema,
  suspendStaffSchema,
} from './pharmacy.validation.js';
import { ROLES } from '../../constants.js';

const router = Router();

// ============================================================
// MY MEMBERSHIPS (must be before parameterized routes)
// ============================================================
router.get(
  '/my-memberships/list',
  authenticate,
  pharmacyController.listMyMemberships
);

// ============================================================
// PHARMACY MANAGEMENT
// ============================================================

// Any authenticated user can create a pharmacy (becomes its manager)
router.post(
  '/',
  authenticate,
  validate(createPharmacySchema),
  pharmacyController.createPharmacy
);

// List pharmacies (public read)
router.get('/', pharmacyController.listPharmacies);

// Get single pharmacy
router.get('/:id', pharmacyController.getPharmacy);

// Update pharmacy status (SUPER_ADMIN only)
router.patch(
  '/:id/status',
  authenticate,
  authorize(ROLES.SUPER_ADMIN),
  validate(updatePharmacyStatusSchema),
  pharmacyController.updatePharmacyStatus
);

// ============================================================
// STAFF MEMBERSHIP MANAGEMENT
// ============================================================

// Invite staff to pharmacy (manager/admin of that pharmacy)
router.post(
  '/:pharmacyId/memberships/invite',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  validate(inviteStaffSchema),
  pharmacyController.inviteStaff
);

// List members of a pharmacy
router.get(
  '/:pharmacyId/memberships',
  authenticate,
  pharmacyController.listMemberships
);

// Activate own pending membership
router.patch(
  '/:pharmacyId/memberships/:membershipId/activate',
  authenticate,
  pharmacyController.activateMembership
);

// Suspend a staff member
router.patch(
  '/:pharmacyId/memberships/:membershipId/suspend',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  validate(suspendStaffSchema),
  pharmacyController.suspendStaff
);

// Remove a staff member
router.delete(
  '/:pharmacyId/memberships/:membershipId',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.MANAGER),
  pharmacyController.removeStaff
);

// ============================================================
// PROFESSIONAL VERIFICATION
// ============================================================

// Submit professional profile (for pharmacists)
router.post(
  '/professional/submit',
  authenticate,
  authorize(ROLES.PHARMACIST),
  validate(submitProfessionalProfileSchema),
  pharmacyController.submitProfessionalProfile
);

// Get my professional profile
router.get(
  '/professional/me',
  authenticate,
  pharmacyController.getProfessionalProfile
);

// Get any user's professional profile (admin only)
router.get(
  '/professional/:userId',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  pharmacyController.getProfessionalProfile
);

// Update professional profile
router.put(
  '/professional/me',
  authenticate,
  validate(submitProfessionalProfileSchema),
  pharmacyController.updateProfessionalProfile
);

// Review verification (admin only)
router.patch(
  '/professional/:userId/review',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  validate(reviewVerificationSchema),
  pharmacyController.reviewVerification
);

// List pending verifications (admin only)
router.get(
  '/professional/verifications/pending',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  pharmacyController.listPendingVerifications
);

// Check my license status
router.get(
  '/professional/license/status',
  authenticate,
  pharmacyController.checkMyLicense
);

// ============================================================
// PERMISSIONS
// ============================================================

// Get permissions for a specific role
router.get(
  '/permissions/:role',
  authenticate,
  pharmacyController.getPermissionsForRole
);

// Get all available permissions
router.get(
  '/permissions',
  authenticate,
  pharmacyController.getAllPermissions
);

export default router;
