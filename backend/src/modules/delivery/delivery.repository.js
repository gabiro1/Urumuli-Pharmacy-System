import { query, queryOne } from '../../config/database.js';

export async function getByOrderId(orderId) {
  return queryOne(
    `SELECT dt.* FROM delivery_tracking dt WHERE dt.order_id = $1 ORDER BY dt.created_at DESC LIMIT 1`,
    [orderId]
  );
}

export async function listDeliveries({ status, page = 1, limit = 20 } = {}) {
  const conditions = [];
  const params = [];
  let idx = 1;

  if (status) { conditions.push(`dt.status = $${idx++}`); params.push(status); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const countResult = await query(`SELECT COUNT(*) FROM delivery_tracking dt ${where}`, params);
  const total = parseInt(countResult.rows[0].count, 10);

  const { rows } = await query(
    `SELECT dt.*, o.id AS order_display_id
     FROM delivery_tracking dt
     JOIN orders o ON o.id = dt.order_id
     ${where}
     ORDER BY dt.created_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, limit, offset]
  );

  return { data: rows, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
}

export async function create(data) {
  const [row] = await query(
    `INSERT INTO delivery_tracking
     (order_id, delivery_partner_name, tracking_number, tracking_url, status, estimated_delivery,
      delivery_address, recipient_name, recipient_phone, delivery_notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING *`,
    [
      data.orderId, data.deliveryPartnerName || null, data.trackingNumber || null,
      data.trackingUrl || null, data.status || 'PENDING', data.estimatedDelivery || null,
      data.deliveryAddress || null, data.recipientName || null,
      data.recipientPhone || null, data.deliveryNotes || null
    ]
  );
  return row;
}

export async function updateStatus(id, status, extra = {}) {
  const fields = [`status = $2`, `updated_at = NOW()`];
  const params = [id, status];
  let idx = 3;

  if (status === 'DELIVERED') { fields.push(`actual_delivery = NOW()`); }
  if (extra.trackingNumber) { fields.push(`tracking_number = $${idx++}`); params.push(extra.trackingNumber); }
  if (extra.trackingUrl) { fields.push(`tracking_url = $${idx++}`); params.push(extra.trackingUrl); }
  if (extra.deliveryNotes) { fields.push(`delivery_notes = $${idx++}`); params.push(extra.deliveryNotes); }
  if (extra.latitude) { fields.push(`latitude = $${idx++}`); params.push(extra.latitude); }
  if (extra.longitude) { fields.push(`longitude = $${idx++}`); params.push(extra.longitude); }

  const [row] = await query(
    `UPDATE delivery_tracking SET ${fields.join(', ')} WHERE id = $1 RETURNING *`,
    params
  );
  return row;
}

export async function getById(id) {
  return queryOne(
    `SELECT dt.*, o.id AS order_display_id
     FROM delivery_tracking dt
     JOIN orders o ON o.id = dt.order_id
     WHERE dt.id = $1`,
    [id]
  );
}
