import { ForbiddenError } from './errors.js';

const DEFAULT_STAFF_ROLES = Object.freeze([
  'SUPER_ADMIN',
  'ADMIN',
  'MANAGER',
  'PHARMACIST',
  'AUDITOR',
]);

export function isAllowedStaffRole(role, staffRoles = DEFAULT_STAFF_ROLES) {
  return staffRoles.includes(role);
}

/**
 * Protect a patient-owned resource while allowing explicitly approved staff
 * roles to operate on it. This is intentionally object-level authorization;
 * route authentication alone is not enough for health data.
 */
export function assertResourceAccess(
  user,
  ownerId,
  {
    staffRoles = DEFAULT_STAFF_ROLES,
    message = 'You do not have permission to access this resource',
  } = {}
) {
  if (!user) {
    throw new ForbiddenError('Authentication required');
  }

  if (isAllowedStaffRole(user.role, staffRoles)) {
    return;
  }

  if (
    user.role === 'PATIENT'
    && ownerId
    && String(user.userId) === String(ownerId)
  ) {
    return;
  }

  throw new ForbiddenError(message);
}

export function assertConversationAccess(user, conversation, options = {}) {
  assertResourceAccess(user, conversation?.patient_id, {
    staffRoles: options.staffRoles || ['SUPER_ADMIN', 'ADMIN', 'PHARMACIST'],
    message: options.message || 'You do not have permission to access this conversation',
  });
}

