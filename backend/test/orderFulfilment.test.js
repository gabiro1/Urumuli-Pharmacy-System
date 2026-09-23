import test from 'node:test';
import assert from 'node:assert/strict';
import { fulfilmentForStatus, FULFILMENT_STATUS, canTransition } from '../src/modules/orders/orderState.js';

test('payment and fulfilment are independent: PAID + AWAITING_DISPENSING', () => {
  // An order that has been paid but not yet prepared stays awaiting dispensing.
  assert.equal(fulfilmentForStatus('PAYMENT_RECEIVED', 'PICKUP'), FULFILMENT_STATUS.AWAITING_DISPENSING);
  assert.equal(fulfilmentForStatus('PAYMENT_DEFERRED', 'PICKUP'), FULFILMENT_STATUS.AWAITING_DISPENSING);
});

test('fulfilment progresses through the handover stages for pickup', () => {
  assert.equal(fulfilmentForStatus('PAYMENT_RECEIVED', 'PICKUP'), 'AWAITING_DISPENSING');
  assert.equal(fulfilmentForStatus('PREPARING', 'PICKUP'), 'PREPARING');
  assert.equal(fulfilmentForStatus('READY_FOR_PICKUP', 'PICKUP'), 'READY_FOR_PICKUP');
  assert.equal(fulfilmentForStatus('COMPLETED', 'PICKUP'), 'DISPENSED');
});

test('fulfilment progresses through the handover stages for delivery', () => {
  assert.equal(fulfilmentForStatus('PREPARING', 'DELIVERY'), 'PREPARING');
  assert.equal(fulfilmentForStatus('OUT_FOR_DELIVERY', 'DELIVERY'), 'OUT_FOR_DELIVERY');
  assert.equal(fulfilmentForStatus('COMPLETED', 'DELIVERY'), 'DELIVERED');
});

test('pre-payment and review stages have no fulfilment stage yet', () => {
  for (const status of ['SUBMITTED_FOR_REVIEW', 'UNDER_PHARMACIST_REVIEW', 'APPROVED_AWAITING_PAYMENT', 'PAYMENT_PROCESSING']) {
    assert.equal(fulfilmentForStatus(status, 'PICKUP'), null, `${status} should not have started fulfilment`);
  }
});

test('terminating states map to CANCELLED fulfilment', () => {
  assert.equal(fulfilmentForStatus('CANCELLED', 'PICKUP'), 'CANCELLED');
  assert.equal(fulfilmentForStatus('REJECTED_BY_PHARMACIST', 'PICKUP'), 'CANCELLED');
  assert.equal(fulfilmentForStatus('REFUNDED', 'DELIVERY'), 'CANCELLED');
});

test('state machine still forbids payment before approval and completion before paid', () => {
  assert.equal(canTransition('UNDER_PHARMACIST_REVIEW', 'PAYMENT_PROCESSING'), false);
  assert.equal(canTransition('APPROVED_AWAITING_PAYMENT', 'PREPARING'), false);
  assert.equal(canTransition('APPROVED_AWAITING_PAYMENT', 'PAYMENT_PROCESSING'), true);
  assert.equal(canTransition('PAYMENT_RECEIVED', 'PREPARING'), true);
  assert.equal(canTransition('READY_FOR_PICKUP', 'COMPLETED'), true);
});

test('refund path is reachable only from paid fulfilment stages', () => {
  assert.equal(canTransition('PAYMENT_RECEIVED', 'REFUND_PENDING'), true);
  assert.equal(canTransition('PREPARING', 'REFUND_PENDING'), true);
  assert.equal(canTransition('READY_FOR_PICKUP', 'REFUND_PENDING'), false); // ready orders are refunded via CANCELLED
  assert.equal(canTransition('REFUND_PENDING', 'REFUNDED'), true);
});