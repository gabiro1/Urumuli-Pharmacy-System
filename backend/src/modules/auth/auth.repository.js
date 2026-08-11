import { query, queryOne, transaction } from '../../config/database.js';

const userFields = `
  id, email, password_hash, first_name, last_name, phone,
  role, is_active, email_verified_at, last_login_at,
  password_changed_at, created_at, updated_at
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
