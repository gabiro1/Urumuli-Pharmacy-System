import { Router } from 'express';
import * as controller from './operating-hours.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { ROLES } from '../../constants.js';

const router = Router();

router.get('/pharmacy/:pharmacyId', authenticate, controller.getHours);
router.get('/pharmacy/:pharmacyId/open', controller.checkOpen);
router.get('/pharmacy/:pharmacyId/staff', authenticate, controller.getStaffAvailability);
router.put('/pharmacy/:pharmacyId', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER), controller.updateHours);
router.put('/pharmacy/:pharmacyId/staff-status', authenticate, controller.setStaffStatus);

export default router;
