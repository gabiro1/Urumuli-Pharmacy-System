import { Router } from 'express';
import * as expiryController from './expiry.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { ROLES } from '../../constants.js';

const router = Router();
router.use(authenticate);

router.get('/', expiryController.listAlerts);
router.get('/stats', expiryController.getStats);
router.post('/scan', authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.PHARMACIST, ROLES.INVENTORY_MANAGER), expiryController.runScan);
router.put('/:id/acknowledge', expiryController.acknowledgeAlert);
router.put('/:id/dismiss', expiryController.dismissAlert);
router.put('/:id/dispose', authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.PHARMACIST), expiryController.markDisposed);

export default router;
