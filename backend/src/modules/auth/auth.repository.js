import { query, queryOne, transaction } from '../../config/database.js';

const userFields = `
  id, email, password_hash, first_name, last_name, phone,
  role, is_active, email_verified_at, last_login_at,
  password_changed_at, two_factor_enabled, two_factor_secret, two_factor_backup_codes,
  created_at, updated_at
`;

const patientSettingsFields = `
  user_id, prescription_updates, message_alerts, appointment_reminders,
  marketing_emails, share_read_receipts, compact_view, created_at, updated_at
`;

export async function findByEmail(email) {
  return queryOne(`SELECT ${userFields} FROM users WHERE LOWER(email) = LOWER($1)`, [email]);
}

export async function findById(id) {
  return queryOne(`SELECT ${userFields} FROM users WHERE id = $1`, [id]);
}

export async function create(userData) {
  const { email, passwordHash, firstName, lastName, phone, role } = userData;
  return queryOne(
    `INSERT INTO users (email, password_hash, first_name, last_name, phone, role)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING ${userFields}`,
    [email.trim().toLowerCase(), passwordHash, firstName, lastName, phone || null, role || 'PHARMACIST']
  );
}

export async function createPatientProfile(userId, profileData) {
  const { dateOfBirth, gender, address } = profileData;
  return queryOne(
    `INSERT INTO patient_profiles (user_id, date_of_birth, gender, address)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [userId, dateOfBirth || null, gender || null, address || null]
  );
}

export async function createIdentityForUser(userId, phone, fullName, email) {
  return queryOne(
    `INSERT INTO patient_identities (user_id, verified_phone, full_name, email, profile_completion_status)
     VALUES ($1, $2, $3, $4, 'COMPLETE')
     ON CONFLICT (verified_phone) DO UPDATE SET
       user_id = EXCLUDED.user_id,
       full_name = COALESCE(EXCLUDED.full_name, patient_identities.full_name),
       email = COALESCE(EXCLUDED.email, patient_identities.email),
       profile_completion_status = 'COMPLETE',
       verified_at = NOW()
     RETURNING *`,
    [userId, phone, fullName || null, email || null]
  );
}

export async function getPatientProfile(userId) {
  return queryOne(
    `SELECT pp.*, u.email, u.first_name, u.last_name, u.phone, u.created_at
     FROM patient_profiles pp
     JOIN users u ON u.id = pp.user_id
     WHERE pp.user_id = $1`,
    [userId]
  );
}

export async function updatePatientProfile(userId, data) {
  const userColumns = { firstName: 'first_name', lastName: 'last_name', email: 'email', phone: 'phone' };
  const profileColumns = {
    dateOfBirth: 'date_of_birth', gender: 'gender', address: 'address',
    emergencyContactName: 'emergency_contact_name', emergencyContactPhone: 'emergency_contact_phone',
    bloodGroup: 'blood_group', allergiesNotes: 'allergies_notes', chronicConditions: 'chronic_conditions',
  };

  return transaction(async (client) => {
    const updateTable = async (table, idColumn, mapping) => {
      const entries = Object.entries(mapping).filter(([key]) => data[key] !== undefined);
      if (!entries.length) return;
      const assignments = entries.map(([, column], index) => `${column} = $${index + 1}`);
      const values = entries.map(([key]) => key === 'email' ? data[key].toLowerCase() : data[key]);
      values.push(userId);
      await client.query(`UPDATE ${table} SET ${assignments.join(', ')} WHERE ${idColumn} = $${values.length}`, values);
    };

    await updateTable('users', 'id', userColumns);
    await updateTable('patient_profiles', 'user_id', profileColumns);
    const result = await client.query(
      `SELECT pp.*, u.email, u.first_name, u.last_name, u.phone, u.created_at
       FROM patient_profiles pp JOIN users u ON u.id = pp.user_id WHERE pp.user_id = $1`,
      [userId]
    );
    return result.rows[0] || null;
  });
}

export async function getPatientSettings(userId) {
  return queryOne(
    `SELECT ${patientSettingsFields} FROM patient_settings WHERE user_id = $1`,
    [userId]
  );
}

export async function createPatientSettings(userId) {
  const inserted = await queryOne(
    `INSERT INTO patient_settings (user_id)
     VALUES ($1)
     ON CONFLICT (user_id) DO NOTHING
     RETURNING ${patientSettingsFields}`,
    [userId]
  );

  if (inserted) return inserted;
  return getPatientSettings(userId);
}

export async function upsertPatientSettings(userId, settings) {
  const {
    prescriptionUpdates,
    messageAlerts,
    appointmentReminders,
    marketingEmails,
    shareReadReceipts,
    compactView,
  } = settings;

  return queryOne(
    `INSERT INTO patient_settings (
        user_id,
        prescription_updates,
        message_alerts,
        appointment_reminders,
        marketing_emails,
        share_read_receipts,
        compact_view
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (user_id) DO UPDATE SET
        prescription_updates = EXCLUDED.prescription_updates,
        message_alerts = EXCLUDED.message_alerts,
        appointment_reminders = EXCLUDED.appointment_reminders,
        marketing_emails = EXCLUDED.marketing_emails,
        share_read_receipts = EXCLUDED.share_read_receipts,
        compact_view = EXCLUDED.compact_view,
        updated_at = NOW()
     RETURNING ${patientSettingsFields}`,
    [
      userId,
      prescriptionUpdates,
      messageAlerts,
      appointmentReminders,
      marketingEmails,
      shareReadReceipts,
      compactView,
    ]
  );
}

export async function updateLastLogin(id) {
  return queryOne(
    `UPDATE users SET last_login_at = NOW() WHERE id = $1 RETURNING ${userFields}`,
    [id]
  );
}

export async function enableTwoFactor(id, secret, backupCodeHashes) {
  return queryOne(
    `UPDATE users
     SET two_factor_enabled = true, two_factor_secret = $1, two_factor_backup_codes = $2
     WHERE id = $3
     RETURNING ${userFields}`,
    [secret, backupCodeHashes || [], id]
  );
}

export async function disableTwoFactor(id) {
  return queryOne(
    `UPDATE users
     SET two_factor_enabled = false, two_factor_secret = NULL, two_factor_backup_codes = '{}'
     WHERE id = $1
     RETURNING ${userFields}`,
    [id]
  );
}

export async function consumeBackupCode(id, codeHash) {
  return queryOne(
    `UPDATE users
     SET two_factor_backup_codes = array_remove(two_factor_backup_codes, $1)
     WHERE id = $2 AND $1 = ANY(two_factor_backup_codes)
     RETURNING ${userFields}`,
    [codeHash, id]
  );
}

export async function findByIdWithSecret(id) {
  return queryOne(
    `SELECT ${userFields} FROM users WHERE id = $1`,
    [id]
  );
}

export async function updatePassword(id, passwordHash) {
  return query(
    `UPDATE users SET password_hash = $1, password_changed_at = NOW() WHERE id = $2`,
    [passwordHash, id]
  );
}

export async function updateRefreshToken(id, tokenHash) {
  return query(
    `UPDATE users SET refresh_token_hash = $1 WHERE id = $2`,
    [tokenHash, id]
  );
}

export async function findByRefreshToken(tokenHash) {
  return queryOne(
    `SELECT id, email, password_hash, first_name, last_name, phone,
            role, is_active, refresh_token_hash
     FROM users WHERE refresh_token_hash = $1 AND is_active = true`,
    [tokenHash]
  );
}

export async function setPasswordResetToken(id, tokenHash, expiresAt) {
  return query(
    `UPDATE users SET password_reset_token_hash = $1, password_reset_expires_at = $2 WHERE id = $3`,
    [tokenHash, expiresAt, id]
  );
}

export async function findByPasswordResetToken(tokenHash) {
  return queryOne(
    `SELECT ${userFields} FROM users
     WHERE password_reset_token_hash = $1
       AND password_reset_expires_at > NOW()
       AND is_active = true`,
    [tokenHash]
  );
}

export async function resetPassword(id, passwordHash) {
  return query(
    `UPDATE users
     SET password_hash = $1, password_changed_at = NOW(), refresh_token_hash = NULL,
         password_reset_token_hash = NULL, password_reset_expires_at = NULL
     WHERE id = $2`,
    [passwordHash, id]
  );
}

export async function listUsers({ page = 1, limit = 20, role, isActive }) {
  const conditions = [];
  const params = [];
  let idx = 1;

  if (role) {
    conditions.push(`role = $${idx++}`);
    params.push(role);
  }
  if (isActive !== undefined) {
    conditions.push(`is_active = $${idx++}`);
    params.push(isActive);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const countResult = await queryOne(
    `SELECT COUNT(*) as total FROM users ${where}`,
    params
  );

  const rows = await query(
    `SELECT id, email, first_name, last_name, phone, role, is_active,
            email_verified_at, last_login_at, created_at, updated_at
     FROM users ${where}
     ORDER BY created_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, limit, offset]
  );

  return {
    data: rows,
    meta: {
      page,
      limit,
      total: parseInt(countResult.total, 10),
      totalPages: Math.ceil(parseInt(countResult.total, 10) / limit),
    },
  };
}

export async function listRoles() {
  return query(`SELECT name, description FROM roles ORDER BY name`);
}

export async function updateRole(id, role) {
  return queryOne(
    `UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING ${userFields}`,
    [role, id]
  );
}

export async function updateActiveStatus(id, isActive) {
  return queryOne(
    `UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING ${userFields}`,
    [isActive, id]
  );
}

const invitationFields = `
  id, email, role, full_name, token_hash, invited_by,
  status, expires_at, accepted_at, revoked_at, accepted_user_id,
  created_at, updated_at
`;

export async function createInvitation({ email, role, fullName, tokenHash, invitedBy, expiresAt }) {
  return queryOne(
    `INSERT INTO staff_invitations (email, role, full_name, token_hash, invited_by, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING ${invitationFields}`,
    [email.trim().toLowerCase(), role, fullName || null, tokenHash, invitedBy, expiresAt]
  );
}

export async function findInvitationByTokenHash(tokenHash) {
  return queryOne(
    `SELECT ${invitationFields} FROM staff_invitations WHERE token_hash = $1`,
    [tokenHash]
  );
}

export async function findPendingInvitationByEmail(email) {
  return queryOne(
    `SELECT ${invitationFields} FROM staff_invitations
     WHERE LOWER(email) = LOWER($1) AND status = 'PENDING'`,
    [email]
  );
}

export async function listInvitations({ page = 1, limit = 20, status } = {}) {
  const conditions = [];
  const params = [];
  let idx = 1;

  if (status) {
    conditions.push(`status = $${idx++}`);
    params.push(status);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const countResult = await queryOne(
    `SELECT COUNT(*) as total FROM staff_invitations ${where}`,
    params
  );

  const rows = await query(
    `SELECT ${invitationFields} FROM staff_invitations ${where}
     ORDER BY created_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, limit, offset]
  );

  return {
    data: rows,
    meta: {
      page,
      limit,
      total: parseInt(countResult.total, 10),
      totalPages: Math.ceil(parseInt(countResult.total, 10) / limit),
    },
  };
}

export async function markInvitationAccepted(id, userId) {
  return queryOne(
    `UPDATE staff_invitations
     SET status = 'ACCEPTED', accepted_at = NOW(), accepted_user_id = $2, updated_at = NOW()
     WHERE id = $1 AND status = 'PENDING'
     RETURNING ${invitationFields}`,
    [id, userId]
  );
}

export async function markInvitationExpired(id) {
  return queryOne(
    `UPDATE staff_invitations
     SET status = 'EXPIRED', updated_at = NOW()
     WHERE id = $1 AND status = 'PENDING'
     RETURNING ${invitationFields}`,
    [id]
  );
}

export async function revokeInvitation(id) {
  return queryOne(
    `UPDATE staff_invitations
     SET status = 'REVOKED', revoked_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND status = 'PENDING'
     RETURNING ${invitationFields}`,
    [id]
  );
}

export async function findInvitationById(id) {
  return queryOne(
    `SELECT ${invitationFields} FROM staff_invitations WHERE id = $1`,
    [id]
  );
}

export async function resendInvitation(id, newTokenHash, newExpiresAt) {
  return queryOne(
    `UPDATE staff_invitations
     SET token_hash = $2, expires_at = $3, status = 'PENDING',
         updated_at = NOW(), revoked_at = NULL
     WHERE id = $1 AND status IN ('PENDING', 'EXPIRED', 'REVOKED')
     RETURNING ${invitationFields}`,
    [id, newTokenHash, newExpiresAt]
  );
}

export async function expireStaleInvitations() {
  return query(
    `UPDATE staff_invitations
     SET status = 'EXPIRED', updated_at = NOW()
     WHERE status = 'PENDING' AND expires_at < NOW()`
  );
}

export async function findByProvider(provider, providerId) {
  return queryOne(
    `SELECT ${userFields} FROM users WHERE auth_provider = $1 AND auth_provider_id = $2`,
    [provider, providerId]
  );
}

export async function linkGoogleAuth(userId, googleId) {
  return queryOne(
    `UPDATE users SET auth_provider = 'google', auth_provider_id = $1, updated_at = NOW()
     WHERE id = $2 RETURNING ${userFields}`,
    [googleId, userId]
  );
}

export async function setEmailVerificationToken(userId, tokenHash, expiresAt) {
  return query(
    `UPDATE users
     SET email_verification_token_hash = $1, email_verification_expires_at = $2, updated_at = NOW()
     WHERE id = $3`,
    [tokenHash, expiresAt, userId]
  );
}

export async function findByEmailVerificationToken(tokenHash) {
  return queryOne(
    `SELECT ${userFields} FROM users
     WHERE email_verification_token_hash = $1
       AND email_verification_expires_at > NOW()
       AND is_active = true`,
    [tokenHash]
  );
}

export async function markEmailVerified(userId) {
  return queryOne(
    `UPDATE users
     SET email_verified_at = NOW(),
         email_verification_token_hash = NULL,
         email_verification_expires_at = NULL,
         updated_at = NOW()
     WHERE id = $1
     RETURNING ${userFields}`,
    [userId]
  );
}
