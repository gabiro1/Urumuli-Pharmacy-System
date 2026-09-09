import * as pharmacyRepository from './pharmacy.repository.js';
import * as authRepository from '../auth/auth.repository.js';
import { createAuditLog } from '../../middlewares/auditLogger.js';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../utils/errors.js';
import {
  PHARMACY_STATUS,
  MEMBERSHIP_STATUS,
  PROFESSIONAL_VERIFICATION_STATUS,
  ROLES,
  AUDIT_ACTION,
  AUDIT_ENTITY,
} from '../../constants.js';
import { getVerificationProvider } from '../../services/professionalVerification.js';

// ============================================================
// PHARMACY MANAGEMENT
// ============================================================

export async function createPharmacy(data, actorId, ipAddress, userAgent) {
  const pharmacy = await pharmacyRepository.createPharmacy(data);

  // Auto-create an ACTIVE membership for the creator as MANAGER
  await pharmacyRepository.createMembership({
    userId: actorId,
    pharmacyId: pharmacy.id,
    role: ROLES.MANAGER,
    invitedBy: null,
  });
  // Activate immediately since the creator is the owner
  const memberships = await pharmacyRepository.listMembershipsByPharmacy(pharmacy.id, {
    status: 'PENDING',
  });
  if (memberships.data.length > 0) {
    await pharmacyRepository.activateMembership(memberships.data[0].id);
  }

  await createAuditLog({
    userId: actorId,
    action: AUDIT_ACTION.CREATE,
    entity: 'PHARMACY',
    entityId: pharmacy.id,
    description: `Pharmacy "${pharmacy.name}" created`,
    metadata: { name: pharmacy.name },
    ipAddress,
    userAgent,
  });

  return pharmacy;
}

export async function getPharmacy(id) {
  const pharmacy = await pharmacyRepository.findPharmacyById(id);
  if (!pharmacy) throw new NotFoundError('Pharmacy', id);
  return pharmacy;
}

export async function listPharmacies(page, limit, status) {
  return pharmacyRepository.listPharmacies({ page, limit, status });
}

export async function updatePharmacyStatus(id, status, reason, actorId, ipAddress, userAgent) {
  const pharmacy = await pharmacyRepository.findPharmacyById(id);
  if (!pharmacy) throw new NotFoundError('Pharmacy', id);

  if (!Object.values(PHARMACY_STATUS).includes(status)) {
    throw new ValidationError('Invalid pharmacy status');
  }

  const updated = await pharmacyRepository.updatePharmacyStatus(id, status, reason, actorId);

  await createAuditLog({
    userId: actorId,
    action: AUDIT_ACTION.UPDATE,
    entity: 'PHARMACY',
    entityId: id,
    description: `Pharmacy "${pharmacy.name}" status changed to ${status}`,
    metadata: { previousStatus: pharmacy.status, status, reason },
    ipAddress,
    userAgent,
  });

  return updated;
}

// ============================================================
// STAFF MEMBERSHIP MANAGEMENT
// ============================================================

export async function inviteStaff(pharmacyId, { email, role }, actorId, ipAddress, userAgent) {
  const pharmacy = await pharmacyRepository.findPharmacyById(pharmacyId);
  if (!pharmacy) throw new NotFoundError('Pharmacy', pharmacyId);

  if (pharmacy.status !== PHARMACY_STATUS.ACTIVE) {
    throw new ForbiddenError('Pharmacy must be active to invite staff');
  }

  // Check that actor has MANAGE_STAFF permission (membership must be active)
  const actorMembership = await pharmacyRepository.findMembershipByUserAndPharmacy(actorId, pharmacyId);
  if (!actorMembership || actorMembership.status !== MEMBERSHIP_STATUS.ACTIVE) {
    throw new ForbiddenError('You do not have an active membership at this pharmacy');
  }

  // Find or create the user
  const user = await authRepository.findByEmail(email.trim().toLowerCase());

  // Check for existing active membership
  if (user) {
    const existing = await pharmacyRepository.findMembershipByUserAndPharmacy(user.id, pharmacyId);
    if (existing && existing.status !== MEMBERSHIP_STATUS.REMOVED) {
      throw new ConflictError('This user is already a member of this pharmacy');
    }
  }

  // Create a pending membership (user may not exist yet — they'll join on first login)
  const membership = await pharmacyRepository.createMembership({
    userId: user?.id || null, // Will be linked when user accepts
    pharmacyId,
    role,
    invitedBy: actorId,
  });

  await createAuditLog({
    userId: actorId,
    action: AUDIT_ACTION.CREATE,
    entity: 'USER',
    entityId: membership.id,
    description: `Invited ${email} as ${role} to pharmacy "${pharmacy.name}"`,
    metadata: { email, role, pharmacyId },
    ipAddress,
    userAgent,
  });

  return membership;
}

export async function activateMembership(membershipId, userId, ipAddress, userAgent) {
  const membership = await pharmacyRepository.findMembershipById(membershipId);
  if (!membership) throw new NotFoundError('Membership', membershipId);

  if (membership.status !== MEMBERSHIP_STATUS.PENDING) {
    throw new ConflictError(`Membership is already ${membership.status.toLowerCase()}`);
  }

  const updated = await pharmacyRepository.activateMembership(membershipId);

  await createAuditLog({
    userId,
    action: AUDIT_ACTION.UPDATE,
    entity: 'USER',
    entityId: membershipId,
    description: `Membership activated`,
    metadata: { pharmacyId: membership.pharmacy_id, role: membership.role },
    ipAddress,
    userAgent,
  });

  return updated;
}

export async function listMemberships(pharmacyId, page, limit, status) {
  const pharmacy = await pharmacyRepository.findPharmacyById(pharmacyId);
  if (!pharmacy) throw new NotFoundError('Pharmacy', pharmacyId);
  return pharmacyRepository.listMembershipsByPharmacy(pharmacyId, { page, limit, status });
}

export async function listUserMemberships(userId) {
  return pharmacyRepository.listMembershipsByUser(userId);
}

export async function suspendMembership(membershipId, reason, actorId, ipAddress, userAgent) {
  const membership = await pharmacyRepository.findMembershipById(membershipId);
  if (!membership) throw new NotFoundError('Membership', membershipId);

  const updated = await pharmacyRepository.suspendMembership(membershipId, reason);

  await createAuditLog({
    userId: actorId,
    action: AUDIT_ACTION.UPDATE,
    entity: 'USER',
    entityId: membershipId,
    description: `Staff membership suspended`,
    metadata: { pharmacyId: membership.pharmacy_id, reason },
    ipAddress,
    userAgent,
  });

  return updated;
}

export async function removeMembership(membershipId, actorId, ipAddress, userAgent) {
  const membership = await pharmacyRepository.findMembershipById(membershipId);
  if (!membership) throw new NotFoundError('Membership', membershipId);

  const updated = await pharmacyRepository.removeMembership(membershipId);

  await createAuditLog({
    userId: actorId,
    action: AUDIT_ACTION.DELETE,
    entity: 'USER',
    entityId: membershipId,
    description: `Staff removed from pharmacy`,
    metadata: { pharmacyId: membership.pharmacy_id, role: membership.role },
    ipAddress,
    userAgent,
  });

  return updated;
}

// ============================================================
// PROFESSIONAL VERIFICATION
// ============================================================

export async function submitProfessionalProfile(userId, profileData) {
  const existing = await pharmacyRepository.findProfessionalProfileByUserId(userId);
  if (existing) {
    throw new ConflictError('Professional profile already exists. Update your existing profile instead.');
  }

  const profile = await pharmacyRepository.createProfessionalProfile(userId, profileData);

  // Automatically trigger verification for the submitted credentials
  const provider = getVerificationProvider();
  const verificationResult = await provider.verifyProfessional({
    registrationNumber: profileData.professionalRegistrationNumber,
    licenseNumber: profileData.licenseNumber,
    licenseExpiry: profileData.licenseExpiry,
    issuingAuthority: profileData.licenseIssuingAuthority,
  });

  // Update status based on provider result
  const newStatus = verificationResult.status === 'VERIFIED'
    ? PROFESSIONAL_VERIFICATION_STATUS.PENDING  // Still needs admin approval
    : verificationResult.status === 'EXPIRED'
    ? PROFESSIONAL_VERIFICATION_STATUS.EXPIRED
    : PROFESSIONAL_VERIFICATION_STATUS.PENDING;

  await pharmacyRepository.updateVerificationStatus(userId, newStatus, {
    notes: verificationResult.reason || `Submitted by user. Provider: ${verificationResult.provider}`,
  });

  return await pharmacyRepository.findProfessionalProfileByUserId(userId);
}

export async function getProfessionalProfile(userId) {
  return pharmacyRepository.findProfessionalProfileByUserId(userId);
}

export async function updateProfessionalProfile(userId, data) {
  const existing = await pharmacyRepository.findProfessionalProfileByUserId(userId);
  if (!existing) {
    throw new NotFoundError('Professional profile not found');
  }

  // If credentials changed, re-verify
  if (data.licenseNumber || data.professionalRegistrationNumber) {
    const provider = getVerificationProvider();
    const result = await provider.verifyProfessional({
      registrationNumber: data.professionalRegistrationNumber || existing.professional_registration_number,
      licenseNumber: data.licenseNumber || existing.license_number,
      licenseExpiry: data.licenseExpiry || existing.license_expiry,
    });

    if (result.status === 'EXPIRED') {
      await pharmacyRepository.updateVerificationStatus(userId, PROFESSIONAL_VERIFICATION_STATUS.EXPIRED, {
        notes: 'License expired per provider check',
      });
    } else if (result.status === 'REJECTED') {
      await pharmacyRepository.updateVerificationStatus(userId, PROFESSIONAL_VERIFICATION_STATUS.REJECTED, {
        rejectionReason: result.reason,
      });
    }
  }

  return pharmacyRepository.updateProfessionalProfile(userId, data);
}

export async function reviewVerification(userId, status, { verifiedBy, notes, rejectionReason }, ipAddress, userAgent) {
  const profile = await pharmacyRepository.findProfessionalProfileByUserId(userId);
  if (!profile) throw new NotFoundError('Professional profile not found');

  if (!Object.values(PROFESSIONAL_VERIFICATION_STATUS).includes(status)) {
    throw new ValidationError('Invalid verification status');
  }

  const updated = await pharmacyRepository.updateVerificationStatus(userId, status, {
    verifiedBy,
    notes,
    rejectionReason,
  });

  await createAuditLog({
    userId: verifiedBy,
    action: AUDIT_ACTION.UPDATE,
    entity: 'USER',
    entityId: userId,
    description: `Professional verification ${status.toLowerCase()} for user`,
    metadata: { status, notes, rejectionReason },
    ipAddress,
    userAgent,
  });

  return updated;
}

export async function listPendingVerifications(page, limit) {
  return pharmacyRepository.listPendingVerifications({ page, limit });
}

// ============================================================
// LICENSE EXPIRATION CHECK
// ============================================================

export async function checkLicenseExpiration(userId) {
  const profile = await pharmacyRepository.findProfessionalProfileByUserId(userId);
  if (!profile) return null;

  if (profile.license_expiry && new Date(profile.license_expiry) < new Date()) {
    // License expired — automatically restrict professional privileges
    if (profile.verification_status === PROFESSIONAL_VERIFICATION_STATUS.VERIFIED) {
      await pharmacyRepository.updateVerificationStatus(userId, PROFESSIONAL_VERIFICATION_STATUS.EXPIRED, {
        notes: 'Automatically expired: license expiry date has passed',
      });
      return { status: 'EXPIRED', licenseExpiry: profile.license_expiry };
    }
  }

  return {
    status: profile.verification_status,
    licenseExpiry: profile.license_expiry,
    isLicenseValid: profile.license_expiry ? new Date(profile.license_expiry) > new Date() : true,
  };
}

// ============================================================
// PERMISSIONS
// ============================================================

export async function getPermissionsForRole(role) {
  return pharmacyRepository.getPermissionsForRole(role);
}

export async function getAllPermissions() {
  return pharmacyRepository.getAllPermissions();
}
