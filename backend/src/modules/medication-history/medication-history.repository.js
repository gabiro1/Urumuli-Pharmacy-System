import { query, queryOne } from '../../config/database.js';

export async function listPatientHistory(patientId, { status, page = 1, limit = 20 } = {}) {
  const conditions = ['pmh.patient_id = $1'];
  const params = [patientId];
  let idx = 2;

  if (status) { conditions.push(`pmh.status = $${idx++}`); params.push(status); }
  const where = `WHERE ${conditions.join(' AND ')}`;
  const offset = (page - 1) * limit;

  const countResult = await query(`SELECT COUNT(*) FROM patient_medication_history pmh ${where}`, params);
  const total = parseInt(countResult.rows[0].count, 10);

  const { rows } = await query(
    `SELECT pmh.*, m.name AS medicine_current_name, m.generic_name
     FROM patient_medication_history pmh
     LEFT JOIN medicines m ON m.id = pmh.medicine_id
     ${where}
     ORDER BY pmh.created_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, limit, offset]
  );

  return { data: rows, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
}

export async function getActiveMedications(patientId) {
  const { rows } = await query(
    `SELECT pmh.*, m.name AS medicine_current_name, m.generic_name
     FROM patient_medication_history pmh
     LEFT JOIN medicines m ON m.id = pmh.medicine_id
     WHERE pmh.patient_id = $1 AND pmh.status = 'ACTIVE'
     ORDER BY pmh.start_date DESC NULLS LAST`,
    [patientId]
  );
  return rows;
}

export async function addEntry({ patientId, medicineId, medicineName, prescriptionId, orderId, dosage, frequency, duration, prescribedBy, startDate, endDate, status, notes }) {
  const [row] = await query(
    `INSERT INTO patient_medication_history
     (patient_id, medicine_id, medicine_name, prescription_id, order_id, dosage, frequency, duration, prescribed_by, start_date, end_date, status, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING *`,
    [patientId, medicineId || null, medicineName, prescriptionId || null, orderId || null, dosage || null, frequency || null, duration || null, prescribedBy || null, startDate || null, endDate || null, status || 'ACTIVE', notes || null]
  );
  return row;
}

export async function updateEntry(id, updates) {
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

  fields.push(`updated_at = NOW()`);
  params.push(id);

  const [row] = await query(
    `UPDATE patient_medication_history SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    params
  );
  return row;
}

export async function getHistoryById(id) {
  return queryOne(
    `SELECT pmh.*, m.name AS medicine_current_name, m.generic_name
     FROM patient_medication_history pmh
     LEFT JOIN medicines m ON m.id = pmh.medicine_id
     WHERE pmh.id = $1`,
    [id]
  );
}

export async function getPatientTimeline(patientId) {
  const { rows } = await query(
    `SELECT pmh.*, m.name AS medicine_current_name
     FROM patient_medication_history pmh
     LEFT JOIN medicines m ON m.id = pmh.medicine_id
     WHERE pmh.patient_id = $1
     ORDER BY COALESCE(pmh.start_date, pmh.created_at) DESC`,
    [patientId]
  );
  return rows;
}
