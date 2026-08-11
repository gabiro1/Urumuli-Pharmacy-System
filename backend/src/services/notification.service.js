import { query } from '../config/database.js';

const MAX_NOTIFICATIONS_PER_USER = 200;

export async function createNotification({ userId, type, title, message, referenceType, referenceId }) {
  if (!userId) return null;
  try {
    const [row] = await query(
      `INSERT INTO notifications (user_id, type, title, message, reference_type, reference_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, type, title, message, reference_type, reference_id, is_read, created_at`,
      [userId, type, title, message || null, referenceType || null, referenceId || null]
    );
    await query(
      `DELETE FROM notifications WHERE id IN (
         SELECT id FROM notifications WHERE user_id = $1 ORDER BY created_at DESC OFFSET $2
       )`,
      [userId, MAX_NOTIFICATIONS_PER_USER]
    );
    return row;
  } catch (error) {
    console.error('[notification] failed to create:', error.message);
    return null;
  }
}

export async function notifyOrderPatient(order, { type, title, message }) {
  try {
    const [identity] = await query(
      'SELECT user_id FROM patient_identities WHERE id = $1 AND user_id IS NOT NULL',
      [order.patient_identity_id]
    );
    if (!identity?.user_id) return null;
    return createNotification({
      userId: identity.user_id,
      type,
      title,
      message,
      referenceType: 'ORDER',
      referenceId: order.id,
    });
  } catch (error) {
    console.error('[notification] order patient failed:', error.message);
    return null;
  }
}
