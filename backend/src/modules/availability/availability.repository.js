import { query, queryOne, transaction } from '../../config/database.js';
import { ValidationError } from '../../utils/errors.js';

const requestFields = `
  r.id, r.conversation_id, r.patient_id, r.medicine_id, r.medicine_name,
  r.searched_term, r.system_stock, r.verification_status,
  r.physical_stock_confirmed, r.pharmacist_id, r.pharmacist_notes,
  r.quoted_unit_price, r.order_id,
  r.verified_at, r.inventory_synced_at, r.created_at, r.updated_at,
  m.name AS medicine_catalog_name, m.price AS medicine_catalog_price,
  m.generic_name AS medicine_generic_name, m.brand_name AS medicine_brand_name,
  m.strength AS medicine_strength, m.dosage_form AS medicine_dosage_form,
  m.pack_size AS medicine_pack_size, m.selling_unit AS medicine_selling_unit,
  m.classification AS medicine_classification,
  m.requires_prescription AS medicine_requires_prescription,
  u.first_name AS patient_first_name, u.last_name AS patient_last_name, u.email AS patient_email,
  p.first_name AS pharmacist_first_name, p.last_name AS pharmacist_last_name
`;

const requestJoin = `
  FROM medicine_availability_requests r
  LEFT JOIN medicines m ON m.id = r.medicine_id
  LEFT JOIN users u ON u.id = r.patient_id
  LEFT JOIN users p ON p.id = r.pharmacist_id
`;

// Creates the conversation, the auto-generated first patient message, the
// conversation event, and the availability request row in one transaction so
// nothing can be half-created.
export async function createRequest({ patientId, medicineId, medicineName, searchedTerm, systemStock, subject, message }) {
  return transaction(async (client) => {
    const conversationResult = await client.query(
      `INSERT INTO conversations (patient_id, subject, context_type, context_id, priority, status)
       VALUES ($1, $2, 'MEDICINE', $3, 'NORMAL', 'WAITING_PHARMACIST')
       RETURNING id, status`,
      [patientId, subject, medicineId || null]
    );
    const conversationId = conversationResult.rows[0].id;

    await client.query(
      `INSERT INTO conversation_messages (conversation_id, sender_id, sender_role, content)
       VALUES ($1, $2, 'PATIENT', $3)`,
      [conversationId, patientId, message]
    );

    await client.query(
      `INSERT INTO conversation_events (conversation_id, event_type, actor_id, new_value, description, metadata)
       VALUES ($1, 'STATUS_CHANGED', $2, 'WAITING_PHARMACIST', 'Availability request created', $3)`,
      [conversationId, patientId, JSON.stringify({ medicineName, medicineId: medicineId || null, systemStock })]
    );

    const requestResult = await client.query(
      `INSERT INTO medicine_availability_requests
         (conversation_id, patient_id, medicine_id, medicine_name, searched_term, system_stock)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [conversationId, patientId, medicineId || null, medicineName, searchedTerm || null, systemStock]
    );

    return { conversationId, request: requestResult.rows[0] };
  });
}

export async function findRequestById(id) {
  return queryOne(`SELECT ${requestFields} ${requestJoin} WHERE r.id = $1`, [id]);
}

export async function findRequestByConversationId(conversationId) {
  return queryOne(`SELECT ${requestFields} ${requestJoin} WHERE r.conversation_id = $1`, [conversationId]);
}

export async function listPatientRequests(patientId) {
  return query(
    `SELECT ${requestFields} ${requestJoin} WHERE r.patient_id = $1 ORDER BY r.created_at DESC`,
    [patientId]
  );
}

export async function updateVerification(id, {
  verificationStatus,
  physicalStockConfirmed,
  pharmacistId,
  notes,
  quotedUnitPrice,
}) {
  const result = await queryOne(
    `UPDATE medicine_availability_requests
     SET verification_status = $2,
         physical_stock_confirmed = $3,
         pharmacist_id = $4,
         pharmacist_notes = $5,
         quoted_unit_price = $6,
         verified_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [
      id,
      verificationStatus,
      physicalStockConfirmed === null || physicalStockConfirmed === undefined ? null : physicalStockConfirmed,
      pharmacistId,
      notes || null,
      quotedUnitPrice === null || quotedUnitPrice === undefined ? null : quotedUnitPrice,
    ]
  );
  if (!result) throw new ValidationError('Availability request not found');
  return findRequestById(id);
}

// Stale-stock-safe inventory synchronisation. Only applies the verified physical
// quantity when the live digital stock still matches the snapshot captured when
// the request was created. If anything changed meanwhile, we refuse instead of
// blindly overwriting newer inventory information.
export async function syncInventoryFromVerification(id, { physicalStock, pharmacistId }) {
  return transaction(async (client) => {
    const reqResult = await client.query(
      `SELECT id, medicine_id, medicine_name, system_stock, verification_status
       FROM medicine_availability_requests WHERE id = $1 FOR UPDATE`,
      [id]
    );
    const request = reqResult.rows[0];
    if (!request) throw new ValidationError('Availability request not found');
    if (!request.medicine_id) {
      throw new ValidationError(
        'This medicine is not in the digital catalog, so inventory cannot be synchronised. Please add it to the catalog first.'
      );
    }
    if (request.verification_status === 'PHYSICALLY_UNAVAILABLE') {
      throw new ValidationError('The medicine was verified as physically unavailable; nothing to synchronise.');
    }

    const medicineResult = await client.query(
      'SELECT id, name, current_stock FROM medicines WHERE id = $1 FOR UPDATE',
      [request.medicine_id]
    );
    const medicine = medicineResult.rows[0];
    if (!medicine) throw new ValidationError('Medicine not found in the inventory');

    const liveStock = Number(medicine.current_stock || 0);
    const snapshot = Number(request.system_stock || 0);

    if (liveStock !== snapshot) {
      throw new ValidationError(
        `Digital inventory changed since this request was created (was ${snapshot}, now ${liveStock}). ` +
        'Please re-check the physical stock before synchronising.'
      );
    }

    const quantity = Math.max(0, Math.round(Number(physicalStock) || 0));
    if (liveStock === quantity) {
      await client.query(
        `UPDATE medicine_availability_requests
         SET verification_status = 'INVENTORY_UPDATED',
             inventory_synced_at = NOW(),
             pharmacist_id = COALESCE($2, pharmacist_id)
         WHERE id = $1`,
        [id, pharmacistId]
      );
      const synced = await client.query(
        `SELECT ${requestFields} ${requestJoin} WHERE r.id = $1`,
        [id]
      );
      return { updated: false, movement: null, request: synced.rows[0] };
    }

    await client.query('UPDATE medicines SET current_stock = $1, updated_at = NOW() WHERE id = $2', [quantity, medicine.id]);

    const movementResult = await client.query(
      `INSERT INTO stock_movements
         (medicine_id, movement_type, quantity, previous_stock, new_stock, reference_type, reference_id, notes, performed_by)
       VALUES ($1, 'ADJUSTMENT', $2, $3, $4, 'VERIFICATION', $5, $6, $7)
       RETURNING *`,
      [
        medicine.id,
        Math.abs(quantity - liveStock),
        liveStock,
        quantity,
        id,
        `Inventory synchronised from physical verification of ${request.medicine_name}`,
        pharmacistId,
      ]
    );

    await client.query(
      `UPDATE medicine_availability_requests
       SET verification_status = 'INVENTORY_UPDATED',
           physical_stock_confirmed = $2,
           inventory_synced_at = NOW(),
           pharmacist_id = COALESCE($3, pharmacist_id)
       WHERE id = $1`,
      [id, quantity, pharmacistId]
    );

    const synced = await client.query(
      `SELECT ${requestFields} ${requestJoin} WHERE r.id = $1`,
      [id]
    );

    return { updated: true, movement: movementResult.rows[0], request: synced.rows[0] };
  });
}

// Active pharmacists plus managers/admins receive availability request pings.
export async function listStaffToNotify() {
  return query(
    `SELECT DISTINCT u.id
     FROM users u
     WHERE u.is_active = true
       AND u.role IN ('PHARMACIST', 'ADMIN', 'MANAGER')`
  );
}

export async function findMedicineSnapshot(id) {
  return queryOne(
    `SELECT id, name, current_stock, is_active, price, classification,
            requires_prescription, selling_unit, pack_size, strength, dosage_form
     FROM medicines
     WHERE id = $1`,
    [id]
  );
}

export async function findUserName(userId) {
  return queryOne('SELECT first_name, last_name FROM users WHERE id = $1', [userId]);
}
