import { query, queryOne } from '../../config/database.js';

export const listAuditLogs = async ({ userId, action, entity, fromDate, toDate, limit, offset }) => {
  const conditions = [];
  const params = [];
  let paramIndex = 1;

  if (userId) {
    conditions.push(`al.user_id = $${paramIndex++}`);
    params.push(userId);
  }
  if (action) {
    conditions.push(`al.action = $${paramIndex++}`);
    params.push(action);
  }
  if (entity) {
    conditions.push(`al.entity = $${paramIndex++}`);
    params.push(entity);
  }
  if (fromDate) {
    conditions.push(`al.created_at >= $${paramIndex++}`);
    params.push(fromDate);
  }
  if (toDate) {
    conditions.push(`al.created_at <= $${paramIndex++}`);
    params.push(toDate);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await queryOne(
    `SELECT COUNT(*)::int AS total FROM audit_logs al ${whereClause}`,
    params
  );

  const rows = await query(
    `SELECT al.*, CONCAT(u.first_name, ' ', u.last_name) AS user_name, u.email AS user_email, u.role AS user_role
     FROM audit_logs al
     LEFT JOIN users u ON u.id = al.user_id
     ${whereClause}
     ORDER BY al.created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
    [...params, limit, offset]
  );

  return { rows, total: countResult?.total ?? 0 };
};

export const findAuditLogById = async (id) => {
  return queryOne(
    `SELECT al.*, CONCAT(u.first_name, ' ', u.last_name) AS user_name, u.email AS user_email, u.role AS user_role
     FROM audit_logs al
     LEFT JOIN users u ON u.id = al.user_id
     WHERE al.id = $1`,
    [id]
  );
};
