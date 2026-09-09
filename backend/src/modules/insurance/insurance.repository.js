import { query, queryOne } from '../../config/database.js';

export async function listProviders({ page = 1, limit = 20, status } = {}) {
  const conditions = [];
  const params = [];
  let idx = 1;
  if (status) { conditions.push(`ip.status = $${idx++}`); params.push(status); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const countResult = await query(`SELECT COUNT(*) FROM insurance_providers ip ${where}`, params);
  const total = parseInt(countResult.rows[0].count, 10);
  const { rows } = await query(`SELECT ip.* FROM insurance_providers ip ${where} ORDER BY ip.name LIMIT $${idx++} OFFSET $${idx++}`, [...params, limit, offset]);
  return { data: rows, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
}

export async function getProvider(id) {
  return queryOne('SELECT * FROM insurance_providers WHERE id = $1', [id]);
}

export async function createProvider(data) {
  const [row] = await query(
    `INSERT INTO insurance_providers (name, code, contact_email, contact_phone, website, api_endpoint, status, supported_plan_types)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [data.name, data.code, data.contactEmail || null, data.contactPhone || null,
     data.website || null, data.apiEndpoint || null, data.status || 'ACTIVE', JSON.stringify(data.supportedPlanTypes || [])]
  );
  return row;
}

export async function updateProvider(id, data) {
  const fields = [];
  const params = [];
  let idx = 1;
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      const col = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      fields.push(`${col} = $${idx++}`);
      params.push(typeof value === 'object' ? JSON.stringify(value) : value);
    }
  }
  if (!fields.length) return null;
  fields.push('updated_at = NOW()');
  params.push(id);
  const [row] = await query(`UPDATE insurance_providers SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, params);
  return row;
}

export async function listClaims({ patientId, status, page = 1, limit = 20 } = {}) {
  const conditions = [];
  const params = [];
  let idx = 1;
  if (patientId) { conditions.push(`ic.patient_id = $${idx++}`); params.push(patientId); }
  if (status) { conditions.push(`ic.status = $${idx++}`); params.push(status); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const countResult = await query(`SELECT COUNT(*) FROM insurance_claims ic ${where}`, params);
  const total = parseInt(countResult.rows[0].count, 10);
  const { rows } = await query(
    `SELECT ic.*, ip.name AS provider_name, u.full_name AS patient_name
     FROM insurance_claims ic
     LEFT JOIN insurance_providers ip ON ip.id = ic.insurance_provider_id
     JOIN users u ON u.id = ic.patient_id
     ${where} ORDER BY ic.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, limit, offset]
  );
  return { data: rows, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
}

export async function getClaim(id) {
  return queryOne(
    `SELECT ic.*, ip.name AS provider_name, u.full_name AS patient_name
     FROM insurance_claims ic
     LEFT JOIN insurance_providers ip ON ip.id = ic.insurance_provider_id
     JOIN users u ON u.id = ic.patient_id
     WHERE ic.id = $1`, [id]
  );
}

export async function createClaim(data) {
  const [row] = await query(
    `INSERT INTO insurance_claims (patient_id, order_id, prescription_id, insurance_provider_id, policy_number, total_amount, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [data.patientId, data.orderId || null, data.prescriptionId || null,
     data.insuranceProviderId || null, data.policyNumber || null, data.totalAmount, data.status || 'DRAFT']
  );
  return row;
}

export async function updateClaimStatus(id, status, extra = {}) {
  const fields = ['status = $2', 'updated_at = NOW()'];
  const params = [id, status];
  let idx = 3;
  if (status === 'SUBMITTED') { fields.push(`submitted_at = NOW()`); }
  if (status === 'APPROVED' || status === 'DENIED') { fields.push(`processed_at = NOW()`); }
  if (extra.coveredAmount !== undefined) { fields.push(`covered_amount = $${idx++}`); params.push(extra.coveredAmount); }
  if (extra.copayAmount !== undefined) { fields.push(`copay_amount = $${idx++}`); params.push(extra.copayAmount); }
  if (extra.denialReason) { fields.push(`denial_reason = $${idx++}`); params.push(extra.denialReason); }
  const [row] = await query(`UPDATE insurance_claims SET ${fields.join(', ')} WHERE id = $1 RETURNING *`, params);
  return row;
}
