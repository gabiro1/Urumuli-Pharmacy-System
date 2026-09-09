import { query, queryOne } from '../../config/database.js';

export async function listByPatient(patientId, { startDate, endDate, page = 1, limit = 50 } = {}) {
  const conditions = ['pa.patient_id = $1'];
  const params = [patientId];
  let idx = 2;
  if (startDate) { conditions.push(`pa.scheduled_date >= $${idx++}`); params.push(startDate); }
  if (endDate) { conditions.push(`pa.scheduled_date <= $${idx++}`); params.push(endDate); }
  const where = `WHERE ${conditions.join(' AND ')}`;
  const offset = (page - 1) * limit;
  const countResult = await query(`SELECT COUNT(*) FROM patient_adherence pa ${where}`, params);
  const total = parseInt(countResult.rows[0].count, 10);
  const { rows } = await query(
    `SELECT pa.*, m.name AS medicine_name FROM patient_adherence pa
     LEFT JOIN medicines m ON m.id = pa.medicine_id
     ${where} ORDER BY pa.scheduled_date DESC, pa.scheduled_time DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, limit, offset]
  );
  return { data: rows, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
}

export async function markTaken(id) {
  const [row] = await query(
    `UPDATE patient_adherence SET taken = TRUE, taken_at = NOW() WHERE id = $1 AND NOT taken RETURNING *`, [id]
  );
  return row;
}

export async function createEntry(data) {
  const [row] = await query(
    `INSERT INTO patient_adherence (patient_id, prescription_id, medicine_id, medicine_name, scheduled_time, scheduled_date, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [data.patientId, data.prescriptionId || null, data.medicineId || null, data.medicineName,
     data.scheduledTime || null, data.scheduledDate, data.notes || null]
  );
  return row;
}

export async function getAdherenceRate(patientId, { startDate, endDate } = {}) {
  const conditions = ['pa.patient_id = $1'];
  const params = [patientId];
  let idx = 2;
  if (startDate) { conditions.push(`pa.scheduled_date >= $${idx++}`); params.push(startDate); }
  if (endDate) { conditions.push(`pa.scheduled_date <= $${idx++}`); params.push(endDate); }
  const where = conditions.join(' AND ');
  const { rows } = await query(
    `SELECT
       COUNT(*) AS total_doses,
       COUNT(*) FILTER (WHERE taken) AS taken_doses,
       ROUND(COUNT(*) FILTER (WHERE taken)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 1) AS adherence_rate
     FROM patient_adherence pa WHERE ${where}`, params
  );
  return rows[0];
}
