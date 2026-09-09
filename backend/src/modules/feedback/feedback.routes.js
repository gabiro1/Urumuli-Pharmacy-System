import { Router } from 'express';
import * as controller from './feedback.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { ROLES } from '../../constants.js';

const router = Router();
router.use(authenticate);

router.get('/', authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.PHARMACIST), controller.listFeedback);
router.get('/rating', controller.getAverageRating);
router.post('/', controller.submitFeedback);

export default router;
