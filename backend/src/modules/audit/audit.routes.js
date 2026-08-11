import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { ROLES } from '../../constants.js';
import * as auditController from './audit.controller.js';

const router = Router();

const { ADMIN, AUDITOR } = ROLES;

router.use(authenticate);
router.use(authorize(ADMIN, AUDITOR));

router.get('/', auditController.listAuditLogs);
router.get('/export', auditController.exportAuditLogs);
router.get('/:id', auditController.getAuditLogById);

export default router;
