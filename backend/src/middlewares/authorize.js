import { ForbiddenError, UnauthorizedError } from '../utils/errors.js';
import { ROLE_HIERARCHY, PROFESSIONAL_ROLES } from '../constants.js';
import { getPermissionsForRole } from '../modules/pharmacy/pharmacy.repository.js';
import { queryOne } from '../config/database.js';

export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ForbiddenError('Authentication required'));
    }

    const userRole = req.user.role;

    if (allowedRoles.includes(userRole)) {
      return next();
    }

    const userLevel = ROLE_HIERARCHY[userRole] || 0;
    const minRequiredLevel = Math.min(
      ...allowedRoles.map((r) => ROLE_HIERARCHY[r] || Infinity)
    );

    if (userLevel >= minRequiredLevel && allowedRoles.length > 0) {
      return next();
    }

    return next(
      new ForbiddenError(
        `Role '${userRole}' does not have permission for this action. Required: ${allowedRoles.join(', ')}`
      )
    );
  };
}

export function selfOrAdmin(paramUserIdField = 'userId') {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ForbiddenError('Authentication required'));
    }

    if (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN') {
      return next();
    }

    const targetUserId = req.params[paramUserIdField] || req.body[paramUserIdField];
    if (targetUserId && req.user.userId === targetUserId) {
      return next();
    }

    return next(new ForbiddenError('You can only access your own data'));
  };
}

/**
 * Require a specific permission for the current user's role.
 * Checks the role_permissions table. SUPER_ADMIN and ADMIN bypass.
 */
export function requirePermission(permission) {
  return async (req, res, next) => {
    if (!req.user) {
      return next(new ForbiddenError('Authentication required'));
    }

    // Admins and super admins have all permissions
    if (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN') {
      return next();
    }

    try {
      const permissions = await getPermissionsForRole(req.user.role);
      if (permissions.includes(permission)) {
        return next();
      }
      return next(new ForbiddenError(`Missing required permission: ${permission}`));
    } catch (error) {
      return next(new ForbiddenError('Failed to check permissions'));
    }
  };
}

/**
 * Enforce professional verification for roles that require it (e.g. PHARMACIST).
 *
 * Checks the full chain:
 *   1. Account is active (users.is_active = true)
 *   2. Professional profile exists and verification_status = VERIFIED
 *   3. License is not expired (license_expiry > NOW())
 *
 * SUPER_ADMIN and ADMIN bypass all checks.
 * Non-professional roles (PATIENT, CASHIER, etc.) pass through without checks.
 */
export function requireProfessionalVerification() {
  return async (req, res, next) => {
    if (!req.user) {
      return next(new ForbiddenError('Authentication required'));
    }

    // Admins and super admins bypass professional checks
    if (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN') {
      return next();
    }

    // Only enforce for roles that require professional verification
    if (!PROFESSIONAL_ROLES.includes(req.user.role)) {
      return next();
    }

    try {
      // 1. Check account is active
      const user = await queryOne(
        `SELECT id, is_active FROM users WHERE id = $1`,
        [req.user.userId]
      );

      if (!user || !user.is_active) {
        return next(new ForbiddenError(
          'Account is inactive. Professional consultation is unavailable.'
        ));
      }

      // 2. Check professional profile exists and is verified
      const profile = await queryOne(
        `SELECT verification_status, license_expiry
         FROM professional_profiles
         WHERE user_id = $1`,
        [req.user.userId]
      );

      if (!profile) {
        return next(new ForbiddenError(
          'Professional profile not found. Please submit your credentials for verification.'
        ));
      }

      if (profile.verification_status !== 'VERIFIED') {
        return next(new ForbiddenError(
          `Professional verification status: ${profile.verification_status}. ` +
          'Only verified professionals can perform this action.'
        ));
      }

      // 3. Check license is not expired
      if (profile.license_expiry && new Date(profile.license_expiry) < new Date()) {
        return next(new ForbiddenError(
          'Professional license has expired. Professional consultation is temporarily disabled. ' +
          'Please update your professional credentials.'
        ));
      }

      return next();
    } catch (error) {
      return next(new ForbiddenError('Failed to verify professional status'));
    }
  };
}
