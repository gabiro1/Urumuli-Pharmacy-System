import { query, queryOne } from '../../config/database.js';

export async function listReports({ pharmacyId, reportType, status, page = 1, limit = 20 } = {}) {
  const conditions = [];
  const params = [];
  let idx = 1;
  if (pharmacyId) { conditions.push(`rr.pharmacy_id = $${idx++}`); params.push(pharmacyId); }
  if (reportType) { conditions.push(`rr.report_type = $${idx++}`); params.push(reportType); }
  if (status) { conditions.push(`rr.status = $${idx++}`); params.push(status); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;
  const countResult = await query(`SELECT COUNT(*) FROM regulatory_reports rr ${where}`, params);
  const total = parseInt(countResult.rows[0].count, 10);
  const { rows } = await query(
    `SELECT rr.*, u.full_name AS generated_by_name, p.name AS pharmacy_name
     FROM regulatory_reports rr
     LEFT JOIN users u ON u.id = rr.generated_by
     LEFT JOIN pharmacies p ON p.id = rr.pharmacy_id
     ${where} ORDER BY rr.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, limit, offset]
  );
  return { data: rows, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
}

export async function getReport(id) {
  return queryOne(
    `SELECT rr.*, u.full_name AS generated_by_name, p.name AS pharmacy_name
     FROM regulatory_reports rr
     LEFT JOIN users u ON u.id = rr.generated_by
     LEFT JOIN pharmacies p ON p.id = rr.pharmacy_id
     WHERE rr.id = $1`, [id]
  );
}

export async function createReport(data) {
  const [row] = await query(
    `INSERT INTO regulatory_reports (pharmacy_id, report_type, period_start, period_end, status, generated_by, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [data.pharmacyId || null, data.reportType, data.periodStart, data.periodEnd,
     data.status || 'DRAFT', data.generatedBy || null, JSON.stringify(data.metadata || {})]
  );
  return row;
}

export async function updateReport(id, updates) {
  const fields = [];
  const params = [];
  let idx = 1;
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      const col = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      fields.push(`${col} = $${idx++}`);
      params.push(typeof value === 'object' ? JSON.stringify(value) : value);
    }
  }
  if (!fields.length) return null;
  fields.push('updated_at = NOW()');
  params.push(id);
  const [row] = await query(`UPDATE regulatory_reports SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, params);
  return row;
}

export async function deleteReport(id) {
  const [row] = await query(`DELETE FROM regulatory_reports WHERE id = $1 AND status = 'DRAFT' RETURNING *`, [id]);
  return row;
}
