import bcrypt from 'bcrypt';
import { getPool } from '../../config/database.js';

const ADMIN_EMAIL = 'alineuwase@yopmail.com';
const DEFAULT_PASSWORD = 'Password123';

export async function seedAdminUser(pool) {
  const password = process.env.ADMIN_SEED_PASSWORD || DEFAULT_PASSWORD;
  const passwordHash = await bcrypt.hash(password, 10);

  const { rows } = await pool.query(
    `INSERT INTO users (email, password_hash, first_name, last_name, phone, role, email_verified_at)
     VALUES ($1, $2, $3, $4, $5, 'ADMIN', NOW())
     ON CONFLICT (email) DO NOTHING
     RETURNING id, email, first_name, last_name, role`,
    [ADMIN_EMAIL, passwordHash, 'Aline', 'Uwase', '+250788123456']
  );

  if (rows.length === 0) {
    console.log(`Admin ${ADMIN_EMAIL} already exists, skipping.`);
    return { created: false, email: ADMIN_EMAIL };
  }

  console.log(`Seeded admin: ${rows[0].first_name} ${rows[0].last_name} <${rows[0].email}> [${rows[0].role}]`);
  return { created: true, email: rows[0].email, password };
}

const isDirectRun =
  process.argv[1] &&
  process.argv[1].replace(/\\/g, '/').endsWith('src/database/seeds/adminSeed.js');

if (isDirectRun) {
  const pool = getPool();
  try {
    const result = await seedAdminUser(pool);
    if (result.created) {
      console.log(`Password: ${result.password}`);
      console.log('Login at /login with these credentials.');
    }
  } catch (err) {
    console.error('Admin seed failed:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
