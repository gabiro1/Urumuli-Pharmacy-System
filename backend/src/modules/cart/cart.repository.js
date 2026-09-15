import { query, queryOne } from '../../config/database.js';

const medicineFields = `
  m.id, m.name, m.generic_name, m.brand_name, m.category_id,
  c.name AS category_name, m.manufacturer, m.description,
  m.price, m.cost_price, m.requires_prescription, m.is_active,
  m.is_controlled, m.strength, m.dosage_form, m.unit_of_measure,
  m.storage_conditions, m.side_effects, m.contraindications,
  m.symptoms, m.indications, m.tags, m.min_stock_level,
  m.max_stock_level, m.current_stock, m.reorder_point,
  m.barcode, m.image_url, m.created_at, m.updated_at,
  m.classification, m.pack_size, m.selling_unit, m.availability_status,
  m.product_type, m.subcategory, m.sku, m.is_archived, m.otc_review_required,
  pc.quantity
`;

const cartJoin = `
  FROM patient_carts pc
  JOIN medicines m ON m.id = pc.medicine_id
  LEFT JOIN categories c ON c.id = m.category_id
  WHERE pc.user_id = $1
`;

export const listCart = (userId) =>
  query(`SELECT ${medicineFields} ${cartJoin} ORDER BY pc.created_at`, [userId]);

export const findCartItem = (userId, medicineId) =>
  queryOne(
    `SELECT ${medicineFields} ${cartJoin} AND pc.medicine_id = $2`,
    [userId, medicineId]
  );

export const upsertItem = (userId, medicineId, quantity) =>
  queryOne(
    `INSERT INTO patient_carts (user_id, medicine_id, quantity)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, medicine_id)
     DO UPDATE SET quantity = LEAST(99, patient_carts.quantity + EXCLUDED.quantity), updated_at = NOW()
     RETURNING user_id, medicine_id, quantity`,
    [userId, medicineId, quantity]
  );

export const setQuantity = (userId, medicineId, quantity) =>
  queryOne(
    `UPDATE patient_carts
     SET quantity = $3, updated_at = NOW()
     WHERE user_id = $1 AND medicine_id = $2
     RETURNING user_id, medicine_id, quantity`,
    [userId, medicineId, quantity]
  );

export const removeItem = (userId, medicineId) =>
  query(
    `DELETE FROM patient_carts WHERE user_id = $1 AND medicine_id = $2`,
    [userId, medicineId]
  );

export const clearCart = (userId) =>
  query(`DELETE FROM patient_carts WHERE user_id = $1`, [userId]);