import pg from 'pg';
const { Pool } = pg;
import crypto from 'crypto';
import { env } from './env.js';

let pool;
const SLOW_QUERY_THRESHOLD_MS = 500;

function buildPoolConfig() {
  const common = {
    max: env.DB.MAX_POOL,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 20000,
    query_timeout: 30000,
    statement_timeout: 30000,
    allowExitOnIdle: true,
  };

  const ssl = env.DB.SSL ? { rejectUnauthorized: false } : undefined;

  if (env.DB.URL) {
    // SSL is handled via the `ssl` option below; strip query params (e.g.
    // ?sslmode=require) so they don't conflict with pg's SSL negotiation.
    const connectionString = env.DB.URL.split('?')[0];
    return { connectionString, ssl, ...common };
  }

  return {
    host: env.DB.HOST,
    port: env.DB.PORT,
    database: env.DB.NAME,
    user: env.DB.USER,
    password: env.DB.PASSWORD,
    ssl,
    ...common,
  };
}

export function getPool() {
  if (!pool) {
    pool = new Pool(buildPoolConfig());

    pool.on('error', (err) => {
      console.error('Unexpected database pool error:', err);
    });

    pool.on('connect', () => {
      if (env.NODE_ENV === 'development') {
        console.log(`[DB] New connection established (pool: ${pool.totalCount} total, ${pool.idleCount} idle, ${pool.waitingCount} waiting)`);
      }
    });

    pool.on('acquire', () => {
      if (pool.waitingCount > 0) {
        console.warn(`[DB] Connection acquired while ${pool.waitingCount} requests waiting (pool: ${pool.totalCount}/${pool.options.max})`);
      }
    });

    pool.on('remove', () => {
      if (env.NODE_ENV === 'development') {
        console.log(`[DB] Connection removed (pool: ${pool.totalCount} total, ${pool.idleCount} idle)`);
      }
    });
  }
  return pool;
}

export async function query(text, params) {
  const startTime = Date.now();
  const queryId = crypto.randomBytes(4).toString('hex');
  let client;
  try {
    client = await getPool().connect();
    const result = await client.query(text, params);
    const duration = Date.now() - startTime;
    if (duration > SLOW_QUERY_THRESHOLD_MS) {
      console.warn(`[DB:SLOW] Query ${queryId} took ${duration}ms`, {
        query: text.substring(0, 200),
        params: params ? params.length : 0,
        rows: result.rowCount,
        duration,
      });
    }
    return result.rows;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[DB:ERROR] Query ${queryId} failed after ${duration}ms:`, {
      query: text.substring(0, 200),
      error: error.message,
      code: error.code,
      duration,
    });
    throw error;
  } finally {
    if (client) client.release();
  }
}

export async function queryOne(text, params) {
  const rows = await query(text, params);
  return rows.length > 0 ? rows[0] : null;
}

export async function transaction(callback) {
  const client = await getPool().connect();
  const startTime = Date.now();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    const duration = Date.now() - startTime;
    if (duration > SLOW_QUERY_THRESHOLD_MS) {
      console.warn(`[DB:SLOW] Transaction took ${duration}ms`);
    }
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export function getPoolStats() {
  const p = getPool();
  return {
    totalCount: p.totalCount,
    idleCount: p.idleCount,
    waitingCount: p.waitingCount,
    maxConnections: p.options.max,
  };
}

export async function healthCheck() {
  try {
    await query('SELECT 1');
    return true;
  } catch (error) {
    console.error('[DB] Health check failed:', error.message);
    return false;
  }
}
