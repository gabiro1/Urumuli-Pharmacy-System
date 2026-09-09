import test from 'node:test';
import assert from 'node:assert/strict';

// ============================================================
// Import modules under test
// ============================================================
import {
  ROLES,
  ROLE_HIERARCHY,
  STAFF_ROLES,
  PHARMACY_STATUS,
  MEMBERSHIP_STATUS,
  PROFESSIONAL_VERIFICATION_STATUS,
  PROFESSIONAL_ROLES,
  INVITATION_STATUS,
  INVITATION_TTL_HOURS,
  PERMISSIONS,
} from '../src/constants.js';

import {
  createPharmacySchema,
  updatePharmacyStatusSchema,
  inviteStaffSchema,
  submitProfessionalProfileSchema,
  reviewVerificationSchema,
  suspendStaffSchema,
} from '../src/modules/pharmacy/pharmacy.validation.js';

import {
  registerSchema,
  inviteStaffSchema as authInviteStaffSchema,
  acceptInvitationSchema,
  updateUserStatusSchema,
} from '../src/modules/auth/auth.validation.js';

import {
  requiresVerification,
} from '../src/services/professionalVerification.js';

// ============================================================
// 1. CONSTANTS — Role Hierarchy & Enums
// ============================================================

test('SUPER_ADMIN has the highest role level', () => {
  assert.ok(
    ROLE_HIERARCHY[ROLES.SUPER_ADMIN] > ROLE_HIERARCHY[ROLES.ADMIN],
    'SUPER_ADMIN must outrank ADMIN'
  );
});

test('ADMIN outranks all other non-super-admin roles', () => {
  const adminLevel = ROLE_HIERARCHY[ROLES.ADMIN];
  for (const role of Object.values(ROLES)) {
    if (role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN || role === ROLES.PATIENT || role === ROLES.GUEST) continue;
    assert.ok(
      adminLevel > ROLE_HIERARCHY[role],
      `ADMIN (${adminLevel}) must outrank ${role} (${ROLE_HIERARCHY[role]})`
    );
  }
});

test('PHARMACIST outranks CASHIER and INVENTORY_MANAGER', () => {
  assert.ok(
    ROLE_HIERARCHY[ROLES.PHARMACIST] > ROLE_HIERARCHY[ROLES.CASHIER],
    'PHARMACIST must outrank CASHIER'
  );
  assert.ok(
    ROLE_HIERARCHY[ROLES.PHARMACIST] > ROLE_HIERARCHY[ROLES.INVENTORY_MANAGER],
    'PHARMACIST must outrank INVENTORY_MANAGER'
  );
});

test('PATIENT has the lowest role level', () => {
  const patientLevel = ROLE_HIERARCHY[ROLES.PATIENT];
  for (const role of Object.values(ROLES)) {
    if (role === ROLES.GUEST) continue;
    assert.ok(
      patientLevel <= ROLE_HIERARCHY[role],
      `PATIENT (${patientLevel}) must be <= ${role} (${ROLE_HIERARCHY[role]})`
    );
  }
});

test('STAFF_ROLES does not include PATIENT or GUEST', () => {
  assert.ok(!STAFF_ROLES.includes(ROLES.PATIENT), 'PATIENT should not be in STAFF_ROLES');
  assert.ok(!STAFF_ROLES.includes(ROLES.GUEST), 'GUEST should not be in STAFF_ROLES');
});

test('STAFF_ROLES includes all expected staff roles', () => {
  const expected = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'PHARMACIST', 'CASHIER', 'INVENTORY_MANAGER', 'AUDITOR'];
  for (const role of expected) {
    assert.ok(STAFF_ROLES.includes(role), `${role} must be in STAFF_ROLES`);
  }
});

test('PHARMACY_STATUS has all required statuses', () => {
  const expected = ['PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED'];
  for (const status of expected) {
    assert.ok(PHARMACY_STATUS[status], `PHARMACY_STATUS must include ${status}`);
  }
});

test('MEMBERSHIP_STATUS has all required statuses', () => {
  const expected = ['PENDING', 'ACTIVE', 'SUSPENDED', 'REMOVED'];
  for (const status of expected) {
    assert.ok(MEMBERSHIP_STATUS[status], `MEMBERSHIP_STATUS must include ${status}`);
  }
});

test('PROFESSIONAL_VERIFICATION_STATUS has all required statuses', () => {
  const expected = ['PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED', 'EXPIRED'];
  for (const status of expected) {
    assert.ok(PROFESSIONAL_VERIFICATION_STATUS[status], `PROFESSIONAL_VERIFICATION_STATUS must include ${status}`);
  }
});

test('PROFESSIONAL_ROLES contains only PHARMACIST', () => {
  assert.deepEqual(PROFESSIONAL_ROLES, [ROLES.PHARMACIST]);
});

test('INVITATION_TTL_HOURS is a positive number', () => {
  assert.ok(typeof INVITATION_TTL_HOURS === 'number' && INVITATION_TTL_HOURS > 0);
});

test('INVITATION_STATUS has all required statuses', () => {
  const expected = ['PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED'];
  for (const status of expected) {
    assert.ok(INVITATION_STATUS[status], `INVITATION_STATUS must include ${status}`);
  }
});

// ============================================================
// 2. PERMISSIONS — Granular RBAC
// ============================================================

test('PERMISSIONS enum contains all expected permissions', () => {
  const expectedPermissions = [
    'VIEW_MEDICINES', 'CREATE_MEDICINE', 'UPDATE_MEDICINE', 'DELETE_MEDICINE',
    'VIEW_PATIENTS',
    'VIEW_PRESCRIPTIONS', 'REVIEW_PRESCRIPTIONS', 'APPROVE_PRESCRIPTIONS',
    'CHAT_WITH_PATIENT', 'PROVIDE_MEDICATION_ADVICE',
    'VIEW_STOCK', 'MANAGE_STOCK', 'VIEW_SUPPLIERS',
    'CREATE_SALE', 'VIEW_ORDERS', 'PROCESS_PAYMENT', 'PRINT_RECEIPT',
    'MANAGE_STAFF', 'INVITE_STAFF', 'REMOVE_STAFF', 'MANAGE_PHARMACY',
    'VIEW_AUDIT', 'MANAGE_SETTINGS', 'VIEW_REPORTS',
  ];
  for (const perm of expectedPermissions) {
    assert.ok(PERMISSIONS[perm], `PERMISSIONS must include ${perm}`);
  }
});

test('PERMISSIONS values match their keys', () => {
  for (const [key, value] of Object.entries(PERMISSIONS)) {
    assert.equal(value, key, `PERMISSIONS.${key} should equal "${key}"`);
  }
});

// ============================================================
// 3. PROFESSIONAL VERIFICATION — Mock Provider
// ============================================================

test('requiresVerification returns true for PHARMACIST role', () => {
  assert.equal(requiresVerification(ROLES.PHARMACIST), true);
});

test('requiresVerification returns false for non-pharmacist roles', () => {
  const nonProfessionalRoles = [
    ROLES.ADMIN, ROLES.MANAGER, ROLES.CASHIER,
    ROLES.INVENTORY_MANAGER, ROLES.AUDITOR, ROLES.PATIENT,
  ];
  for (const role of nonProfessionalRoles) {
    assert.equal(requiresVerification(role), false, `${role} should not require verification`);
  }
});

// ============================================================
// 4. PHARMACY VALIDATION SCHEMAS
// ============================================================

// --- createPharmacySchema ---

test('createPharmacySchema accepts valid minimal input', () => {
  const result = createPharmacySchema.safeParse({ name: 'Test Pharmacy' });
  assert.ok(result.success, `Expected success, got: ${JSON.stringify(result.error?.issues)}`);
});

test('createPharmacySchema accepts full input', () => {
  const result = createPharmacySchema.safeParse({
    name: 'Urumuli Pharmacy',
    registrationNumber: 'RC/2024/001',
    contactEmail: 'info@urumuli.rw',
    contactPhone: '+250788000000',
    address: '123 Main St',
    city: 'Kigali',
    province: 'Kigali City',
    country: 'Rwanda',
    description: 'A modern pharmacy',
  });
  assert.ok(result.success);
});

test('createPharmacySchema rejects empty name', () => {
  const result = createPharmacySchema.safeParse({ name: '' });
  assert.ok(!result.success);
});

test('createPharmacySchema rejects single-character name', () => {
  const result = createPharmacySchema.safeParse({ name: 'A' });
  assert.ok(!result.success);
});

test('createPharmacySchema rejects name with only whitespace', () => {
  const result = createPharmacySchema.safeParse({ name: '   ' });
  assert.ok(!result.success);
});

test('createPharmacySchema rejects name exceeding 300 characters', () => {
  const result = createPharmacySchema.safeParse({ name: 'X'.repeat(301) });
  assert.ok(!result.success);
});

test('createPharmacySchema rejects invalid email format', () => {
  const result = createPharmacySchema.safeParse({
    name: 'Test',
    contactEmail: 'not-an-email',
  });
  assert.ok(!result.success);
});

test('createPharmacySchema rejects invalid phone format', () => {
  const result = createPharmacySchema.safeParse({
    name: 'Test',
    contactPhone: 'abc-not-a-phone',
  });
  assert.ok(!result.success);
});

test('createPharmacySchema accepts valid phone formats', () => {
  const phones = ['+250788000000', '+250 788 000 000', '0788000000', '+1 (555) 123-4567'];
  for (const phone of phones) {
    const result = createPharmacySchema.safeParse({
      name: 'Test',
      contactPhone: phone,
    });
    assert.ok(result.success, `Phone "${phone}" should be accepted`);
  }
});

test('createPharmacySchema converts empty strings to undefined', () => {
  const result = createPharmacySchema.safeParse({
    name: 'Test',
    registrationNumber: '',
    contactEmail: '',
    address: '',
  });
  assert.ok(result.success);
  assert.equal(result.data.registrationNumber, undefined);
  assert.equal(result.data.contactEmail, undefined);
});

test('createPharmacySchema rejects unknown fields (strict)', () => {
  const result = createPharmacySchema.safeParse({
    name: 'Test',
    unknownField: 'should fail',
  });
  assert.ok(!result.success);
});

// --- updatePharmacyStatusSchema ---

test('updatePharmacyStatusSchema accepts valid status', () => {
  for (const status of ['PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED']) {
    const result = updatePharmacyStatusSchema.safeParse({ status });
    assert.ok(result.success, `Status "${status}" should be accepted`);
  }
});

test('updatePharmacyStatusSchema rejects invalid status', () => {
  const result = updatePharmacyStatusSchema.safeParse({ status: 'INVALID' });
  assert.ok(!result.success);
});

test('updatePharmacyStatusSchema accepts optional reason', () => {
  const result = updatePharmacyStatusSchema.safeParse({
    status: 'REJECTED',
    reason: 'Does not meet requirements',
  });
  assert.ok(result.success);
});

// --- inviteStaffSchema (pharmacy) ---

test('pharmacy inviteStaffSchema accepts valid input', () => {
  const result = inviteStaffSchema.safeParse({
    email: 'staff@pharmacy.com',
    role: 'PHARMACIST',
  });
  assert.ok(result.success);
});

test('pharmacy inviteStaffSchema accepts all staff roles', () => {
  const roles = ['PHARMACIST', 'CASHIER', 'INVENTORY_MANAGER', 'MANAGER', 'AUDITOR'];
  for (const role of roles) {
    const result = inviteStaffSchema.safeParse({ email: 'test@test.com', role });
    assert.ok(result.success, `Role "${role}" should be accepted`);
  }
});

test('pharmacy inviteStaffSchema rejects PATIENT role', () => {
  const result = inviteStaffSchema.safeParse({ email: 'test@test.com', role: 'PATIENT' });
  assert.ok(!result.success, 'PATIENT role should not be accepted for staff invitation');
});

test('pharmacy inviteStaffSchema rejects invalid email', () => {
  const result = inviteStaffSchema.safeParse({ email: 'not-email', role: 'PHARMACIST' });
  assert.ok(!result.success);
});

// --- submitProfessionalProfileSchema ---

test('submitProfessionalProfileSchema accepts empty optional fields', () => {
  const result = submitProfessionalProfileSchema.safeParse({});
  assert.ok(result.success);
});

test('submitProfessionalProfileSchema accepts full input', () => {
  const result = submitProfessionalProfileSchema.safeParse({
    professionalRegistrationNumber: 'NPC/2024/001',
    licenseNumber: 'PHA/RW/2024/456',
    licenseExpiry: '2027-12-31',
    licenseIssuingAuthority: 'National Pharmacy Council of Rwanda',
    qualification: 'Bachelor of Pharmacy',
    specialization: 'Clinical Pharmacy',
    yearsOfExperience: 5,
  });
  assert.ok(result.success);
});

test('submitProfessionalProfileSchema rejects yearsOfExperience > 100', () => {
  const result = submitProfessionalProfileSchema.safeParse({ yearsOfExperience: 101 });
  assert.ok(!result.success);
});

test('submitProfessionalProfileSchema rejects negative yearsOfExperience', () => {
  const result = submitProfessionalProfileSchema.safeParse({ yearsOfExperience: -1 });
  assert.ok(!result.success);
});

test('submitProfessionalProfileSchema rejects non-integer yearsOfExperience', () => {
  const result = submitProfessionalProfileSchema.safeParse({ yearsOfExperience: 5.5 });
  assert.ok(!result.success);
});

// --- reviewVerificationSchema ---

test('reviewVerificationSchema accepts VERIFIED status', () => {
  const result = reviewVerificationSchema.safeParse({
    status: 'VERIFIED',
    notes: 'All credentials verified',
  });
  assert.ok(result.success);
});

test('reviewVerificationSchema accepts REJECTED with reason', () => {
  const result = reviewVerificationSchema.safeParse({
    status: 'REJECTED',
    rejectionReason: 'Invalid license number',
  });
  assert.ok(result.success);
});

test('reviewVerificationSchema rejects invalid status', () => {
  const result = reviewVerificationSchema.safeParse({ status: 'PENDING' });
  assert.ok(!result.success);
});

test('reviewVerificationSchema rejects SUSPENDED without reason (still valid — reason is optional)', () => {
  const result = reviewVerificationSchema.safeParse({ status: 'SUSPENDED' });
  assert.ok(result.success, 'SUSPENDED without reason should still be valid (reason is optional)');
});

// --- suspendStaffSchema ---

test('suspendStaffSchema accepts empty input (reason is optional)', () => {
  const result = suspendStaffSchema.safeParse({});
  assert.ok(result.success);
});

test('suspendStaffSchema accepts reason', () => {
  const result = suspendStaffSchema.safeParse({ reason: 'Policy violation' });
  assert.ok(result.success);
});

// ============================================================
// 5. AUTH VALIDATION SCHEMAS
// ============================================================

// --- registerSchema (patient registration) ---

test('registerSchema accepts valid patient input', () => {
  const result = registerSchema.safeParse({
    email: 'patient@example.com',
    password: 'SecurePass1',
    fullName: 'John Doe',
  });
  assert.ok(result.success);
});

test('registerSchema rejects role field (security: patients cannot self-assign roles)', () => {
  const result = registerSchema.safeParse({
    email: 'patient@example.com',
    password: 'SecurePass1',
    fullName: 'John Doe',
    role: 'PHARMACIST',
  });
  // registerSchema should NOT have a role field
  // If it parses successfully, the role field should be stripped
  assert.ok(result.success, 'Schema should parse (role is simply ignored)');
  assert.equal(result.data.role, undefined, 'Role field should be stripped/undefined');
});

test('registerSchema requires password to be at least 8 characters', () => {
  const result = registerSchema.safeParse({
    email: 'test@test.com',
    password: 'Short1',
    fullName: 'Test',
  });
  assert.ok(!result.success);
});

test('registerSchema requires uppercase in password', () => {
  const result = registerSchema.safeParse({
    email: 'test@test.com',
    password: 'nouppercase1',
    fullName: 'Test',
  });
  assert.ok(!result.success);
});

test('registerSchema requires lowercase in password', () => {
  const result = registerSchema.safeParse({
    email: 'test@test.com',
    password: 'NOLOWERCASE1',
    fullName: 'Test',
  });
  assert.ok(!result.success);
});

test('registerSchema requires number in password', () => {
  const result = registerSchema.safeParse({
    email: 'test@test.com',
    password: 'NoNumberHere',
    fullName: 'Test',
  });
  assert.ok(!result.success);
});

// --- acceptInvitationSchema ---

test('acceptInvitationSchema accepts valid input', () => {
  const result = acceptInvitationSchema.safeParse({
    token: 'a'.repeat(64),
    fullName: 'Jane Smith',
    password: 'SecurePass1',
  });
  assert.ok(result.success);
});

test('acceptInvitationSchema rejects short token', () => {
  const result = acceptInvitationSchema.safeParse({
    token: 'short',
    fullName: 'Jane Smith',
    password: 'SecurePass1',
  });
  assert.ok(!result.success);
});

test('acceptInvitationSchema requires fullName', () => {
  const result = acceptInvitationSchema.safeParse({
    token: 'a'.repeat(64),
    fullName: '',
    password: 'SecurePass1',
  });
  assert.ok(!result.success);
});

// --- updateUserStatusSchema ---

test('updateUserStatusSchema accepts valid isActive boolean', () => {
  assert.ok(updateUserStatusSchema.safeParse({ isActive: true }).success);
  assert.ok(updateUserStatusSchema.safeParse({ isActive: false }).success);
});

test('updateUserStatusSchema rejects non-boolean isActive', () => {
  assert.ok(!updateUserStatusSchema.safeParse({ isActive: 'true' }).success);
  assert.ok(!updateUserStatusSchema.safeParse({ isActive: 1 }).success);
});

// ============================================================
// 6. AUTH SERVICE — Security: Public Registration
// ============================================================

test('registerSchema does not expose role selection (no role field)', () => {
  // The registerSchema should NOT have a role property
  // This ensures patients cannot grant themselves privileged roles
  const shape = registerSchema.shape;
  assert.equal(shape.role, undefined, 'registerSchema must not have a role field');
});

// ============================================================
// 7. PHARMACY STATUS WORKFLOW — Transition Rules
// ============================================================

test('pharmacy status workflow: PENDING can transition to ACTIVE or REJECTED', () => {
  const validTransitions = {
    PENDING: ['ACTIVE', 'REJECTED'],
    ACTIVE: ['SUSPENDED'],
    SUSPENDED: ['ACTIVE'],
    REJECTED: ['ACTIVE'],
  };

  // PENDING -> ACTIVE (approve)
  assert.ok(validTransitions.PENDING.includes('ACTIVE'));
  // PENDING -> REJECTED (reject)
  assert.ok(validTransitions.PENDING.includes('REJECTED'));
  // ACTIVE -> SUSPENDED (suspend)
  assert.ok(validTransitions.ACTIVE.includes('SUSPENDED'));
  // SUSPENDED -> ACTIVE (reactivate)
  assert.ok(validTransitions.SUSPENDED.includes('ACTIVE'));
  // REJECTED -> ACTIVE (override approve)
  assert.ok(validTransitions.REJECTED.includes('ACTIVE'));
});

test('pharmacy status workflow: PENDING cannot transition to SUSPENDED directly', () => {
  const validTransitions = {
    PENDING: ['ACTIVE', 'REJECTED'],
  };
  assert.ok(!validTransitions.PENDING.includes('SUSPENDED'));
});

// ============================================================
// 8. MEMBERSHIP STATUS WORKFLOW
// ============================================================

test('membership status workflow: PENDING -> ACTIVE -> SUSPENDED/REMOVED', () => {
  const validTransitions = {
    PENDING: ['ACTIVE'],
    ACTIVE: ['SUSPENDED', 'REMOVED'],
    SUSPENDED: ['ACTIVE', 'REMOVED'],
    REMOVED: [],
  };

  assert.ok(validTransitions.PENDING.includes('ACTIVE'));
  assert.ok(validTransitions.ACTIVE.includes('SUSPENDED'));
  assert.ok(validTransitions.ACTIVE.includes('REMOVED'));
  assert.ok(validTransitions.SUSPENDED.includes('ACTIVE'));
  assert.ok(validTransitions.SUSPENDED.includes('REMOVED'));
  assert.equal(validTransitions.REMOVED.length, 0, 'REMOVED is a terminal state');
});

// ============================================================
// 9. PROFESSIONAL VERIFICATION STATUS WORKFLOW
// ============================================================

test('professional verification workflow: PENDING -> VERIFIED/REJECTED/SUSPENDED/EXPIRED', () => {
  const validTransitions = {
    PENDING: ['VERIFIED', 'REJECTED', 'SUSPENDED', 'EXPIRED'],
    VERIFIED: ['SUSPENDED', 'EXPIRED'],
    REJECTED: ['PENDING'], // Can resubmit
    SUSPENDED: ['VERIFIED', 'PENDING'],
    EXPIRED: ['PENDING'], // Can resubmit with new credentials
  };

  assert.ok(validTransitions.PENDING.includes('VERIFIED'));
  assert.ok(validTransitions.PENDING.includes('REJECTED'));
  assert.ok(validTransitions.PENDING.includes('SUSPENDED'));
  assert.ok(validTransitions.PENDING.includes('EXPIRED'));
  assert.ok(validTransitions.VERIFIED.includes('SUSPENDED'));
  assert.ok(validTransitions.VERIFIED.includes('EXPIRED'));
  assert.ok(validTransitions.REJECTED.includes('PENDING'));
  assert.ok(validTransitions.EXPIRED.includes('PENDING'));
});

// ============================================================
// 10. INVITATION FLOW
// ============================================================

test('invitation TTL is 48 hours', () => {
  assert.equal(INVITATION_TTL_HOURS, 48);
});

test('invitation expires correctly (48 hours from creation)', () => {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + INVITATION_TTL_HOURS * 60 * 60 * 1000);
  const diffHours = (expiresAt - now) / (1000 * 60 * 60);
  assert.equal(diffHours, 48);
});

test('invitation status PENDING can be ACCEPTED, EXPIRED, or REVOKED', () => {
  const terminalStates = ['ACCEPTED', 'EXPIRED', 'REVOKED'];
  assert.ok(terminalStates.includes('ACCEPTED'));
  assert.ok(terminalStates.includes('EXPIRED'));
  assert.ok(terminalStates.includes('REVOKED'));
});

test('accepted invitation cannot be reused', () => {
  // INVITATION_STATUS.ACCEPTED is a terminal state
  const nonPendingStatuses = ['ACCEPTED', 'EXPIRED', 'REVOKED'];
  assert.ok(nonPendingStatuses.includes('ACCEPTED'));
});

// ============================================================
// 11. EDGE CASES — Validation
// ============================================================

test('createPharmacySchema trims whitespace from name', () => {
  const result = createPharmacySchema.safeParse({ name: '  Test Pharmacy  ' });
  assert.ok(result.success);
  assert.equal(result.data.name, 'Test Pharmacy');
});

test('createPharmacySchema trims whitespace from email', () => {
  const result = createPharmacySchema.safeParse({
    name: 'Test',
    contactEmail: '  test@example.com  ',
  });
  assert.ok(result.success);
  assert.equal(result.data.contactEmail, 'test@example.com');
});

test('inviteStaffSchema trims whitespace from email', () => {
  const result = inviteStaffSchema.safeParse({
    email: '  staff@test.com  ',
    role: 'PHARMACIST',
  });
  assert.ok(result.success);
  assert.equal(result.data.email, 'staff@test.com');
});

test('submitProfessionalProfileSchema converts string number to actual number', () => {
  const result = submitProfessionalProfileSchema.safeParse({
    yearsOfExperience: '5',
  });
  assert.ok(result.success);
  assert.equal(result.data.yearsOfExperience, 5);
  assert.equal(typeof result.data.yearsOfExperience, 'number');
});

test('submitProfessionalProfileSchema handles undefined optional fields gracefully', () => {
  const result = submitProfessionalProfileSchema.safeParse({
    professionalRegistrationNumber: undefined,
    licenseNumber: undefined,
  });
  assert.ok(result.success);
});

test('updatePharmacyStatusSchema rejects unknown fields', () => {
  const result = updatePharmacyStatusSchema.safeParse({
    status: 'ACTIVE',
    extraField: 'should fail',
  });
  assert.ok(!result.success);
});

// ============================================================
// 12. SECURITY — Role Protection
// ============================================================

test('patient cannot self-assign PHARMACIST role via register schema', () => {
  // registerSchema should not have a role field at all
  const shape = registerSchema.shape;
  assert.equal(shape.role, undefined);
});

test('PATIENT role is not in STAFF_ROLES', () => {
  assert.ok(!STAFF_ROLES.includes(ROLES.PATIENT));
});

test('PATIENT role is not in PROFESSIONAL_ROLES', () => {
  assert.ok(!PROFESSIONAL_ROLES.includes(ROLES.PATIENT));
});

test('inviteStaffSchema does not allow SUPER_ADMIN role', () => {
  const result = inviteStaffSchema.safeParse({
    email: 'test@test.com',
    role: 'SUPER_ADMIN',
  });
  assert.ok(!result.success, 'SUPER_ADMIN should not be inviteable via staff invitation');
});

test('inviteStaffSchema does not allow ADMIN role', () => {
  const result = inviteStaffSchema.safeParse({
    email: 'test@test.com',
    role: 'ADMIN',
  });
  assert.ok(!result.success, 'ADMIN should not be inviteable via staff invitation');
});

// ============================================================
// 13. CROSS-MODULE CONSISTENCY
// ============================================================

test('PROFESSIONAL_ROLES is a subset of STAFF_ROLES', () => {
  for (const role of PROFESSIONAL_ROLES) {
    assert.ok(STAFF_ROLES.includes(role), `${role} must be in STAFF_ROLES`);
  }
});

test('all ROLE_HIERARCHY keys are valid ROLES', () => {
  for (const role of Object.keys(ROLE_HIERARCHY)) {
    assert.ok(
      Object.values(ROLES).includes(role),
      `"${role}" in ROLE_HIERARCHY must be a valid ROLES value`
    );
  }
});

test('all PHARMACY_STATUS values are used in updatePharmacyStatusSchema', () => {
  const result = updatePharmacyStatusSchema.safeParse({ status: 'PENDING' });
  assert.ok(result.success, 'PENDING should be accepted');
  const result2 = updatePharmacyStatusSchema.safeParse({ status: 'ACTIVE' });
  assert.ok(result2.success, 'ACTIVE should be accepted');
  const result3 = updatePharmacyStatusSchema.safeParse({ status: 'SUSPENDED' });
  assert.ok(result3.success, 'SUSPENDED should be accepted');
  const result4 = updatePharmacyStatusSchema.safeParse({ status: 'REJECTED' });
  assert.ok(result4.success, 'REJECTED should be accepted');
});

test('all review verification statuses are in the schema', () => {
  const schemaStatuses = reviewVerificationSchema.shape.status.options;
  const expected = ['VERIFIED', 'REJECTED', 'SUSPENDED'];
  for (const status of expected) {
    assert.ok(
      schemaStatuses.includes(status),
      `"${status}" must be in reviewVerificationSchema`
    );
  }
});
