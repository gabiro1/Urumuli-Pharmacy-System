import { Router } from 'express';
import * as controller from './controlled-substances.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { auditMiddleware } from '../../middlewares/auditLogger.js';
import { ROLES, AUDIT_ACTION, AUDIT_ENTITY } from '../../constants.js';

const router = Router();
router.use(authenticate);

router.get('/', authorize(ROLES.ADMIN, ROLES.PHARMACIST, ROLES.MANAGER), controller.listEntries);
router.get('/summary', authorize(ROLES.ADMIN, ROLES.PHARMACIST, ROLES.MANAGER), controller.getSummary);
router.get('/balance/:medicineId', authorize(ROLES.ADMIN, ROLES.PHARMACIST), controller.getBalance);
router.post('/', authorize(ROLES.PHARMACIST), auditMiddleware(AUDIT_ACTION.CREATE, AUDIT_ENTITY.ORDER), controller.createEntry);

export default router;
