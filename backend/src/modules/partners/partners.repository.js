import { query, queryOne } from '../../config/database.js';

export const listActivePartners = async () => {
  return query(
    `SELECT id, name, logo_url, website_url, partner_type, description, display_order
     FROM partners
     WHERE is_active = true
     ORDER BY display_order ASC, name ASC`
  );
};

export const listAllPartners = async ({ search, partnerType, isActive, limit, offset }) => {
  const conditions = [];
  const params = [];
  let paramIndex = 1;

  if (search) {
    conditions.push(`p.name ILIKE $${paramIndex++}`);
    params.push(`%${search}%`);
  }
  if (partnerType) {
    conditions.push(`p.partner_type = $${paramIndex++}`);
    params.push(partnerType);
  }
  if (isActive !== null && isActive !== undefined) {
    conditions.push(`p.is_active = $${paramIndex++}`);
    params.push(isActive);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await queryOne(
    `SELECT COUNT(*)::int AS total FROM partners p ${whereClause}`,
    params
  );

  const rows = await query(
    `SELECT p.* FROM partners p
     ${whereClause}
     ORDER BY p.display_order ASC, p.name ASC
     LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
    [...params, limit, offset]
  );

  return { rows, total: countResult?.total ?? 0 };
};

export const findPartnerById = async (id) => {
  return queryOne('SELECT * FROM partners WHERE id = $1', [id]);
};

export const createPartner = async ({ name, logo_url, website_url, partner_type, description, display_order }) => {
  return queryOne(
    `INSERT INTO partners (name, logo_url, website_url, partner_type, description, display_order)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [name, logo_url, website_url, partner_type, description, display_order]
  );
};

export const updatePartner = async (id, { name, logo_url, website_url, partner_type, description, display_order, is_active }) => {
  return queryOne(
    `UPDATE partners
     SET name = $1, logo_url = $2, website_url = $3, partner_type = $4,
         description = $5, display_order = $6, is_active = $7, updated_at = NOW()
     WHERE id = $8
     RETURNING *`,
    [name, logo_url, website_url, partner_type, description, display_order, is_active, id]
  );
};

export const deletePartner = async (id) => {
  return queryOne(
    'DELETE FROM partners WHERE id = $1 RETURNING *',
    [id]
  );
};
