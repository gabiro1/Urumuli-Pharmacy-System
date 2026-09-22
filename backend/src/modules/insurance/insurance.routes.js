import { Router } from 'express';
import * as controller from './insurance.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize, authorizeExact } from '../../middlewares/authorize.js';
import { ROLES } from '../../constants.js';

const router = Router();
router.use(authenticate);

router.get('/providers', authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.PHARMACIST), controller.listProviders);
router.get('/providers/:id', authorize(ROLES.ADMIN, ROLES.MANAGER), controller.getProvider);
router.post('/providers', authorize(ROLES.ADMIN), controller.createProvider);
router.put('/providers/:id', authorize(ROLES.ADMIN), controller.updateProvider);
router.get('/claims', authorizeExact(ROLES.PATIENT, ROLES.ADMIN, ROLES.MANAGER, ROLES.PHARMACIST, ROLES.AUDITOR), controller.listClaims);
router.get('/claims/:id', authorizeExact(ROLES.PATIENT, ROLES.ADMIN, ROLES.MANAGER, ROLES.PHARMACIST, ROLES.AUDITOR), controller.getClaim);
router.post('/claims', authorizeExact(ROLES.PATIENT, ROLES.ADMIN, ROLES.MANAGER, ROLES.PHARMACIST), controller.createClaim);
router.put('/claims/:id/status', authorize(ROLES.ADMIN, ROLES.PHARMACIST), controller.updateClaimStatus);

export default router;
