import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import { OAuth2Client } from 'google-auth-library';
import { env } from '../../config/env.js';
import * as authRepository from './auth.repository.js';
import { createAuditLog } from '../../middlewares/auditLogger.js';
import { UnauthorizedError, ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../utils/errors.js';
import { ROLES, AUDIT_ACTION, AUDIT_ENTITY, INVITATION_TTL_HOURS, INVITATION_STATUS } from '../../constants.js';
import { mapUser, mapUserSummary, mapPatientSettings } from '../../utils/serializers.js';
import { cacheRemember, cacheGet, cacheSet, cacheDelKey } from '../../services/redis.service.js';
import { SYSTEM_ROLES, isCatalogPermission, PERMISSION_CATALOG } from '../../permissions.js';
import { verifyTotp, hashBackupCode, generateSecret, generateBackupCodes } from '../../services/totp.service.js';
import { sendVerificationEmail, sendInvitationEmail } from '../../services/mail.service.js';

function refreshSessionKey(tokenHash) {
  return `auth:refresh:${tokenHash}`;
}

function generateTwoFactorChallenge(user) {
  return jwt.sign(
    { userId: user.id, purpose: 'two-factor-challenge' },
    env.JWT.SECRET,
    { expiresIn: '10m' }
  );
}

function isStaffRole(role) {
  return ![ROLES.PATIENT].includes(role) && role !== undefined && role !== null;
}

function refreshSessionTtlSeconds() {
  const match = /^(\d+)\s*([smhd])?$/.exec(String(env.JWT.REFRESH_EXPIRES_IN || '7d'));
  if (!match) return 7 * 24 * 60 * 60;
  const value = parseInt(match[1], 10);
  const unit = match[2] || 's';
  const multipliers = { s: 1, m: 60, h: 3600, d: 86400 };
  return value * (multipliers[unit] || 1);
}

async function persistRefreshSession(user, tokenHash) {
  await cacheSet(
    refreshSessionKey(tokenHash),
    { userId: user.id, passwordChangedAt: user.password_changed_at || null },
    refreshSessionTtlSeconds()
  );
}

async function consumeRefreshSession(tokenHash) {
  const session = await cacheGet(refreshSessionKey(tokenHash));
  if (session && session.userId) {
    await cacheDelKey(refreshSessionKey(tokenHash));
    return session;
  }
  return null;
}

function generateAccessToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    env.JWT.SECRET,
    { expiresIn: env.JWT.ACCESS_EXPIRES_IN }
  );
}

function generateRefreshToken() {
  return crypto.randomBytes(64).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function sanitizeUser(user) {
  if (!user) return null;
  const safe = { ...user };
  delete safe.password_hash;
  delete safe.refresh_token_hash;
  return mapUser(safe);
}

// Effective RBAC permissions for a user's role. ADMIN / SUPER_ADMIN are
// granted the wildcard "*". Every other role reads its grants from the
// role_permissions table (the runtime store for the Roles manager).
async function getEffectivePermissions(role) {
  if (role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN) {
    return ['*'];
  }
  const rows = await authRepository.getRolePermissions(role);
  return rows.map((row) => row.permission);
}

async function buildSessionUser(user) {
  const safe = sanitizeUser(user);
  safe.permissions = await getEffectivePermissions(user.role);
  return safe;
}

async function assertRoleExists(role) {
  const existing = await authRepository.findRole(role);
  if (!existing) {
    throw new ValidationError(`Unknown role: ${role}. Create it in Team > Roles & Permissions first.`);
  }
  return existing;
}

function getFullName(userData) {
  return userData.fullName || userData.name || '';
}

export async function login(email, password, ipAddress, userAgent) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await authRepository.findByEmail(normalizedEmail);
  if (!user) throw new UnauthorizedError('Invalid email or password');
  if (!user.is_active) throw new UnauthorizedError('Account is deactivated. Contact administrator.');

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) throw new UnauthorizedError('Invalid email or password');

  await authRepository.updateLastLogin(user.id);

  await createAuditLog({
    userId: user.id,
    action: AUDIT_ACTION.LOGIN,
    entity: AUDIT_ENTITY.USER,
    entityId: user.id,
    description: `User ${user.email} logged in (password verified)`,
    ipAddress,
    userAgent,
  });

  if (user.two_factor_enabled && isStaffRole(user.role)) {
    return {
      requiresTwoFactor: true,
      tempToken: generateTwoFactorChallenge(user),
    };
  }

  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashToken(refreshToken);
  await authRepository.updateRefreshToken(user.id, refreshTokenHash);
  await persistRefreshSession(user, refreshTokenHash);

  return {
    user: await buildSessionUser(user),
    accessToken: generateAccessToken(user),
    refreshToken,
  };
}

export async function register(userData, ipAddress, userAgent) {
  // SECURITY: Public registration is ONLY for patient accounts.
  // Staff accounts must be created through the invitation flow.
  const normalizedEmail = userData.email.trim().toLowerCase();
  const existing = await authRepository.findByEmail(normalizedEmail);
  if (existing) throw new ConflictError('Email already registered');

  const passwordHash = await bcrypt.hash(userData.password, 10);

  const nameParts = getFullName(userData).trim().split(/\s+/);
  const user = await authRepository.create({
    email: normalizedEmail,
    passwordHash,
    firstName: nameParts[0] || '',
    lastName: nameParts.slice(1).join(' ') || nameParts[0] || '',
    phone: userData.phone,
    role: ROLES.PATIENT,
  });

  if (userData.phone) {
    await authRepository.createIdentityForUser(
      user.id,
      userData.phone,
      [user.first_name, user.last_name].filter(Boolean).join(' '),
      normalizedEmail
    );
  }

  await createAuditLog({
    userId: user.id,
    action: AUDIT_ACTION.CREATE,
    entity: AUDIT_ENTITY.USER,
    entityId: user.id,
    description: `User ${user.email} registered`,
    ipAddress,
    userAgent,
  });

  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashToken(refreshToken);
  await authRepository.updateRefreshToken(user.id, refreshTokenHash);
  await persistRefreshSession(user, refreshTokenHash);

  return {
    user: sanitizeUser(user),
    accessToken: generateAccessToken(user),
    refreshToken,
  };
}

export async function registerPatient(userData, ipAddress, userAgent) {
  const normalizedEmail = userData.email.trim().toLowerCase();
  const existing = await authRepository.findByEmail(normalizedEmail);
  if (existing) throw new ConflictError('Email already registered');

  const passwordHash = await bcrypt.hash(userData.password, 10);

  const nameParts = getFullName(userData).trim().split(/\s+/);
  const user = await authRepository.create({
    email: normalizedEmail,
    passwordHash,
    firstName: nameParts[0] || '',
    lastName: nameParts.slice(1).join(' ') || nameParts[0] || '',
    phone: userData.phone,
    role: ROLES.PATIENT,
  });

  await authRepository.createPatientProfile(user.id, {
    dateOfBirth: userData.dateOfBirth,
    gender: userData.gender,
    address: userData.address,
  });

  if (userData.phone) {
    await authRepository.createIdentityForUser(
      user.id,
      userData.phone,
      [user.first_name, user.last_name].filter(Boolean).join(' '),
      normalizedEmail
    );
  }

  await createAuditLog({
    userId: user.id,
    action: AUDIT_ACTION.CREATE,
    entity: AUDIT_ENTITY.USER,
    entityId: user.id,
    description: `Patient ${user.email} registered`,
    ipAddress,
    userAgent,
  });

  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashToken(refreshToken);
  await authRepository.updateRefreshToken(user.id, refreshTokenHash);
  await persistRefreshSession(user, refreshTokenHash);

  return {
    user: await buildSessionUser(user),
    accessToken: generateAccessToken(user),
    refreshToken,
  };
}

export async function googleSignIn(idToken, ipAddress, userAgent) {
  if (!env.GOOGLE_CLIENT_ID) {
    throw new UnauthorizedError('Google sign-in is not configured');
  }

  const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);
  let ticket;
  try {
    ticket = await client.verifyIdToken({ idToken, audience: env.GOOGLE_CLIENT_ID });
  } catch {
    throw new UnauthorizedError('Invalid Google token');
  }

  const payload = ticket.getPayload();
  if (!payload || !payload.email) {
    throw new UnauthorizedError('Could not extract email from Google token');
  }

  const googleEmail = payload.email.toLowerCase();
  const googleId = payload.sub;
  const firstName = payload.given_name || '';
  const lastName = payload.family_name || '';

  // Check if a user already exists with this Google ID
  let user = await authRepository.findByProvider('google', googleId);

  if (user) {
    // Existing Google-linked account. If it was created on a previous Google
    // sign-in but never verified, resend the verification email instead of
    // signing the user in.
    if (!user.email_verified_at) {
      return issueEmailVerification(user, ipAddress, userAgent);
    }
  } else {
    // Check if a user exists with this email (a pre-existing local account)
    user = await authRepository.findByEmail(googleEmail);

    if (user) {
      // Link Google auth to the existing local account. That account already
      // passed registration, so no new verification step is introduced.
      user = await authRepository.linkGoogleAuth(user.id, googleId);
      await authRepository.createPatientProfile(user.id, {});
    } else {
      // Create a brand-new patient account. It must verify its email address
      // before it can sign in.
      user = await authRepository.create({
        email: googleEmail,
        passwordHash: null,
        firstName: firstName || 'Google',
        lastName: lastName || 'User',
        phone: null,
        role: ROLES.PATIENT,
      });

      // Set OAuth columns on the new user
      user = await authRepository.linkGoogleAuth(user.id, googleId);

      await authRepository.createPatientProfile(user.id, {});

      await createAuditLog({
        userId: user.id,
        action: AUDIT_ACTION.CREATE,
        entity: AUDIT_ENTITY.USER,
        entityId: user.id,
        description: `Patient ${user.email} registered via Google`,
        ipAddress,
        userAgent,
      });

      return issueEmailVerification(user, ipAddress, userAgent);
    }
  }

  await authRepository.updateLastLogin(user.id);

  await createAuditLog({
    userId: user.id,
    action: AUDIT_ACTION.LOGIN,
    entity: AUDIT_ENTITY.USER,
    entityId: user.id,
    description: `User ${user.email} logged in via Google`,
    ipAddress,
    userAgent,
  });

  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashToken(refreshToken);
  await authRepository.updateRefreshToken(user.id, refreshTokenHash);
  await persistRefreshSession(user, refreshTokenHash);

  return {
    user: await buildSessionUser(user),
    accessToken: generateAccessToken(user),
    refreshToken,
  };
}

async function issueEmailVerification(user, ipAddress, userAgent) {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + env.EMAIL.VERIFICATION_TTL_MS);
  await authRepository.setEmailVerificationToken(user.id, tokenHash, expiresAt);

  const verificationUrl = `${env.PUBLIC_URL}/verify-email?token=${token}`;

  const result = await sendVerificationEmail({
    to: user.email,
    name: [user.first_name, user.last_name].filter(Boolean).join(' '),
    verificationUrl,
  });

  if (result?.failed) {
    console.error(
      `[auth] Verification email could not be delivered to ${user.email}: ${result.reason}`
    );
  } else if (result?.skipped) {
    console.log(`[auth] SMTP not configured. Verification link for ${user.email}: ${verificationUrl}`);
  }

  return {
    requiresEmailVerification: true,
    email: user.email,
    ...(env.NODE_ENV === 'development' ? { verificationLink: verificationUrl } : {}),
  };
}

export async function verifyEmail(token, ipAddress, userAgent) {
  const user = await authRepository.findByEmailVerificationToken(hashToken(token));
  if (!user) throw new UnauthorizedError('Verification link is invalid or has expired');

  const verified = await authRepository.markEmailVerified(user.id);

  await createAuditLog({
    userId: user.id,
    action: AUDIT_ACTION.UPDATE,
    entity: AUDIT_ENTITY.USER,
    entityId: user.id,
    description: `Email verified for ${user.email}`,
    ipAddress,
    userAgent,
  });

  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashToken(refreshToken);
  await authRepository.updateRefreshToken(user.id, refreshTokenHash);
  await persistRefreshSession(verified, refreshTokenHash);

return {
    user: await buildSessionUser(user),
    accessToken: generateAccessToken(user),
    refreshToken,
  };
}

export async function refreshTokens(refreshToken, _ipAddress, _userAgent) {
  const tokenHash = hashToken(refreshToken);

  const session = await consumeRefreshSession(tokenHash);
  let user = null;

  if (session && session.userId) {
    user = await authRepository.findById(session.userId);
    const sessionPasswordVersion = session.passwordChangedAt || null;
    if (user && String(user.password_changed_at || '') !== String(sessionPasswordVersion)) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
  } else {
    user = await authRepository.findByRefreshToken(tokenHash);
  }

  if (!user || !user.is_active) throw new UnauthorizedError('Invalid or expired refresh token');

  const newRefreshToken = generateRefreshToken();
  const newRefreshTokenHash = hashToken(newRefreshToken);
  await authRepository.updateRefreshToken(user.id, newRefreshTokenHash);
  await persistRefreshSession(user, newRefreshTokenHash);

  return {
    user: await buildSessionUser(user),
    accessToken: generateAccessToken(user),
    refreshToken: newRefreshToken,
  };
}

export async function setupTwoFactor(userId, actorId, ipAddress, userAgent) {
  const user = await authRepository.findById(userId);
  if (!user) throw new NotFoundError('User', userId);
  if (!isStaffRole(user.role)) throw new ForbiddenError('Two-factor authentication is only available for staff accounts');

  const secret = generateSecret();
  const backupCodes = generateBackupCodes(8);
  const backupCodeHashes = backupCodes.map((c) => hashBackupCode(c));

  const updated = await authRepository.enableTwoFactor(userId, secret, backupCodeHashes);

  await createAuditLog({
    userId: actorId || userId,
    action: AUDIT_ACTION.UPDATE,
    entity: AUDIT_ENTITY.USER,
    entityId: userId,
    description: `Enabled two-factor authentication for ${updated.email}`,
    ipAddress,
    userAgent,
  });

  return {
    secret,
    otpAuthUrl: `otpauth://totp/Urumuli:${encodeURIComponent(updated.email)}?secret=${secret}&issuer=Urumuli`,
    backupCodes,
    enabled: true,
  };
}

export async function verifyTwoFactorSetup(userId, code, actorId, ipAddress, userAgent) {
  const user = await authRepository.findByIdWithSecret(userId);
  if (!user) throw new NotFoundError('User', userId);

  if (!verifyTotp(user.two_factor_secret, code)) {
    throw new UnauthorizedError('Invalid two-factor authentication code');
  }

  await createAuditLog({
    userId: actorId || userId,
    action: AUDIT_ACTION.UPDATE,
    entity: AUDIT_ENTITY.USER,
    entityId: userId,
    description: `Verified two-factor setup for ${user.email}`,
    ipAddress,
    userAgent,
  });

  return { verified: true };
}

export async function verifyTwoFactorLogin(tempToken, code, ipAddress, userAgent) {
  let payload;
  try {
    payload = jwt.verify(tempToken, env.JWT.SECRET);
  } catch {
    throw new UnauthorizedError('Two-factor session has expired, please log in again');
  }
  if (payload.purpose !== 'two-factor-challenge') {
    throw new UnauthorizedError('Invalid two-factor challenge');
  }

  const user = await authRepository.findByIdWithSecret(payload.userId);
  if (!user || !user.is_active) throw new UnauthorizedError('Invalid or inactive account');

  const codeIsTotp = verifyTotp(user.two_factor_secret, code);

  if (!codeIsTotp) {
    const backupHashes = Array.isArray(user.two_factor_backup_codes) ? user.two_factor_backup_codes : [];
    const hashed = hashBackupCode(code);
    if (backupHashes.includes(hashed)) {
      await authRepository.consumeBackupCode(user.id, hashed);
    } else {
      throw new UnauthorizedError('Invalid two-factor authentication code');
    }
  }

  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashToken(refreshToken);
  await authRepository.updateRefreshToken(user.id, refreshTokenHash);
  await persistRefreshSession(user, refreshTokenHash);

  await createAuditLog({
    userId: user.id,
    action: AUDIT_ACTION.LOGIN,
    entity: AUDIT_ENTITY.USER,
    entityId: user.id,
    description: `User ${user.email} completed two-factor authentication`,
    ipAddress,
    userAgent,
  });

  return {
    user: await buildSessionUser(user),
    accessToken: generateAccessToken(user),
    refreshToken,
  };
}

export async function disableTwoFactor(userId, actorId, ipAddress, userAgent) {
  const user = await authRepository.findById(userId);
  if (!user) throw new NotFoundError('User', userId);

  const updated = await authRepository.disableTwoFactor(userId);

  await createAuditLog({
    userId: actorId || userId,
    action: AUDIT_ACTION.UPDATE,
    entity: AUDIT_ENTITY.USER,
    entityId: userId,
    description: `Disabled two-factor authentication for ${updated.email}`,
    ipAddress,
    userAgent,
  });

  return sanitizeUser(updated);
}


export async function forgotPassword(email) {
  const user = await authRepository.findByEmail(email.trim().toLowerCase());
  if (!user || !user.is_active) return {};

  const resetToken = crypto.randomBytes(32).toString('hex');
  await authRepository.setPasswordResetToken(
    user.id,
    hashToken(resetToken),
    new Date(Date.now() + 30 * 60 * 1000)
  );

  // A mail provider can consume this token in production. It is returned only
  // in development so the local application remains fully testable.
  return env.NODE_ENV === 'development' ? { resetToken } : {};
}

export async function resetPassword(token, password) {
  const user = await authRepository.findByPasswordResetToken(hashToken(token));
  if (!user) throw new UnauthorizedError('Reset link is invalid or has expired');
  const passwordHash = await bcrypt.hash(password, 10);
  await authRepository.resetPassword(user.id, passwordHash);
}

export async function logout(userId, refreshToken, ipAddress, userAgent) {
  await authRepository.updateRefreshToken(userId, null);
  if (refreshToken) {
    await cacheDelKey(refreshSessionKey(hashToken(refreshToken)));
  }

  await createAuditLog({
    userId,
    action: AUDIT_ACTION.LOGOUT,
    entity: AUDIT_ENTITY.USER,
    entityId: userId,
    description: 'User logged out',
    ipAddress,
    userAgent,
  });
}

export async function changePassword(userId, currentPassword, newPassword, ipAddress, userAgent) {
  const user = await authRepository.findById(userId);
  if (!user) throw new UnauthorizedError('User not found');

  const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isMatch) throw new UnauthorizedError('Current password is incorrect');

  const isSame = await bcrypt.compare(newPassword, user.password_hash);
  if (isSame) throw new ConflictError('New password must be different from current password');

  const newHash = await bcrypt.hash(newPassword, 10);
  await authRepository.updatePassword(userId, newHash);
  await authRepository.updateRefreshToken(userId, null);

  await createAuditLog({
    userId,
    action: AUDIT_ACTION.UPDATE,
    entity: AUDIT_ENTITY.USER,
    entityId: userId,
    description: 'User changed password',
    ipAddress,
    userAgent,
  });
}

export async function getProfile(userId) {
  const user = await authRepository.findById(userId);
  return buildSessionUser(user);
}

export async function getPatientProfile(userId) {
  const profile = await authRepository.getPatientProfile(userId);
  return profile;
}

export async function updatePatientProfile(userId, data) {
  if (data.email) {
    const existing = await authRepository.findByEmail(data.email.trim().toLowerCase());
    if (existing && existing.id !== userId) {
      throw new ConflictError('That email address is already in use');
    }
  }
  return authRepository.updatePatientProfile(userId, data);
}

function identifyProfileAvatar(file) {
  const buffer = file?.buffer;
  if (!buffer?.length) throw new ValidationError('Choose a profile photo to upload');

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { extension: '.jpg', mimeType: 'image/jpeg' };
  }
  if (buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return { extension: '.png', mimeType: 'image/png' };
  }
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return { extension: '.webp', mimeType: 'image/webp' };
  }
  if (['GIF87a', 'GIF89a'].includes(buffer.toString('ascii', 0, 6))) {
    return { extension: '.gif', mimeType: 'image/gif' };
  }

  throw new ValidationError('Unsupported profile photo. Upload a JPG, PNG, WebP, or GIF image');
}

export async function uploadPatientAvatar(userId, file) {
  const detected = identifyProfileAvatar(file);
  const directory = path.resolve(env.UPLOAD_DIR, 'profile-avatars');
  await fs.mkdir(directory, { recursive: true });

  const fileName = `${userId}-${crypto.randomUUID()}${detected.extension}`;
  const storageKey = `profile-avatars/${fileName}`;
  const absolutePath = path.resolve(env.UPLOAD_DIR, storageKey);
  await fs.writeFile(absolutePath, file.buffer, { flag: 'wx' });

  try {
    await authRepository.updatePatientAvatar(userId, `/uploads/${storageKey}`);
    return authRepository.getPatientProfile(userId);
  } catch (error) {
    await fs.unlink(absolutePath).catch(() => {});
    throw error;
  }
}

export async function getPatientSettings(userId) {
  let settings = await authRepository.getPatientSettings(userId);
  if (!settings) {
    settings = await authRepository.createPatientSettings(userId);
  }
  return mapPatientSettings(settings);
}

export async function updatePatientSettings(userId, data, ipAddress, userAgent) {
  const current = await getPatientSettings(userId);
  const merged = {
    prescriptionUpdates: data.prescriptionUpdates ?? current.prescriptionUpdates,
    messageAlerts: data.messageAlerts ?? current.messageAlerts,
    appointmentReminders: data.appointmentReminders ?? current.appointmentReminders,
    marketingEmails: data.marketingEmails ?? current.marketingEmails,
    shareReadReceipts: data.shareReadReceipts ?? current.shareReadReceipts,
    compactView: data.compactView ?? current.compactView,
  };

  const updated = await authRepository.upsertPatientSettings(userId, merged);

  await createAuditLog({
    userId,
    action: AUDIT_ACTION.UPDATE,
    entity: AUDIT_ENTITY.SETTINGS,
    entityId: userId,
    description: 'Updated patient settings',
    metadata: { changes: data },
    ipAddress,
    userAgent,
  });

  return mapPatientSettings(updated);
}

export async function listUsers(page, limit, role, isActive, search) {
  const result = await authRepository.listUsers({ page, limit, role, isActive, search });
  return {
    data: result.data.map((user) => mapUserSummary(user)),
    meta: result.meta,
  };
}

export async function getRoles() {
  const roles = await cacheRemember('auth:roles', 3600, () => authRepository.listRolesDetailed());
  return { roles, catalog: PERMISSION_CATALOG };
}

function validateRolePermissions(permissions) {
  if (!permissions || permissions.length === 0) return [];
  for (const permission of permissions) {
    if (permission === '*') {
      throw new ValidationError("The wildcard '*' permission is reserved for ADMIN / SUPER_ADMIN roles");
    }
    if (!isCatalogPermission(permission)) {
      throw new ValidationError(`Unknown permission: ${permission}`);
    }
  }
  return permissions;
}

export async function createRole({ name, description, permissions }, actorId, ipAddress, userAgent) {
  if (SYSTEM_ROLES.includes(name)) {
    throw new ConflictError(`'${name}' is a built-in role and cannot be recreated`);
  }
  const existing = await authRepository.findRole(name);
  if (existing) throw new ConflictError(`Role '${name}' already exists`);

  const safePermissions = validateRolePermissions(permissions);

  const role = await authRepository.createRole({ name, description, permissions: safePermissions });

  await createAuditLog({
    userId: actorId,
    action: AUDIT_ACTION.CREATE,
    entity: AUDIT_ENTITY.ROLE,
    entityId: name,
    description: `Created role ${name} (${safePermissions.length} permissions)`,
    metadata: { permissions: safePermissions },
    ipAddress,
    userAgent,
  });

  await cacheDelKey('auth:roles');
  return role;
}

export async function updateRole(name, { description, permissions }, actorId, ipAddress, userAgent) {
  const existing = await authRepository.findRole(name);
  if (!existing) throw new NotFoundError('Role', name);

  const changes = {};
  if (description !== undefined) {
    changes.description = description;
  }
  if (permissions !== undefined) {
    const safePermissions = existing.is_system && (name === 'ADMIN' || name === 'SUPER_ADMIN')
      ? permissions
      : validateRolePermissions(permissions);
    await authRepository.replaceRolePermissions(name, safePermissions);
    changes.permissions = safePermissions;
  }

  let role = existing;
  if (description !== undefined) {
    role = await authRepository.updateRoleInfo(name, description);
  }

  await createAuditLog({
    userId: actorId,
    action: AUDIT_ACTION.UPDATE,
    entity: AUDIT_ENTITY.ROLE,
    entityId: name,
    description: `Updated role ${name}`,
    metadata: changes,
    ipAddress,
    userAgent,
  });

  await cacheDelKey('auth:roles');
  return role;
}

export async function deleteRole(name, actorId, ipAddress, userAgent) {
  const existing = await authRepository.findRole(name);
  if (!existing) throw new NotFoundError('Role', name);
  if (existing.is_system) {
    throw new ForbiddenError(`'${name}' is a built-in role and cannot be deleted`);
  }

  const assignedUsers = await authRepository.countUsersByRole(name);
  if (assignedUsers > 0) {
    throw new ConflictError(
      `Role '${name}' is still assigned to ${assignedUsers} user${assignedUsers === 1 ? '' : 's'}. Reassign them first.`
    );
  }

  await authRepository.deleteRole(name);

  await createAuditLog({
    userId: actorId,
    action: AUDIT_ACTION.DELETE,
    entity: AUDIT_ENTITY.ROLE,
    entityId: name,
    description: `Deleted role ${name}`,
    ipAddress,
    userAgent,
  });

  await cacheDelKey('auth:roles');
  return { deleted: true };
}

export async function createUser(userData, ipAddress, userAgent) {
  const normalizedEmail = userData.email.trim().toLowerCase();
  const existing = await authRepository.findByEmail(normalizedEmail);
  if (existing) throw new ConflictError('Email already registered');

  await assertRoleExists(userData.role);

  const passwordHash = await bcrypt.hash(userData.password, 10);
  const fullName = getFullName(userData);
  const nameParts = fullName.trim().split(/\s+/);

  const user = await authRepository.create({
    email: normalizedEmail,
    passwordHash,
    firstName: nameParts[0] || '',
    lastName: nameParts.slice(1).join(' ') || nameParts[0] || '',
    phone: userData.phone,
    role: userData.role,
  });

  await createAuditLog({
    userId: user.id,
    action: AUDIT_ACTION.CREATE,
    entity: AUDIT_ENTITY.USER,
    entityId: user.id,
    description: `User ${user.email} created`,
    ipAddress,
    userAgent,
  });

  return sanitizeUser(user);
}

export async function updateUserRole(userId, role, actorId, ipAddress, userAgent) {
  const user = await authRepository.findById(userId);
  if (!user) throw new UnauthorizedError('User not found');
  if (user.role === ROLES.SUPER_ADMIN) {
    throw new ForbiddenError('Super admin accounts cannot be modified');
  }

  await assertRoleExists(role);

  const updated = await authRepository.updateRole(userId, role);

  await createAuditLog({
    userId: actorId,
    action: AUDIT_ACTION.UPDATE,
    entity: AUDIT_ENTITY.USER,
    entityId: userId,
    description: `Updated role for ${updated.email} to ${role}`,
    ipAddress,
    userAgent,
    metadata: { previousRole: user.role, role },
  });

  return sanitizeUser(updated);
}

export async function updateUserActiveStatus(userId, isActive, actorId, ipAddress, userAgent) {
  const user = await authRepository.findById(userId);
  if (!user) throw new UnauthorizedError('User not found');
  if (user.role === ROLES.SUPER_ADMIN) {
    throw new ForbiddenError('Super admin accounts cannot be modified');
  }

  const updated = await authRepository.updateActiveStatus(userId, isActive);

  await createAuditLog({
    userId: actorId,
    action: AUDIT_ACTION.UPDATE,
    entity: AUDIT_ENTITY.USER,
    entityId: userId,
    description: `${isActive ? 'Activated' : 'Deactivated'} user ${updated.email}`,
    ipAddress,
    userAgent,
    metadata: { isActive },
  });

  return sanitizeUser(updated);
}

export async function deleteUser(userId, actorId, ipAddress, userAgent) {
  const user = await authRepository.findById(userId);
  if (!user) throw new NotFoundError('User', userId);
  if (user.role === ROLES.SUPER_ADMIN) {
    throw new ForbiddenError('Super admin accounts cannot be deleted');
  }
  if (userId === actorId) {
    throw new ForbiddenError('You cannot delete your own account');
  }

  let deleted;
  try {
    deleted = await authRepository.deleteUser(userId);
  } catch (error) {
    if (error?.code === '23503') {
      throw new ConflictError(
        'This member has sales, prescriptions, stock movements, or other records. Deactivate their account instead of deleting it.'
      );
    }
    throw error;
  }
  if (!deleted) throw new NotFoundError('User', userId);

  await createAuditLog({
    userId: actorId,
    action: AUDIT_ACTION.DELETE,
    entity: AUDIT_ENTITY.USER,
    entityId: userId,
    description: `Deleted user ${deleted.email}`,
    ipAddress,
    userAgent,
  });

  return { id: deleted.id, email: deleted.email };
}

function serializeInvitation(invitation) {
  if (!invitation) return null;
  const safe = { ...invitation };
  delete safe.token_hash;
  return safe;
}

function buildInviteUrl(token) {
  return `${env.PUBLIC_URL || 'http://localhost:5173'}/accept-invite?token=${token}`;
}

async function dispatchInvitationEmail(invitation, inviteUrl) {
  const sendResult = await sendInvitationEmail({
    to: invitation.email,
    name: invitation.full_name,
    role: invitation.role,
    inviteUrl,
    expiresAt: invitation.expires_at,
  });

  const skipped = Boolean(sendResult?.skipped);
  const failed = Boolean(sendResult?.failed);
  const emailSent = !skipped && !failed;
  const error = failed ? sendResult.reason : skipped ? 'SMTP not configured' : null;

  const updated = await authRepository.recordInvitationEmail(invitation.id, { sent: emailSent, error });

  if (failed) {
    console.error(
      `[auth] Invitation email could not be delivered to ${invitation.email}: ${sendResult.reason}`
    );
  } else if (skipped) {
    console.log(`[auth] SMTP not configured. Invitation link for ${invitation.email}: ${inviteUrl}`);
  }

  return { invitation: updated || invitation, emailSent };
}

export async function createInvitation(inviteData, actorId, ipAddress, userAgent) {
  const { email, role, fullName } = inviteData;

  await assertRoleExists(role);

  const existingUser = await authRepository.findByEmail(email.trim().toLowerCase());
  if (existingUser) throw new ConflictError('A user with that email already exists');

  const pending = await authRepository.findPendingInvitationByEmail(email);
  if (pending) throw new ConflictError('An active invitation already exists for that email');

  await authRepository.expireStaleInvitations();

  const inviteToken = crypto.randomBytes(32).toString('hex');
  const invitation = await authRepository.createInvitation({
    email,
    role,
    fullName,
    tokenHash: hashToken(inviteToken),
    invitedBy: actorId,
    expiresAt: new Date(Date.now() + INVITATION_TTL_HOURS * 60 * 60 * 1000),
  });

  await createAuditLog({
    userId: actorId,
    action: AUDIT_ACTION.CREATE,
    entity: AUDIT_ENTITY.USER,
    entityId: invitation.id,
    description: `Invited ${email} as ${role}`,
    metadata: { email, role },
    ipAddress,
    userAgent,
  });

  const inviteUrl = buildInviteUrl(inviteToken);
  const delivery = await dispatchInvitationEmail(invitation, inviteUrl);

  const result = serializeInvitation(delivery.invitation);
  result.emailSent = delivery.emailSent;
  if (env.NODE_ENV === 'development' || !delivery.emailSent) {
    result.inviteUrl = inviteUrl;
  }
  return result;
}

export async function acceptInvitation(token, userData, ipAddress, userAgent) {
  await authRepository.expireStaleInvitations();

  const invitation = await authRepository.findInvitationByTokenHash(hashToken(token));
  if (!invitation) {
    throw new UnauthorizedError(
      'This invitation link is invalid or has been replaced by a newer invitation email. Check your most recent invitation email, or contact your administrator for a new link.'
    );
  }

  if (invitation.status !== INVITATION_STATUS.PENDING) {
    throw new ConflictError(
      `Invitation is no longer pending (current status: ${invitation.status.toLowerCase()})`
    );
  }
  if (new Date(invitation.expires_at) < new Date()) {
    await authRepository.markInvitationExpired(invitation.id);
    throw new ConflictError('Invitation has expired. Contact your administrator for a new one.');
  }

  const invitedRole = await authRepository.findRole(invitation.role);
  if (!invitedRole) {
    throw new ConflictError(
      `The role '${invitation.role}' no longer exists. Contact your administrator for a new invitation.`
    );
  }

  const existing = await authRepository.findByEmail(invitation.email);
  if (existing) throw new ConflictError('An account already exists for this email');

  const passwordHash = await bcrypt.hash(userData.password, 10);
  const nameParts = (userData.fullName || invitation.full_name || '').trim().split(/\s+/);

  const user = await authRepository.create({
    email: invitation.email,
    passwordHash,
    firstName: nameParts[0] || '',
    lastName: nameParts.slice(1).join(' ') || nameParts[0] || '',
    phone: userData.phone,
    role: invitation.role,
  });

  await authRepository.markInvitationAccepted(invitation.id, user.id);

  await createAuditLog({
    userId: user.id,
    action: AUDIT_ACTION.CREATE,
    entity: AUDIT_ENTITY.USER,
    entityId: user.id,
    description: `Staff ${user.email} accepted invitation and activated ${invitation.role} account`,
    ipAddress,
    userAgent,
  });

  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashToken(refreshToken);
  await authRepository.updateRefreshToken(user.id, refreshTokenHash);
  await persistRefreshSession(user, refreshTokenHash);

  return {
    user: sanitizeUser(user),
    accessToken: generateAccessToken(user),
    refreshToken,
  };
}

export async function listInvitations(page, limit, status) {
  await authRepository.expireStaleInvitations();
  const result = await authRepository.listInvitations({ page, limit, status });
  return {
    data: result.data.map((invitation) => serializeInvitation(invitation)),
    meta: result.meta,
  };
}

export async function revokeInvitation(invitationId, actorId, ipAddress, userAgent) {
  await authRepository.expireStaleInvitations();
  const updated = await authRepository.revokeInvitation(invitationId);
  if (!updated) throw new NotFoundError('Pending invitation not found');

  await createAuditLog({
    userId: actorId,
    action: AUDIT_ACTION.UPDATE,
    entity: AUDIT_ENTITY.USER,
    entityId: invitationId,
    description: `Revoked invitation for ${updated.email}`,
    metadata: { email: updated.email },
    ipAddress,
    userAgent,
  });

  return serializeInvitation(updated);
}

export async function resendInvitation(invitationId, actorId, ipAddress, userAgent) {
  await authRepository.expireStaleInvitations();

  const existing = await authRepository.findInvitationById(invitationId);
  if (!existing) throw new NotFoundError('Invitation not found');

  if (existing.status === 'ACCEPTED') {
    throw new ConflictError('This invitation has already been accepted');
  }

  const newToken = crypto.randomBytes(32).toString('hex');
  const newTokenHash = hashToken(newToken);
  const newExpiresAt = new Date(Date.now() + INVITATION_TTL_HOURS * 60 * 60 * 1000);

  const updated = await authRepository.resendInvitation(invitationId, newTokenHash, newExpiresAt);
  if (!updated) throw new NotFoundError('Invitation not found or cannot be resent');

  await createAuditLog({
    userId: actorId,
    action: AUDIT_ACTION.UPDATE,
    entity: AUDIT_ENTITY.USER,
    entityId: invitationId,
    description: `Resent invitation to ${updated.email}`,
    metadata: { email: updated.email, role: updated.role },
    ipAddress,
    userAgent,
  });

  const inviteUrl = buildInviteUrl(newToken);
  const delivery = await dispatchInvitationEmail(updated, inviteUrl);

  const result = serializeInvitation(delivery.invitation);
  result.emailSent = delivery.emailSent;
  if (env.NODE_ENV === 'development' || !delivery.emailSent) {
    result.inviteUrl = inviteUrl;
  }
  return result;
}

export async function deleteInvitation(invitationId, actorId, ipAddress, userAgent) {
  const existing = await authRepository.findInvitationById(invitationId);
  if (!existing) throw new NotFoundError('Invitation not found');

  if (existing.status === INVITATION_STATUS.PENDING) {
    throw new ConflictError('Revoke the invitation before deleting it');
  }

  const deleted = await authRepository.deleteInvitation(invitationId);
  if (!deleted) throw new NotFoundError('Invitation not found');

  await createAuditLog({
    userId: actorId,
    action: AUDIT_ACTION.DELETE,
    entity: AUDIT_ENTITY.USER,
    entityId: invitationId,
    description: `Deleted ${existing.status.toLowerCase()} invitation for ${existing.email}`,
    metadata: { email: existing.email, role: existing.role, status: existing.status },
    ipAddress,
    userAgent,
  });

  return { deleted: true, id: invitationId };
}

// ---------------------------------------------------------------------------
// Data protection
// ---------------------------------------------------------------------------

export async function exportPatientData(userId) {
  const user = await authRepository.findById(userId);
  if (!user) throw new NotFoundError('User not found');

  const data = await authRepository.collectPatientData(userId);
  return {
    generatedAt: new Date().toISOString(),
    requestedBy: user.id,
    data,
  };
}

export async function deletePatientAccount(userId, ipAddress, userAgent) {
  const user = await authRepository.findById(userId);
  if (!user) throw new NotFoundError('User not found');
  if (user.role !== ROLES.PATIENT) {
    throw new ForbiddenError('Account erasure is only available to patients');
  }

  const result = await authRepository.anonymizePatientAccount(userId);

  await createAuditLog({
    userId,
    action: AUDIT_ACTION.DELETE,
    entity: AUDIT_ENTITY.USER,
    entityId: userId,
    description: 'Patient account anonymized (right to erasure)',
    metadata: { anonymized: true },
    ipAddress,
    userAgent,
  });

  return { deleted: true, confirmation: 'Your account has been anonymized. Clinical records are retained anonymously for regulatory purposes.' };
}
