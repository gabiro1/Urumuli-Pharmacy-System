import { Router } from 'express';
import * as notificationsController from './notifications.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';

const router = Router();

router.use(authenticate);

router.get('/', notificationsController.listMyNotifications);
router.get('/unread-count', notificationsController.unreadCount);
router.put('/:id/read', notificationsController.markRead);
router.put('/read-all', notificationsController.markAllRead);

export default router;
