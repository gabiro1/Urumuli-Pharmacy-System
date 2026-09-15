import bcrypt from 'bcrypt';
import { getPool } from '../../config/database.js';

const DEFAULT_PASSWORD = 'Staff@123';

const STAFF_ACCOUNTS = [
  {
    email: 'manager@yopmail.com',
    firstName: 'Jean',
    lastName: 'Mugabo',
    phone: '+250788111001',
    role: 'MANAGER',
  },
  {
    email: 'pharmacist@yopmail.com',
    firstName: 'Grace',
    lastName: 'Umutoni',
    phone: '+250788111002',
    role: 'PHARMACIST',
  },
  {
    email: 'cashier@yopmail.com',
    firstName: 'Patrick',
    lastName: 'Habimana',
    phone: '+250788111003',
    role: 'CASHIER',
  },
  {
    email: 'inventory@yopmail.com',
    firstName: 'Diane',
    lastName: 'Ingabire',
    phone: '+250788111004',
    role: 'INVENTORY_MANAGER',
  },
  {
    email: 'auditor@yopmail.com',
    firstName: 'Eric',
    lastName: 'Niyonzima',
    phone: '+250788111005',
    role: 'AUDITOR',
  },
];

export async function seedStaff(pool) {
  const password = process.env.STAFF_SEED_PASSWORD || DEFAULT_PASSWORD;
  const passwordHash = await bcrypt.hash(password, 10);

  const results = [];

  for (const staff of STAFF_ACCOUNTS) {
    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, phone, role, email_verified_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (email) DO NOTHING
       RETURNING id, email, first_name, last_name, role`,
      [staff.email, passwordHash, staff.firstName, staff.lastName, staff.phone, staff.role]
    );

    if (rows.length === 0) {
      console.log(`Staff ${staff.email} already exists, skipping.`);
      results.push({ created: false, email: staff.email, role: staff.role });
      continue;
    }

    console.log(`Seeded staff: ${rows[0].first_name} ${rows[0].last_name} <${rows[0].email}> [${rows[0].role}]`);
    results.push({ created: true, email: rows[0].email, role: rows[0].role, password });
  }

  return results;
}

const isDirectRun =
  process.argv[1] &&
  process.argv[1].replace(/\\/g, '/').endsWith('src/database/seeds/staffSeed.js');

if (isDirectRun) {
  const pool = getPool();
  try {
    const results = await seedStaff(pool);
    console.log('\n--- Staff Credentials ---');
    console.log(`Password (all accounts): ${DEFAULT_PASSWORD}\n`);
    for (const r of results) {
      console.log(`${r.role}: ${r.email}`);
    }
  } catch (err) {
    console.error('Staff seed failed:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
