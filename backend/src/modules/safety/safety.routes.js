import { Router } from 'express';
import * as safetyController from './safety.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { ROLES } from '../../constants.js';

const router = Router();

router.use(authenticate);
router.use(authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.PHARMACIST, ROLES.CASHIER, ROLES.INVENTORY_MANAGER, ROLES.AUDITOR));

router.get('/drug-checker', safetyController.checkDrugInteractions);
router.post('/drug-checker', safetyController.checkDrugInteractions);

router.get('/interactions', safetyController.listInteractions);
router.post('/interactions', authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.PHARMACIST), safetyController.createInteraction);
router.delete('/interactions/:id', authorize(ROLES.ADMIN, ROLES.MANAGER), safetyController.deleteInteraction);

export default router;
