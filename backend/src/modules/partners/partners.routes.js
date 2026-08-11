import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { ROLES } from '../../constants.js';
import * as partnersController from './partners.controller.js';
import { validateCreatePartner, validateUpdatePartner } from './partners.validation.js';

const router = Router();

const { ADMIN } = ROLES;

router.get('/active', partnersController.listActivePartners);

router.use(authenticate);
router.use(authorize(ADMIN));

router.get('/', partnersController.listAllPartners);
router.get('/:id', partnersController.getPartnerById);
router.post('/', validateCreatePartner, partnersController.createPartner);
router.put('/:id', validateUpdatePartner, partnersController.updatePartner);
router.delete('/:id', partnersController.deletePartner);

export default router;
