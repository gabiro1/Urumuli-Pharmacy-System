import { query, queryOne } from '../../config/database.js';

export async function listUserNotifications(userId, { unreadOnly = false, limit = 50, offset = 0 } = {}) {
  const conditions = ['user_id = $1'];
  const params = [userId];
  if (unreadOnly) conditions.push('is_read = false');
  const where = conditions.join(' AND ');

  const rows = await query(
    `SELECT id, type, title, message, reference_type, reference_id, is_read, created_at
     FROM notifications WHERE ${where}
     ORDER BY created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  const countRow = await queryOne(
    `SELECT COUNT(*)::int AS total FROM notifications WHERE ${where}`,
    params
  );
  const unreadRow = await queryOne(
    `SELECT COUNT(*)::int AS unread FROM notifications WHERE user_id = $1 AND is_read = false`,
    [userId]
  );

  return { rows, total: countRow?.total || 0, unread: unreadRow?.unread || 0 };
}

export function markNotificationRead(userId, notificationId) {
  return queryOne(
    `UPDATE notifications SET is_read = true
     WHERE id = $1 AND user_id = $2
     RETURNING id, is_read`,
    [notificationId, userId]
  );
}

export async function markAllRead(userId) {
  const rows = await query(
    `UPDATE notifications SET is_read = true
     WHERE user_id = $1 AND is_read = false
     RETURNING id`,
    [userId]
  );
  return rows.length;
}
