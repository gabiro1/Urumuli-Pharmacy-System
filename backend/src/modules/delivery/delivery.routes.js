import { Router } from 'express';
import * as controller from './delivery.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { ROLES } from '../../constants.js';

const router = Router();
router.use(authenticate);

router.get('/', authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.PHARMACIST), controller.listDeliveries);
router.get('/:id', controller.getDelivery);
router.get('/order/:orderId', controller.getByOrder);
router.post('/order/:orderId', authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.PHARMACIST), controller.createDelivery);
router.put('/:id/status', authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.PHARMACIST), controller.updateStatus);

export default router;
