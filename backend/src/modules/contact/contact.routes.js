import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middlewares/validate.js';
import * as contactController from './contact.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { ROLES } from '../../constants.js';

const router = Router();
const schema = z.object({
  name: z.string().trim().min(2).max(200),
  email: z.string().trim().email().max(255),
  subject: z.string().trim().max(300).optional(),
  message: z.string().trim().min(10).max(5000),
});

const statusSchema = z.object({
  status: z.string().trim().toUpperCase().refine((value) => ['NEW', 'READ', 'RESOLVED'].includes(value), {
    message: 'Status must be one of: NEW, READ, RESOLVED',
  }),
});

router.post('/', validate(schema), contactController.createMessage);

router.use(authenticate);
router.use(authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.PHARMACIST));

router.get('/', contactController.listMessages);
router.get('/:id', contactController.getMessage);
router.patch('/:id/status', validate(statusSchema), contactController.updateMessageStatus);

export default router;
