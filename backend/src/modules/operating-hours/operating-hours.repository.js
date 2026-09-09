import { query } from '../../config/database.js';

export async function getPharmacyHours(pharmacyId) {
  const { rows } = await query(
    `SELECT * FROM pharmacy_operating_hours WHERE pharmacy_id = $1 ORDER BY day_of_week`,
    [pharmacyId]
  );
  return rows;
}

export async function upsertHours(pharmacyId, hours) {
  const values = [];
  const params = [];
  let idx = 1;

  for (const h of hours) {
    values.push(`($${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++})`);
    params.push(pharmacyId, h.dayOfWeek, h.openTime, h.closeTime, h.isClosed || false);
  }

  await query(
    `INSERT INTO pharmacy_operating_hours (pharmacy_id, day_of_week, open_time, close_time, is_closed)
     VALUES ${values.join(', ')}
     ON CONFLICT (pharmacy_id, day_of_week)
     DO UPDATE SET open_time = EXCLUDED.open_time, close_time = EXCLUDED.close_time,
                   is_closed = EXCLUDED.is_closed, updated_at = NOW()`,
    params
  );

  return getPharmacyHours(pharmacyId);
}

export async function isPharmacyOpen(pharmacyId) {
  const { rows } = await query(
    `SELECT * FROM pharmacy_operating_hours
     WHERE pharmacy_id = $1 AND day_of_week = EXTRACT(DOW FROM NOW())::INT
     AND NOT is_closed AND open_time <= NOW()::TIME AND close_time > NOW()::TIME`,
    [pharmacyId]
  );
  return rows.length > 0;
}

export async function getStaffAvailability(pharmacyId) {
  const { rows } = await query(
    `SELECT psa.*, u.full_name, u.email
     FROM pharmacy_staff_availability psa
     JOIN users u ON u.id = psa.user_id
     WHERE psa.pharmacy_id = $1`,
    [pharmacyId]
  );
  return rows;
}

export async function updateStaffAvailability(userId, pharmacyId, status) {
  const [row] = await query(
    `INSERT INTO pharmacy_staff_availability (user_id, pharmacy_id, status, last_active_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (user_id, pharmacy_id)
     DO UPDATE SET status = EXCLUDED.status, last_active_at = NOW(), updated_at = NOW()
     RETURNING *`,
    [userId, pharmacyId, status]
  );
  return row;
}
