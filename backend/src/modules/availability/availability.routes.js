import { Router } from 'express';
import * as availabilityController from './availability.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import { auditMiddleware } from '../../middlewares/auditLogger.js';
import {
  createAvailabilityRequestSchema,
  createAvailabilityOrderSchema,
  verifyAvailabilitySchema,
  syncInventorySchema,
} from './availability.validation.js';
import { ROLES, AUDIT_ACTION, AUDIT_ENTITY } from '../../constants.js';

const router = Router();

router.post('/requests', authenticate, authorize(ROLES.PATIENT), validate(createAvailabilityRequestSchema), availabilityController.createRequest);
router.get('/requests/my', authenticate, authorize(ROLES.PATIENT), availabilityController.listMyRequests);

// Anything that can read a chat conversation can read its availability context,
// so ownership + staff checks are enforced inside the service.
router.get('/conversations/:conversationId', authenticate, availabilityController.getRequestByConversation);

router.post(
  '/requests/:id/order',
  authenticate,
  authorize(ROLES.PATIENT),
  validate(createAvailabilityOrderSchema),
  availabilityController.createOrder
);
router.get('/requests/:id', authenticate, availabilityController.getRequest);
router.put(
  '/requests/:id/verify',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.PHARMACIST),
  validate(verifyAvailabilitySchema),
  availabilityController.verifyRequest
);

router.put(
  '/requests/:id/inventory',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.PHARMACIST, ROLES.INVENTORY_MANAGER),
  validate(syncInventorySchema),
  auditMiddleware(AUDIT_ACTION.UPDATE, AUDIT_ENTITY.INVENTORY),
  availabilityController.syncInventory
);

export default router;
