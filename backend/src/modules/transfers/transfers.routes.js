import { Router } from 'express';
import * as controller from './transfers.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { ROLES } from '../../constants.js';

const router = Router();
router.use(authenticate);

router.get('/', authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.PHARMACIST, ROLES.INVENTORY_MANAGER), controller.listTransfers);
router.get('/:id', controller.getTransfer);
router.post('/', authorize(ROLES.PHARMACIST, ROLES.MANAGER, ROLES.INVENTORY_MANAGER), controller.requestTransfer);
router.put('/:id/approve', authorize(ROLES.ADMIN, ROLES.MANAGER), controller.approveTransfer);
router.put('/:id/ship', authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.PHARMACIST), controller.shipTransfer);
router.put('/:id/receive', authorize(ROLES.PHARMACIST, ROLES.MANAGER), controller.receiveTransfer);
router.put('/:id/reject', authorize(ROLES.ADMIN, ROLES.MANAGER), controller.rejectTransfer);

export default router;
