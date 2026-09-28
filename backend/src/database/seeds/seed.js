import { getPool } from '../../config/database.js';
import { medicineCatalog, medicineCategories } from './medicineCatalog.js';
import { seedAdminUser } from './adminSeed.js';
import { seedStaff } from './staffSeed.js';

const partners = [
  {
    name: 'Kigali Health Pharmacy',
    partner_type: 'PHARMACY',
    website_url: 'https://example.com',
    description: 'Community pharmacy serving Kigali residents with fast, reliable prescription care.',
    display_order: 1,
  },
  {
    name: 'RwandaCare Mutual',
    partner_type: 'INSURANCE',
    website_url: 'https://example.com',
    description: 'Health insurance provider offering affordable coverage across the country.',
    display_order: 2,
  },
  {
    name: 'Lakeview Drugstore',
    partner_type: 'PHARMACY',
    website_url: 'https://example.com',
    description: 'Full-service pharmacy with a wide medicine catalog and 24/7 support.',
    display_order: 3,
  },
  {
    name: 'Urumuli Insurance Partners',
    partner_type: 'INSURANCE',
    website_url: 'https://example.com',
    description: 'Insurance partner enabling seamless digital claim and prescription verification.',
    display_order: 4,
  },
  {
    name: 'Nyarugenge Chemists',
    partner_type: 'PHARMACY',
    website_url: 'https://example.com',
    description: 'Neighborhood chemists committed to safe dispensing and patient education.',
    display_order: 5,
  },
  {
    name: 'Muhima Pharmacy',
    partner_type: 'PHARMACY',
    website_url: 'https://example.com',
    description: 'Trusted pharmacy offering personalized medication management.',
    display_order: 6,
  },
  {
    name: 'Heritage Medical Insurance',
    partner_type: 'INSURANCE',
    website_url: 'https://example.com',
    description: 'Health coverage provider supporting digital prescription workflows.',
    display_order: 7,
  },
  {
    name: 'Umbrella Health Plans',
    partner_type: 'INSURANCE',
    website_url: 'https://example.com',
    description: 'Flexible health plans designed for families and small businesses.',
    display_order: 8,
  },
];

async function seedPartners(pool) {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS total FROM partners');
  if (rows[0].total > 0) {
    console.log('Partners table already has data, skipping partner seed.');
    return;
  }

  for (const partner of partners) {
    const exists = await pool.query('SELECT id FROM partners WHERE name = $1', [partner.name]);
    if (exists.rows.length > 0) continue;

    await pool.query(
      `INSERT INTO partners (name, logo_url, website_url, partner_type, description, display_order)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [partner.name, null, partner.website_url, partner.partner_type, partner.description, partner.display_order]
    );
  }

  console.log(`Seeded ${partners.length} sample partners.`);
}

async function seedMedicines(pool) {
  const categoryIds = new Map();
  for (const [name, description] of medicineCategories) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const { rows } = await pool.query(
      `INSERT INTO categories (name, slug, description)
       VALUES ($1, $2, $3)
       ON CONFLICT (slug) DO UPDATE SET
         name = EXCLUDED.name,
         description = COALESCE(categories.description, EXCLUDED.description),
         is_active = true
       RETURNING id`,
      [name, slug, description]
    );
    categoryIds.set(name, rows[0].id);
  }

  let inserted = 0;
  let skipped = 0;
  for (const medicine of medicineCatalog) {
    const sellingUnit = medicine.unit_of_measure === 'TREATMENT_PACK' ? 'treatment pack' : medicine.unit_of_measure.toLowerCase();
    const packSize = medicine.unit_of_measure === 'TREATMENT_PACK' ? '24 tablets' : medicine.unit_of_measure === 'INHALER' ? '1 inhaler' : `1 ${sellingUnit}`;
    const classification = medicine.is_controlled ? 'RESTRICTED' : medicine.requires_prescription ? 'PRESCRIPTION_REQUIRED' : 'OTC';
    const catalogImage = medicine.unit_of_measure === 'INHALER'
      ? '/medicines/inhaler.png'
      : medicine.unit_of_measure === 'SACHET'
        ? '/medicines/sachet.png'
        : medicine.unit_of_measure === 'CAPSULE'
          ? '/medicines/capsules.png'
          : '/medicines/tablets.png';
    const exists = await pool.query(
      `SELECT id FROM medicines WHERE barcode = $1 OR (LOWER(name) = LOWER($2) AND strength = $3) LIMIT 1`,
      [medicine.barcode, medicine.name, medicine.strength]
    );
    if (exists.rows.length > 0) {
      await pool.query(`UPDATE medicines SET classification=$1,pack_size=$2,selling_unit=$3,
        availability_status=CASE WHEN current_stock<=0 THEN 'UNAVAILABLE' WHEN current_stock<=reorder_point THEN 'LOW_STOCK' ELSE 'IN_STOCK' END,
        general_warnings=$4,image_url=$5 WHERE id=$6`,[classification,packSize,sellingUnit,medicine.contraindications,catalogImage,exists.rows[0].id]);
      skipped++;
      continue;
    }

    await pool.query(
      `INSERT INTO medicines (
        name, generic_name, brand_name, category_id, manufacturer, description,
        price, cost_price, requires_prescription, is_active, is_controlled,
        strength, dosage_form, unit_of_measure, storage_conditions, side_effects,
        contraindications, symptoms, indications, tags, min_stock_level,
        max_stock_level, current_stock, reorder_point, barcode, image_url,
        classification, pack_size, selling_unit, availability_status, general_warnings
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
        $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26,
        $27, $28, $29, $30, $31
      )`,
      [
        medicine.name, medicine.generic_name, medicine.brand_name,
        categoryIds.get(medicine.category), medicine.manufacturer, medicine.description,
        medicine.price, medicine.cost_price, medicine.requires_prescription,
        medicine.is_active, medicine.is_controlled, medicine.strength,
        medicine.dosage_form, medicine.unit_of_measure, medicine.storage_conditions,
        medicine.side_effects, medicine.contraindications, medicine.symptoms,
        medicine.indications, medicine.tags, medicine.min_stock_level,
        medicine.max_stock_level, medicine.current_stock, medicine.reorder_point,
        medicine.barcode, catalogImage,
        classification, packSize, sellingUnit,
        medicine.current_stock <= 0 ? 'UNAVAILABLE' : medicine.current_stock <= medicine.reorder_point ? 'LOW_STOCK' : 'IN_STOCK',
        medicine.contraindications,
      ]
    );
    inserted++;
  }
  console.log(`Medicine catalog: ${inserted} inserted, ${skipped} already present.`);
}

async function seedStockBatches(pool) {
  const { rows: medicines } = await pool.query(
    `SELECT m.id, m.barcode, m.name, m.current_stock, m.price, m.cost_price
     FROM medicines m`
  );

  if (medicines.length === 0) {
    console.log('No medicines found, skipping batch seed.');
    return;
  }

  const existing = await pool.query(
    'SELECT COUNT(*)::int AS total FROM stock_batches'
  );
  if (existing.rows[0].total > 0) {
    console.log('stock_batches already has data, skipping batch seed.');
    return;
  }

  let created = 0;
  for (const medicine of medicines) {
    if (!medicine.current_stock || medicine.current_stock <= 0) continue;

    const batchNumber = `SEED-${(medicine.barcode || medicine.id).toString().slice(-10).toUpperCase()}-1`;
    const expiresIn = 300 + Math.floor(Math.random() * 500);

    await pool.query(
      `INSERT INTO stock_batches
         (medicine_id, batch_number, quantity, remaining_quantity, unit_cost, selling_price,
          manufacturing_date, expiry_date, received_date, notes)
       VALUES ($1, $2, $3, $3, $4, $5, CURRENT_DATE - 30, CURRENT_DATE + $6 * INTERVAL '1 day', NOW(), $7)
       ON CONFLICT DO NOTHING`,
      [
        medicine.id,
        batchNumber,
        medicine.current_stock,
        medicine.cost_price,
        medicine.price,
        expiresIn,
        `Seed batch for ${medicine.name} (FEFO stock)`,
      ]
    );
    created++;
  }

  console.log(`Seeded ${created} stock batches for FEFO sales.`);
}

async function seed() {
  const pool = getPool();
  await seedAdminUser(pool);
  await seedStaff(pool);
  await seedPartners(pool);
  await seedMedicines(pool);
  await seedStockBatches(pool);
  await pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
