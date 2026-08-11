import * as notificationsRepository from './notifications.repository.js';
import { sendPaginated, sendSuccess } from '../../utils/response.js';
import { NotFoundError } from '../../utils/errors.js';

export async function listMyNotifications(req, res, next) {
  try {
    const unreadOnly = req.query.unread === 'true';
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
    const offset = (page - 1) * limit;
    const { rows, total, unread } = await notificationsRepository.listUserNotifications(req.user.userId, {
      unreadOnly,
      limit,
      offset,
    });
    return sendPaginated(res, rows, { total, unread, page, limit, pages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
}

export async function unreadCount(req, res, next) {
  try {
    const { unread } = await notificationsRepository.listUserNotifications(req.user.userId, { limit: 1 });
    return sendSuccess(res, { unread });
  } catch (error) {
    next(error);
  }
}

export async function markRead(req, res, next) {
  try {
    const notification = await notificationsRepository.markNotificationRead(req.user.userId, req.params.id);
    if (!notification) throw new NotFoundError('Notification', req.params.id);
    return sendSuccess(res, notification, 'Notification marked as read');
  } catch (error) {
    next(error);
  }
}

export async function markAllRead(req, res, next) {
  try {
    const updated = await notificationsRepository.markAllRead(req.user.userId);
    return sendSuccess(res, { updated }, 'All notifications marked as read');
  } catch (error) {
    next(error);
  }
}
