import { query, queryOne, transaction } from '../../config/database.js';

export async function listTransfers({ fromPharmacyId, toPharmacyId, status, page = 1, limit = 20 } = {}) {
  const conditions = [];
  const params = [];
  let idx = 1;
  if (fromPharmacyId) { conditions.push(`pt.from_pharmacy_id = $${idx++}`); params.push(fromPharmacyId); }
  if (toPharmacyId) { conditions.push(`pt.to_pharmacy_id = $${idx++}`); params.push(toPharmacyId); }
  if (status) { conditions.push(`pt.status = $${idx++}`); params.push(status); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;
  const countResult = await query(`SELECT COUNT(*) FROM pharmacy_transfers pt ${where}`, params);
  const total = parseInt(countResult.rows[0].count, 10);
  const { rows } = await query(
    `SELECT pt.*, m.name AS medicine_name,
            fp.name AS from_pharmacy_name, tp.name AS to_pharmacy_name,
            u.full_name AS requested_by_name
     FROM pharmacy_transfers pt
     JOIN medicines m ON m.id = pt.medicine_id
     JOIN pharmacies fp ON fp.id = pt.from_pharmacy_id
     JOIN pharmacies tp ON tp.id = pt.to_pharmacy_id
     JOIN users u ON u.id = pt.requested_by
     ${where} ORDER BY pt.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, limit, offset]
  );
  return { data: rows, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
}

export async function getTransfer(id) {
  return queryOne(
    `SELECT pt.*, m.name AS medicine_name, fp.name AS from_pharmacy_name, tp.name AS to_pharmacy_name,
            u.full_name AS requested_by_name
     FROM pharmacy_transfers pt
     JOIN medicines m ON m.id = pt.medicine_id
     JOIN pharmacies fp ON fp.id = pt.from_pharmacy_id
     JOIN pharmacies tp ON tp.id = pt.to_pharmacy_id
     JOIN users u ON u.id = pt.requested_by
     WHERE pt.id = $1`, [id]
  );
}

export async function createTransfer(data) {
  const [row] = await query(
    `INSERT INTO pharmacy_transfers (from_pharmacy_id, to_pharmacy_id, medicine_id, stock_batch_id, quantity, requested_by, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [data.fromPharmacyId, data.toPharmacyId, data.medicineId, data.stockBatchId || null,
     data.quantity, data.requestedBy, data.notes || null]
  );
  return row;
}

export async function updateStatus(id, status, userId) {
  const fields = ['status = $2', 'updated_at = NOW()'];
  const params = [id, status];
  let idx = 3;
  if (status === 'APPROVED') { fields.push(`approved_by = $${idx++}`); params.push(userId); fields.push(`approved_at = NOW()`); }
  if (status === 'RECEIVED') { fields.push(`received_by = $${idx++}`); params.push(userId); fields.push(`received_at = NOW()`); }
  const [row] = await query(`UPDATE pharmacy_transfers SET ${fields.join(', ')} WHERE id = $1 RETURNING *`, params);
  return row;
}

export async function processReceived(id) {
  return transaction(async (client) => {
    const result = await client.query(
      'SELECT * FROM pharmacy_transfers WHERE id = $1 AND status = $2 FOR UPDATE',
      [id, 'IN_TRANSIT']
    );
    if (!result.rows.length) throw new Error('Transfer not found or not in transit');
    const t = result.rows[0];

    await client.query(
      `UPDATE stock_batches SET quantity = quantity + $2 WHERE id = $3`,
      [t.quantity, t.stock_batch_id]
    );

    const [row] = await client.query(
      `UPDATE pharmacy_transfers SET status = 'RECEIVED', received_by = $2, received_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, t.requested_by]
    );
    return row;
  });
}
