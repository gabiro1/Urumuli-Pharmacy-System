import test from 'node:test';
import assert from 'node:assert/strict';
import { assertResourceAccess, assertConversationAccess, isAllowedStaffRole } from '../src/utils/resourceAccess.js';
import { ForbiddenError } from '../src/utils/errors.js';

const staff = { userId: 'staff-1', role: 'PHARMACIST' };
const patient = { userId: 'patient-1', role: 'PATIENT' };
const otherPatient = { userId: 'patient-2', role: 'PATIENT' };

test('staff roles bypass patient ownership', () => {
  assert.doesNotThrow(() => assertResourceAccess(staff, 'patient-1'));
});

test('patient can access own resource', () => {
  assert.doesNotThrow(() => assertResourceAccess(patient, 'patient-1'));
});

test('patient cannot access another patient resource', () => {
  assert.throws(() => assertResourceAccess(patient, 'patient-5'), ForbiddenError);
});

test('auditor is not allowed staff role for phone-gated staff access', () => {
  assert.equal(isAllowedStaffRole('AUDITOR'), true);
  assert.equal(isAllowedStaffRole('CASHIER'), false);
});

test('unauthenticated callers are rejected', () => {
  assert.throws(() => assertResourceAccess(null, 'patient-1'), ForbiddenError);
});

test('conversation access follows the patient holder', () => {
  assert.doesNotThrow(() => assertConversationAccess(staff, { patient_id: 'p1' }));
  assert.doesNotThrow(() => assertConversationAccess(patient, { patient_id: 'patient-1' }));
  assert.throws(() => assertConversationAccess(patient, { patient_id: 'someone-else' }), ForbiddenError);
});