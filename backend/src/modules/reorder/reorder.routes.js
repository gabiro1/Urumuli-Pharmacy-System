import { Router } from 'express';
import * as controller from './reorder.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { ROLES } from '../../constants.js';

const router = Router();
router.use(authenticate);

router.get('/', authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.INVENTORY_MANAGER), controller.listSuggestions);
router.post('/generate', authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.INVENTORY_MANAGER), controller.generateSuggestions);
router.put('/:id/approve', authorize(ROLES.ADMIN, ROLES.MANAGER), controller.approveSuggestion);
router.put('/:id/ordered', authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.INVENTORY_MANAGER), controller.markOrdered);
router.put('/:id/dismiss', authorize(ROLES.ADMIN, ROLES.MANAGER), controller.dismissSuggestion);

export default router;
