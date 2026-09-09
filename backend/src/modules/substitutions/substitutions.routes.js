import { Router } from 'express';
import * as controller from './substitutions.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { ROLES } from '../../constants.js';

const router = Router();
router.use(authenticate);

router.get('/search', controller.search);
router.get('/medicine/:medicineId', controller.getForMedicine);
router.post('/', authorize(ROLES.ADMIN, ROLES.PHARMACIST), controller.create);
router.put('/:id/approve', authorize(ROLES.ADMIN, ROLES.PHARMACIST), controller.approve);
router.delete('/:id', authorize(ROLES.ADMIN), controller.remove);

export default router;
