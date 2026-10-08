import { query, queryOne } from '../../config/database.js';

// The staff queue needs the purchaser and the goods in the same row, so the
// list query joins through orders to patient_identities and counts items.
const STAFF_SELECT = `
  SELECT dt.*,
         o.public_reference,
         o.status            AS order_status,
         o.fulfilment_status,
         o.fulfilment_method,
         o.payment_status,
         o.delivery_address  AS order_delivery_address,
         o.created_at        AS order_created_at,
         pi.id               AS patient_identity_id,
         pi.full_name        AS patient_name,
         pi.verified_phone   AS patient_phone,
         pi.email            AS patient_email,
         pi.user_id          AS patient_user_id,
         (SELECT COUNT(*)::int FROM order_items oi WHERE oi.order_id = o.id) AS item_count,
         (SELECT COALESCE(json_agg(json_build_object(
                    'name', oi.medicine_snapshot->>'name',
                    'quantity', oi.approved_quantity,
                    'sellingUnit', oi.selling_unit
                  ) ORDER BY oi.created_at), '[]'::json)
            FROM order_items oi WHERE oi.order_id = o.id) AS items
  FROM delivery_tracking dt
  JOIN orders o ON o.id = dt.order_id
  JOIN patient_identities pi ON pi.id = o.patient_identity_id
`;

export async function getByOrderId(orderId) {
  return queryOne(`${STAFF_SELECT} WHERE dt.order_id = $1 ORDER BY dt.created_at DESC LIMIT 1`, [orderId]);
}

export async function getById(id) {
  return queryOne(`${STAFF_SELECT} WHERE dt.id = $1`, [id]);
}

export async function getHistory(deliveryId) {
  return query(
    `SELECT h.*, CONCAT(u.first_name, ' ', u.last_name) AS actor_name
     FROM delivery_status_history h
     LEFT JOIN users u ON u.id = h.actor_id
     WHERE h.delivery_id = $1
     ORDER BY h.created_at`,
    [deliveryId]
  );
}

export async function getHistoryByOrder(orderId) {
  return query(
    `SELECT h.*, CONCAT(u.first_name, ' ', u.last_name) AS actor_name
     FROM delivery_status_history h
     LEFT JOIN users u ON u.id = h.actor_id
     WHERE h.order_id = $1
     ORDER BY h.created_at`,
    [orderId]
  );
}

export const addHistory = (client, data) =>
  client.query(
    `INSERT INTO delivery_status_history
       (delivery_id, order_id, previous_status, new_status, actor_id, actor_role, location_note, note)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [
      data.deliveryId,
      data.orderId,
      data.previousStatus || null,
      data.newStatus,
      data.actorId || null,
      data.actorRole,
      data.locationNote || null,
      data.note || null,
    ]
  ).then((r) => r.rows[0]);

/**
 * Staff-facing queue. `scope` narrows the list to what a dispatcher cares
 * about: 'open' (default), 'delivered' or 'all'.
 */
export async function listDeliveries({
  status,
  scope = 'open',
  search,
  from,
  to,
  page = 1,
  limit = 20,
} = {}) {
  const conditions = [];
  const params = [];
  const add = (value) => {
    params.push(value);
    return `$${params.length}`;
  };

  if (status) conditions.push(`dt.status = ${add(status)}`);
  else if (scope === 'open') {
    conditions.push(`dt.status IN ('PENDING','PICKED_UP','IN_TRANSIT','OUT_FOR_DELIVERY','FAILED')`);
  } else if (scope === 'delivered') {
    conditions.push(`dt.status = 'DELIVERED'`);
  }

  if (search) {
    const needle = add(`%${search}%`);
    conditions.push(
      `(o.public_reference ILIKE ${needle} OR pi.full_name ILIKE ${needle}` +
        ` OR pi.verified_phone ILIKE ${needle} OR dt.tracking_number ILIKE ${needle})`
    );
  }
  if (from) conditions.push(`COALESCE(dt.dispatched_at, dt.created_at) >= ${add(from)}`);
  if (to) conditions.push(`COALESCE(dt.dispatched_at, dt.created_at) <= ${add(to)}`);

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const size = Math.min(Number(limit) || 20, 100);
  const offset = (Math.max(Number(page) || 1, 1) - 1) * size;

  const countRows = await query(
    `SELECT COUNT(*) FROM delivery_tracking dt
     JOIN orders o ON o.id = dt.order_id
     JOIN patient_identities pi ON pi.id = o.patient_identity_id
     ${where}`,
    params
  );
  const total = Number(countRows[0].count);

  const rows = await query(
    `${STAFF_SELECT}
     ${where}
     ORDER BY
       CASE dt.status
         WHEN 'FAILED' THEN 0
         WHEN 'OUT_FOR_DELIVERY' THEN 1
         WHEN 'IN_TRANSIT' THEN 2
         WHEN 'PICKED_UP' THEN 3
         WHEN 'PENDING' THEN 4
         ELSE 5
       END,
       COALESCE(dt.dispatched_at, dt.created_at) DESC
     LIMIT ${add(size)} OFFSET ${add(offset)}`,
    params
  );

  return { data: rows, meta: { total, page: Number(page) || 1, limit: size, pages: Math.ceil(total / size) } };
}

/** Deliveries belonging to one patient identity, newest first. */
export async function listForPatient(identityId, { page = 1, limit = 20 } = {}) {
  const size = Math.min(Number(limit) || 20, 100);
  const offset = (Math.max(Number(page) || 1, 1) - 1) * size;
  const rows = await query(
    `${STAFF_SELECT}
     WHERE o.patient_identity_id = $1
     ORDER BY COALESCE(dt.dispatched_at, dt.created_at) DESC
     LIMIT $2 OFFSET $3`,
    [identityId, size, offset]
  );
  return rows;
}

/** Headline counters for the delivery board. */
export async function getStats() {
  const rows = await query(
    `SELECT
       COUNT(*) FILTER (WHERE status IN ('PENDING','PICKED_UP','IN_TRANSIT'))::int AS in_progress,
       COUNT(*) FILTER (WHERE status = 'OUT_FOR_DELIVERY')::int                  AS out_for_delivery,
       COUNT(*) FILTER (WHERE status = 'FAILED')::int                             AS needs_attention,
       COUNT(*) FILTER (WHERE status = 'DELIVERED' AND actual_delivery >= date_trunc('day', NOW()))::int AS delivered_today,
       COUNT(*) FILTER (
         WHERE status NOT IN ('DELIVERED','RETURNED','CANCELLED')
           AND created_at < NOW() - INTERVAL '1 day'
       )::int AS overdue,
       COUNT(*) FILTER (WHERE status IN ('DELIVERED','RETURNED','CANCELLED'))::int AS closed
     FROM delivery_tracking`
  );
  return rows[0];
}

export async function create(data, client = null) {
  const sql = `
    INSERT INTO delivery_tracking
      (order_id, delivery_partner_name, tracking_number, tracking_url, status, estimated_delivery,
       delivery_address, recipient_name, recipient_phone, delivery_notes, dispatched_at, attempt)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,COALESCE($12, 1))
    RETURNING *`;
  const params = [
    data.orderId,
    data.deliveryPartnerName || null,
    data.trackingNumber || null,
    data.trackingUrl || null,
    data.status || 'PENDING',
    data.estimatedDelivery || null,
    data.deliveryAddress || null,
    data.recipientName || null,
    data.recipientPhone || null,
    data.deliveryNotes || null,
    data.dispatchedAt || null,
    data.attempt ?? 1,
  ];
  if (client) return (await client.query(sql, params)).rows[0];
  return queryOne(sql, params);
}

const UPDATABLE = {
  trackingNumber: 'tracking_number',
  trackingUrl: 'tracking_url',
  deliveryNotes: 'delivery_notes',
  deliveryAddress: 'delivery_address',
  recipientName: 'recipient_name',
  recipientPhone: 'recipient_phone',
  estimatedDelivery: 'estimated_delivery',
  latitude: 'latitude',
  longitude: 'longitude',
  confirmationNote: 'confirmation_note',
  failureReason: 'failure_reason',
  deliveryPartnerName: 'delivery_partner_name',
};

export function buildStatusUpdate(status, extra = {}) {
  const fields = ['status = $2'];
  const params = [extra.id, status];
  const push = (column, value) => {
    fields.push(`${column} = $${params.push(value)}`);
  };

  if (status === 'PICKED_UP') push('dispatched_at', new Date());
  if (status === 'DELIVERED') push('actual_delivery', new Date());

  for (const [key, column] of Object.entries(UPDATABLE)) {
    if (extra[key] !== undefined && extra[key] !== null) push(column, extra[key]);
  }
  // Handover details only make sense once the parcel is actually handed over.
  if (status === 'DELIVERED') {
    if (extra.receiverName) push('receiver_name', extra.receiverName);
    if (extra.receivedBy) push('received_by', extra.receivedBy);
  }

  fields.push('updated_at = NOW()');
  return { fields, params };
}

export async function updateStatus(id, status, extra = {}, client = null) {
  const { fields, params } = buildStatusUpdate(status, { ...extra, id });
  const sql = `UPDATE delivery_tracking SET ${fields.join(', ')} WHERE id = $1 RETURNING *`;
  if (client) return (await client.query(sql, params)).rows[0];
  return queryOne(sql, params);
}
