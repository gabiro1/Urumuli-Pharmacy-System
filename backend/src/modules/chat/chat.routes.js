import { Router } from 'express';
import * as chatController from './chat.controller.js';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize, requireProfessionalVerification } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import { startConversationSchema, sendMessageSchema, assignConversationSchema, cannedReplySchema } from './chat.validation.js';
import { ROLES } from '../../constants.js';

const router = Router();

router.get('/unread-count', authenticate, chatController.getUnreadCount);

router.post('/conversations', authenticate, authorize(ROLES.PATIENT), validate(startConversationSchema), chatController.startConversation);
router.get('/conversations', authenticate, authorize(ROLES.PATIENT), chatController.getMyConversations);
router.get('/conversations/:id', authenticate, chatController.getConversation);
router.get('/conversations/:id/messages', authenticate, chatController.getMessages);
router.post('/conversations/:id/messages', authenticate, requireProfessionalVerification(), validate(sendMessageSchema), chatController.sendMessage);
router.put('/conversations/:id/read', authenticate, chatController.markAsRead);
router.put('/conversations/:id/close', authenticate, chatController.closeConversation);
router.put('/conversations/:id/reopen', authenticate, chatController.reopenConversation);

router.put('/conversations/:id/assign', authenticate, authorize(ROLES.ADMIN, ROLES.PHARMACIST), requireProfessionalVerification(), validate(assignConversationSchema), chatController.assignConversation);
router.put('/conversations/:id/unassign', authenticate, authorize(ROLES.ADMIN, ROLES.PHARMACIST), requireProfessionalVerification(), chatController.unassignConversation);

router.get('/inbox', authenticate, authorize(ROLES.ADMIN, ROLES.PHARMACIST), requireProfessionalVerification(), chatController.getMyInbox);
router.get('/open', authenticate, authorize(ROLES.ADMIN, ROLES.PHARMACIST), requireProfessionalVerification(), chatController.getOpenConversations);

router.get('/canned-replies', authenticate, authorize(ROLES.ADMIN, ROLES.PHARMACIST), chatController.getCannedReplies);
router.post('/canned-replies', authenticate, authorize(ROLES.ADMIN, ROLES.PHARMACIST), validate(cannedReplySchema), chatController.createCannedReply);

export default router;
