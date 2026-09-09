import { query, queryOne } from '../../config/database.js';

export async function listSuggestions({ status, page = 1, limit = 20 } = {}) {
  const conditions = [];
  const params = [];
  let idx = 1;
  if (status) { conditions.push(`irs.status = $${idx++}`); params.push(status); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;
  const countResult = await query(`SELECT COUNT(*) FROM inventory_reorder_suggestions irs ${where}`, params);
  const total = parseInt(countResult.rows[0].count, 10);
  const { rows } = await query(
    `SELECT irs.*, m.name AS medicine_name, m.current_stock, m.reorder_point,
            s.name AS supplier_name
     FROM inventory_reorder_suggestions irs
     JOIN medicines m ON m.id = irs.medicine_id
     LEFT JOIN suppliers s ON s.id = irs.preferred_supplier_id
     ${where} ORDER BY irs.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, limit, offset]
  );
  return { data: rows, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
}

export async function generateSuggestions() {
  const { rows: lowStock } = await query(
    `SELECT m.id, m.name, m.current_stock, m.reorder_point, m.supplier_id,
            m.min_stock_level, m.max_stock_level
     FROM medicines m
     WHERE m.is_active = TRUE
       AND m.current_stock <= COALESCE(m.reorder_point, m.min_stock_level, 0)
       AND NOT EXISTS (
         SELECT 1 FROM inventory_reorder_suggestions irs
         WHERE irs.medicine_id = m.id AND irs.status IN ('PENDING', 'APPROVED', 'ORDERED')
       )`
  );

  const created = [];
  for (const med of lowStock) {
    const suggestedQty = (med.max_stock_level || med.reorder_point * 2 || 100) - med.current_stock;
    const [row] = await query(
      `INSERT INTO inventory_reorder_suggestions
       (medicine_id, current_stock, reorder_level, suggested_quantity, preferred_supplier_id, status)
       VALUES ($1,$2,$3,$4,$5,'PENDING') RETURNING *`,
      [med.id, med.current_stock, med.reorder_point || med.min_stock_level || 0, suggestedQty, med.supplier_id || null]
    );
    created.push(row);
  }
  return created;
}

export async function updateStatus(id, status, userId) {
  const fields = ['status = $2', 'updated_at = NOW()'];
  const params = [id, status];
  let idx = 3;
  if (status === 'APPROVED') { fields.push(`approved_by = $${idx++}`); params.push(userId); }
  if (status === 'ORDERED') { fields.push(`ordered_at = NOW()`); }
  const [row] = await query(`UPDATE inventory_reorder_suggestions SET ${fields.join(', ')} WHERE id = $1 RETURNING *`, params);
  return row;
}
