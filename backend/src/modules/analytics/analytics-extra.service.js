import { query } from '../../config/database.js';

export async function generateDailySnapshot(pharmacyId, date) {
  const d = date || new Date().toISOString().split('T')[0];
  const { rows: [stats] } = await query(`
    SELECT
      COUNT(*) AS total_orders,
      COUNT(*) FILTER (WHERE o.status = 'COMPLETED') AS completed_orders,
      COALESCE(SUM(o.total_amount) FILTER (WHERE o.status = 'COMPLETED'), 0) AS total_revenue,
      (SELECT COUNT(DISTINCT patient_identity_id) FROM orders WHERE created_at::date = $2) AS active_patients,
      (SELECT COUNT(DISTINCT patient_identity_id) FROM orders WHERE created_at::date = $2 AND patient_identity_id NOT IN
        (SELECT DISTINCT patient_identity_id FROM orders WHERE created_at::date < $2)) AS new_patients
    FROM orders o
    WHERE o.created_at::date = $2
  `, [pharmacyId, d]);

  const { rows: [alerts] } = await query(`
    SELECT COUNT(*) AS expiry_alerts
    FROM medicine_expiry_alerts
    WHERE status = 'ACTIVE' AND created_at::date = $2
  `, [d]);

  const { rows: [chats] } = await query(`
    SELECT COUNT(*) AS chat_conversations
    FROM conversations
    WHERE created_at::date = $2
  `, [d]);

  const snapshot = {
    pharmacyId: pharmacyId || null,
    snapshotDate: d,
    totalOrders: parseInt(stats.total_orders, 10),
    completedOrders: parseInt(stats.completed_orders, 10),
    totalRevenue: parseFloat(stats.total_revenue),
    activePatients: parseInt(stats.active_patients, 10),
    newPatients: parseInt(stats.new_patients, 10),
    expiryAlerts: parseInt(alerts.expiry_alerts, 10),
    chatConversations: parseInt(chats.chat_conversations, 10),
  };

  await query(`
    INSERT INTO analytics_daily_snapshot
    (pharmacy_id, snapshot_date, total_orders, completed_orders, total_revenue, active_patients, new_patients, expiry_alerts, chat_conversations)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (pharmacy_id, snapshot_date) DO UPDATE SET
      total_orders = EXCLUDED.total_orders, completed_orders = EXCLUDED.completed_orders,
      total_revenue = EXCLUDED.total_revenue, active_patients = EXCLUDED.active_patients,
      new_patients = EXCLUDED.new_patients, expiry_alerts = EXCLUDED.expiry_alerts,
      chat_conversations = EXCLUDED.chat_conversations
  `, [pharmacyId || null, d, snapshot.totalOrders, snapshot.completedOrders, snapshot.totalRevenue,
      snapshot.activePatients, snapshot.newPatients, snapshot.expiryAlerts, snapshot.chatConversations]);

  return snapshot;
}

export async function getAnalyticsTrend({ pharmacyId, metric, days = 30 }) {
  const validMetrics = { orders: 'total_orders', revenue: 'total_revenue', patients: 'active_patients', chats: 'chat_conversations' };
  const col = validMetrics[metric] || 'total_orders';
  
  const conditions = pharmacyId ? 'AND pharmacy_id = $3' : '';
  const params = [days, col, ...(pharmacyId ? [pharmacyId] : [])];
  
  const { rows } = await query(`
    SELECT snapshot_date AS date, ${col} AS value
    FROM analytics_daily_snapshot
    WHERE snapshot_date >= CURRENT_DATE - INTERVAL '1 day' * $1 ${conditions}
    ORDER BY snapshot_date ASC
  `, params);
  
  return rows;
}

export async function getTopMedicines({ days = 30, limit = 10 }) {
  const { rows } = await query(`
    SELECT m.name, m.generic_name, COUNT(*) AS dispense_count, SUM(dr.total_price) AS revenue
    FROM dispensing_records dr
    JOIN medicines m ON m.id = dr.medicine_id
    WHERE dr.dispensed_at >= NOW() - INTERVAL '1 day' * $1 AND dr.status = 'DISPENSED'
    GROUP BY m.id, m.name, m.generic_name
    ORDER BY dispense_count DESC LIMIT $2
  `, [days, limit]);
  return rows;
}
