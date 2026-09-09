import { Router } from 'express';
import * as controller from './adherence.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { ROLES } from '../../constants.js';

const router = Router();
router.use(authenticate);

router.get('/me', controller.listEntries);
router.get('/me/rate', controller.getAdherenceRate);
router.get('/patient/:patientId', authorize(ROLES.ADMIN, ROLES.PHARMACIST), controller.listEntries);
router.get('/patient/:patientId/rate', authorize(ROLES.ADMIN, ROLES.PHARMACIST), controller.getAdherenceRate);
router.post('/', controller.createEntry);
router.put('/:id/take', controller.markTaken);

export default router;
