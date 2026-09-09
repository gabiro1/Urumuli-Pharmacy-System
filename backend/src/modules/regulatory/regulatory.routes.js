import { Router } from 'express';
import * as controller from './regulatory.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { ROLES } from '../../constants.js';

const router = Router();
router.use(authenticate);

router.get('/', authorize(ROLES.ADMIN, ROLES.MANAGER), controller.listReports);
router.get('/:id', authorize(ROLES.ADMIN, ROLES.MANAGER), controller.getReport);
router.post('/', authorize(ROLES.ADMIN, ROLES.MANAGER), controller.generateReport);
router.put('/:id/submit', authorize(ROLES.ADMIN), controller.submitReport);
router.delete('/:id', authorize(ROLES.ADMIN), controller.deleteReport);

export default router;
