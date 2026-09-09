import { Router } from 'express';
import * as controller from './medication-history.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { ROLES } from '../../constants.js';

const router = Router();
router.use(authenticate);

router.get('/me', controller.listHistory);
router.get('/me/active', controller.getActiveMeds);
router.get('/me/timeline', controller.getTimeline);
router.get('/:id', controller.getEntry);
router.get('/patient/:patientId', authorize(ROLES.ADMIN, ROLES.PHARMACIST, ROLES.MANAGER), controller.listHistory);
router.get('/patient/:patientId/active', authorize(ROLES.ADMIN, ROLES.PHARMACIST, ROLES.MANAGER), controller.getActiveMeds);
router.get('/patient/:patientId/timeline', authorize(ROLES.ADMIN, ROLES.PHARMACIST, ROLES.MANAGER), controller.getTimeline);
router.post('/', authorize(ROLES.ADMIN, ROLES.PHARMACIST, ROLES.MANAGER), controller.addEntry);
router.put('/:id', authorize(ROLES.ADMIN, ROLES.PHARMACIST, ROLES.MANAGER), controller.updateEntry);

export default router;
