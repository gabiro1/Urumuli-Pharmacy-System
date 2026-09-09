import { Router } from 'express';
import * as controller from './dispensing.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { auditMiddleware } from '../../middlewares/auditLogger.js';
import { ROLES, AUDIT_ACTION, AUDIT_ENTITY } from '../../constants.js';

const router = Router();
router.use(authenticate);

router.get('/', authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.PHARMACIST), controller.listRecords);
router.get('/stats', authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.PHARMACIST), controller.getStats);
router.get('/prescription/:prescriptionId', authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.PHARMACIST), controller.getByPrescription);
router.get('/:id', controller.getRecord);
router.post('/', authorize(ROLES.PHARMACIST), auditMiddleware(AUDIT_ACTION.CREATE, AUDIT_ENTITY.ORDER), controller.dispense);
router.put('/:id/return', authorize(ROLES.PHARMACIST, ROLES.ADMIN), controller.returnDispensing);

export default router;
