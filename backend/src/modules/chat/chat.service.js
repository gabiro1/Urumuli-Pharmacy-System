import * as chatRepository from './chat.repository.js';
import { createAuditLog } from '../../middlewares/auditLogger.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../utils/errors.js';
import { CONVERSATION_STATUS, AUDIT_ACTION, AUDIT_ENTITY } from '../../constants.js';
import { mapConversation, mapMessage } from '../../utils/serializers.js';
import { cacheRemember, invalidateCannedReplyCache } from '../../services/redis.service.js';
import { createNotification } from '../../services/notification.service.js';

export async function startConversation(patientId, data, ipAddress, userAgent) {
  const conversation = await chatRepository.createConversation({
    patientId,
    subject: data.subject,
    contextType: data.contextType || 'GENERAL',
    contextId: data.contextId || null,
    priority: data.priority || 'NORMAL',
  });

  await chatRepository.createMessage({
    conversationId: conversation.id,
    senderId: patientId,
    senderRole: 'PATIENT',
    content: data.message || `Started conversation: ${data.subject}`,
  });

  await chatRepository.addConversationEvent({
    conversationId: conversation.id,
    eventType: 'STATUS_CHANGED',
    actorId: patientId,
    newValue: 'WAITING_PHARMACIST',
    description: 'Conversation created',
  });

  await createAuditLog({
    userId: patientId,
    action: AUDIT_ACTION.CREATE,
    entity: AUDIT_ENTITY.CONVERSATION,
    entityId: conversation.id,
    description: `Patient started conversation: ${data.subject}`,
    ipAddress,
    userAgent,
  });

  const fullConversation = await chatRepository.findConversationById(conversation.id);
  return mapConversation(fullConversation);
}

export async function getPatientConversations(patientId, query) {
  const result = await chatRepository.listPatientConversations(patientId, query);
  return {
    data: result.data.map((conversation) => mapConversation(conversation)),
    meta: result.meta,
  };
}

export async function getConversation(conversationId, userId, userRole) {
  const conversation = await chatRepository.findConversationById(conversationId);
  if (!conversation) throw new NotFoundError('Conversation not found');

  if (userRole === 'PATIENT' && conversation.patient_id !== userId) {
    throw new ForbiddenError('You can only access your own conversations');
  }

  return mapConversation(conversation);
}

export async function getMessages(conversationId, userId, userRole, query) {
  const conversation = await chatRepository.findConversationById(conversationId);
  if (!conversation) throw new NotFoundError('Conversation not found');

  if (userRole === 'PATIENT' && conversation.patient_id !== userId) {
    throw new ForbiddenError('You can only access your own conversations');
  }

  const result = await chatRepository.getMessages(conversationId, query);

  if (userRole === 'PATIENT') {
    result.data = result.data.filter((m) => !m.is_private_note);
  }

  result.data = result.data.map((message) => mapMessage(message));
  return result;
}

export async function sendMessage(conversationId, userId, userRole, data, ipAddress, userAgent) {
  const conversation = await chatRepository.findConversationById(conversationId);
  if (!conversation) throw new NotFoundError('Conversation not found');
  if (conversation.status === 'CLOSED') throw new ValidationError('Conversation is closed');

  if (userRole === 'PATIENT' && conversation.patient_id !== userId) {
    throw new ForbiddenError('You can only send messages in your own conversations');
  }

  const isPrivateNote = data.isPrivateNote === true && userRole !== 'PATIENT';

  const senderRole = userRole === 'PATIENT' ? 'PATIENT' : userRole === 'ADMIN' ? 'ADMIN' : 'PHARMACIST';

  const message = await chatRepository.createMessage({
    conversationId,
    senderId: userId,
    senderRole,
    content: data.content,
    attachmentUrl: data.attachmentUrl,
    attachmentType: data.attachmentType,
    attachmentName: data.attachmentName,
    isPrivateNote,
  });

  const newStatus = userRole === 'PATIENT' ? CONVERSATION_STATUS.WAITING_PHARMACIST : CONVERSATION_STATUS.WAITING_PATIENT;
  await chatRepository.updateConversationStatus(conversationId, newStatus, userId);

  if (isPrivateNote) {
    await chatRepository.addConversationEvent({
      conversationId,
      eventType: 'NOTE_ADDED',
      actorId: userId,
      description: 'Private note added',
    });
  }

  await createAuditLog({
    userId,
    action: AUDIT_ACTION.CREATE,
    entity: AUDIT_ENTITY.MESSAGE,
    entityId: message.id,
    description: `Message sent in conversation ${conversationId}`,
    ipAddress,
    userAgent,
  });

  if (!isPrivateNote) {
    const recipientId = userRole === 'PATIENT' ? conversation.assigned_pharmacist_id : conversation.patient_id;
    const title = userRole === 'PATIENT' ? 'New message for pharmacist' : 'New message from the pharmacy';
    createNotification({
      userId: recipientId,
      type: 'NEW_MESSAGE',
      title,
      message: data.content.slice(0, 200),
      referenceType: 'CONVERSATION',
      referenceId: conversationId,
    });
  }

  return mapMessage(message);
}

export async function assignConversation(conversationId, pharmacistId, actorId, ipAddress, userAgent) {
  const conversation = await chatRepository.findConversationById(conversationId);
  if (!conversation) throw new NotFoundError('Conversation not found');

  const oldPharmacistId = conversation.assigned_pharmacist_id;
  const result = await chatRepository.assignConversation(conversationId, pharmacistId);

  await chatRepository.addConversationEvent({
    conversationId,
    eventType: 'ASSIGNED',
    actorId,
    oldValue: oldPharmacistId || 'unassigned',
    newValue: pharmacistId,
    description: `Assigned to pharmacist`,
  });

  await createAuditLog({
    userId: actorId,
    action: AUDIT_ACTION.UPDATE,
    entity: AUDIT_ENTITY.CONVERSATION,
    entityId: conversationId,
    description: `Conversation assigned to pharmacist`,
    ipAddress,
    userAgent,
  });

  return mapConversation(result);
}

export async function unassignConversation(conversationId, actorId, _ipAddress, _userAgent) {
  const result = await chatRepository.unassignConversation(conversationId);

  await chatRepository.addConversationEvent({
    conversationId,
    eventType: 'UNASSIGNED',
    actorId,
    description: 'Pharmacist unassigned',
  });

  return mapConversation(result);
}

export async function closeConversation(conversationId, userId, userRole, ipAddress, userAgent) {
  const conversation = await chatRepository.findConversationById(conversationId);
  if (!conversation) throw new NotFoundError('Conversation not found');

  if (userRole === 'PATIENT' && conversation.patient_id !== userId) {
    throw new ForbiddenError('You can only close your own conversations');
  }

  const result = await chatRepository.updateConversationStatus(conversationId, 'CLOSED', userId);

  await chatRepository.addConversationEvent({
    conversationId,
    eventType: 'CLOSED',
    actorId: userId,
    description: 'Conversation closed',
  });

  await createAuditLog({
    userId,
    action: AUDIT_ACTION.UPDATE,
    entity: AUDIT_ENTITY.CONVERSATION,
    entityId: conversationId,
    description: `Conversation ${conversationId} closed`,
    ipAddress,
    userAgent,
  });

  return mapConversation(result);
}

export async function reopenConversation(conversationId, userId, _ipAddress, _userAgent) {
  const result = await chatRepository.updateConversationStatus(conversationId, 'WAITING_PHARMACIST', userId);

  await chatRepository.addConversationEvent({
    conversationId,
    eventType: 'REOPENED',
    actorId: userId,
    description: 'Conversation reopened',
  });

  return mapConversation(result);
}

export async function markAsRead(conversationId, userId) {
  return chatRepository.markMessagesAsRead(conversationId, userId);
}

export async function getPharmacistInbox(pharmacistId, query) {
  const result = await chatRepository.listPharmacistConversations(pharmacistId, query);
  return {
    data: result.data.map((conversation) => mapConversation(conversation)),
    meta: result.meta,
  };
}

export async function getOpenConversations(query) {
  const result = await chatRepository.listOpenConversations(query);
  return {
    data: result.data.map((conversation) => mapConversation(conversation)),
    meta: result.meta,
  };
}

export async function getUnreadCount(pharmacistId) {
  return chatRepository.getUnreadCount(pharmacistId);
}

export async function getCannedReplies(category) {
  const cacheKey = category ? `canned_replies:${category}` : 'canned_replies:all';
  return cacheRemember(cacheKey, 600, () => chatRepository.getCannedReplies(category));
}

export async function createCannedReply(data, userId) {
  const result = await chatRepository.createCannedReply({ ...data, createdBy: userId });
  await invalidateCannedReplyCache();
  return result;
}
