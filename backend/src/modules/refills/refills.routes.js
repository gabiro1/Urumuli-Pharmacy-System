import { Router } from 'express';
import * as controller from './refills.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { ROLES } from '../../constants.js';

const router = Router();
router.use(authenticate);

router.get('/', controller.listReminders);
router.get('/patient/:patientId', authorize(ROLES.ADMIN, ROLES.PHARMACIST), controller.listReminders);
router.post('/', controller.createReminder);
router.put('/:id/cancel', controller.cancelReminder);
router.put('/:id/complete', controller.completeReminder);
router.post('/process-due', authorize(ROLES.ADMIN, ROLES.MANAGER), controller.processDue);

export default router;
