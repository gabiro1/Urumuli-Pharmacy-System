import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../../config/env.js';
import * as authRepository from './auth.repository.js';
import { createAuditLog } from '../../middlewares/auditLogger.js';
import { UnauthorizedError, ConflictError } from '../../utils/errors.js';
import { ROLES, AUDIT_ACTION, AUDIT_ENTITY } from '../../constants.js';
import { mapUser, mapUserSummary, mapRole, mapPatientSettings } from '../../utils/serializers.js';
import { cacheRemember, cacheGet, cacheSet, cacheDelKey } from '../../services/redis.service.js';

function refreshSessionKey(tokenHash) {
  return `auth:refresh:${tokenHash}`;
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

  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashToken(refreshToken);
  await authRepository.updateRefreshToken(user.id, refreshTokenHash);
  await persistRefreshSession(user, refreshTokenHash);

  await createAuditLog({
    userId: user.id,
    action: AUDIT_ACTION.LOGIN,
    entity: AUDIT_ENTITY.USER,
    entityId: user.id,
    description: `User ${user.email} logged in`,
    ipAddress,
    userAgent,
  });

  return {
    user: sanitizeUser(user),
    accessToken: generateAccessToken(user),
    refreshToken,
  };
}

export async function register(userData, ipAddress, userAgent) {
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
    role: userData.role || ROLES.PHARMACIST,
  });

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
    user: sanitizeUser(user),
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
    user: sanitizeUser(user),
    accessToken: generateAccessToken(user),
    refreshToken: newRefreshToken,
  };
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
  return sanitizeUser(user);
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

export async function listUsers(page, limit, role, isActive) {
  const result = await authRepository.listUsers({ page, limit, role, isActive });
  return {
    data: result.data.map((user) => mapUserSummary(user)),
    meta: result.meta,
  };
}

export async function getRoles() {
  return cacheRemember('auth:roles', 3600, async () => {
    const roles = await authRepository.listRoles();
    return roles.map((role) => mapRole(role));
  });
}

export async function createUser(userData, ipAddress, userAgent) {
  const normalizedEmail = userData.email.trim().toLowerCase();
  const existing = await authRepository.findByEmail(normalizedEmail);
  if (existing) throw new ConflictError('Email already registered');

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
