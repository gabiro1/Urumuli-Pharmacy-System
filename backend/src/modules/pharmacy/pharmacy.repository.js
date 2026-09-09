import { query, queryOne, transaction } from '../../config/database.js';

// ============================================================
// PHARMACY
// ============================================================

const pharmacyFields = `
  id, name, registration_number, contact_email, contact_phone,
  address, city, province, country, logo_url, description,
  status, status_reason, approved_at, approved_by, suspended_at,
  created_at, updated_at
`;

export async function createPharmacy({ name, registrationNumber, contactEmail, contactPhone, address, city, province, country, description }) {
  return queryOne(
    `INSERT INTO pharmacies (name, registration_number, contact_email, contact_phone, address, city, province, country, description)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING ${pharmacyFields}`,
    [name, registrationNumber || null, contactEmail || null, contactPhone || null, address || null, city || null, province || null, country || 'Rwanda', description || null]
  );
}

export async function findPharmacyById(id) {
  return queryOne(`SELECT ${pharmacyFields} FROM pharmacies WHERE id = $1`, [id]);
}

export async function listPharmacies({ page = 1, limit = 20, status } = {}) {
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
    `SELECT COUNT(*) as total FROM pharmacies ${where}`,
    params
  );

  const rows = await query(
    `SELECT ${pharmacyFields} FROM pharmacies ${where}
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

export async function updatePharmacyStatus(id, status, reason, approvedBy) {
  const updates = { status, status_reason: reason || null };
  if (status === 'ACTIVE') {
    updates.approved_at = new Date();
    updates.approved_by = approvedBy;
  } else if (status === 'SUSPENDED') {
    updates.suspended_at = new Date();
  }

  const entries = Object.entries(updates);
  const sets = entries.map(([key], i) => `${key} = $${i + 1}`);
  const values = entries.map(([, val]) => val);
  values.push(id);

  return queryOne(
    `UPDATE pharmacies SET ${sets.join(', ')}, updated_at = NOW()
     WHERE id = $${values.length}
     RETURNING ${pharmacyFields}`,
    values
  );
}

// ============================================================
// PHARMACY MEMBERSHIPS
// ============================================================

const membershipFields = `
  id, user_id, pharmacy_id, role, status,
  invited_by, joined_at, suspended_at, suspension_reason,
  created_at, updated_at
`;

export async function createMembership({ userId, pharmacyId, role, invitedBy }) {
  return queryOne(
    `INSERT INTO pharmacy_memberships (user_id, pharmacy_id, role, invited_by)
     VALUES ($1, $2, $3, $4)
     RETURNING ${membershipFields}`,
    [userId, pharmacyId, role, invitedBy || null]
  );
}

export async function findMembershipById(id) {
  return queryOne(`SELECT ${membershipFields} FROM pharmacy_memberships WHERE id = $1`, [id]);
}

export async function findMembershipByUserAndPharmacy(userId, pharmacyId) {
  return queryOne(
    `SELECT ${membershipFields} FROM pharmacy_memberships WHERE user_id = $1 AND pharmacy_id = $2`,
    [userId, pharmacyId]
  );
}

export async function listMembershipsByPharmacy(pharmacyId, { page = 1, limit = 50, status } = {}) {
  const conditions = [`pharmacy_id = $1`];
  const params = [pharmacyId];
  let idx = 2;

  if (status) {
    conditions.push(`status = $${idx++}`);
    params.push(status);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const offset = (page - 1) * limit;

  const countResult = await queryOne(
    `SELECT COUNT(*) as total FROM pharmacy_memberships ${where}`,
    params
  );

  const rows = await query(
    `SELECT pm.*, u.email, u.first_name, u.last_name, u.phone, u.role as global_role
     FROM pharmacy_memberships pm
     JOIN users u ON u.id = pm.user_id
     ${where}
     ORDER BY pm.created_at DESC
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

export async function listMembershipsByUser(userId) {
  return query(
    `SELECT pm.*, p.name as pharmacy_name, p.status as pharmacy_status
     FROM pharmacy_memberships pm
     JOIN pharmacies p ON p.id = pm.pharmacy_id
     WHERE pm.user_id = $1
     ORDER BY pm.created_at DESC`,
    [userId]
  );
}

export async function activateMembership(id) {
  return queryOne(
    `UPDATE pharmacy_memberships
     SET status = 'ACTIVE', joined_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND status = 'PENDING'
     RETURNING ${membershipFields}`,
    [id]
  );
}

export async function suspendMembership(id, reason) {
  return queryOne(
    `UPDATE pharmacy_memberships
     SET status = 'SUSPENDED', suspended_at = NOW(), suspension_reason = $2, updated_at = NOW()
     WHERE id = $1 AND status = 'ACTIVE'
     RETURNING ${membershipFields}`,
    [id, reason || null]
  );
}

export async function removeMembership(id) {
  return queryOne(
    `UPDATE pharmacy_memberships
     SET status = 'REMOVED', updated_at = NOW()
     WHERE id = $1 AND status IN ('ACTIVE', 'SUSPENDED')
     RETURNING ${membershipFields}`,
    [id]
  );
}

export async function countMembersByPharmacy(pharmacyId) {
  const result = await queryOne(
    `SELECT COUNT(*)::int AS total FROM pharmacy_memberships
     WHERE pharmacy_id = $1 AND status = 'ACTIVE'`,
    [pharmacyId]
  );
  return result?.total ?? 0;
}

// ============================================================
// PROFESSIONAL PROFILES
// ============================================================

const professionalFields = `
  id, user_id, professional_registration_number, license_number,
  license_expiry, license_issuing_authority, qualification,
  specialization, years_of_experience, verification_status,
  verification_notes, verified_at, verified_by, rejection_reason,
  supporting_documents, created_at, updated_at
`;

export async function createProfessionalProfile(userId, data) {
  return queryOne(
    `INSERT INTO professional_profiles (user_id, professional_registration_number, license_number, license_expiry, license_issuing_authority, qualification, specialization, years_of_experience)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING ${professionalFields}`,
    [
      userId,
      data.professionalRegistrationNumber || null,
      data.licenseNumber || null,
      data.licenseExpiry || null,
      data.licenseIssuingAuthority || 'National Pharmacy Council of Rwanda',
      data.qualification || null,
      data.specialization || null,
      data.yearsOfExperience || null,
    ]
  );
}

export async function findProfessionalProfileByUserId(userId) {
  return queryOne(
    `SELECT ${professionalFields} FROM professional_profiles WHERE user_id = $1`,
    [userId]
  );
}

export async function updateProfessionalProfile(userId, data) {
  const entries = Object.entries(data).filter(([, value]) => value !== undefined);
  if (entries.length === 0) return findProfessionalProfileByUserId(userId);

  const sets = entries.map(([key], i) => `${key} = $${i + 1}`);
  const values = entries.map(([, value]) => value);
  values.push(userId);

  return queryOne(
    `UPDATE professional_profiles
     SET ${sets.join(', ')}, updated_at = NOW()
     WHERE user_id = $${values.length}
     RETURNING ${professionalFields}`,
    values
  );
}

export async function updateVerificationStatus(userId, status, { verifiedBy, notes, rejectionReason } = {}) {
  const updates = {
    verification_status: status,
    verification_notes: notes || null,
  };

  if (status === 'VERIFIED') {
    updates.verified_at = new Date();
    updates.verified_by = verifiedBy;
    updates.rejection_reason = null;
  } else if (status === 'REJECTED') {
    updates.rejection_reason = rejectionReason || null;
    updates.verified_by = verifiedBy;
  }

  const entries = Object.entries(updates);
  const sets = entries.map(([key], i) => `${key} = $${i + 1}`);
  const values = entries.map(([, val]) => val);
  values.push(userId);

  return queryOne(
    `UPDATE professional_profiles
     SET ${sets.join(', ')}, updated_at = NOW()
     WHERE user_id = $${values.length}
     RETURNING ${professionalFields}`,
    values
  );
}

export async function listPendingVerifications({ page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;

  const countResult = await queryOne(
    `SELECT COUNT(*) as total FROM professional_profiles WHERE verification_status = 'PENDING'`
  );

  const rows = await query(
    `SELECT pp.*, u.email, u.first_name, u.last_name
     FROM professional_profiles pp
     JOIN users u ON u.id = pp.user_id
     WHERE pp.verification_status = 'PENDING'
     ORDER BY pp.created_at ASC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
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

// ============================================================
// ROLE PERMISSIONS
// ============================================================

export async function getPermissionsForRole(role) {
  const rows = await query(
    `SELECT permission FROM role_permissions WHERE role = $1`,
    [role]
  );
  return rows.map((r) => r.permission);
}

export async function getAllPermissions() {
  return query(`SELECT DISTINCT permission FROM role_permissions ORDER BY permission`);
}
