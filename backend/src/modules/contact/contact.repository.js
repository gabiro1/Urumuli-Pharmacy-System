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
    `SELECT id, name, email, subject, message, status, created_at
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
    `SELECT id, name, email, subject, message, status, created_at
     FROM contact_messages WHERE id = $1`,
    [id]
  );
}

export function updateMessageStatus(id, status) {
  return queryOne(
    `UPDATE contact_messages SET status = $1
     WHERE id = $2 RETURNING id, name, email, subject, status, created_at`,
    [status, id]
  );
}
