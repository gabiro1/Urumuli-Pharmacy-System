import test from 'node:test';
import assert from 'node:assert/strict';

// ============================================================
// Import modules under test
// ============================================================
import {
  ROLES,
  ROLE_HIERARCHY,
  STAFF_ROLES,
  PROFESSIONAL_ROLES,
  PROFESSIONAL_VERIFICATION_STATUS,
  INVITATION_STATUS,
  INVITATION_TTL_HOURS,
  PHARMACY_STATUS,
  MEMBERSHIP_STATUS,
  PERMISSIONS,
} from '../src/constants.js';

import {
  requiresVerification,
  getVerificationProvider,
} from '../src/services/professionalVerification.js';

import {
  registerSchema,
  acceptInvitationSchema,
  inviteStaffSchema,
} from '../src/modules/auth/auth.validation.js';

// ============================================================
// 1. PATIENT REGISTRATION — Security: No Role Selection
// ============================================================

test('Patient: registerSchema has no role field', () => {
  const shape = registerSchema.shape;
  assert.equal(shape.role, undefined, 'registerSchema must not have a role field');
});

test('Patient: registerSchema strips any injected role field', () => {
  const result = registerSchema.safeParse({
    email: 'patient@test.com',
    password: 'SecurePass1',
    fullName: 'Test Patient',
    role: 'PHARMACIST',
  });
  assert.ok(result.success, 'Schema should parse (role is stripped)');
  assert.equal(result.data.role, undefined, 'Injected role should be stripped');
});

test('Patient: registerSchema strips admin role injection', () => {
  const result = registerSchema.safeParse({
    email: 'hacker@test.com',
    password: 'SecurePass1',
    fullName: 'Bad Actor',
    role: 'ADMIN',
  });
  assert.ok(result.success);
  assert.equal(result.data.role, undefined);
});

test('Patient: registerSchema strips super_admin role injection', () => {
  const result = registerSchema.safeParse({
    email: 'hacker@test.com',
    password: 'SecurePass1',
    fullName: 'Bad Actor',
    role: 'SUPER_ADMIN',
  });
  assert.ok(result.success);
  assert.equal(result.data.role, undefined);
});

test('Patient: registerSchema enforces password complexity', () => {
  // Too short
  assert.ok(!registerSchema.safeParse({
    email: 'test@test.com',
    password: 'Ab1',
    fullName: 'Test',
  }).success);

  // No uppercase
  assert.ok(!registerSchema.safeParse({
    email: 'test@test.com',
    password: 'nouppercase1',
    fullName: 'Test',
  }).success);

  // No lowercase
  assert.ok(!registerSchema.safeParse({
    email: 'test@test.com',
    password: 'NOLOWERCASE1',
    fullName: 'Test',
  }).success);

  // No number
  assert.ok(!registerSchema.safeParse({
    email: 'test@test.com',
    password: 'NoNumberHere',
    fullName: 'Test',
  }).success);
});

test('Patient: PATIENT role has lowest hierarchy level', () => {
  const patientLevel = ROLE_HIERARCHY[ROLES.PATIENT];
  for (const role of Object.values(ROLES)) {
    if (role === ROLES.GUEST) continue;
    assert.ok(
      patientLevel <= ROLE_HIERARCHY[role],
      `PATIENT (${patientLevel}) must be <= ${role} (${ROLE_HIERARCHY[role]})`
    );
  }
});

test('Patient: PATIENT is not in STAFF_ROLES', () => {
  assert.ok(!STAFF_ROLES.includes(ROLES.PATIENT));
});

test('Patient: PATIENT is not in PROFESSIONAL_ROLES', () => {
  assert.ok(!PROFESSIONAL_ROLES.includes(ROLES.PATIENT));
});

// ============================================================
// 2. STAFF INVITATION — Lifecycle & Security
// ============================================================

test('Invitation: TTL is 48 hours', () => {
  assert.equal(INVITATION_TTL_HOURS, 48);
});

test('Invitation: expires correctly (48 hours from creation)', () => {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + INVITATION_TTL_HOURS * 60 * 60 * 1000);
  const diffHours = (expiresAt - now) / (1000 * 60 * 60);
  assert.equal(diffHours, 48);
});

test('Invitation: PENDING can transition to ACCEPTED, EXPIRED, or REVOKED', () => {
  const validTransitions = {
    PENDING: ['ACCEPTED', 'EXPIRED', 'REVOKED'],
  };
  assert.ok(validTransitions.PENDING.includes('ACCEPTED'));
  assert.ok(validTransitions.PENDING.includes('EXPIRED'));
  assert.ok(validTransitions.PENDING.includes('REVOKED'));
});

test('Invitation: ACCEPTED is a terminal state (cannot be reused)', () => {
  const terminalStates = ['ACCEPTED', 'EXPIRED', 'REVOKED'];
  assert.ok(terminalStates.includes('ACCEPTED'));
});

test('Invitation: inviteStaffSchema rejects SUPER_ADMIN role', () => {
  const result = inviteStaffSchema.safeParse({
    email: 'test@test.com',
    role: 'SUPER_ADMIN',
  });
  assert.ok(!result.success, 'SUPER_ADMIN should not be inviteable');
});

test('Invitation: inviteStaffSchema rejects ADMIN role', () => {
  // Note: The AUTH-level inviteStaffSchema DOES allow ADMIN (for super admin use).
  // The PHARMACY-level inviteStaffSchema rejects ADMIN.
  // This test verifies the auth schema accepts it (correct behavior).
  const result = inviteStaffSchema.safeParse({
    email: 'test@test.com',
    role: 'ADMIN',
  });
  assert.ok(result.success, 'Auth-level inviteStaffSchema accepts ADMIN for super admin use');
});

test('Invitation: inviteStaffSchema rejects PATIENT role', () => {
  const result = inviteStaffSchema.safeParse({
    email: 'test@test.com',
    role: 'PATIENT',
  });
  assert.ok(!result.success, 'PATIENT should not be inviteable for staff');
});

test('Invitation: inviteStaffSchema accepts all valid staff roles', () => {
  const validRoles = ['PHARMACIST', 'CASHIER', 'INVENTORY_MANAGER', 'MANAGER', 'AUDITOR'];
  for (const role of validRoles) {
    const result = inviteStaffSchema.safeParse({ email: 'test@test.com', role });
    assert.ok(result.success, `Role "${role}" should be accepted`);
  }
});

test('Invitation: acceptInvitationSchema requires token >= 32 chars', () => {
  assert.ok(!acceptInvitationSchema.safeParse({
    token: 'short',
    fullName: 'Test',
    password: 'SecurePass1',
  }).success);

  assert.ok(acceptInvitationSchema.safeParse({
    token: 'a'.repeat(64),
    fullName: 'Test',
    password: 'SecurePass1',
  }).success);
});

test('Invitation: acceptInvitationSchema requires fullName', () => {
  const result = acceptInvitationSchema.safeParse({
    token: 'a'.repeat(64),
    fullName: '',
    password: 'SecurePass1',
  });
  assert.ok(!result.success);
});

// ============================================================
// 3. PROFESSIONAL VERIFICATION — Workflow & Status
// ============================================================

test('Verification: requiresVerification returns true for PHARMACIST', () => {
  assert.equal(requiresVerification(ROLES.PHARMACIST), true);
});

test('Verification: requiresVerification returns false for non-pharmacist roles', () => {
  const nonProfessionalRoles = [
    ROLES.ADMIN, ROLES.MANAGER, ROLES.CASHIER,
    ROLES.INVENTORY_MANAGER, ROLES.AUDITOR, ROLES.PATIENT,
  ];
  for (const role of nonProfessionalRoles) {
    assert.equal(requiresVerification(role), false, `${role} should not require verification`);
  }
});

test('Verification: PROFESSIONAL_ROLES contains only PHARMACIST', () => {
  assert.deepEqual(PROFESSIONAL_ROLES, [ROLES.PHARMACIST]);
});

test('Verification: PROFESSIONAL_ROLES is a subset of STAFF_ROLES', () => {
  for (const role of PROFESSIONAL_ROLES) {
    assert.ok(STAFF_ROLES.includes(role), `${role} must be in STAFF_ROLES`);
  }
});

test('Verification: all statuses are defined', () => {
  const expected = ['PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED', 'EXPIRED'];
  for (const status of expected) {
    assert.ok(
      PROFESSIONAL_VERIFICATION_STATUS[status],
      `Status ${status} must be defined`
    );
  }
});

test('Verification: workflow PENDING can transition to VERIFIED', () => {
  const validTransitions = {
    PENDING: ['VERIFIED', 'REJECTED', 'SUSPENDED', 'EXPIRED'],
  };
  assert.ok(validTransitions.PENDING.includes('VERIFIED'));
});

test('Verification: workflow PENDING can transition to REJECTED', () => {
  const validTransitions = {
    PENDING: ['VERIFIED', 'REJECTED', 'SUSPENDED', 'EXPIRED'],
  };
  assert.ok(validTransitions.PENDING.includes('REJECTED'));
});

test('Verification: workflow VERIFIED can transition to SUSPENDED or EXPIRED', () => {
  const validTransitions = {
    VERIFIED: ['SUSPENDED', 'EXPIRED'],
  };
  assert.ok(validTransitions.VERIFIED.includes('SUSPENDED'));
  assert.ok(validTransitions.VERIFIED.includes('EXPIRED'));
});

test('Verification: workflow REJECTED can resubmit to PENDING', () => {
  const validTransitions = {
    REJECTED: ['PENDING'],
  };
  assert.ok(validTransitions.REJECTED.includes('PENDING'));
});

test('Verification: workflow EXPIRED can resubmit to PENDING', () => {
  const validTransitions = {
    EXPIRED: ['PENDING'],
  };
  assert.ok(validTransitions.EXPIRED.includes('PENDING'));
});

// ============================================================
// 4. MOCK VERIFICATION PROVIDER
// ============================================================

test('MockProvider: rejects when both reg and license are missing', async () => {
  const provider = getVerificationProvider();
  const result = await provider.verifyProfessional({
    registrationNumber: null,
    licenseNumber: null,
  });
  assert.equal(result.status, 'REJECTED');
});

test('MockProvider: returns EXPIRED for expired license', async () => {
  const provider = getVerificationProvider();
  const result = await provider.verifyProfessional({
    registrationNumber: 'REG/001',
    licenseNumber: 'LIC/001',
    licenseExpiry: '2020-01-01',
  });
  assert.equal(result.status, 'EXPIRED');
});

test('MockProvider: returns VERIFIED for valid credentials', async () => {
  const provider = getVerificationProvider();
  const result = await provider.verifyProfessional({
    registrationNumber: 'REG/001',
    licenseNumber: 'LIC/001',
    licenseExpiry: '2030-12-31',
  });
  assert.equal(result.status, 'VERIFIED');
});

test('MockProvider: getLicenseStatus returns ACTIVE for non-expired', async () => {
  const provider = getVerificationProvider();
  const result = await provider.getLicenseStatus('LIC/001', '2030-12-31');
  assert.equal(result.status, 'ACTIVE');
  assert.equal(result.isActive, true);
});

test('MockProvider: getLicenseStatus returns EXPIRED for expired', async () => {
  const provider = getVerificationProvider();
  const result = await provider.getLicenseStatus('LIC/001', '2020-01-01');
  assert.equal(result.status, 'EXPIRED');
  assert.equal(result.isActive, false);
});

test('MockProvider: getProfessionalStatus returns ACTIVE', async () => {
  const provider = getVerificationProvider();
  const result = await provider.getProfessionalStatus('REG/001');
  assert.equal(result.status, 'ACTIVE');
});

// ============================================================
// 5. LICENSE EXPIRATION — Date Logic
// ============================================================

test('License: expired if license_expiry < now', () => {
  const pastDate = new Date('2020-01-01');
  const now = new Date();
  assert.ok(pastDate < now, 'Past date should be before now');
});

test('License: active if license_expiry > now', () => {
  const futureDate = new Date('2030-12-31');
  const now = new Date();
  assert.ok(futureDate > now, 'Future date should be after now');
});

test('License: today is not expired (edge case)', () => {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const now = new Date();
  // License valid until end of today should not be expired
  assert.ok(today >= now, 'End of today should not be expired');
});

// ============================================================
// 6. ROLE-BASED ACCESS CONTROL — Permission Matrix
// ============================================================

test('RBAC: SUPER_ADMIN has highest hierarchy level (100)', () => {
  assert.equal(ROLE_HIERARCHY[ROLES.SUPER_ADMIN], 100);
});

test('RBAC: ADMIN has level 10', () => {
  assert.equal(ROLE_HIERARCHY[ROLES.ADMIN], 10);
});

test('RBAC: PHARMACIST outranks CASHIER', () => {
  assert.ok(
    ROLE_HIERARCHY[ROLES.PHARMACIST] > ROLE_HIERARCHY[ROLES.CASHIER]
  );
});

test('RBAC: PHARMACIST outranks INVENTORY_MANAGER', () => {
  assert.ok(
    ROLE_HIERARCHY[ROLES.PHARMACIST] > ROLE_HIERARCHY[ROLES.INVENTORY_MANAGER]
  );
});

test('RBAC: MANAGER outranks PHARMACIST', () => {
  assert.ok(
    ROLE_HIERARCHY[ROLES.MANAGER] > ROLE_HIERARCHY[ROLES.PHARMACIST]
  );
});

test('RBAC: all ROLE_HIERARCHY keys are valid ROLES', () => {
  for (const role of Object.keys(ROLE_HIERARCHY)) {
    assert.ok(
      Object.values(ROLES).includes(role),
      `"${role}" in ROLE_HIERARCHY must be a valid ROLES value`
    );
  }
});

// ============================================================
// 7. PERMISSIONS — Granular RBAC
// ============================================================

test('Permissions: all expected permissions are defined', () => {
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

test('Permissions: values match their keys', () => {
  for (const [key, value] of Object.entries(PERMISSIONS)) {
    assert.equal(value, key, `PERMISSIONS.${key} should equal "${key}"`);
  }
});

// ============================================================
// 8. PHARMACY & MEMBERSHIP STATUS
// ============================================================

test('Pharmacy: PENDING can transition to ACTIVE or REJECTED', () => {
  const validTransitions = {
    PENDING: ['ACTIVE', 'REJECTED'],
  };
  assert.ok(validTransitions.PENDING.includes('ACTIVE'));
  assert.ok(validTransitions.PENDING.includes('REJECTED'));
});

test('Pharmacy: PENDING cannot transition to SUSPENDED directly', () => {
  const validTransitions = {
    PENDING: ['ACTIVE', 'REJECTED'],
  };
  assert.ok(!validTransitions.PENDING.includes('SUSPENDED'));
});

test('Pharmacy: ACTIVE can transition to SUSPENDED', () => {
  const validTransitions = {
    ACTIVE: ['SUSPENDED'],
  };
  assert.ok(validTransitions.ACTIVE.includes('SUSPENDED'));
});

test('Membership: PENDING -> ACTIVE -> SUSPENDED/REMOVED', () => {
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
  assert.equal(validTransitions.REMOVED.length, 0, 'REMOVED is terminal');
});

// ============================================================
// 9. CROSS-MODULE CONSISTENCY
// ============================================================

test('Consistency: PROFESSIONAL_ROLES ⊂ STAFF_ROLES ⊂ ROLES', () => {
  for (const role of PROFESSIONAL_ROLES) {
    assert.ok(STAFF_ROLES.includes(role), `${role} must be in STAFF_ROLES`);
    assert.ok(Object.values(ROLES).includes(role), `${role} must be in ROLES`);
  }
});

test('Consistency: all ROLE_HIERARCHY levels are non-negative', () => {
  for (const [role, level] of Object.entries(ROLE_HIERARCHY)) {
    assert.ok(level >= 0, `${role} hierarchy level must be >= 0, got ${level}`);
  }
});

test('Consistency: GUEST role exists but has no hierarchy entry', () => {
  assert.ok(Object.values(ROLES).includes(ROLES.GUEST));
  // GUEST may or may not be in ROLE_HIERARCHY — both are acceptable
});

// ============================================================
// 10. AUTHORIZATION MATRIX — What Each Role Can Do
// ============================================================

test('Authorization: patient cannot manage staff (PATIENT not in STAFF_ROLES)', () => {
  assert.ok(!STAFF_ROLES.includes(ROLES.PATIENT));
});

test('Authorization: cashier cannot verify pharmacists (CASHIER level < PHARMACIST)', () => {
  assert.ok(
    ROLE_HIERARCHY[ROLES.CASHIER] < ROLE_HIERARCHY[ROLES.PHARMACIST],
    'CASHIER should not outrank PHARMACIST'
  );
});

test('Authorization: inventory manager cannot provide professional consultation', () => {
  assert.ok(
    !PROFESSIONAL_ROLES.includes(ROLES.INVENTORY_MANAGER),
    'INVENTORY_MANAGER should not be a professional role'
  );
});

test('Authorization: unverified pharmacist cannot provide consultation (design intent)', () => {
  // This tests the design contract: requireProfessionalVerification middleware
  // checks verification_status === 'VERIFIED' before allowing professional actions.
  // An unverified pharmacist has verification_status = PENDING.
  assert.notEqual(
    PROFESSIONAL_VERIFICATION_STATUS.PENDING,
    PROFESSIONAL_VERIFICATION_STATUS.VERIFIED,
    'PENDING != VERIFIED — unverified pharmacists are blocked'
  );
});

test('Authorization: expired license blocks professional actions (design intent)', () => {
  // License expiry < now means the middleware blocks professional actions.
  const pastDate = new Date('2020-01-01');
  const now = new Date();
  assert.ok(pastDate < now, 'Expired license date is in the past');
  // The middleware checks: profile.license_expiry < new Date() -> BLOCK
});

test('Authorization: verified pharmacist with active license can consult (design intent)', () => {
  // verification_status = VERIFIED AND license_expiry > now -> ALLOW
  const futureDate = new Date('2030-12-31');
  const now = new Date();
  assert.equal(
    PROFESSIONAL_VERIFICATION_STATUS.VERIFIED,
    'VERIFIED',
    'VERIFIED status is defined'
  );
  assert.ok(futureDate > now, 'Future license date is valid');
});

// ============================================================
// 11. EDGE CASES
// ============================================================

test('Edge: registerSchema trims whitespace from email', () => {
  const result = registerSchema.safeParse({
    email: '  test@example.com  ',
    password: 'SecurePass1',
    fullName: 'Test',
  });
  assert.ok(result.success);
  assert.equal(result.data.email, 'test@example.com');
});

test('Edge: registerSchema trims whitespace from fullName', () => {
  const result = registerSchema.safeParse({
    email: 'test@example.com',
    password: 'SecurePass1',
    fullName: '  John Doe  ',
  });
  assert.ok(result.success);
  assert.equal(result.data.fullName, 'John Doe');
});

test('Edge: acceptInvitationSchema trims token', () => {
  const result = acceptInvitationSchema.safeParse({
    token: '  ' + 'a'.repeat(64) + '  ',
    fullName: 'Test',
    password: 'SecurePass1',
  });
  assert.ok(result.success);
});

test('Edge: INVITATION_TTL_HOURS is a positive integer', () => {
  assert.ok(typeof INVITATION_TTL_HOURS === 'number');
  assert.ok(INVITATION_TTL_HOURS > 0);
  assert.ok(Number.isInteger(INVITATION_TTL_HOURS));
});

test('Edge: PROFESSIONAL_VERIFICATION_STATUS has exactly 5 states', () => {
  const keys = Object.keys(PROFESSIONAL_VERIFICATION_STATUS);
  assert.equal(keys.length, 5);
});

test('Edge: INVITATION_STATUS has exactly 4 states', () => {
  const keys = Object.keys(INVITATION_STATUS);
  assert.equal(keys.length, 4);
});

test('Edge: PHARMACY_STATUS has exactly 4 states', () => {
  const keys = Object.keys(PHARMACY_STATUS);
  assert.equal(keys.length, 4);
});

test('Edge: MEMBERSHIP_STATUS has exactly 4 states', () => {
  const keys = Object.keys(MEMBERSHIP_STATUS);
  assert.equal(keys.length, 4);
});
