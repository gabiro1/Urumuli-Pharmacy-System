import { Router } from 'express';
import * as salesController from './sales.controller.js';
import { validateCreateSale } from './sales.validation.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { auditMiddleware } from '../../middlewares/auditLogger.js';
import { AUDIT_ACTION, AUDIT_ENTITY, ROLES } from '../../constants.js';

const router = Router();

router.use(authenticate);
router.use(authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.PHARMACIST, ROLES.CASHIER, ROLES.INVENTORY_MANAGER, ROLES.AUDITOR));

router.get('/summary', salesController.getSummary);
router.get('/', salesController.listSales);
router.get('/:id', salesController.getSale);
router.get('/:id/receipt', salesController.getReceipt);
router.get('/:id/receipt/print', salesController.getPrintableReceipt);

router.post(
  '/',
  authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.PHARMACIST, ROLES.CASHIER),
  validateCreateSale,
  auditMiddleware(AUDIT_ACTION.CREATE, AUDIT_ENTITY.SALE),
  salesController.createSale
);

router.post(
  '/:id/void',
  authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.PHARMACIST),
  auditMiddleware(AUDIT_ACTION.UPDATE, AUDIT_ENTITY.SALE),
  salesController.voidSale
);

router.post(
  '/:id/refund',
  authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.PHARMACIST),
  auditMiddleware(AUDIT_ACTION.UPDATE, AUDIT_ENTITY.SALE),
  salesController.refundSale
);

export default router;
