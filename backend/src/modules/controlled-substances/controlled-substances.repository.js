import { query, queryOne } from '../../config/database.js';

export async function listEntries({ medicineId, pharmacistId, schedule, transactionType, startDate, endDate, page = 1, limit = 20 } = {}) {
  const conditions = [];
  const params = [];
  let idx = 1;
  if (medicineId) { conditions.push(`csr.medicine_id = $${idx++}`); params.push(medicineId); }
  if (pharmacistId) { conditions.push(`csr.pharmacist_id = $${idx++}`); params.push(pharmacistId); }
  if (schedule) { conditions.push(`csr.schedule = $${idx++}`); params.push(schedule); }
  if (transactionType) { conditions.push(`csr.transaction_type = $${idx++}`); params.push(transactionType); }
  if (startDate) { conditions.push(`csr.created_at >= $${idx++}`); params.push(startDate); }
  if (endDate) { conditions.push(`csr.created_at <= $${idx++}`); params.push(endDate); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const countResult = await query(`SELECT COUNT(*) FROM controlled_substance_register csr ${where}`, params);
  const total = parseInt(countResult.rows[0].count, 10);
  const { rows } = await query(
    `SELECT csr.*, m.name AS medicine_name, u.full_name AS pharmacist_name,
            w.full_name AS witness_name, p.full_name AS patient_name
     FROM controlled_substance_register csr
     JOIN medicines m ON m.id = csr.medicine_id
     JOIN users u ON u.id = csr.pharmacist_id
     LEFT JOIN users w ON w.id = csr.witness_id
     LEFT JOIN users p ON p.id = csr.patient_id
     ${where} ORDER BY csr.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, limit, offset]
  );
  return { data: rows, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
}

export async function createEntry(data) {
  const [row] = await query(
    `INSERT INTO controlled_substance_register
     (medicine_id, schedule, transaction_type, quantity, batch_number, pharmacist_id, witness_id, patient_id, prescription_id, order_id, destination, reason)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [data.medicineId, data.schedule, data.transactionType, data.quantity, data.batchNumber || null,
     data.pharmacistId, data.witnessId || null, data.patientId || null, data.prescriptionId || null,
     data.orderId || null, data.destination || null, data.reason]
  );
  return row;
}

export async function getRunningBalance(medicineId) {
  const { rows } = await query(
    `SELECT
       COALESCE(SUM(quantity) FILTER (WHERE transaction_type = 'RECEIVED'), 0) AS received,
       COALESCE(SUM(quantity) FILTER (WHERE transaction_type = 'DISPENSED'), 0) AS dispensed,
       COALESCE(SUM(quantity) FILTER (WHERE transaction_type = 'RETURNED'), 0) AS returned,
       COALESCE(SUM(quantity) FILTER (WHERE transaction_type = 'DESTROYED'), 0) AS destroyed,
       COALESCE(SUM(quantity) FILTER (WHERE transaction_type = 'TRANSFERRED'), 0) AS transferred
     FROM controlled_substance_register WHERE medicine_id = $1`,
    [medicineId]
  );
  const b = rows[0];
  return { ...b, balance: Number(b.received) - Number(b.dispensed) + Number(b.returned) - Number(b.destroyed) - Number(b.transferred) };
}

export async function getScheduleSummary() {
  const { rows } = await query(
    `SELECT schedule, COUNT(*) AS entry_count,
            SUM(quantity) AS total_quantity,
            COUNT(DISTINCT medicine_id) AS unique_medicines
     FROM controlled_substance_register
     GROUP BY schedule ORDER BY schedule`
  );
  return rows;
}
