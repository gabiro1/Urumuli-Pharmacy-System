import { query, queryOne, transaction } from '../../config/database.js';

const userFields = `
  id, email, password_hash, first_name, last_name, phone,
  avatar,
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
    `SELECT pp.*, u.email, u.first_name, u.last_name, u.phone, u.avatar, u.created_at
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
      `SELECT pp.*, u.email, u.first_name, u.last_name, u.phone, u.avatar, u.created_at
       FROM patient_profiles pp JOIN users u ON u.id = pp.user_id WHERE pp.user_id = $1`,
      [userId]
    );
    return result.rows[0] || null;
  });
}

export async function updatePatientAvatar(userId, avatar) {
  return queryOne(
    `UPDATE users
     SET avatar = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING id`,
    [avatar, userId]
  );
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

// ---------------------------------------------------------------------------
// Data protection: portable export and right-to-erasure (anonymization).
// Patient clinical rows are intentionally kept for pharmacy/regulatory record
// keeping, but every personally identifying field is stripped or replaced.
// ---------------------------------------------------------------------------

const exportQueries = (userId) => ({
  identity: `SELECT id, full_name, verified_phone, email, verification_status, profile_completion_status, notification_preferences, verified_at, created_at FROM patient_identities WHERE user_id=$1`,
  profile: `SELECT date_of_birth, gender, address, city, emergency_contact_name, emergency_contact_phone, blood_group, weight_kg, height_cm, allergies_notes, chronic_conditions, insurance_provider, insurance_number, preferred_pharmacy_notes, created_at FROM patient_profiles WHERE user_id=$1`,
  settings: `SELECT prescription_updates, message_alerts, appointment_reminders, marketing_emails, share_read_receipts, compact_view FROM patient_settings WHERE user_id=$1`,
  cart: `SELECT id, medicine_id, quantity, usage_notes, created_at FROM carts WHERE user_id=$1 ORDER BY created_at`,
  consents: `SELECT consent_type, granted, granted_at FROM patient_consents WHERE patient_id=$1 ORDER BY consent_type`,
  orders: `SELECT o.id, o.public_reference, o.status, o.order_type, o.subtotal, o.delivery_fee, o.discount_amount, o.total, o.currency, o.fulfilment_method, o.delivery_address, o.payment_method, o.payment_status, o.created_at,
             COALESCE(jsonb_agg(jsonb_build_object('medicine', oi.medicine_snapshot->'name', 'requested_quantity', oi.requested_quantity, 'unit_price', oi.unit_price, 'total', oi.total) ORDER BY oi.created_at) FILTER (WHERE oi.id IS NOT NULL), '[]') AS items
          FROM orders o JOIN patient_identities pi ON pi.id=o.patient_identity_id
          LEFT JOIN order_items oi ON oi.order_id=o.id
          WHERE pi.user_id=$1 GROUP BY o.id ORDER BY o.created_at DESC`,
  prescriptions: `SELECT p.id, p.status, p.patient_name, p.doctor_name, p.validity_status, p.created_at,
                     COALESCE(jsonb_agg(jsonb_build_object('mime_type', pf.mime_type, 'byte_size', pf.byte_size, 'created_at', pf.created_at) ORDER BY pf.created_at) FILTER (WHERE pf.id IS NOT NULL), '[]') AS files
                  FROM prescriptions p LEFT JOIN prescription_files pf ON pf.prescription_id=p.id
                  WHERE p.patient_id=$1 GROUP BY p.id ORDER BY p.created_at DESC`,
  paymentAttempts: `SELECT pa.provider, pa.provider_reference, pa.amount, pa.currency, pa.status, pa.created_at FROM orders o JOIN patient_identities pi ON pi.id=o.patient_identity_id JOIN payment_attempts pa ON pa.order_id=o.id WHERE pi.user_id=$1 ORDER BY pa.created_at DESC`,
  medicationHistory: `SELECT pmh.medicine_name, pmh.dosage, pmh.frequency, pmh.duration, pmh.start_date, pmh.end_date, pmh.status, pmh.notes FROM patient_medication_history pmh WHERE pmh.patient_id=$1 ORDER BY pmh.created_at DESC`,
  adherence: `SELECT pa.medicine_name, pa.scheduled_date, pa.scheduled_time, pa.taken, pa.taken_at, pa.notes FROM patient_adherence pa WHERE pa.patient_id=$1 ORDER BY pa.scheduled_date DESC`,
  refills: `SELECT rr.medicine_name, rr.next_refill_date, rr.status, rr.created_at FROM refill_reminders rr WHERE rr.patient_id=$1 ORDER BY rr.created_at DESC`,
  conversations: `SELECT c.id, c.status, c.context_type, c.subject, c.created_at, c.closed_at,
                     COALESCE(jsonb_agg(jsonb_build_object('body', cm.body, 'created_at', cm.created_at) ORDER BY cm.created_at) FILTER (WHERE cm.id IS NOT NULL), '[]') AS messages
                  FROM conversations c LEFT JOIN conversation_messages cm ON cm.conversation_id=c.id
                  WHERE c.patient_id=$1 GROUP BY c.id ORDER BY c.created_at DESC`,
  telehealth: `SELECT ts.status, ts.room_id, ts.scheduled_at, ts.notes, ts.created_at FROM telehealth_sessions ts WHERE ts.patient_id=$1 ORDER BY ts.created_at DESC`,
  availability: `SELECT r.medicine_name, r.verification_status, r.searched_term, r.physical_stock_confirmed, r.verified_at, r.created_at FROM medicine_availability_requests r WHERE r.patient_id=$1 ORDER BY r.created_at DESC`,
  feedback: `SELECT pf.feedback_type, pf.rating, pf.comment, pf.created_at FROM patient_feedback pf WHERE pf.patient_id=$1 ORDER BY pf.created_at DESC`,
  insurance: `SELECT ic.status, ic.claim_number, ic.policy_number, ic.total_amount, ic.covered_amount, ic.patient_responsibility, ic.submitted_at FROM insurance_claims ic WHERE ic.patient_id=$1 ORDER BY ic.submitted_at DESC NULLS LAST`,
});

export async function collectPatientData(userId) {
  const result = {};
  for (const [key, sql] of Object.entries(exportQueries(userId))) {
    if (key === 'orders' || key === 'prescriptions' || key === 'conversations') {
      result[key] = (await query(sql, [userId])).rows;
    } else {
      const { rows } = await query(sql, [userId]);
      result[key] = rows;
    }
  }
  return result;
}

export async function anonymizePatientAccount(userId) {
  return transaction(async (client) => {
    const user = (
      await client.query('SELECT id FROM users WHERE id=$1', [userId])
    ).rows[0];
    if (!user) return null;

    const anonEmail = `deleted-${user.id}@anonymous.urumuli.rw`;
    const anonPhone = `+699${user.id.replace(/-/g, '').slice(0, 9)}`;

    await client.query(
      `UPDATE users
       SET email=$2, first_name='Deleted', last_name='User', phone=NULL, avatar=NULL,
           is_active=false, email_verified_at=NULL, refresh_token_hash=NULL,
           password_reset_token_hash=NULL, password_reset_expires_at=NULL,
           email_verification_token_hash=NULL, email_verification_expires_at=NULL,
           auth_provider_id=NULL, two_factor_secret=NULL, two_factor_backup_codes=NULL
       WHERE id=$1`,
      [userId, anonEmail]
    );
    await client.query(
      `UPDATE patient_identities
       SET full_name='Deleted User', email=NULL, verified_phone=$2, verification_status='ANONYMIZED',
           profile_completion_status='ANONYMIZED', notification_preferences='{}'::jsonb
       WHERE user_id=$1`,
      [userId, anonPhone]
    );
    await client.query(
      `UPDATE patient_profiles
       SET date_of_birth=NULL, address=NULL, city=NULL, emergency_contact_name=NULL, emergency_contact_phone=NULL,
           blood_group=NULL, weight_kg=NULL, height_cm=NULL, allergies_notes=NULL, chronic_conditions=NULL,
           insurance_provider=NULL, insurance_number=NULL, preferred_pharmacy_notes=NULL
       WHERE user_id=$1`,
      [userId]
    );
    await client.query(`DELETE FROM carts WHERE user_id=$1`, [userId]);
    await client.query(`DELETE FROM notifications WHERE user_id=$1`, [userId]);
    await client.query(
      `DELETE FROM conversation_messages WHERE conversation_id IN (SELECT id FROM conversations WHERE patient_id=$1)`,
      [userId]
    );
    await client.query(`DELETE FROM conversations WHERE patient_id=$1`, [userId]);
    await client.query(
      `UPDATE prescriptions SET patient_name='Deleted User', patient_phone=NULL, doctor_name='Deleted', unverified_ocr_data=NULL WHERE patient_id=$1`,
      [userId]
    );
    await client.query(
      `UPDATE patient_settings SET prescription_updates=COALESCE(prescription_updates,'{}'), message_alerts=COALESCE(message_alerts,'{}'), marketing_emails=false WHERE user_id=$1`,
      [userId]
    );
    return { id: user.id };
  });
}
