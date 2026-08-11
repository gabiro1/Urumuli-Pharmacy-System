import Queue from 'bull';
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

const salesQueue = new Queue('sales-events', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
});

async function processSaleEvent(job) {
  const { saleId, referenceNumber, totalAmount, itemsCount } = job.data;

  try {
    const saleDate = new Date().toISOString().split('T')[0];

    await pool.query(
      `INSERT INTO daily_sales_summary (sale_date, total_sales_count, total_revenue, total_discount, total_tax, average_transaction_value)
       VALUES ($1, 1, $2, 0, 0, $2)
       ON CONFLICT (sale_date) DO UPDATE SET
         total_sales_count = daily_sales_summary.total_sales_count + 1,
         total_revenue = daily_sales_summary.total_revenue + $2,
         average_transaction_value = (daily_sales_summary.total_revenue + $2) / (daily_sales_summary.total_sales_count + 1)`,
      [saleDate, totalAmount]
    );

    console.log(`Processed sale event: ${referenceNumber} (${totalAmount})`);
  } catch (error) {
    console.error('Failed to process sale event:', error.message);
    throw error;
  }
}

export async function consumeSalesEvents() {
  salesQueue.process('sale.completed', async (job) => {
    await processSaleEvent(job);
  });

  salesQueue.on('completed', (job) => {
    console.log(`Sales event processed: ${job.id}`);
  });

  salesQueue.on('failed', (job, err) => {
    console.error(`Sales event failed: ${job.id}`, err.message);
  });
}
