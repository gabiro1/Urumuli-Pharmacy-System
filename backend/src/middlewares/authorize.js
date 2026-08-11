import { ForbiddenError } from '../utils/errors.js';
import { ROLE_HIERARCHY } from '../constants.js';

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

    if (req.user.role === 'ADMIN') {
      return next();
    }

    const targetUserId = req.params[paramUserIdField] || req.body[paramUserIdField];
    if (targetUserId && req.user.userId === targetUserId) {
      return next();
    }

    return next(new ForbiddenError('You can only access your own data'));
  };
}
