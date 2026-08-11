import { Router } from 'express';
import * as analyticsController from './analytics.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { ROLES } from '../../constants.js';

const router = Router();

router.use(authenticate);
router.use(authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.PHARMACIST, ROLES.AUDITOR, ROLES.INVENTORY_MANAGER));

router.get('/overview', analyticsController.getOverview);

export default router;
