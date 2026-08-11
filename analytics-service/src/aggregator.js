import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'urumuli_pharmacy',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function aggregateMedicineSales() {
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  try {
    await pool.query(
      `INSERT INTO medicine_sales_summary (medicine_id, sale_date, total_quantity_sold, total_revenue, total_transactions)
       SELECT
         si.medicine_id,
         DATE(s.created_at) as sale_date,
         SUM(si.quantity) as total_quantity_sold,
         SUM(si.total_price) as total_revenue,
         COUNT(DISTINCT s.id) as total_transactions
       FROM sale_items si
       JOIN sales s ON s.id = si.sale_id
       WHERE s.status = 'COMPLETED' AND DATE(s.created_at) = $1
       GROUP BY si.medicine_id, DATE(s.created_at)
       ON CONFLICT (medicine_id, sale_date) DO UPDATE SET
         total_quantity_sold = EXCLUDED.total_quantity_sold,
         total_revenue = EXCLUDED.total_revenue,
         total_transactions = EXCLUDED.total_transactions`,
      [yesterday]
    );

    console.log(`Aggregated medicine sales for ${yesterday}`);
  } catch (error) {
    console.error('Medicine sales aggregation failed:', error.message);
  }
}

async function aggregatePaymentBreakdown() {
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  try {
    const result = await pool.query(
      `SELECT payment_method, COUNT(*) as count, SUM(grand_total) as total
       FROM sales
       WHERE status = 'COMPLETED' AND DATE(created_at) = $1
       GROUP BY payment_method`,
      [yesterday]
    );

    const breakdown = {};
    for (const row of result.rows) {
      breakdown[row.payment_method] = {
        count: parseInt(row.count),
        total: parseFloat(row.total),
      };
    }

    await pool.query(
      `UPDATE daily_sales_summary SET payment_breakdown = $1 WHERE sale_date = $2`,
      [JSON.stringify(breakdown), yesterday]
    );
  } catch (error) {
    console.error('Payment breakdown aggregation failed:', error.message);
  }
}

export function startAggregationCron() {
  const INTERVAL = 3600000;

  const run = async () => {
    await aggregateMedicineSales();
    await aggregatePaymentBreakdown();
  };

  run().catch(console.error);
  setInterval(run, INTERVAL);

  console.log(`Analytics aggregation cron started (interval: ${INTERVAL / 60000}min)`);
}
