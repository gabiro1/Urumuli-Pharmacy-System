import { query, queryOne, transaction } from '../../config/database.js';

export async function listExpiryAlerts({ pharmacyId, status, alertType, page = 1, limit = 20 }) {
  const conditions = [];
  const params = [];
  let idx = 1;

  conditions.push('ea.stock_batch_id IS NOT NULL');
  
  if (status) { conditions.push(`ea.status = $${idx++}`); params.push(status); }
  if (alertType) { conditions.push(`ea.alert_type = $${idx++}`); params.push(alertType); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const countResult = await query(`SELECT COUNT(*) FROM medicine_expiry_alerts ea ${where}`, params);
  const total = parseInt(countResult.rows[0].count, 10);

  const { rows } = await query(
    `SELECT ea.*, m.name AS medicine_name, m.generic_name, m.brand_name,
            sb.batch_number, sb.expiry_date, sb.quantity AS batch_quantity
     FROM medicine_expiry_alerts ea
     JOIN medicines m ON m.id = ea.medicine_id
     JOIN stock_batches sb ON sb.id = ea.stock_batch_id
     ${where}
     ORDER BY ea.created_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, limit, offset]
  );

  return { data: rows, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
}

export async function createExpiryAlert({ stockBatchId, medicineId, alertType }) {
  const [row] = await query(
    `INSERT INTO medicine_expiry_alerts (stock_batch_id, medicine_id, alert_type)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [stockBatchId, medicineId, alertType]
  );
  return row;
}

export async function acknowledgeAlert(alertId, userId) {
  const [row] = await query(
    `UPDATE medicine_expiry_alerts
     SET status = 'ACKNOWLEDGED', acknowledged_by = $2, acknowledged_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND status = 'ACTIVE'
     RETURNING *`,
    [alertId, userId]
  );
  return row;
}

export async function dismissAlert(alertId, userId) {
  const [row] = await query(
    `UPDATE medicine_expiry_alerts
     SET status = 'DISMISSED', acknowledged_by = $2, acknowledged_at = NOW(), updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [alertId, userId]
  );
  return row;
}

export async function markDisposed(alertId, userId) {
  const [row] = await query(
    `UPDATE medicine_expiry_alerts
     SET status = 'DISPOSED', acknowledged_by = $2, acknowledged_at = NOW(), updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [alertId, userId]
  );
  return row;
}

export async function scanExpiringBatches() {
  const { rows } = await query(`
    SELECT sb.id AS stock_batch_id, sb.medicine_id, sb.expiry_date, sb.quantity,
           m.name AS medicine_name,
           CASE
             WHEN sb.expiry_date <= CURRENT_DATE THEN 'EXPIRED'
             WHEN sb.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'THIRTY_DAY'
             WHEN sb.expiry_date <= CURRENT_DATE + INTERVAL '60 days' THEN 'SIXTY_DAY'
             WHEN sb.expiry_date <= CURRENT_DATE + INTERVAL '90 days' THEN 'NINETY_DAY'
           END AS alert_type
    FROM stock_batches sb
    JOIN medicines m ON m.id = sb.medicine_id
    WHERE sb.expiry_date <= CURRENT_DATE + INTERVAL '90 days'
      AND sb.quantity > 0
      AND NOT EXISTS (
        SELECT 1 FROM medicine_expiry_alerts ea
        WHERE ea.stock_batch_id = sb.id AND ea.status IN ('ACTIVE', 'ACKNOWLEDGED')
      )
    ORDER BY sb.expiry_date ASC
  `);
  return rows;
}

export async function getExpiryStats() {
  const { rows } = await query(`
    SELECT
      COUNT(*) FILTER (WHERE ea.status = 'ACTIVE' AND ea.alert_type = 'EXPIRED') AS expired_count,
      COUNT(*) FILTER (WHERE ea.status = 'ACTIVE' AND ea.alert_type = 'THIRTY_DAY') AS thirty_day_count,
      COUNT(*) FILTER (WHERE ea.status = 'ACTIVE' AND ea.alert_type = 'SIXTY_DAY') AS sixty_day_count,
      COUNT(*) FILTER (WHERE ea.status = 'ACTIVE' AND ea.alert_type = 'NINETY_DAY') AS ninety_day_count,
      COUNT(*) FILTER (WHERE ea.status = 'ACKNOWLEDGED') AS acknowledged_count,
      COUNT(*) FILTER (WHERE ea.status = 'DISPOSED') AS disposed_count
    FROM medicine_expiry_alerts ea
  `);
  return rows[0];
}
