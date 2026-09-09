import { query, queryOne } from '../../config/database.js';

export async function listSessions({ patientId, pharmacistId, status, page = 1, limit = 20 } = {}) {
  const conditions = [];
  const params = [];
  let idx = 1;
  if (patientId) { conditions.push(`ts.patient_id = $${idx++}`); params.push(patientId); }
  if (pharmacistId) { conditions.push(`ts.pharmacist_id = $${idx++}`); params.push(pharmacistId); }
  if (status) { conditions.push(`ts.status = $${idx++}`); params.push(status); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;
  const countResult = await query(`SELECT COUNT(*) FROM telehealth_sessions ts ${where}`, params);
  const total = parseInt(countResult.rows[0].count, 10);
  const { rows } = await query(
    `SELECT ts.*, u.full_name AS patient_name, p.full_name AS pharmacist_name, ph.name AS pharmacy_name
     FROM telehealth_sessions ts
     JOIN users u ON u.id = ts.patient_id
     JOIN users p ON p.id = ts.pharmacist_id
     LEFT JOIN pharmacies ph ON ph.id = ts.pharmacy_id
     ${where} ORDER BY ts.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, limit, offset]
  );
  return { data: rows, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
}

export async function getSession(id) {
  return queryOne(
    `SELECT ts.*, u.full_name AS patient_name, p.full_name AS pharmacist_name, ph.name AS pharmacy_name
     FROM telehealth_sessions ts
     JOIN users u ON u.id = ts.patient_id
     JOIN users p ON p.id = ts.pharmacist_id
     LEFT JOIN pharmacies ph ON ph.id = ts.pharmacy_id
     WHERE ts.id = $1`, [id]
  );
}

export async function createSession(data) {
  const roomId = `telehealth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const [row] = await query(
    `INSERT INTO telehealth_sessions (conversation_id, patient_id, pharmacist_id, pharmacy_id, status, room_id, scheduled_at, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [data.conversationId || null, data.patientId, data.pharmacistId, data.pharmacyId || null,
     data.status || 'SCHEDULED', roomId, data.scheduledAt || null, data.notes || null]
  );
  return row;
}

export async function updateSession(id, updates) {
  const fields = [];
  const params = [];
  let idx = 1;
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      const col = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      fields.push(`${col} = $${idx++}`);
      params.push(value);
    }
  }
  if (!fields.length) return null;
  fields.push('updated_at = NOW()');
  params.push(id);
  const [row] = await query(`UPDATE telehealth_sessions SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, params);
  return row;
}

export async function getUpcomingForUser(userId) {
  const { rows } = await query(
    `SELECT ts.*, u.full_name AS patient_name, p.full_name AS pharmacist_name
     FROM telehealth_sessions ts
     JOIN users u ON u.id = ts.patient_id
     JOIN users p ON p.id = ts.pharmacist_id
     WHERE (ts.patient_id = $1 OR ts.pharmacist_id = $1)
       AND ts.status IN ('SCHEDULED', 'WAITING')
       AND ts.scheduled_at >= NOW()
     ORDER BY ts.scheduled_at ASC LIMIT 10`, [userId]
  );
  return rows;
}
