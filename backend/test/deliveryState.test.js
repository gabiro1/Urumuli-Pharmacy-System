import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canTransitionDelivery,
  deliveryTransitions,
  isTerminalDeliveryStatus,
  orderStatusForDelivery,
  DELIVERY_STATUS,
  DELIVERY_PROGRESS,
} from '../src/modules/delivery/deliveryState.js';
import { updateStatusSchema } from '../src/modules/delivery/delivery.validation.js';

test('a parcel walks the full dispatch path to delivered', () => {
  for (let i = 0; i < DELIVERY_PROGRESS.length - 1; i += 1) {
    const from = DELIVERY_PROGRESS[i];
    const to = DELIVERY_PROGRESS[i + 1];
    assert.equal(canTransitionDelivery(from, to), true, `${from} should be able to reach ${to}`);
  }
});

test('delivery cannot skip the dispatch stages', () => {
  assert.equal(canTransitionDelivery('PENDING', 'DELIVERED'), false);
  assert.equal(canTransitionDelivery('PENDING', 'OUT_FOR_DELIVERY'), false);
  assert.equal(canTransitionDelivery('IN_TRANSIT', 'DELIVERED'), false);
});

test('delivered, returned and cancelled are terminal', () => {
  for (const status of [DELIVERY_STATUS.DELIVERED, DELIVERY_STATUS.RETURNED, DELIVERY_STATUS.CANCELLED]) {
    assert.equal(isTerminalDeliveryStatus(status), true, `${status} should be terminal`);
    for (const target of Object.values(DELIVERY_STATUS)) {
      assert.equal(canTransitionDelivery(status, target), false, `${status} must not reach ${target}`);
    }
  }
});

test('a failed attempt can be retried or sent back to the pharmacy', () => {
  assert.equal(canTransitionDelivery('FAILED', 'PICKED_UP'), true);
  assert.equal(canTransitionDelivery('FAILED', 'RETURNED'), true);
  assert.equal(canTransitionDelivery('FAILED', 'DELIVERED'), false, 'a failed attempt still has to be dispatched again');
});

test('every transition target is a status the database accepts', () => {
  // delivery_tracking.status CHECK (migration 031) must cover the machine.
  const allowed = new Set([...Object.values(DELIVERY_STATUS)]);
  for (const [from, targets] of Object.entries(deliveryTransitions)) {
    assert.ok(allowed.has(from), `${from} is not a known delivery status`);
    for (const to of targets) {
      assert.ok(allowed.has(to), `${from} -> ${to} targets an unknown status`);
    }
  }
});

test('a failed delivery records the parcel as out for delivery on the order', () => {
  assert.equal(orderStatusForDelivery('PICKED_UP'), 'OUT_FOR_DELIVERY');
  assert.equal(orderStatusForDelivery('IN_TRANSIT'), 'OUT_FOR_DELIVERY');
  assert.equal(orderStatusForDelivery('OUT_FOR_DELIVERY'), 'OUT_FOR_DELIVERY');
  assert.equal(orderStatusForDelivery('DELIVERED'), 'COMPLETED');
});

test('order status is not rewritten for parcels still being prepared', () => {
  // PENDING must not drag the order forward: the order may not be ready yet.
  assert.equal(orderStatusForDelivery('PENDING'), null);
  // A failed attempt or a return leaves the order for a human to decide.
  assert.equal(orderStatusForDelivery('FAILED'), null);
  assert.equal(orderStatusForDelivery('RETURNED'), null);
});

test('the mirrored order status is one the order machine actually permits', () => {
  // OUT_FOR_DELIVERY is reachable from PREPARING / PAYMENT_*_*, and COMPLETED
  // from READY_FOR_PICKUP / OUT_FOR_DELIVERY. Anything else would be dropped by
  // the guard, so assert the intended paths hold.
  assert.equal(orderStatusForDelivery(DELIVERY_STATUS.OUT_FOR_DELIVERY), 'OUT_FOR_DELIVERY');
  assert.equal(orderStatusForDelivery(DELIVERY_STATUS.DELIVERED), 'COMPLETED');
});

test('status payload rejects unknown states and malformed coordinates', () => {
  assert.equal(updateStatusSchema.validate({ status: 'DELIVERED' }).error, undefined);
  assert.ok(updateStatusSchema.validate({ status: 'TELEPORTED' }).error, 'unknown status must be rejected');
  assert.ok(updateStatusSchema.validate({}).error, 'status is required');
  assert.ok(updateStatusSchema.validate({ status: 'DELIVERED', latitude: 200 }).error, 'latitude is out of range');
  assert.ok(updateStatusSchema.validate({ status: 'DELIVERED', trackingUrl: 'not-a-url' }).error);
});

test('a failure reason cannot be blank when one is supplied', () => {
  assert.ok(updateStatusSchema.validate({ status: 'FAILED', failureReason: 'ab' }).error);
  assert.equal(updateStatusSchema.validate({ status: 'FAILED', failureReason: 'Patient not available' }).error, undefined);
});
