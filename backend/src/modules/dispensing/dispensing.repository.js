import { query, queryOne, transaction } from '../../config/database.js';

export async function listRecords({ patientId, pharmacistId, prescriptionId, status, page = 1, limit = 20 } = {}) {
  const conditions = [];
  const params = [];
  let idx = 1;

  if (patientId) { conditions.push(`dr.patient_id = $${idx++}`); params.push(patientId); }
  if (pharmacistId) { conditions.push(`dr.pharmacist_id = $${idx++}`); params.push(pharmacistId); }
  if (prescriptionId) { conditions.push(`dr.prescription_id = $${idx++}`); params.push(prescriptionId); }
  if (status) { conditions.push(`dr.status = $${idx++}`); params.push(status); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const countResult = await query(`SELECT COUNT(*) FROM dispensing_records dr ${where}`, params);
  const total = parseInt(countResult.rows[0].count, 10);

  const { rows } = await query(
    `SELECT dr.*, m.name AS medicine_name, m.generic_name,
            u.full_name AS pharmacist_name, p.full_name AS patient_name
     FROM dispensing_records dr
     JOIN medicines m ON m.id = dr.medicine_id
     JOIN users u ON u.id = dr.pharmacist_id
     JOIN users p ON p.id = dr.patient_id
     ${where}
     ORDER BY dr.created_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, limit, offset]
  );

  return { data: rows, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
}

export async function getRecord(id) {
  return queryOne(
    `SELECT dr.*, m.name AS medicine_name, m.generic_name,
            u.full_name AS pharmacist_name, p.full_name AS patient_name
     FROM dispensing_records dr
     JOIN medicines m ON m.id = dr.medicine_id
     JOIN users u ON u.id = dr.pharmacist_id
     JOIN users p ON p.id = dr.patient_id
     WHERE dr.id = $1`,
    [id]
  );
}

export async function createRecord(data) {
  return transaction(async (client) => {
    if (data.stockBatchId) {
      const batchResult = await client.query(
        'SELECT quantity FROM stock_batches WHERE id = $1 FOR UPDATE',
        [data.stockBatchId]
      );
      if (batchResult.rows.length === 0) throw new Error('Stock batch not found');
      if (batchResult.rows[0].quantity < data.quantityDispensed) throw new Error('Insufficient stock');

      await client.query(
        'UPDATE stock_batches SET quantity = quantity - $2, updated_at = NOW() WHERE id = $1',
        [data.stockBatchId, data.quantityDispensed]
      );
    }

    const [row] = await client.query(
      `INSERT INTO dispensing_records
       (prescription_id, order_id, patient_id, pharmacist_id, stock_batch_id, medicine_id,
        quantity_dispensed, unit_price, total_price, dispensing_notes, patient_instructions)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        data.prescriptionId || null, data.orderId || null, data.patientId, data.pharmacistId,
        data.stockBatchId || null, data.medicineId, data.quantityDispensed,
        data.unitPrice || null, data.totalPrice || null,
        data.dispensingNotes || null, data.patientInstructions || null
      ]
    );
    return row;
  });
}

export async function updateStatus(id, status, notes) {
  const fields = [`status = $2`, `updated_at = NOW()`];
  const params = [id, status];
  let idx = 3;

  if (status === 'RETURNED') {
    fields.push(`returned_at = NOW()`);
  }
  if (notes) {
    fields.push(`dispensing_notes = COALESCE(dispensing_notes, '') || E'\n' || $${idx++}`);
    params.push(notes);
  }

  const [row] = await query(
    `UPDATE dispensing_records SET ${fields.join(', ')} WHERE id = $1 RETURNING *`,
    params
  );
  return row;
}

export async function returnStock(stockBatchId, quantity) {
  await query(
    'UPDATE stock_batches SET quantity = quantity + $2, updated_at = NOW() WHERE id = $1',
    [stockBatchId, quantity]
  );
}

export async function getRecordsByPrescription(prescriptionId) {
  const { rows } = await query(
    `SELECT dr.*, m.name AS medicine_name, u.full_name AS pharmacist_name
     FROM dispensing_records dr
     JOIN medicines m ON m.id = dr.medicine_id
     JOIN users u ON u.id = dr.pharmacist_id
     WHERE dr.prescription_id = $1
     ORDER BY dr.dispensed_at DESC`,
    [prescriptionId]
  );
  return rows;
}

export async function getDispensingStats({ startDate, endDate, pharmacyId } = {}) {
  const conditions = ["dr.status = 'DISPENSED'"];
  const params = [];
  let idx = 1;

  if (startDate) { conditions.push(`dr.dispensed_at >= $${idx++}`); params.push(startDate); }
  if (endDate) { conditions.push(`dr.dispensed_at <= $${idx++}`); params.push(endDate); }

  const where = `WHERE ${conditions.join(' AND ')}`;

  const { rows } = await query(
    `SELECT
       COUNT(*) AS total_dispensed,
       COALESCE(SUM(dr.total_price), 0) AS total_revenue,
       COUNT(DISTINCT dr.patient_id) AS unique_patients,
       COUNT(DISTINCT dr.pharmacist_id) AS active_pharmacists
     FROM dispensing_records dr
     ${where}`,
    params
  );
  return rows[0];
}
