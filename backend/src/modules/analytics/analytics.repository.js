import { query, queryOne } from '../../config/database.js';

export async function getPrescriptionSummary() {
  return queryOne(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE status = 'PENDING')::int AS pending,
       COUNT(*) FILTER (WHERE status = 'UNDER_REVIEW')::int AS under_review,
       COUNT(*) FILTER (WHERE status = 'APPROVED')::int AS approved,
       COUNT(*) FILTER (WHERE status = 'COMPLETED')::int AS completed,
       COUNT(*) FILTER (WHERE status = 'REJECTED')::int AS rejected
     FROM prescriptions`
  );
}

export async function getLatestSystemHealth() {
  return query(
    `SELECT DISTINCT ON (service_name)
       id, service_name, status, latency_ms, error_message, metadata, checked_at
     FROM system_health
     ORDER BY service_name, checked_at DESC`
  );
}

export async function getLowStockMedicines(limit = 8) {
  return query(
    `SELECT
       m.*, c.name AS category_name,
       (m.current_stock - COALESCE(m.reorder_point, m.min_stock_level, 0)) AS stock_gap
     FROM medicines m
     LEFT JOIN categories c ON c.id = m.category_id
     WHERE m.is_active = true
       AND m.current_stock <= COALESCE(m.reorder_point, m.min_stock_level, 0)
     ORDER BY stock_gap ASC, m.current_stock ASC, m.name ASC
     LIMIT $1`,
    [limit]
  );
}

export async function getExpiringBatches(limit = 8) {
  return query(
    `SELECT
       sb.*,
       m.name AS medicine_name,
       m.generic_name,
       m.brand_name,
       c.name AS category_name,
       s.name AS supplier_name
     FROM stock_batches sb
     JOIN medicines m ON m.id = sb.medicine_id
     LEFT JOIN categories c ON c.id = m.category_id
     LEFT JOIN suppliers s ON s.id = sb.supplier_id
     WHERE sb.remaining_quantity > 0
       AND sb.expiry_date <= CURRENT_DATE + INTERVAL '90 days'
     ORDER BY sb.expiry_date ASC, sb.received_date ASC
     LIMIT $1`,
    [limit]
  );
}

export async function getProfitSummary({ days = 30 } = {}) {
  const totals = await queryOne(
    `SELECT
       COALESCE(SUM(si.total_price), 0) AS revenue,
       COALESCE(SUM(
         si.quantity * COALESCE(sb.unit_cost, m.cost_price, 0)
       ), 0) AS cost_of_goods,
       COUNT(DISTINCT si.sale_id)::int AS transactions
     FROM sale_items si
     JOIN sales s ON s.id = si.sale_id
     LEFT JOIN medicines m ON m.id = si.medicine_id
     LEFT JOIN stock_batches sb ON sb.id = si.stock_batch_id
     WHERE s.status = 'COMPLETED'
       AND s.created_at >= CURRENT_DATE - ($1 * INTERVAL '1 day')`,
    [Math.max(1, days)]
  );

  const daily = await query(
    `SELECT
       DATE(s.created_at) AS day,
       COALESCE(SUM(si.total_price), 0) AS revenue,
       COALESCE(SUM(si.quantity * COALESCE(sb.unit_cost, m.cost_price, 0)), 0) AS cost_of_goods
     FROM sale_items si
     JOIN sales s ON s.id = si.sale_id
     LEFT JOIN medicines m ON m.id = si.medicine_id
     LEFT JOIN stock_batches sb ON sb.id = si.stock_batch_id
     WHERE s.status = 'COMPLETED'
       AND s.created_at >= CURRENT_DATE - ($1 * INTERVAL '1 day')
     GROUP BY DATE(s.created_at)
     ORDER BY day ASC`,
    [Math.max(1, days)]
  );

  return { totals, daily };
}

export async function getDemandForecast({ days = 30, horizon = 14, top = 10 } = {}) {
  const rows = await query(
    `WITH recent AS (
       SELECT
         si.medicine_id,
         m.name AS medicine_name,
         m.generic_name,
         m.current_stock,
         m.reorder_point,
         DATE(s.created_at) AS day,
         SUM(si.quantity)::int AS qty
       FROM sale_items si
       JOIN sales s ON s.id = si.sale_id
       JOIN medicines m ON m.id = si.medicine_id
       WHERE s.status = 'COMPLETED'
         AND s.created_at >= CURRENT_DATE - ($1 * INTERVAL '1 day')
       GROUP BY si.medicine_id, m.name, m.generic_name, m.current_stock, m.reorder_point, DATE(s.created_at)
     ),
     base AS (
       SELECT
         medicine_id,
         medicine_name,
         generic_name,
         current_stock,
         reorder_point,
         COUNT(*)::int AS active_days,
         SUM(qty)::int AS total_qty
       FROM recent
       GROUP BY medicine_id, medicine_name, generic_name, current_stock, reorder_point
     )
     SELECT
       medicine_id,
       medicine_name,
       generic_name,
       current_stock,
       reorder_point,
       total_qty,
       ROUND(total_qty::numeric / GREATEST(active_days, 1), 2) AS avg_daily_qty,
       ROUND((total_qty::numeric / GREATEST(active_days, 1)) * $2, 2) AS forecast_qty,
       ROUND(
         (total_qty::numeric / GREATEST(active_days, 1)) * $2 - current_stock,
         2
       ) AS stock_gap
     FROM base
     ORDER BY forecast_qty DESC
     LIMIT $3`,
    [Math.max(1, days), Math.max(1, horizon), Math.max(1, top)]
  );

  return rows;
}
