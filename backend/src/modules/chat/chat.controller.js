import * as chatService from './chat.service.js';
import { sendSuccess, sendCreated } from '../../utils/response.js';

export async function startConversation(req, res, next) {
  try {
    const result = await chatService.startConversation(req.user.userId, req.body, req.ip, req.get('User-Agent'));
    return sendCreated(res, result, 'Conversation started');
  } catch (error) {
    next(error);
  }
}

export async function getMyConversations(req, res, next) {
  try {
    const { status, page, limit } = req.query;
    const result = await chatService.getPatientConversations(req.user.userId, {
      status, page: parseInt(page) || 1, limit: parseInt(limit) || 20,
    });
    return sendSuccess(res, result.data, 'Success', 200, result.meta);
  } catch (error) {
    next(error);
  }
}

export async function getConversation(req, res, next) {
  try {
    const result = await chatService.getConversation(req.params.id, req.user.userId, req.user.role);
    return sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function getMessages(req, res, next) {
  try {
    const { page, limit } = req.query;
    const result = await chatService.getMessages(req.params.id, req.user.userId, req.user.role, {
      page: parseInt(page) || 1, limit: parseInt(limit) || 50,
    });
    return sendSuccess(res, result.data, 'Success', 200, result.meta);
  } catch (error) {
    next(error);
  }
}

export async function sendMessage(req, res, next) {
  try {
    const result = await chatService.sendMessage(
      req.params.id, req.user.userId, req.user.role, req.body,
      req.ip, req.get('User-Agent')
    );
    return sendCreated(res, result, 'Message sent');
  } catch (error) {
    next(error);
  }
}

export async function assignConversation(req, res, next) {
  try {
    const { pharmacistId } = req.body;
    const result = await chatService.assignConversation(
      req.params.id, pharmacistId || req.user.userId, req.user.userId,
      req.ip, req.get('User-Agent')
    );
    return sendSuccess(res, result, 'Conversation assigned');
  } catch (error) {
    next(error);
  }
}

export async function unassignConversation(req, res, next) {
  try {
    const result = await chatService.unassignConversation(req.params.id, req.user.userId, req.ip, req.get('User-Agent'));
    return sendSuccess(res, result, 'Conversation unassigned');
  } catch (error) {
    next(error);
  }
}

export async function closeConversation(req, res, next) {
  try {
    const result = await chatService.closeConversation(req.params.id, req.user.userId, req.user.role, req.ip, req.get('User-Agent'));
    return sendSuccess(res, result, 'Conversation closed');
  } catch (error) {
    next(error);
  }
}

export async function reopenConversation(req, res, next) {
  try {
    const result = await chatService.reopenConversation(req.params.id, req.user.userId, req.ip, req.get('User-Agent'));
    return sendSuccess(res, result, 'Conversation reopened');
  } catch (error) {
    next(error);
  }
}

export async function markAsRead(req, res, next) {
  try {
    await chatService.markAsRead(req.params.id, req.user.userId);
    return sendSuccess(res, null, 'Marked as read');
  } catch (error) {
    next(error);
  }
}

export async function getMyInbox(req, res, next) {
  try {
    const { status, page, limit } = req.query;
    const result = await chatService.getPharmacistInbox(req.user.userId, {
      status, page: parseInt(page) || 1, limit: parseInt(limit) || 20,
    });
    return sendSuccess(res, result.data, 'Success', 200, result.meta);
  } catch (error) {
    next(error);
  }
}

export async function getOpenConversations(req, res, next) {
  try {
    const { status, page, limit } = req.query;
    const result = await chatService.getOpenConversations({
      status, page: parseInt(page) || 1, limit: parseInt(limit) || 50,
    });
    return sendSuccess(res, result.data, 'Success', 200, result.meta);
  } catch (error) {
    next(error);
  }
}

export async function getUnreadCount(req, res, next) {
  try {
    const count = await chatService.getUnreadCount(req.user.userId);
    return sendSuccess(res, { count });
  } catch (error) {
    next(error);
  }
}

export async function getCannedReplies(req, res, next) {
  try {
    const { category } = req.query;
    const replies = await chatService.getCannedReplies(category);
    return sendSuccess(res, replies);
  } catch (error) {
    next(error);
  }
}

export async function createCannedReply(req, res, next) {
  try {
    const reply = await chatService.createCannedReply(req.body, req.user.userId);
    return sendCreated(res, reply, 'Canned reply created');
  } catch (error) {
    next(error);
  }
}
