import { query, queryOne } from '../../config/database.js';

export async function getSubstitutes(medicineId) {
  const { rows } = await query(
    `SELECT ms.*, m.name AS substitute_name, m.generic_name AS substitute_generic,
            m.price AS substitute_price, m.current_stock AS substitute_stock,
            m.brand_name AS substitute_brand
     FROM medicine_substitutions ms
     JOIN medicines m ON m.id = ms.substitute_medicine_id
     WHERE ms.original_medicine_id = $1`,
    [medicineId]
  );
  return rows;
}

export async function findSubstitutesByName(search) {
  const { rows } = await query(
    `SELECT ms.*, m.name AS original_name, s.name AS substitute_name,
            m.price AS original_price, s.price AS substitute_price
     FROM medicine_substitutions ms
     JOIN medicines m ON m.id = ms.original_medicine_id
     JOIN medicines s ON s.id = ms.substitute_medicine_id
     WHERE m.name ILIKE $1 OR s.name ILIKE $1 OR m.generic_name ILIKE $1 OR s.generic_name ILIKE $1
     ORDER BY ms.therapeutic_equivalence ASC`,
    [`%${search}%`]
  );
  return rows;
}

export async function createSubstitution(data) {
  const [row] = await query(
    `INSERT INTO medicine_substitutions (original_medicine_id, substitute_medicine_id, therapeutic_equivalence, notes, pharmacist_approved, approved_by)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [data.originalMedicineId, data.substituteMedicineId, data.therapeuticEquivalence || 'A',
     data.notes || null, data.pharmacistApproved || false, data.approvedBy || null]
  );
  return row;
}

export async function approveSubstitution(id, approvedBy) {
  const [row] = await query(
    `UPDATE medicine_substitutions SET pharmacist_approved = TRUE, approved_by = $2 WHERE id = $1 RETURNING *`,
    [id, approvedBy]
  );
  return row;
}

export async function deleteSubstitution(id) {
  const [row] = await query(`DELETE FROM medicine_substitutions WHERE id = $1 RETURNING *`, [id]);
  return row;
}
