import { Router } from 'express';
import * as controller from './consent.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { ROLES } from '../../constants.js';

const router = Router();
router.use(authenticate);

router.get('/', controller.getMyConsents);
router.put('/:type', controller.updateConsent);
router.put('/bulk', controller.bulkUpdate);

export default router;
