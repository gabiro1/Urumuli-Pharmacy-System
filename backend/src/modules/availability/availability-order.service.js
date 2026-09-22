import crypto from 'crypto';
import { transaction } from '../../config/database.js';
import { env } from '../../config/env.js';
import { ORDER_STATUS } from '../../constants.js';
import { createAuditLog } from '../../middlewares/auditLogger.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../../utils/errors.js';
import { notifyOrderPatient } from '../../services/notification.service.js';

const IDEMPOTENCY_SCOPE = 'CREATE_AVAILABILITY_ORDER';

function normalizePhone(phone) {
  return String(phone || '').replace(/[\s()-]/g, '');
}

function buildReference() {
  return `URU-${Date.now().toString().slice(-8)}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
}

function numberOrNull(value) {
  if (value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

async function getOrCreatePatientIdentity(client, userId) {
  let identity = (await client.query(
    'SELECT * FROM patient_identities WHERE user_id = $1 FOR UPDATE',
    [userId]
  )).rows[0];
  if (identity) return identity;

  const account = (await client.query(
    `SELECT first_name, last_name, email, phone
     FROM users
     WHERE id = $1 AND is_active = true`,
    [userId]
  )).rows[0];
  const phone = normalizePhone(account?.phone);
  if (!account || !phone) {
    throw new ValidationError('Add a phone number to your patient profile before ordering');
  }

  identity = (await client.query(
    `INSERT INTO patient_identities
       (user_id, full_name, verified_phone, email, profile_completion_status)
     VALUES ($1, $2, $3, $4, 'COMPLETE')
     ON CONFLICT (verified_phone) DO UPDATE SET
       user_id = EXCLUDED.user_id,
       full_name = COALESCE(EXCLUDED.full_name, patient_identities.full_name),
       email = COALESCE(EXCLUDED.email, patient_identities.email),
       profile_completion_status = 'COMPLETE',
       verified_at = NOW()
     RETURNING *`,
    [userId, `${account.first_name || ''} ${account.last_name || ''}`.trim() || null, phone, account.email || null]
  )).rows[0];

  return identity;
}

export async function createOrderFromAvailability(requestId, user, data, idempotencyKey) {
  if (!idempotencyKey) throw new ValidationError('Idempotency-Key header is required');

  const result = await transaction(async (client) => {
    const request = (await client.query(
      `SELECT r.id, r.patient_id, r.medicine_id, r.medicine_name,
              r.verification_status, r.physical_stock_confirmed,
              r.quoted_unit_price, r.order_id, r.pharmacist_id,
              m.name AS medicine_catalog_name, m.generic_name AS medicine_generic_name,
              m.brand_name AS medicine_brand_name, m.strength AS medicine_strength,
              m.dosage_form AS medicine_dosage_form, m.pack_size AS medicine_pack_size,
              m.selling_unit AS medicine_selling_unit, m.price AS medicine_price,
              m.classification AS medicine_classification,
              m.requires_prescription AS medicine_requires_prescription,
              m.current_stock AS medicine_current_stock
       FROM medicine_availability_requests r
       LEFT JOIN medicines m ON m.id = r.medicine_id
       WHERE r.id = $1
        FOR UPDATE OF r`,
      [requestId]
    )).rows[0];

    if (!request) throw new NotFoundError('Availability request', requestId);
    if (request.patient_id !== user.userId) throw new ForbiddenError('You can only order from your own availability requests');

    const prior = (await client.query(
      `SELECT response_body
       FROM idempotency_records
       WHERE scope = $1 AND idempotency_key = $2 AND owner_key = $3`,
      [IDEMPOTENCY_SCOPE, idempotencyKey, user.userId]
    )).rows[0];
    if (prior) return { order: prior.response_body, created: false };

    if (request.order_id) {
      const existing = (await client.query('SELECT * FROM orders WHERE id = $1', [request.order_id])).rows[0];
      if (existing) return { order: existing, created: false };
    }

    if (![ 'PHYSICALLY_AVAILABLE', 'INVENTORY_UPDATED' ].includes(request.verification_status)) {
      throw new ValidationError('The pharmacist must confirm physical availability before an order can be created');
    }

    if (request.medicine_id && request.verification_status !== 'INVENTORY_UPDATED') {
      throw new ValidationError('The pharmacist must synchronise the digital inventory before this catalog medicine can be ordered');
    }

    const quantity = Number(data.quantity || 1);
    const physicalStock = Number(request.physical_stock_confirmed || 0);
    if (physicalStock < quantity) {
      throw new ValidationError(`Only ${physicalStock} unit(s) were confirmed as physically available`);
    }

    if (['RESTRICTED', 'PRESCRIPTION_REQUIRED'].includes(request.medicine_classification) || request.medicine_requires_prescription) {
      throw new ValidationError('This medicine requires the prescription ordering workflow');
    }

    const unitPrice = numberOrNull(request.quoted_unit_price ?? request.medicine_price);
    if (unitPrice === null || unitPrice < 0) {
      throw new ValidationError('The pharmacist has not set a valid price for this medicine');
    }

    const identity = await getOrCreatePatientIdentity(client, user.userId);
    const deliveryFee = data.fulfilmentMethod === 'DELIVERY' ? 1500 : 0;
    const subtotal = unitPrice * quantity;
    const order = (await client.query(
      `INSERT INTO orders
         (public_reference, patient_identity_id, account_id, status, order_type,
          subtotal, delivery_fee, total, fulfilment_method, delivery_address, consented_at)
       VALUES ($1, $2, $3, $4, 'OTC', $5, $6, $7, $8, $9, NOW())
       RETURNING *`,
      [
        buildReference(),
        identity.id,
        user.userId,
        ORDER_STATUS.APPROVED_AWAITING_PAYMENT,
        subtotal,
        deliveryFee,
        subtotal + deliveryFee,
        data.fulfilmentMethod,
        data.deliveryAddress || null,
      ]
    )).rows[0];

    const snapshot = {
      name: request.medicine_name,
      catalogName: request.medicine_catalog_name || null,
      genericName: request.medicine_generic_name || null,
      brandName: request.medicine_brand_name || null,
      strength: request.medicine_strength || null,
      dosageForm: request.medicine_dosage_form || null,
      packSize: request.medicine_pack_size || null,
      sellingUnit: request.medicine_selling_unit || 'unit',
      source: 'PHYSICAL_AVAILABILITY_REQUEST',
      availabilityRequestId: request.id,
    };

    const item = (await client.query(
      `INSERT INTO order_items
         (order_id, medicine_id, medicine_snapshot, requested_quantity,
          approved_quantity, selling_unit, unit_price, total,
          prescription_required, approval_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false, 'APPROVED')
       RETURNING id`,
      [
        order.id,
        request.medicine_id || null,
        JSON.stringify(snapshot),
        quantity,
        quantity,
        snapshot.sellingUnit,
        unitPrice,
        subtotal,
      ]
    )).rows[0];

    if (request.medicine_id && request.verification_status === 'INVENTORY_UPDATED') {
      const activeReservations = (await client.query(
        `SELECT COALESCE(SUM(quantity), 0)::int AS quantity
         FROM inventory_reservations
         WHERE medicine_id = $1 AND status = 'ACTIVE' AND expires_at > NOW()`,
        [request.medicine_id]
      )).rows[0];
      const availableAfterReservations = Number(request.medicine_current_stock || 0) - Number(activeReservations.quantity || 0);
      if (availableAfterReservations < quantity) {
        throw new ValidationError('The verified medicine quantity is no longer available');
      }
      await client.query(
        `INSERT INTO inventory_reservations(order_item_id, medicine_id, quantity, expires_at)
         VALUES ($1, $2, $3, NOW() + ($4 || ' minutes')::interval)`,
        [item.id, request.medicine_id, quantity, env.RESERVATION_MINUTES]
      );
    }

    await client.query(
      `UPDATE medicine_availability_requests
       SET order_id = $2
       WHERE id = $1`,
      [request.id, order.id]
    );

    await client.query(
      `INSERT INTO order_status_history
         (order_id, previous_status, new_status, actor_id, actor_role, metadata)
       VALUES ($1, NULL, $2, $3, $4, $5)`,
      [
        order.id,
        ORDER_STATUS.APPROVED_AWAITING_PAYMENT,
        user.userId,
        user.role,
        JSON.stringify({ availabilityRequestId: request.id, quantity }),
      ]
    );

    const response = { ...order, item_id: item.id, availability_request_id: request.id };
    await client.query(
      `INSERT INTO idempotency_records
         (scope, idempotency_key, owner_key, response_status, response_body)
       VALUES ($1, $2, $3, 201, $4)`,
      [IDEMPOTENCY_SCOPE, idempotencyKey, user.userId, JSON.stringify(response)]
    );

    return { order: response, created: true };
  });

  if (result.created) {
    await createAuditLog({
      userId: user.userId,
      action: 'CREATE',
      entity: 'ORDER',
      entityId: result.order.id,
      description: `Order created from availability request ${requestId}`,
      metadata: { availabilityRequestId: requestId },
    });
    await notifyOrderPatient(result.order, {
      type: 'ORDER_ACTION',
      title: 'Medicine ready to order',
      message: 'The pharmacy confirmed your medicine. Continue to payment to complete the order.',
    });
  }

  return result.order;
}
