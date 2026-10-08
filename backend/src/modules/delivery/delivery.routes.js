import { Router } from 'express';
import * as controller from './delivery.controller.js';
import { validate, validateQuery } from '../../middlewares/validate.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorizeAccess } from '../../middlewares/authorize.js';
import { ROLES } from '../../constants.js';
import { createDeliverySchema, updateStatusSchema, listQuerySchema } from './delivery.validation.js';

const router = Router();
router.use(authenticate);

const VIEW = { roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.PHARMACIST, ROLES.AUDITOR], permissions: ['delivery:view'] };
const MANAGE = { roles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.PHARMACIST], permissions: ['delivery:manage'] };

// Fixed segments are declared before '/:id' so they are not captured as an id.
router.get('/mine', controller.myDeliveries);
router.get('/stats', authorizeAccess(VIEW), controller.stats);
router.get('/', authorizeAccess(VIEW), validateQuery(listQuerySchema), controller.listDeliveries);

router.get('/order/:orderId', controller.getByOrder);
router.get('/order/:orderId/timeline', controller.getTimeline);
router.post('/order/:orderId', authorizeAccess(MANAGE), validate(createDeliverySchema), controller.createDelivery);

router.get('/:id', controller.getDelivery);
router.put('/:id/status', authorizeAccess(MANAGE), validate(updateStatusSchema), controller.updateStatus);

export default router;
