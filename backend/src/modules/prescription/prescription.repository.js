import { query, queryOne } from '../../config/database.js';

const prescriptionFields = `
  p.id, p.patient_id, p.patient_name, p.patient_dob, p.patient_gender,
  p.patient_phone, p.patient_email, p.patient_address,
  p.doctor_name, p.doctor_license_number, p.hospital_name,
  p.diagnosis, p.notes, p.file_path, p.file_type,
  p.status, p.urgency, p.pharmacist_id,
  CONCAT(pharmacist.first_name, ' ', pharmacist.last_name) as pharmacist_name,
  p.pharmacist_notes, p.approved_at, p.rejected_at,
  p.rejection_reason, p.completed_at,
  p.uploaded_by,
  CONCAT(uploader.first_name, ' ', uploader.last_name) as uploaded_by_name,
  p.expires_at,
  p.created_at, p.updated_at
`;

export async function findById(id) {
  return queryOne(
    `SELECT ${prescriptionFields}
     FROM prescriptions p
     LEFT JOIN users pharmacist ON pharmacist.id = p.pharmacist_id
     LEFT JOIN users uploader ON uploader.id = p.uploaded_by
     WHERE p.id = $1`,
    [id]
  );
}

export async function listPrescriptions({
  limit,
  offset,
  status,
  patientPhone,
  fromDate,
  toDate,
  search,
  urgency,
  pharmacist,
}) {
  const conditions = [];
  const params = [];
  let idx = 1;

  if (status) {
    conditions.push(`p.status = $${idx++}`);
    params.push(status);
  }
  if (patientPhone) {
    conditions.push(`p.patient_phone = $${idx++}`);
    params.push(patientPhone);
  }
  if (search) {
    conditions.push(`(
      p.patient_name ILIKE $${idx}
      OR p.id::text ILIKE $${idx}
      OR p.doctor_name ILIKE $${idx}
      OR p.patient_phone ILIKE $${idx}
    )`);
    params.push(`%${search}%`);
    idx++;
  }
  if (urgency) {
    conditions.push(`p.urgency = $${idx++}`);
    params.push(urgency);
  }
  if (pharmacist) {
    conditions.push(`(
      CONCAT(COALESCE(pharmacist.first_name, ''), ' ', COALESCE(pharmacist.last_name, '')) ILIKE $${idx}
      OR pharmacist.email ILIKE $${idx}
      OR p.pharmacist_id::text = $${idx}
    )`);
    params.push(`%${pharmacist}%`);
    idx++;
  }
  if (fromDate) {
    conditions.push(`p.created_at >= $${idx++}`);
    params.push(fromDate);
  }
  if (toDate) {
    conditions.push(`p.created_at <= $${idx++}`);
    params.push(toDate);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await queryOne(
    `SELECT COUNT(*)::int AS total
     FROM prescriptions p
     LEFT JOIN users pharmacist ON pharmacist.id = p.pharmacist_id
     ${where}`,
    params
  );

  const dataSql = `
    SELECT ${prescriptionFields}
    FROM prescriptions p
    LEFT JOIN users pharmacist ON pharmacist.id = p.pharmacist_id
    LEFT JOIN users uploader ON uploader.id = p.uploaded_by
    ${where}
    ORDER BY p.created_at DESC
    LIMIT $${idx++} OFFSET $${idx++}
  `;

  const rows = await query(dataSql, [...params, limit, offset]);

  return { rows, total: countResult.total };
}

export async function listPatientPrescriptions(userId, { limit, offset, status }) {
  const conditions = ['p.patient_id = $1'];
  const params = [userId];
  let idx = 2;

  if (status) {
    conditions.push(`p.status = $${idx++}`);
    params.push(status);
  }

  const where = conditions.join(' AND ');

  const countResult = await queryOne(
    `SELECT COUNT(*)::int AS total FROM prescriptions p WHERE ${where}`,
    params
  );

  const dataSql = `
    SELECT ${prescriptionFields}
    FROM prescriptions p
    LEFT JOIN users pharmacist ON pharmacist.id = p.pharmacist_id
    LEFT JOIN users uploader ON uploader.id = p.uploaded_by
    WHERE ${where}
    ORDER BY p.created_at DESC
    LIMIT $${idx++} OFFSET $${idx++}
  `;

  const rows = await query(dataSql, [...params, limit, offset]);

  return { rows, total: countResult.total };
}

export async function getPrescriptionItems(prescriptionId) {
  const rows = await query(
    `SELECT * FROM prescription_items WHERE prescription_id = $1 ORDER BY created_at`,
    [prescriptionId]
  );
  return rows;
}

export async function createPrescription(client, data) {
  const { rows } = await client.query(
    `INSERT INTO prescriptions (patient_name, patient_dob, patient_gender,
      patient_phone, patient_email, patient_address, doctor_name,
      doctor_license_number, hospital_name, diagnosis, notes,
      uploaded_by, patient_id, expires_at, status, urgency)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
     RETURNING *`,
    [
      data.patient_name, data.patient_dob, data.patient_gender,
      data.patient_phone, data.patient_email, data.patient_address,
      data.doctor_name, data.doctor_license_number, data.hospital_name,
      data.diagnosis, data.notes, data.uploaded_by, data.patient_id,
      data.expires_at, data.status, data.urgency || 'NORMAL',
    ]
  );
  return rows[0];
}

export async function getPatientIdentity(userId) {
  return queryOne(
    `SELECT u.id, u.email, u.first_name, u.last_name, u.phone,
            pp.date_of_birth, pp.gender, pp.address
     FROM users u
     LEFT JOIN patient_profiles pp ON pp.user_id = u.id
     WHERE u.id = $1`,
    [userId]
  );
}

export async function createPrescriptionItems(client, items) {
  if (!items || items.length === 0) return [];

  const placeholders = [];
  const values = [];
  let idx = 1;

  for (const item of items) {
    placeholders.push(
      `($${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++})`
    );
    values.push(
      item.prescription_id, item.medicine_name, item.medicine_id,
      item.dosage, item.frequency, item.duration, item.quantity, item.notes
    );
  }

  const { rows } = await client.query(
    `INSERT INTO prescription_items (prescription_id, medicine_name, medicine_id,
      dosage, frequency, duration, quantity, notes)
     VALUES ${placeholders.join(', ')}
     RETURNING *`,
    values
  );
  return rows;
}

export async function updateStatus(id, pharmacistId, status) {
  return queryOne(
    `UPDATE prescriptions SET status = $1, pharmacist_id = $2 WHERE id = $3 RETURNING *`,
    [status, pharmacistId, id]
  );
}

export async function approvePrescription(id, pharmacistId, notes) {
  return queryOne(
    `UPDATE prescriptions
     SET status = 'APPROVED', pharmacist_id = $1,
         pharmacist_notes = $2, approved_at = NOW()
     WHERE id = $3 RETURNING *`,
    [pharmacistId, notes, id]
  );
}

export async function rejectPrescription(id, pharmacistId, reason) {
  return queryOne(
    `UPDATE prescriptions
     SET status = 'REJECTED', pharmacist_id = $1,
         rejection_reason = $2, rejected_at = NOW()
     WHERE id = $3 RETURNING *`,
    [pharmacistId, reason, id]
  );
}

export async function markAsCompleted(id, pharmacistId) {
  return queryOne(
    `UPDATE prescriptions SET status = 'COMPLETED', pharmacist_id = $1, completed_at = NOW() WHERE id = $2 RETURNING *`,
    [pharmacistId, id]
  );
}

export async function updateFilePath(id, filePath, fileType) {
  return queryOne(
    `UPDATE prescriptions SET file_path = $1, file_type = $2 WHERE id = $3 RETURNING *`,
    [filePath, fileType, id]
  );
}
