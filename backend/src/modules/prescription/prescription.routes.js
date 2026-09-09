import { Router } from 'express';
import multer from 'multer';
import * as prescriptionController from './prescription.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize, requireProfessionalVerification } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import { auditMiddleware } from '../../middlewares/auditLogger.js';
import {
  patientSubmitSchema,
  approvePrescriptionSchema,
  rejectPrescriptionSchema,
} from './prescription.validation.js';
import { ROLES, AUDIT_ACTION, AUDIT_ENTITY } from '../../constants.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, GIF, WebP, and PDF files are allowed'), false);
    }
  },
});

const prescriptionUploadFields = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'file', maxCount: 1 },
]);

router.post(
  '/',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.PHARMACIST, ROLES.MANAGER),
  requireProfessionalVerification(),
  prescriptionUploadFields,
  auditMiddleware(AUDIT_ACTION.CREATE, AUDIT_ENTITY.PRESCRIPTION),
  prescriptionController.createStaffPrescription
);

router.post(
  '/submit',
  authenticate,
  authorize(ROLES.PATIENT),
  validate(patientSubmitSchema),
  prescriptionController.createPrescription
);

router.post(
  '/:id/upload',
  authenticate,
  authorize(ROLES.PATIENT, ROLES.ADMIN, ROLES.PHARMACIST),
  prescriptionUploadFields,
  prescriptionController.uploadFile
);

router.get(
  '/my',
  authenticate,
  authorize(ROLES.PATIENT),
  prescriptionController.getMyPrescriptions
);

router.get(
  '/',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.PHARMACIST, ROLES.MANAGER, ROLES.AUDITOR),
  prescriptionController.listPrescriptions
);

router.get(
  '/:id',
  authenticate,
  prescriptionController.getPrescription
);

router.post(
  '/:id/review',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.PHARMACIST, ROLES.MANAGER),
  requireProfessionalVerification(),
  auditMiddleware(AUDIT_ACTION.UPDATE, AUDIT_ENTITY.PRESCRIPTION),
  prescriptionController.reviewPrescription
);

router.post(
  '/:id/approve',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.PHARMACIST, ROLES.MANAGER),
  requireProfessionalVerification(),
  validate(approvePrescriptionSchema),
  auditMiddleware(AUDIT_ACTION.APPROVE, AUDIT_ENTITY.PRESCRIPTION),
  prescriptionController.approvePrescription
);

router.post(
  '/:id/reject',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.PHARMACIST, ROLES.MANAGER),
  requireProfessionalVerification(),
  validate(rejectPrescriptionSchema),
  auditMiddleware(AUDIT_ACTION.REJECT, AUDIT_ENTITY.PRESCRIPTION),
  prescriptionController.rejectPrescription
);

router.post(
  '/:id/complete',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.PHARMACIST, ROLES.MANAGER),
  requireProfessionalVerification(),
  auditMiddleware(AUDIT_ACTION.UPDATE, AUDIT_ENTITY.PRESCRIPTION),
  prescriptionController.markAsCompleted
);

router.patch(
  '/:id/status',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.PHARMACIST, ROLES.MANAGER),
  requireProfessionalVerification(),
  auditMiddleware(AUDIT_ACTION.UPDATE, AUDIT_ENTITY.PRESCRIPTION),
  prescriptionController.updatePrescriptionStatus
);

export default router;
