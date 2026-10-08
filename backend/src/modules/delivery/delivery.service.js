import * as repository from './delivery.repository.js';
import * as orderRepository from '../orders/orders.repository.js';
import { transaction } from '../../config/database.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';
import { assertResourceAccess } from '../../utils/resourceAccess.js';
import { createAuditLog } from '../../middlewares/auditLogger.js';
import { notifyOrderPatient } from '../../services/notification.service.js';
import { AUDIT_ACTION, AUDIT_ENTITY } from '../../constants.js';
import { canTransition, fulfilmentForStatus } from '../orders/orderState.js';
import { consumeReservedStock } from '../orders/orders.service.js';
import {
  DELIVERY_STATUS,
  DELIVERY_STATUSES,
  OPEN_DELIVERY_STATUSES,
  REASON_REQUIRED_FOR,
  canTransitionDelivery,
  orderStatusForDelivery,
} from './deliveryState.js';

const DELIVERY_STAFF_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'PHARMACIST'];

const NOTIFICATIONS = {
  PICKED_UP: ['ORDER_STATUS', 'Delivery collected', 'Your order has been collected and is on its way.'],
  IN_TRANSIT: ['ORDER_STATUS', 'Delivery in transit', 'Your order is in transit.'],
  OUT_FOR_DELIVERY: ['ORDER_STATUS', 'Out for delivery', 'Your order is out for delivery and arriving shortly.'],
  DELIVERED: ['ORDER_STATUS', 'Order delivered', 'Your order has been delivered. Thank you for choosing Urumuli Pharmacy.'],
  FAILED: ['ORDER_ACTION', 'Delivery attempt failed', 'We could not complete the delivery. Our team will contact you.'],
  RETURNED: ['ORDER_ACTION', 'Delivery returned', 'Your order could not be delivered and has been returned to the pharmacy.'],
  CANCELLED: ['ORDER_STATUS', 'Delivery cancelled', 'The delivery for your order has been cancelled.'],
};

export async function createDelivery(data, user) {
  const order = await orderRepository.findOrder(data.orderId);
  if (!order) throw new NotFoundError('Order', data.orderId);
  if (order.fulfilment_method !== 'DELIVERY') {
    throw new ValidationError('Only orders fulfilled by delivery can have a delivery record');
  }
  if (order.status === 'CANCELLED' || order.status === 'REFUNDED') {
    throw new ValidationError(`Order ${order.public_reference} is ${order.status} and cannot be dispatched`);
  }

  const existing = await repository.getByOrderId(data.orderId);

  // An order can only have one live delivery at a time (enforced by
  // uq_delivery_live_per_order). Treat creation as idempotent so a double
  // click or a retried request returns the open record instead of surfacing
  // a raw unique-violation. A FAILED attempt stays live on purpose: it is
  // retried by transitioning the same row, not by opening a new one.
  if (existing && OPEN_DELIVERY_STATUSES.includes(existing.status)) {
    return { ...existing, history: await repository.getHistory(existing.id) };
  }

  // Only a closed record can be superseded, and the new attempt starts at 1.
  const attempt = 1;

  return transaction(async (client) => {
    const delivery = await repository.create(
      {
        ...data,
        orderId: data.orderId,
        status: DELIVERY_STATUS.PENDING,
        attempt,
        deliveryAddress: data.deliveryAddress || order.delivery_address,
        recipientName: data.recipientName || order.patient_name,
        recipientPhone: data.recipientPhone || order.patient_phone,
      },
      client
    );
    await repository.addHistory(client, {
      deliveryId: delivery.id,
      orderId: order.id,
      newStatus: delivery.status,
      actorId: user?.userId,
      actorRole: user?.role || 'SYSTEM',
      note: existing ? `Redelivery attempt ${attempt}` : 'Delivery record created',
    });
    return delivery;
  });
}

export async function getDelivery(id, user) {
  const delivery = await repository.getById(id);
  if (!delivery) throw new NotFoundError('Delivery', id);
  assertResourceAccess(user, delivery.patient_user_id, {
    staffRoles: DELIVERY_STAFF_ROLES,
    message: 'You can only access your own delivery information',
  });
  return { ...delivery, history: await repository.getHistory(delivery.id) };
}

export async function getByOrder(orderId, user) {
  const delivery = await repository.getByOrderId(orderId);
  if (!delivery) throw new NotFoundError('Delivery');
  assertResourceAccess(user, delivery.patient_user_id, {
    staffRoles: DELIVERY_STAFF_ROLES,
    message: 'You can only access your own delivery information',
  });
  return { ...delivery, history: await repository.getHistory(delivery.id) };
}

/**
 * Merge the parcel's own events with the order's lifecycle events so staff
 * see one chronological handover story rather than two disconnected logs.
 */
export async function getTimeline(orderId, user) {
  const [delivery, orderHistory] = await Promise.all([
    repository.getByOrderId(orderId),
    orderRepository.getHistory(orderId),
  ]);
  if (!delivery) throw new NotFoundError('Delivery');

  assertResourceAccess(user, delivery.patient_user_id, {
    staffRoles: DELIVERY_STAFF_ROLES,
    message: 'You can only access your own delivery information',
  });

  const deliveryEvents = await repository.getHistory(delivery.id);
  const events = [
    ...orderHistory.map((h) => ({
      source: 'ORDER',
      status: h.new_status,
      previousStatus: h.previous_status,
      note: h.reason || h.internal_note || null,
      actorRole: h.actor_role,
      createdAt: h.created_at,
    })),
    ...deliveryEvents.map((h) => ({
      source: 'DELIVERY',
      status: h.new_status,
      previousStatus: h.previous_status,
      note: h.note || h.location_note || null,
      actorRole: h.actor_role,
      actorName: h.actor_name,
      createdAt: h.created_at,
    })),
  ].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  return { delivery, events };
}

/**
 * Move a parcel to its next stage.
 *
 * Three things happen in one transaction so the delivery board, the order
 * record and the audit trail can never disagree:
 *   - the delivery row and its event log are written
 *   - the order is advanced to the matching lifecycle status (when legal)
 *   - completion releases stock, exactly as a manual completion would
 */
export async function updateDeliveryStatus(id, status, extra = {}, user) {
  if (!DELIVERY_STATUSES.includes(status)) {
    throw new ValidationError(`Unknown delivery status '${status}'`);
  }

  const current = await repository.getById(id);
  if (!current) throw new NotFoundError('Delivery', id);

  if (!canTransitionDelivery(current.status, status)) {
    throw new ValidationError(`Cannot transition from ${current.status} to ${status}`);
  }
  if (REASON_REQUIRED_FOR.includes(status) && !extra.failureReason?.trim()) {
    throw new ValidationError(`A reason is required when marking a delivery as ${status}`);
  }
  if (status === DELIVERY_STATUS.DELIVERED && !extra.receiverName?.trim()) {
    throw new ValidationError('Record who received the delivery before confirming handover');
  }

  const updated = await transaction(async (client) => {
    const locked = (
      await client.query('SELECT * FROM delivery_tracking WHERE id = $1 FOR UPDATE', [id])
    ).rows[0];
    if (!locked) throw new NotFoundError('Delivery', id);
    if (!canTransitionDelivery(locked.status, status)) {
      throw new ValidationError(`Cannot transition from ${locked.status} to ${status}`);
    }

    const row = await repository.updateStatus(
      id,
      status,
      {
        ...extra,
        id,
        // The UI sends a single "note" for the handover; persist it on the row
        // as well as in the event log so the delivery card can show it later.
        confirmationNote:
          status === DELIVERY_STATUS.DELIVERED ? extra.note || extra.confirmationNote : undefined,
        receivedBy: status === DELIVERY_STATUS.DELIVERED ? user?.userId : null,
      },
      client
    );

    await repository.addHistory(client, {
      deliveryId: id,
      orderId: locked.order_id,
      previousStatus: locked.status,
      newStatus: status,
      actorId: user?.userId,
      actorRole: user?.role || 'SYSTEM',
      locationNote: extra.locationNote,
      note: extra.note || extra.confirmationNote || extra.failureReason,
    });

    const order = (
      await client.query('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [locked.order_id])
    ).rows[0];
    if (order) await syncOrderStatus(client, order, status, user, extra);

    return row;
  });

  createAuditLog({
    userId: user?.userId,
    action: AUDIT_ACTION.UPDATE,
    entity: AUDIT_ENTITY.ORDER,
    entityId: current.order_id,
    description: `Delivery ${current.public_reference || current.order_id} ${current.status} → ${status}`,
    metadata: {
      deliveryId: id,
      orderId: current.order_id,
      previousStatus: current.status,
      newStatus: status,
      receiverName: extra.receiverName || null,
      failureReason: extra.failureReason || null,
    },
  }).catch(console.error);

  const [type, title, message] = NOTIFICATIONS[status] || [];
  if (type) notifyOrderPatient(current, { type, title, message });

  return { ...updated, history: await repository.getHistory(id) };
}

/**
 * Reflect a delivery movement onto the parent order. The order machine is
 * authoritative, so an illegal or redundant move is skipped silently - the
 * delivery record is the source of truth for the parcel and the order already
 * tells the patient everything else.
 */
async function syncOrderStatus(client, order, deliveryStatus, user, extra) {
  const target = orderStatusForDelivery(deliveryStatus);
  if (!target || order.status === target) return;
  if (!canTransition(order.status, target)) return;

  const fulfilmentStatus = fulfilmentForStatus(target, order.fulfilment_method);
  const fulfilment = { fulfilmentStatus };
  if (target === 'OUT_FOR_DELIVERY') fulfilment.readyAt = new Date();
  if (target === 'COMPLETED') {
    // A confirmed handover must draw stock down, otherwise the pharmacy keeps
    // selling medicine it has already given away.
    await consumeReservedStock(client, order.id, user);
    fulfilment.fulfilledAt = new Date();
    if (order.fulfilment_method === 'DELIVERY') fulfilment.deliveredAt = new Date();
  }
  if (target === 'CANCELLED') fulfilment.cancelledAt = new Date();

  await orderRepository.updateOrderStatus(
    client,
    order.id,
    target,
    ['ADMIN', 'MANAGER', 'PHARMACIST'].includes(user?.role) ? user.userId : null,
    fulfilment
  );
  await orderRepository.addHistory(client, {
    orderId: order.id,
    previousStatus: order.status,
    newStatus: target,
    actorId: user?.userId,
    actorRole: user?.role || 'SYSTEM',
    reason: 'Automatic update from delivery tracking',
    metadata: { source: 'DELIVERY_TRACKING', deliveryStatus, failureReason: extra.failureReason || null },
  });
}

export async function listDeliveries(filters) {
  return repository.listDeliveries(filters);
}

/** A patient's own delivery records. Never exposes another customer's data. */
export async function listMyDeliveries(user, filters = {}) {
  const identityId =
    user.patientIdentityId || (await orderRepository.findIdentityByUser(user.userId))?.id;
  if (!identityId) throw new NotFoundError('Patient identity');
  return repository.listForPatient(identityId, filters);
}

export async function getDeliveryStats() {
  return repository.getStats();
}
