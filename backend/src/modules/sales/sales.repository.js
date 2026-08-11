import { query, queryOne, transaction } from '../../config/database.js';
import { generateReference } from '../../utils/helpers.js';
import { ValidationError } from '../../utils/errors.js';

export async function findMedicineWithStock(id, client) {
  const result = await client.query(
    `SELECT id, name, price, cost_price, current_stock, requires_prescription, classification, availability_status, is_active, selling_unit, image_url
     FROM medicines WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

export async function findAvailableBatches(medicineId, client) {
  const result = await client.query(
    `SELECT id, batch_number, remaining_quantity, unit_cost, selling_price, expiry_date, is_expired
     FROM stock_batches
     WHERE medicine_id = $1 AND remaining_quantity > 0 AND is_expired = false
       AND (expiry_date IS NULL OR expiry_date > CURRENT_DATE)
     ORDER BY expiry_date ASC NULLS LAST, created_at ASC`,
    [medicineId]
  );
  return result.rows;
}

export async function updateMedicineStock(client, medicineId, newStock) {
  await client.query('UPDATE medicines SET current_stock = $1 WHERE id = $2', [newStock, medicineId]);
}

export async function updateBatchRemaining(client, batchId, newRemaining) {
  await client.query('UPDATE stock_batches SET remaining_quantity = $1 WHERE id = $2', [newRemaining, batchId]);
}

export async function insertStockMovement(client, {
  medicineId, stockBatchId, movementType, quantity, previousStock, newStock, referenceType, referenceId, notes, performedBy,
}) {
  const result = await client.query(
    `INSERT INTO stock_movements
       (medicine_id, stock_batch_id, movement_type, quantity, previous_stock, new_stock, reference_type, reference_id, notes, performed_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [medicineId, stockBatchId || null, movementType, quantity, previousStock, newStock, referenceType || 'SALE', referenceId || null, notes || null, performedBy || null]
  );
  return result.rows[0];
}

export async function createSale(data) {
  const {
    items, customer = {}, paymentMethod, amountTendered, discountAmount, taxAmount,
    pharmacistId, prescriptionId, notes, cashierId,
  } = data;

  return transaction(async (client) => {
    const resolvedItems = [];
    let totalAmount = 0;

    for (const item of items) {
      const medicine = await findMedicineWithStock(item.medicineId, client);
      if (!medicine) throw new ValidationError(`Medicine ${item.medicineId} not found`);
      if (!medicine.is_active || medicine.availability_status === 'UNAVAILABLE' || medicine.classification === 'RESTRICTED') {
        throw new ValidationError(`${medicine.name} is not available for sale`);
      }

      const isRestricted = medicine.classification === 'RESTRICTED';
      const isRxOnly = medicine.classification === 'PRESCRIPTION_REQUIRED' || Boolean(medicine.requires_prescription);
      if (isRestricted || isRxOnly) {
        if (!prescriptionId) {
          throw new ValidationError(`${medicine.name} is ${isRestricted ? 'a restricted' : 'a prescription-only'} medicine and requires a valid prescription reference`);
        }
      }

      const quantity = item.quantity;
      if (medicine.current_stock < quantity) {
        throw new ValidationError(`${medicine.name} has insufficient stock (${medicine.current_stock} available)`);
      }

      let remaining = quantity;
      const allocations = [];

      const batches = await findAvailableBatches(item.medicineId, client);
      for (const batch of batches) {
        if (remaining <= 0) break;
        const take = Math.min(batch.remaining_quantity, remaining);
        if (take > 0) {
          allocations.push({ batchId: batch.id, take });
          remaining -= take;
        }
      }

      if (remaining > 0) {
        throw new ValidationError(`${medicine.name} has no available batch stock for the requested quantity`);
      }

      const unitPrice = Number(medicine.price) || 0;
      const lineTotal = unitPrice * quantity;
      totalAmount += lineTotal;

      const newStock = medicine.current_stock - quantity;
      await updateMedicineStock(client, medicine.id, newStock);

      for (const allocation of allocations) {
        const batch = await client.query(
          'SELECT remaining_quantity FROM stock_batches WHERE id = $1 FOR UPDATE',
          [allocation.batchId]
        );
        const newRemaining = batch.rows[0].remaining_quantity - allocation.take;
        await updateBatchRemaining(client, allocation.batchId, newRemaining);
      }

      await insertStockMovement(client, {
        medicineId: medicine.id,
        stockBatchId: allocations[0]?.batchId || null,
        movementType: 'OUTBOUND',
        quantity,
        previousStock: medicine.current_stock,
        newStock,
        referenceType: 'SALE',
        referenceId: null,
        notes: `Sale of ${quantity} × ${medicine.name}`,
        performedBy: cashierId,
      });

      resolvedItems.push({
        medicine,
        quantity,
        unitPrice,
        totalPrice: lineTotal,
        stockBatchId: allocations.length === 1 ? allocations[0].batchId : null,
        stockBatchIds: allocations.map((a) => a.batchId),
      });
    }

    const discount = Number(discountAmount || 0);
    const tax = Number(taxAmount || 0);
    const grandTotal = totalAmount - discount + tax;
    const change = amountTendered !== null && amountTendered !== undefined
      ? Math.max(0, Number(amountTendered) - grandTotal)
      : 0;

    const referenceNumber = generateReference('SALE');
    const saleResult = await client.query(
      `INSERT INTO sales
         (reference_number, cashier_id, pharmacist_id, prescription_id, customer_name, customer_phone, customer_email,
          total_amount, discount_amount, tax_amount, grand_total, amount_tendered, change_amount, payment_method, status, notes, pos_metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'COMPLETED', $15, $16)
       RETURNING *`,
      [
        referenceNumber, cashierId, pharmacistId || null, prescriptionId || null,
        customer.name || null, customer.phone || null, customer.email || null,
        Number(totalAmount.toFixed(2)), Number(discount.toFixed(2)), Number(tax.toFixed(2)),
        Number(grandTotal.toFixed(2)), amountTendered ?? null, Number(change.toFixed(2)),
        paymentMethod, notes || null, JSON.stringify({ items: resolvedItems.length }),
      ]
    );
    const sale = saleResult.rows[0];

    const itemRows = [];
    for (const resolved of resolvedItems) {
      const result = await client.query(
        `INSERT INTO sale_items
           (sale_id, medicine_id, stock_batch_id, medicine_name, quantity, unit_price, total_price, discount_amount)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 0)
         RETURNING *`,
        [
          sale.id, resolved.medicine.id, resolved.stockBatchId, resolved.medicine.name,
          resolved.quantity, Number(resolved.unitPrice.toFixed(2)), Number(resolved.totalPrice.toFixed(2)),
        ]
      );
      itemRows.push(result.rows[0]);
    }

    return { sale, items: itemRows };
  });
}

export async function transitionSaleStatus(id, status, { userId, restoreStock = false } = {}) {
  return transaction(async (client) => {
    const saleResult = await client.query('SELECT * FROM sales WHERE id = $1 FOR UPDATE', [id]);
    const sale = saleResult.rows[0];
    if (!sale) return null;

    const allowedStatuses = status === 'VOIDED' ? ['COMPLETED'] : ['COMPLETED'];
    if (!allowedStatuses.includes(sale.status)) {
      throw new ValidationError(`Only COMPLETED sales can be marked as ${status.toLowerCase()}`);
    }

    await client.query(
      'UPDATE sales SET status = $1, updated_at = NOW() WHERE id = $2',
      [status, id]
    );

    if (restoreStock) {
      const itemsResult = await client.query('SELECT * FROM sale_items WHERE sale_id = $1', [id]);
      for (const item of itemsResult.rows) {
        const medicineResult = await client.query(
          'SELECT current_stock FROM medicines WHERE id = $1 FOR UPDATE',
          [item.medicine_id]
        );
        const medicine = medicineResult.rows[0];
        const newStock = (medicine?.current_stock || 0) + item.quantity;
        await updateMedicineStock(client, item.medicine_id, newStock);

        if (item.stock_batch_id) {
          const batchResult = await client.query(
            'SELECT remaining_quantity, is_expired FROM stock_batches WHERE id = $1 FOR UPDATE',
            [item.stock_batch_id]
          );
          const batch = batchResult.rows[0];
          if (batch && !batch.is_expired) {
            await updateBatchRemaining(client, item.stock_batch_id, batch.remaining_quantity + item.quantity);
          }
        }

        await insertStockMovement(client, {
          medicineId: item.medicine_id,
          stockBatchId: item.stock_batch_id,
          movementType: 'RETURN',
          quantity: item.quantity,
          previousStock: medicine?.current_stock || 0,
          newStock,
          referenceType: 'SALE',
          referenceId: id,
          notes: `${status} sale ${sale.reference_number}`,
          performedBy: userId,
        });
      }
    }

    return sale;
  });
}


const saleFields = `
  s.id, s.reference_number, s.cashier_id, s.pharmacist_id, s.prescription_id,
  s.customer_name, s.customer_phone, s.customer_email,
  s.total_amount, s.discount_amount, s.tax_amount, s.grand_total,
  s.amount_tendered, s.change_amount, s.payment_method, s.status,
  s.notes, s.pos_metadata, s.created_at, s.updated_at,
  CONCAT(cashier.first_name, ' ', cashier.last_name) AS cashier_name,
  CONCAT(pharmacist.first_name, ' ', pharmacist.last_name) AS pharmacist_name,
  COALESCE(item_counts.cnt, 0)::int AS item_count
`;

const saleFieldsJoin = `
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::int AS cnt FROM sale_items si WHERE si.sale_id = s.id
  ) item_counts ON true
`;

function buildSaleWhere({
  search,
  status,
  paymentMethod,
  fromDate,
  toDate,
}) {
  const conditions = [];
  const params = [];
  let idx = 1;

  if (search) {
    conditions.push(`(
      s.reference_number ILIKE $${idx}
      OR COALESCE(s.customer_name, '') ILIKE $${idx}
      OR COALESCE(s.customer_phone, '') ILIKE $${idx}
      OR COALESCE(s.customer_email, '') ILIKE $${idx}
      OR CONCAT(COALESCE(cashier.first_name, ''), ' ', COALESCE(cashier.last_name, '')) ILIKE $${idx}
      OR CONCAT(COALESCE(pharmacist.first_name, ''), ' ', COALESCE(pharmacist.last_name, '')) ILIKE $${idx}
    )`);
    params.push(`%${search}%`);
    idx++;
  }

  if (status) {
    conditions.push(`s.status = $${idx++}`);
    params.push(status);
  }

  if (paymentMethod) {
    conditions.push(`s.payment_method = $${idx++}`);
    params.push(paymentMethod);
  }

  if (fromDate) {
    conditions.push(`s.created_at >= $${idx++}`);
    params.push(fromDate);
  }

  if (toDate) {
    conditions.push(`s.created_at <= $${idx++}`);
    params.push(toDate);
  }

  return { conditions, params };
}

export async function listSales({
  limit,
  offset,
  search,
  status,
  paymentMethod,
  fromDate,
  toDate,
}) {
  const { conditions, params } = buildSaleWhere({
    search,
    status,
    paymentMethod,
    fromDate,
    toDate,
  });
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await queryOne(
    `SELECT COUNT(*)::int AS total
     FROM sales s
     ${whereClause}`,
    params
  );

  const rows = await query(
    `SELECT ${saleFields}
     FROM sales s
     LEFT JOIN users cashier ON cashier.id = s.cashier_id
     LEFT JOIN users pharmacist ON pharmacist.id = s.pharmacist_id
     ${saleFieldsJoin}
     ${whereClause}
     ORDER BY s.created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  return {
    rows,
    total: countResult?.total ?? 0,
  };
}

export async function findSaleById(id) {
  const sale = await queryOne(
    `SELECT ${saleFields}
     FROM sales s
     LEFT JOIN users cashier ON cashier.id = s.cashier_id
     LEFT JOIN users pharmacist ON pharmacist.id = s.pharmacist_id
     ${saleFieldsJoin}
     WHERE s.id = $1`,
    [id]
  );

  if (!sale) {
    return null;
  }

  const items = await query(
    `SELECT si.*, m.name AS catalog_name, m.generic_name, m.brand_name, m.image_url
     FROM sale_items si
     LEFT JOIN medicines m ON m.id = si.medicine_id
     WHERE si.sale_id = $1
     ORDER BY si.created_at ASC`,
    [id]
  );

  return { sale, items };
}

export async function getDashboardData({ days = 30, recentLimit = 10, topLimit = 8 } = {}) {
  const dateThreshold = `CURRENT_DATE - (${Math.max(1, days)} * INTERVAL '1 day')`;

  const totalsPromise = queryOne(
    `SELECT
       COUNT(*)::int AS total_sales,
       COALESCE(SUM(grand_total), 0) AS total_revenue,
       COALESCE(SUM(discount_amount), 0) AS total_discount,
       COALESCE(SUM(tax_amount), 0) AS total_tax,
       COALESCE(AVG(grand_total), 0) AS average_transaction_value,
       COUNT(*) FILTER (WHERE status = 'COMPLETED')::int AS completed_sales,
       COUNT(*) FILTER (WHERE status = 'REFUNDED')::int AS refunded_sales,
       COUNT(*) FILTER (WHERE status = 'VOIDED')::int AS voided_sales,
       COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE)::int AS today_sales,
       COALESCE(SUM(grand_total) FILTER (WHERE created_at::date = CURRENT_DATE), 0) AS today_revenue
     FROM sales
     WHERE created_at >= ${dateThreshold}`
  );

  const paymentBreakdownPromise = query(
    `SELECT
       payment_method,
       COUNT(*)::int AS count,
       COALESCE(SUM(grand_total), 0) AS revenue
     FROM sales
     WHERE created_at >= ${dateThreshold}
     GROUP BY payment_method
     ORDER BY count DESC, revenue DESC`
  );

  const statusBreakdownPromise = query(
    `SELECT
       status,
       COUNT(*)::int AS count,
       COALESCE(SUM(grand_total), 0) AS revenue
     FROM sales
     WHERE created_at >= ${dateThreshold}
     GROUP BY status
     ORDER BY count DESC, revenue DESC`
  );

  const dailyRevenuePromise = query(
    `SELECT
       DATE(created_at) AS day,
       COUNT(*)::int AS sales_count,
       COALESCE(SUM(grand_total), 0) AS revenue,
       COALESCE(SUM(discount_amount), 0) AS discount,
       COALESCE(SUM(tax_amount), 0) AS tax
     FROM sales
     WHERE created_at >= CURRENT_DATE - ($1 * INTERVAL '1 day')
     GROUP BY DATE(created_at)
     ORDER BY day ASC`,
    [Math.max(1, days)]
  );

  const recentSalesPromise = query(
    `SELECT ${saleFields}
     FROM sales s
     LEFT JOIN users cashier ON cashier.id = s.cashier_id
     LEFT JOIN users pharmacist ON pharmacist.id = s.pharmacist_id
     ${saleFieldsJoin}
     ORDER BY s.created_at DESC
     LIMIT $1`,
    [recentLimit]
  );

  const topMedicinesPromise = query(
    `SELECT
       si.medicine_id,
       si.medicine_name,
       SUM(si.quantity)::int AS total_quantity_sold,
       COALESCE(SUM(si.total_price), 0) AS total_revenue,
       COUNT(DISTINCT si.sale_id)::int AS total_transactions
     FROM sale_items si
     GROUP BY si.medicine_id, si.medicine_name
     ORDER BY total_quantity_sold DESC, total_revenue DESC
     LIMIT $1`,
    [topLimit]
  );

  const [totals, paymentBreakdown, statusBreakdown, dailyRevenue, recentSales, topMedicines] = await Promise.all([
    totalsPromise,
    paymentBreakdownPromise,
    statusBreakdownPromise,
    dailyRevenuePromise,
    recentSalesPromise,
    topMedicinesPromise,
  ]);

  return {
    totals,
    paymentBreakdown,
    statusBreakdown,
    dailyRevenue,
    recentSales,
    topMedicines,
  };
}
