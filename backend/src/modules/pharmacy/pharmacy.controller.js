import * as pharmacyService from './pharmacy.service.js';
import { sendSuccess, sendCreated } from '../../utils/response.js';

// ============================================================
// PHARMACY MANAGEMENT
// ============================================================

export async function createPharmacy(req, res, next) {
  try {
    const pharmacy = await pharmacyService.createPharmacy(
      req.body,
      req.user.userId,
      req.ip,
      req.get('User-Agent')
    );
    return sendCreated(res, pharmacy, 'Pharmacy created');
  } catch (error) {
    next(error);
  }
}

export async function getPharmacy(req, res, next) {
  try {
    const pharmacy = await pharmacyService.getPharmacy(req.params.id);
    return sendSuccess(res, pharmacy);
  } catch (error) {
    next(error);
  }
}

export async function listPharmacies(req, res, next) {
  try {
    const { page, limit, status } = req.query;
    const result = await pharmacyService.listPharmacies(
      parseInt(page) || 1,
      parseInt(limit) || 20,
      status
    );
    return sendSuccess(res, result.data, 'Success', 200, result.meta);
  } catch (error) {
    next(error);
  }
}

export async function updatePharmacyStatus(req, res, next) {
  try {
    const { status, reason } = req.body;
    const pharmacy = await pharmacyService.updatePharmacyStatus(
      req.params.id,
      status,
      reason,
      req.user.userId,
      req.ip,
      req.get('User-Agent')
    );
    return sendSuccess(res, pharmacy, 'Pharmacy status updated');
  } catch (error) {
    next(error);
  }
}

// ============================================================
// STAFF MEMBERSHIP MANAGEMENT
// ============================================================

export async function inviteStaff(req, res, next) {
  try {
    const membership = await pharmacyService.inviteStaff(
      req.params.pharmacyId,
      req.body,
      req.user.userId,
      req.ip,
      req.get('User-Agent')
    );
    return sendCreated(res, membership, 'Staff invitation sent');
  } catch (error) {
    next(error);
  }
}

export async function listMemberships(req, res, next) {
  try {
    const { page, limit, status } = req.query;
    const result = await pharmacyService.listMemberships(
      req.params.pharmacyId,
      parseInt(page) || 1,
      parseInt(limit) || 50,
      status
    );
    return sendSuccess(res, result.data, 'Success', 200, result.meta);
  } catch (error) {
    next(error);
  }
}

export async function activateMembership(req, res, next) {
  try {
    const membership = await pharmacyService.activateMembership(
      req.params.membershipId,
      req.user.userId,
      req.ip,
      req.get('User-Agent')
    );
    return sendSuccess(res, membership, 'Membership activated');
  } catch (error) {
    next(error);
  }
}

export async function suspendStaff(req, res, next) {
  try {
    const { reason } = req.body || {};
    const membership = await pharmacyService.suspendMembership(
      req.params.membershipId,
      reason,
      req.user.userId,
      req.ip,
      req.get('User-Agent')
    );
    return sendSuccess(res, membership, 'Staff suspended');
  } catch (error) {
    next(error);
  }
}

export async function removeStaff(req, res, next) {
  try {
    const membership = await pharmacyService.removeMembership(
      req.params.membershipId,
      req.user.userId,
      req.ip,
      req.get('User-Agent')
    );
    return sendSuccess(res, membership, 'Staff removed');
  } catch (error) {
    next(error);
  }
}

export async function listMyMemberships(req, res, next) {
  try {
    const memberships = await pharmacyService.listUserMemberships(req.user.userId);
    return sendSuccess(res, memberships);
  } catch (error) {
    next(error);
  }
}

// ============================================================
// PROFESSIONAL VERIFICATION
// ============================================================

export async function submitProfessionalProfile(req, res, next) {
  try {
    const profile = await pharmacyService.submitProfessionalProfile(
      req.user.userId,
      req.body
    );
    return sendCreated(res, profile, 'Professional profile submitted for verification');
  } catch (error) {
    next(error);
  }
}

export async function getProfessionalProfile(req, res, next) {
  try {
    const userId = req.params.userId || req.user.userId;
    const profile = await pharmacyService.getProfessionalProfile(userId);
    return sendSuccess(res, profile);
  } catch (error) {
    next(error);
  }
}

export async function updateProfessionalProfile(req, res, next) {
  try {
    const userId = req.params.userId || req.user.userId;
    const profile = await pharmacyService.updateProfessionalProfile(userId, req.body);
    return sendSuccess(res, profile, 'Professional profile updated');
  } catch (error) {
    next(error);
  }
}

export async function reviewVerification(req, res, next) {
  try {
    const { status, notes, rejectionReason } = req.body;
    const profile = await pharmacyService.reviewVerification(
      req.params.userId,
      status,
      { verifiedBy: req.user.userId, notes, rejectionReason },
      req.ip,
      req.get('User-Agent')
    );
    return sendSuccess(res, profile, `Verification ${status.toLowerCase()}`);
  } catch (error) {
    next(error);
  }
}

export async function listPendingVerifications(req, res, next) {
  try {
    const { page, limit } = req.query;
    const result = await pharmacyService.listPendingVerifications(
      parseInt(page) || 1,
      parseInt(limit) || 20
    );
    return sendSuccess(res, result.data, 'Success', 200, result.meta);
  } catch (error) {
    next(error);
  }
}

export async function checkMyLicense(req, res, next) {
  try {
    const status = await pharmacyService.checkLicenseExpiration(req.user.userId);
    return sendSuccess(res, status);
  } catch (error) {
    next(error);
  }
}

// ============================================================
// PERMISSIONS
// ============================================================

export async function getPermissionsForRole(req, res, next) {
  try {
    const permissions = await pharmacyService.getPermissionsForRole(req.params.role);
    return sendSuccess(res, permissions);
  } catch (error) {
    next(error);
  }
}

export async function getAllPermissions(req, res, next) {
  try {
    const permissions = await pharmacyService.getAllPermissions();
    return sendSuccess(res, permissions);
  } catch (error) {
    next(error);
  }
}
