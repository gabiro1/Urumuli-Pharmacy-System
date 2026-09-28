import { query, queryOne } from '../../config/database.js';

export function createMessage({ name, email, subject, message }) {
  return queryOne(
    `INSERT INTO contact_messages (name, email, subject, message)
     VALUES ($1, $2, $3, $4) RETURNING id, status, created_at`,
    [name, email.toLowerCase(), subject || null, message]
  );
}

export async function listMessages({ status, search, limit = 50, offset = 0 } = {}) {
  const conditions = [];
  const params = [];
  let paramIndex = 1;

  if (status) {
    conditions.push(`status = $${paramIndex++}`);
    params.push(status);
  }
  if (search) {
    conditions.push(`(name ILIKE $${paramIndex} OR email ILIKE $${paramIndex} OR subject ILIKE $${paramIndex} OR message ILIKE $${paramIndex})`);
    params.push(`%${search}%`);
    paramIndex++;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = await query(
    `SELECT id, name, email, subject, message, status, created_at, replied_at
     FROM contact_messages ${where}
     ORDER BY created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
    [...params, limit, offset]
  );

  const countRow = await queryOne(
    `SELECT COUNT(*)::int AS total FROM contact_messages ${where}`,
    params
  );

  return { rows, total: countRow?.total || 0 };
}

export function findMessageById(id) {
  return queryOne(
    `SELECT m.id, m.name, m.email, m.subject, m.message, m.status, m.created_at, m.replied_at,
            COALESCE(
              (SELECT json_agg(json_build_object(
                'id', r.id,
                'body', r.body,
                'staffEmail', r.staff_email,
                'createdAt', r.created_at
              ) ORDER BY r.created_at) FROM contact_replies r WHERE r.message_id = m.id),
              '[]'::json
            ) AS replies
     FROM contact_messages m WHERE m.id = $1`,
    [id]
  );
}

export function updateMessageStatus(id, status) {
  return queryOne(
    `UPDATE contact_messages SET status = $1
     WHERE id = $2 RETURNING id, name, email, subject, status, created_at, replied_at`,
    [status, id]
  );
}

export async function createReply({ messageId, body, staffEmail, staffRole }) {
  await query(
    `INSERT INTO contact_replies (message_id, body, staff_email, staff_role) VALUES ($1, $2, $3, $4)`,
    [messageId, body, staffEmail, staffRole]
  );
  await queryOne(
    `UPDATE contact_messages SET status = 'RESOLVED', replied_at = NOW() WHERE id = $1 RETURNING id`,
    [messageId]
  );
  return findMessageById(messageId);
}
