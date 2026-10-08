// ============================================================
// Delivery record state machine.
//
// The physical delivery leg is tracked separately from the order
// lifecycle (see ../orders/orderState.js). An order can reach
// COMPLETED while its parcel is still moving, so "delivered" is
// asserted here first and then reconciled onto the order.
// ============================================================

export const DELIVERY_STATUS = Object.freeze({
  PENDING: 'PENDING',
  PICKED_UP: 'PICKED_UP',
  IN_TRANSIT: 'IN_TRANSIT',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  FAILED: 'FAILED',
  RETURNED: 'RETURNED',
  CANCELLED: 'CANCELLED',
});

export const DELIVERY_STATUSES = Object.freeze(Object.values(DELIVERY_STATUS));

// A failure reason is the only thing that makes a failed delivery meaningful
// to the next person who touches it.
export const REASON_REQUIRED_FOR = Object.freeze(['FAILED', 'RETURNED', 'CANCELLED']);

export const deliveryTransitions = Object.freeze({
  PENDING: ['PICKED_UP', 'CANCELLED'],
  PICKED_UP: ['IN_TRANSIT', 'CANCELLED'],
  IN_TRANSIT: ['OUT_FOR_DELIVERY', 'FAILED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'FAILED', 'RETURNED'],
  FAILED: ['PICKED_UP', 'RETURNED'],
  RETURNED: [],
  DELIVERED: [],
  CANCELLED: [],
});

export function canTransitionDelivery(from, to) {
  return (deliveryTransitions[from] || []).includes(to);
}

export function isTerminalDeliveryStatus(status) {
  return (deliveryTransitions[status] || []).length === 0;
}

// Deliveries the pharmacy still has to act on.
export const OPEN_DELIVERY_STATUSES = Object.freeze([
  DELIVERY_STATUS.PENDING,
  DELIVERY_STATUS.PICKED_UP,
  DELIVERY_STATUS.IN_TRANSIT,
  DELIVERY_STATUS.OUT_FOR_DELIVERY,
  DELIVERY_STATUS.FAILED,
]);

// Ordered for the progress rail. FAILED / RETURNED / CANCELLED sit outside
// the happy path and are rendered as exceptions.
export const DELIVERY_PROGRESS = Object.freeze([
  DELIVERY_STATUS.PENDING,
  DELIVERY_STATUS.PICKED_UP,
  DELIVERY_STATUS.IN_TRANSIT,
  DELIVERY_STATUS.OUT_FOR_DELIVERY,
  DELIVERY_STATUS.DELIVERED,
]);

/**
 * Order lifecycle status to mirror when a delivery moves. Keeps the order
 * timeline truthful without letting the delivery record invent states the
 * order machine rejects: anything the order cannot legally accept is null and
 * simply left alone.
 */
export function orderStatusForDelivery(deliveryStatus) {
  switch (deliveryStatus) {
    case DELIVERY_STATUS.PICKED_UP:
    case DELIVERY_STATUS.IN_TRANSIT:
    case DELIVERY_STATUS.OUT_FOR_DELIVERY:
      return 'OUT_FOR_DELIVERY';
    case DELIVERY_STATUS.DELIVERED:
      return 'COMPLETED';
    case DELIVERY_STATUS.CANCELLED:
      return 'CANCELLED';
    default:
      return null;
  }
}
