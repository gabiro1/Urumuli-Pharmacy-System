import { Router } from 'express';
import * as cartController from './cart.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import { addItemSchema, updateQuantitySchema } from './cart.validation.js';
import { ROLES } from '../../constants.js';

const router = Router();

router.use(authenticate, authorize(ROLES.PATIENT));

router.get('/', cartController.getCart);
router.post('/', validate(addItemSchema), cartController.addItem);
router.patch('/:medicineId', validate(updateQuantitySchema), cartController.updateItem);
router.delete('/:medicineId', cartController.removeItem);
router.delete('/', cartController.clearCart);

export default router;