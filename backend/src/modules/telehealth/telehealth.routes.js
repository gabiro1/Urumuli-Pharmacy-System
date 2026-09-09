import { Router } from 'express';
import * as controller from './telehealth.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { ROLES } from '../../constants.js';

const router = Router();
router.use(authenticate);

router.get('/', authorize(ROLES.ADMIN, ROLES.PHARMACIST, ROLES.MANAGER), controller.listSessions);
router.get('/upcoming', controller.getUpcoming);
router.get('/:id', controller.getSession);
router.post('/', authorize(ROLES.ADMIN, ROLES.PHARMACIST, ROLES.MANAGER), controller.scheduleSession);
router.put('/:id/start', authorize(ROLES.PHARMACIST), controller.startSession);
router.put('/:id/end', authorize(ROLES.PHARMACIST), controller.endSession);
router.put('/:id/cancel', controller.cancelSession);

export default router;
