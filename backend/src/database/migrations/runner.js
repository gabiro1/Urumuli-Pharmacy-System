import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPool } from '../../config/database.js';
import { env } from '../../config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runMigrations() {
  const target = env.DB.URL
    ? env.DB.NAME
    : `${env.DB.NAME}@${env.DB.HOST}:${env.DB.PORT}`;
  console.log(`Running migrations on ${target}...`);

  const pool = getPool();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  const files = fs.readdirSync(__dirname).filter((f) => f.endsWith('.sql')).sort();

  for (const file of files) {
    const migrationName = path.basename(file, '.sql');

    const exists = await pool.query(
      'SELECT id FROM migrations WHERE name = $1',
      [migrationName]
    );

    if (exists.rows.length > 0) {
      console.log(`Skipping already executed: ${migrationName}`);
      continue;
    }

    console.log(`Executing migration: ${migrationName}`);
    const sql = fs.readFileSync(path.join(__dirname, file), 'utf8');

    try {
      await pool.query(sql);
      await pool.query('INSERT INTO migrations (name) VALUES ($1)', [migrationName]);
      console.log(`Completed: ${migrationName}`);
    } catch (error) {
      console.error(`Failed migration ${migrationName}:`, error.message);
      throw error;
    }
  }

  console.log('All migrations completed.');
  await pool.end();
}

runMigrations().catch((err) => {
  console.error('Migration runner failed:', err);
  process.exit(1);
});
