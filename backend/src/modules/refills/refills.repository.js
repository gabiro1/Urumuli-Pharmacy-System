import { query, queryOne } from '../../config/database.js';

export async function listReminders(patientId, { status, page = 1, limit = 20 } = {}) {
  const conditions = ['rr.patient_id = $1'];
  const params = [patientId];
  let idx = 2;
  if (status) { conditions.push(`rr.status = $${idx++}`); params.push(status); }
  const where = `WHERE ${conditions.join(' AND ')}`;
  const offset = (page - 1) * limit;

  const countResult = await query(`SELECT COUNT(*) FROM refill_reminders rr ${where}`, params);
  const total = parseInt(countResult.rows[0].count, 10);
  const { rows } = await query(
    `SELECT rr.*, m.name AS medicine_name FROM refill_reminders rr
     LEFT JOIN medicines m ON m.id = rr.medicine_id
     ${where} ORDER BY rr.next_refill_date ASC NULLS LAST
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, limit, offset]
  );
  return { data: rows, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
}

export async function getDueReminders() {
  const { rows } = await query(
    `SELECT rr.*, m.name AS medicine_name, u.full_name AS patient_name, u.email AS patient_email
     FROM refill_reminders rr
     LEFT JOIN medicines m ON m.id = rr.medicine_id
     JOIN users u ON u.id = rr.patient_id
     WHERE rr.status = 'ACTIVE' AND rr.next_refill_date <= CURRENT_DATE + INTERVAL '7 days'`
  );
  return rows;
}

export async function createReminder(data) {
  const [row] = await query(
    `INSERT INTO refill_reminders (patient_id, medicine_id, medicine_name, prescription_id, days_before_refill, next_refill_date, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [data.patientId, data.medicineId || null, data.medicineName, data.prescriptionId || null,
     data.daysBeforeRefill || 5, data.nextRefillDate, data.status || 'ACTIVE']
  );
  return row;
}

export async function updateReminder(id, updates) {
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
  const [row] = await query(`UPDATE refill_reminders SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, params);
  return row;
}

export async function deleteReminder(id) {
  const [row] = await query(`DELETE FROM refill_reminders WHERE id = $1 RETURNING *`, [id]);
  return row;
}
