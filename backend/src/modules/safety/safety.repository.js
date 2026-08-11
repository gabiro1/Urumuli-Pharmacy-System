import { query, queryOne } from '../../config/database.js';

export async function findMedicinesByIds(ids) {
  return query(
    `SELECT m.id, m.name, m.generic_name, m.brand_name, m.description,
            m.side_effects, m.contraindications, m.symptoms, m.tags,
            c.name AS category_name
     FROM medicines m
     LEFT JOIN categories c ON c.id = m.category_id
     WHERE m.id = ANY($1::uuid[])`,
    [ids]
  );
}

export async function findInteractions(medicineIds) {
  return query(
    `SELECT
       di.*,
       ma.name AS medicine_a_name,
       mb.name AS medicine_b_name
     FROM drug_interactions di
     JOIN medicines ma ON ma.id = di.medicine_a_id
     JOIN medicines mb ON mb.id = di.medicine_b_id
     WHERE di.medicine_a_id = ANY($1::uuid[])
       AND di.medicine_b_id = ANY($1::uuid[])
     ORDER BY
       CASE di.severity
         WHEN 'CONTRAINDICATED' THEN 1
         WHEN 'SEVERE' THEN 2
         WHEN 'MODERATE' THEN 3
         ELSE 4
       END,
       di.created_at DESC`,
    [medicineIds]
  );
}

export async function findPatientAllergies(patientPhone) {
  return query(
    `SELECT *
     FROM patient_allergies
     WHERE patient_phone = $1
     ORDER BY
       CASE severity
         WHEN 'SEVERE' THEN 1
         WHEN 'MODERATE' THEN 2
         WHEN 'MILD' THEN 3
         ELSE 4
       END,
       created_at DESC`,
    [patientPhone]
  );
}

export async function listInteractions({ limit = 50, offset = 0, medicineId, severity } = {}) {
  const conditions = [];
  const params = [];
  let idx = 1;

  if (medicineId) {
    conditions.push(`(di.medicine_a_id = $${idx} OR di.medicine_b_id = $${idx})`);
    params.push(medicineId);
    idx++;
  }

  if (severity) {
    conditions.push(`di.severity = $${idx++}`);
    params.push(severity);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await queryOne(
    `SELECT COUNT(*)::int AS total FROM drug_interactions di ${where}`,
    params
  );

  const rows = await query(
    `SELECT
       di.*,
       ma.name AS medicine_a_name,
       ma.generic_name AS medicine_a_generic,
       mb.name AS medicine_b_name,
       mb.generic_name AS medicine_b_generic
     FROM drug_interactions di
     JOIN medicines ma ON ma.id = di.medicine_a_id
     JOIN medicines mb ON mb.id = di.medicine_b_id
     ${where}
     ORDER BY
       CASE di.severity
         WHEN 'CONTRAINDICATED' THEN 1
         WHEN 'SEVERE' THEN 2
         WHEN 'MODERATE' THEN 3
         ELSE 4
       END,
       di.updated_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, limit, offset]
  );

  return { rows, total: countResult?.total ?? 0 };
}

export async function findInteractionByPair(medicineAId, medicineBId) {
  const [lowId, highId] = [medicineAId, medicineBId].sort();
  return queryOne(
    `SELECT * FROM drug_interactions WHERE medicine_a_id = $1 AND medicine_b_id = $2`,
    [lowId, highId]
  );
}

export async function findInteractionById(id) {
  return queryOne(`SELECT * FROM drug_interactions WHERE id = $1`, [id]);
}

export async function createInteraction(data) {
  const [lowId, highId] = [data.medicineAId, data.medicineBId].sort();
  return queryOne(
    `INSERT INTO drug_interactions
       (medicine_a_id, medicine_b_id, severity, description, mechanism, recommendation, evidence_level, source)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      lowId,
      highId,
      data.severity,
      data.description,
      data.mechanism || null,
      data.recommendation || null,
      data.evidenceLevel || null,
      data.source || null,
    ]
  );
}

export async function deleteInteraction(id) {
  return queryOne(
    'DELETE FROM drug_interactions WHERE id = $1 RETURNING *',
    [id]
  );
}
