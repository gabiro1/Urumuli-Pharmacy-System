import { query, queryOne, transaction } from '../../config/database.js';
import { ValidationError } from '../../utils/errors.js';

const medicineFields = `
  m.id, m.name, m.generic_name, m.brand_name, m.category_id,
  c.name AS category_name, m.manufacturer, m.description,
  m.price, m.cost_price, m.requires_prescription, m.is_active,
  m.is_controlled, m.strength, m.dosage_form, m.unit_of_measure,
  m.storage_conditions, m.side_effects, m.contraindications,
  m.symptoms, m.indications, m.tags, m.min_stock_level,
  m.max_stock_level, m.current_stock, m.reorder_point,
  m.barcode, m.image_url, m.created_at, m.updated_at
  , m.classification, m.pack_size, m.selling_unit, m.availability_status,
  m.general_warnings, m.approved_information_url, m.otc_review_required,
  m.product_type, m.subcategory, m.sku, m.supplier_id, s.name AS supplier_name,
  m.expiry_date, m.active_ingredients, m.route_of_administration, m.dosage_instructions,
  m.care_purpose, m.ingredients, m.usage_instructions, m.size_description, m.is_archived
`;

const sortableColumns = {
  name: 'm.name',
  created_at: 'm.created_at',
  updated_at: 'm.updated_at',
  updatedAt: 'm.updated_at',
  price: 'm.price',
  current_stock: 'm.current_stock',
  currentStock: 'm.current_stock',
  barcode: 'm.barcode',
  category_name: 'c.name',
  categoryName: 'c.name',
  expiry_date: 'm.expiry_date',
  expiryDate: 'm.expiry_date',
};

function buildMedicineWhere({ search, categoryId, requiresPrescription, isActive, classification, availability, dosageForm, productType, stockStatus, expiry, minPrice, maxPrice, brand, supplierId }) {
  const conditions = [];
  const params = [];
  let hasSearch = false;
  let idx = 1;

  if (search) {
    const tsQuery = `plainto_tsquery('english', $${idx})`;
    conditions.push(`(
      m.search_vector @@ ${tsQuery}
      OR COALESCE(c.name, '') ILIKE $${idx}
    )`);
    params.push(search);
    hasSearch = true;
    idx++;
  }

  if (categoryId) {
    conditions.push(`m.category_id = $${idx++}`);
    params.push(categoryId);
  }

  if (requiresPrescription !== undefined && requiresPrescription !== null) {
    conditions.push(`m.requires_prescription = $${idx++}`);
    params.push(requiresPrescription);
  }

  if (isActive !== undefined && isActive !== null) {
    conditions.push(`m.is_active = $${idx++}`);
    params.push(isActive);
  }
  if (classification) { conditions.push(`m.classification = $${idx++}`); params.push(classification); }
  if (availability) { conditions.push(`m.availability_status = $${idx++}`); params.push(availability); }
  if (dosageForm) { conditions.push(`m.dosage_form = $${idx++}`); params.push(dosageForm); }
  if (productType) { conditions.push(`m.product_type = $${idx++}`); params.push(productType); }
  if (brand) { conditions.push(`m.brand_name ILIKE $${idx++}`); params.push(`%${brand}%`); }
  if (supplierId) { conditions.push(`m.supplier_id = $${idx++}`); params.push(supplierId); }
  if (minPrice !== undefined && minPrice !== null) { conditions.push(`m.price >= $${idx++}`); params.push(minPrice); }
  if (maxPrice !== undefined && maxPrice !== null) { conditions.push(`m.price <= $${idx++}`); params.push(maxPrice); }
  if (stockStatus === 'OUT_OF_STOCK') conditions.push('m.current_stock = 0');
  if (stockStatus === 'LOW_STOCK') conditions.push('m.current_stock > 0 AND m.current_stock <= COALESCE(m.reorder_point, m.min_stock_level, 0)');
  if (stockStatus === 'IN_STOCK') conditions.push('m.current_stock > COALESCE(m.reorder_point, m.min_stock_level, 0)');
  if (expiry === 'EXPIRED') conditions.push('m.expiry_date < CURRENT_DATE');
  if (expiry === 'EXPIRING_SOON') conditions.push("m.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days'");
  if (expiry === 'VALID') conditions.push('(m.expiry_date IS NULL OR m.expiry_date > CURRENT_DATE + INTERVAL \'90 days\')');

  return { conditions, params, hasSearch };
}

export async function listMedicines({ limit, offset, search, categoryId, requiresPrescription, isActive, classification, availability, dosageForm, productType, stockStatus, expiry, minPrice, maxPrice, brand, supplierId, sortBy = 'name', sortOrder = 'ASC' }) {
  const { conditions, params, hasSearch } = buildMedicineWhere({ search, categoryId, requiresPrescription, isActive, classification, availability, dosageForm, productType, stockStatus, expiry, minPrice, maxPrice, brand, supplierId });
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const sortColumn = sortableColumns[sortBy] || sortableColumns.name;
  const normalizedSortOrder = sortOrder === 'DESC' ? 'DESC' : 'ASC';

  const relevanceExpr = hasSearch
    ? `ts_rank_cd(m.search_vector, plainto_tsquery('english', ${JSON.stringify(search)}))`
    : '0';

  const countResult = await queryOne(
    `SELECT COUNT(*)::int AS total
     FROM medicines m
     LEFT JOIN categories c ON c.id = m.category_id LEFT JOIN suppliers s ON s.id = m.supplier_id
     ${whereClause}`,
    params
  );

  const orderBy = hasSearch
    ? `${relevanceExpr} DESC, ${sortColumn} ${normalizedSortOrder}`
    : `${sortColumn} ${normalizedSortOrder}`;

  const rows = await query(
    `SELECT ${medicineFields}
     FROM medicines m
     LEFT JOIN categories c ON c.id = m.category_id LEFT JOIN suppliers s ON s.id = m.supplier_id
     ${whereClause}
     ORDER BY ${orderBy}
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  return {
    rows,
    total: countResult?.total ?? 0,
  };
}

export async function autocompleteMedicines({ search, limit = 8 }) {
  if (!search) return [];

  const rows = await query(
    `SELECT m.id, m.name, m.generic_name, m.brand_name
     FROM medicines m
     WHERE m.search_vector @@ plainto_tsquery('english', $1)
       AND m.is_active = true
     ORDER BY ts_rank_cd(m.search_vector, plainto_tsquery('english', $1)) DESC,
              m.name ASC
     LIMIT $2`,
    [search, limit]
  );

  return rows;
}

export async function findMedicineById(id) {
  return queryOne(
    `SELECT ${medicineFields}
     FROM medicines m
     LEFT JOIN categories c ON c.id = m.category_id LEFT JOIN suppliers s ON s.id = m.supplier_id
     WHERE m.id = $1`,
    [id]
  );
}

export async function findMedicineByBarcode(barcode) {
  return queryOne(
    `SELECT ${medicineFields}
     FROM medicines m
     LEFT JOIN categories c ON c.id = m.category_id LEFT JOIN suppliers s ON s.id = m.supplier_id
     WHERE m.barcode = $1 OR m.sku = $1`,
    [barcode]
  );
}

export async function createMedicine(data) {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ');

  return queryOne(
    `INSERT INTO medicines (${keys.join(', ')})
     VALUES (${placeholders})
     RETURNING *`,
    values
  );
}

export async function updateMedicine(id, data) {
  const entries = Object.entries(data).filter(([, value]) => value !== undefined);
  if (entries.length === 0) {
    return findMedicineById(id);
  }

  const sets = entries.map(([key], index) => `${key} = $${index + 1}`);
  const values = entries.map(([, value]) => value);
  values.push(id);

  return queryOne(
    `UPDATE medicines
     SET ${sets.join(', ')}, updated_at = NOW()
     WHERE id = $${values.length}
     RETURNING *`,
    values
  );
}

export async function deleteMedicine(id) {
  return queryOne(
    `DELETE FROM medicines WHERE id = $1 RETURNING *`,
    [id]
  );
}

export async function archiveMedicine(id) {
  return queryOne(
    `UPDATE medicines SET is_active = false, is_archived = true, archived_at = NOW(), updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id]
  );
}

export async function listCategories() {
  return query(
    `SELECT id, name, slug, parent_id, description, is_active, created_at, updated_at
     FROM categories WHERE is_active = true ORDER BY name ASC`
  );
}

export async function findCategoryById(id) {
  return queryOne(`SELECT * FROM categories WHERE id = $1`, [id]);
}

export async function findCategoryBySlug(slug) {
  return queryOne(`SELECT * FROM categories WHERE slug = $1`, [slug]);
}

export async function createCategory(data) {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ');

  return queryOne(
    `INSERT INTO categories (${keys.join(', ')})
     VALUES (${placeholders})
     RETURNING *`,
    values
  );
}

export async function updateCategory(id, data) {
  const entries = Object.entries(data).filter(([, value]) => value !== undefined);
  if (entries.length === 0) return findCategoryById(id);

  const sets = entries.map(([key], index) => `${key} = $${index + 1}`);
  const values = entries.map(([, value]) => value);
  values.push(id);

  return queryOne(
    `UPDATE categories
     SET ${sets.join(', ')}, updated_at = NOW()
     WHERE id = $${values.length}
     RETURNING *`,
    values
  );
}

export async function deleteCategory(id) {
  return queryOne(`DELETE FROM categories WHERE id = $1 RETURNING *`, [id]);
}

export async function countProductsByCategory(categoryId) {
  const result = await queryOne(
    `SELECT COUNT(*)::int AS total FROM medicines WHERE category_id = $1`,
    [categoryId]
  );
  return result?.total ?? 0;
}

export async function getInventorySummary() {
  const results = await Promise.all([
    queryOne(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE product_type = 'MEDICINE')::int AS medicines,
         COUNT(*) FILTER (WHERE product_type = 'PHARMACY_CARE')::int AS pharmacy_care,
         COUNT(*) FILTER (WHERE current_stock > 0 AND current_stock <= COALESCE(reorder_point, min_stock_level, 0))::int AS low_stock,
         COUNT(*) FILTER (WHERE current_stock = 0)::int AS out_of_stock,
         COUNT(*) FILTER (WHERE expiry_date IS NOT NULL AND expiry_date < CURRENT_DATE)::int AS expired,
         COUNT(*) FILTER (WHERE expiry_date IS NOT NULL AND expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days')::int AS expiring_soon
       FROM medicines
       WHERE is_active = true`
    ),
    queryOne(
      `SELECT COUNT(*)::int AS total
       FROM stock_batches
       WHERE remaining_quantity > 0
         AND expiry_date <= CURRENT_DATE + INTERVAL '90 days'`
    ),
    queryOne(`SELECT COUNT(*)::int AS total FROM categories WHERE is_active = true`),
  ]);

  const summary = results[0] || {};
  return {
    totalProducts: summary.total ?? 0,
    medicines: summary.medicines ?? 0,
    pharmacyCare: summary.pharmacy_care ?? 0,
    lowStock: summary.low_stock ?? 0,
    outOfStock: summary.out_of_stock ?? 0,
    expired: summary.expired ?? 0,
    expiringSoon: summary.expiring_soon ?? 0,
    expiringBatches: results[1]?.total ?? 0,
    categories: results[2]?.total ?? 0,
  };
}

export async function productHasReferences(id) {
  const result = await queryOne(
    `SELECT
       (SELECT COUNT(*) FROM stock_batches WHERE medicine_id = $1)
       + (SELECT COUNT(*) FROM stock_movements WHERE medicine_id = $1)
       + (SELECT COUNT(*) FROM sale_items WHERE medicine_id = $1)
       + (SELECT COUNT(*) FROM order_items WHERE medicine_id = $1)
       + (SELECT COUNT(*) FROM prescription_items WHERE medicine_id = $1)
       + (SELECT COUNT(*) FROM inventory_reservations WHERE medicine_id = $1)
       + (SELECT COUNT(*) FROM medication_instructions WHERE medicine_id = $1)
       AS refs`,
    [id]
  );
  return Number(result?.refs ?? 0) > 0;
}

// ---------------------------------------------------------------- Suppliers

export async function listSuppliers({ search, isActive }) {
  const conditions = [];
  const params = [];
  let idx = 1;

  if (search) {
    conditions.push(`(
      name ILIKE $${idx}
      OR COALESCE(contact_person, '') ILIKE $${idx}
      OR COALESCE(email, '') ILIKE $${idx}
      OR COALESCE(phone, '') ILIKE $${idx}
      OR COALESCE(city, '') ILIKE $${idx}
      OR COALESCE(tax_id, '') ILIKE $${idx}
    )`);
    params.push(`%${search}%`);
    idx++;
  }

  if (isActive !== undefined && isActive !== null) {
    conditions.push(`is_active = $${idx++}`);
    params.push(isActive === 'true' || isActive === true);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await queryOne(
    `SELECT COUNT(*)::int AS total FROM suppliers ${whereClause}`,
    params
  );

  const rows = await query(
    `SELECT * FROM suppliers ${whereClause} ORDER BY name ASC`,
    params
  );

  return { rows, total: countResult?.total ?? 0 };
}

export async function findSupplierById(id) {
  return queryOne(`SELECT * FROM suppliers WHERE id = $1`, [id]);
}

export async function createSupplier(data) {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ');

  return queryOne(
    `INSERT INTO suppliers (${keys.join(', ')})
     VALUES (${placeholders})
     RETURNING *`,
    values
  );
}

export async function updateSupplier(id, data) {
  const entries = Object.entries(data).filter(([, value]) => value !== undefined);
  if (entries.length === 0) return findSupplierById(id);

  const sets = entries.map(([key], index) => `${key} = $${index + 1}`);
  const values = entries.map(([, value]) => value);
  values.push(id);

  return queryOne(
    `UPDATE suppliers
     SET ${sets.join(', ')}, updated_at = NOW()
     WHERE id = $${values.length}
     RETURNING *`,
    values
  );
}

export async function deleteSupplier(id) {
  return queryOne(`DELETE FROM suppliers WHERE id = $1 RETURNING *`, [id]);
}

// ---------------------------------------------------------------- Batches

export async function listBatches({ search, medicineId, supplierId, status, limit = 100, offset = 0 }) {
  const conditions = [];
  const params = [];
  let idx = 1;

  if (medicineId) {
    conditions.push(`sb.medicine_id = $${idx++}`);
    params.push(medicineId);
  }

  if (supplierId) {
    conditions.push(`sb.supplier_id = $${idx++}`);
    params.push(supplierId);
  }

  if (search) {
    conditions.push(`(
      sb.batch_number ILIKE $${idx}
      OR COALESCE(m.name, '') ILIKE $${idx}
    )`);
    params.push(`%${search}%`);
    idx++;
  }

  const statusFilter = {
    EXPIRED: `sb.expiry_date < CURRENT_DATE OR sb.is_expired = true`,
    EXPIRING: `sb.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days'`,
    VALID: `sb.expiry_date > CURRENT_DATE + INTERVAL '90 days'`,
  };
  if (statusFilter[status]) {
    conditions.push(statusFilter[status]);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await queryOne(
    `SELECT COUNT(*)::int AS total
     FROM stock_batches sb
     LEFT JOIN medicines m ON m.id = sb.medicine_id
     ${whereClause}`,
    params
  );

  const rows = await query(
    `SELECT sb.*, m.name AS medicine_name, m.generic_name, m.brand_name, m.classification, m.requires_prescription,
            s.name AS supplier_name
     FROM stock_batches sb
     LEFT JOIN medicines m ON m.id = sb.medicine_id
     LEFT JOIN suppliers s ON s.id = sb.supplier_id
     ${whereClause}
     ORDER BY sb.expiry_date ASC NULLS LAST, sb.created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  return { rows, total: countResult?.total ?? 0 };
}

export async function findBatchById(id) {
  return queryOne(
    `SELECT sb.*, m.name AS medicine_name, m.generic_name, m.brand_name, s.name AS supplier_name
     FROM stock_batches sb
     LEFT JOIN medicines m ON m.id = sb.medicine_id
     LEFT JOIN suppliers s ON s.id = sb.supplier_id
     WHERE sb.id = $1`,
    [id]
  );
}

export async function createBatch(data, performedBy = null) {
  return transaction(async (client) => {
    const medicineResult = await client.query(
      'SELECT id, current_stock FROM medicines WHERE id = $1 FOR UPDATE',
      [data.medicineId]
    );
    if (!medicineResult.rows[0]) throw new ValidationError('Medicine not found');

    const batchResult = await client.query(
      `INSERT INTO stock_batches
         (medicine_id, supplier_id, batch_number, quantity, remaining_quantity, unit_cost, selling_price,
          manufacturing_date, expiry_date, received_date, notes)
       VALUES ($1, $2, $3, $4, $4, $5, $6, $7, $8, NOW(), $9)
       RETURNING *`,
      [
        data.medicineId, data.supplierId || null, data.batchNumber, data.quantity,
        data.unitCost ?? 0, data.sellingPrice ?? null, data.manufacturingDate || null,
        data.expiryDate, data.notes || null,
      ]
    );

    const previousStock = medicineResult.rows[0].current_stock;
    const newStock = previousStock + data.quantity;
    await client.query('UPDATE medicines SET current_stock = $1 WHERE id = $2', [newStock, data.medicineId]);

    await client.query(
      `INSERT INTO stock_movements
         (medicine_id, stock_batch_id, movement_type, quantity, previous_stock, new_stock, reference_type, reference_id, notes, performed_by)
       VALUES ($1, $2, 'INBOUND', $3, $4, $5, 'BATCH', $6, $7, $8)`,
      [
        data.medicineId, batchResult.rows[0].id, data.quantity, previousStock, newStock,
        batchResult.rows[0].id, `Received batch ${data.batchNumber}`, performedBy,
      ]
    );

    return batchResult.rows[0];
  });
}

export async function updateBatch(id, data) {
  const existing = await findBatchById(id);
  if (!existing) return null;

  const entries = Object.entries(data).filter(([, value]) => value !== undefined);
  if (entries.length === 0) return existing;

  const sets = entries.map(([key], index) => `${key} = $${index + 1}`);
  const values = entries.map(([, value]) => value);
  values.push(id);

  return queryOne(
    `UPDATE stock_batches
     SET ${sets.join(', ')}, updated_at = NOW()
     WHERE id = $${values.length}
     RETURNING *`,
    values
  );
}

// ---------------------------------------------------------------- Movements

export async function listStockMovements({ medicineId, movementType, fromDate, toDate, search, limit = 50, offset = 0 }) {
  const conditions = [];
  const params = [];
  let idx = 1;

  if (medicineId) {
    conditions.push(`sm.medicine_id = $${idx++}`);
    params.push(medicineId);
  }
  if (movementType) {
    conditions.push(`sm.movement_type = $${idx++}`);
    params.push(movementType);
  }
  if (fromDate) {
    conditions.push(`sm.created_at >= $${idx++}`);
    params.push(fromDate);
  }
  if (toDate) {
    conditions.push(`sm.created_at <= $${idx++}`);
    params.push(toDate);
  }
  if (search) {
    conditions.push(`COALESCE(m.name, '') ILIKE $${idx}`);
    params.push(`%${search}%`);
    idx++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await queryOne(
    `SELECT COUNT(*)::int AS total
     FROM stock_movements sm
     LEFT JOIN medicines m ON m.id = sm.medicine_id
     ${whereClause}`,
    params
  );

  const rows = await query(
    `SELECT sm.*, m.name AS medicine_name, CONCAT(u.first_name, ' ', u.last_name) AS performed_by_name
     FROM stock_movements sm
     LEFT JOIN medicines m ON m.id = sm.medicine_id
     LEFT JOIN users u ON u.id = sm.performed_by
     ${whereClause}
     ORDER BY sm.created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  return { rows, total: countResult?.total ?? 0 };
}

export async function adjustStock(data, performedBy = null) {
  return transaction(async (client) => {
    const medicineResult = await client.query(
      'SELECT id, current_stock FROM medicines WHERE id = $1 FOR UPDATE',
      [data.medicineId]
    );
    const medicine = medicineResult.rows[0];
    if (!medicine) throw new ValidationError('Medicine not found');

    const previousStock = medicine.current_stock;
    const newStock = Math.max(0, previousStock + data.quantity);
    if (newStock < 0) {
      throw new ValidationError(`Adjustment would bring stock below zero`);
    }

    await client.query('UPDATE medicines SET current_stock = $1 WHERE id = $2', [newStock, data.medicineId]);

    if (data.stockBatchId) {
      const batchResult = await client.query(
        'SELECT remaining_quantity, is_expired FROM stock_batches WHERE id = $1 FOR UPDATE',
        [data.stockBatchId]
      );
      const batch = batchResult.rows[0];
      if (batch && !batch.is_expired) {
        const batchNew = Math.max(0, batch.remaining_quantity + data.quantity);
        if (batchNew < 0) throw new ValidationError('Adjustment would bring batch stock below zero');
        await client.query('UPDATE stock_batches SET remaining_quantity = $1 WHERE id = $2', [batchNew, data.stockBatchId]);
      }
    }

    const result = await client.query(
      `INSERT INTO stock_movements
         (medicine_id, stock_batch_id, movement_type, quantity, previous_stock, new_stock, reference_type, notes, performed_by)
       VALUES ($1, $2, 'ADJUSTMENT', $3, $4, $5, 'ADJUSTMENT', $6, $7)
       RETURNING *`,
      [
        data.medicineId, data.stockBatchId || null, Math.abs(data.quantity), previousStock, newStock,
        data.reason || 'Stock adjustment', performedBy,
      ]
    );

    return result.rows[0];
  });
}
