import { query } from '../../config/database.js';

export async function getConsents(patientId) {
  const { rows } = await query(
    `SELECT * FROM patient_consents WHERE patient_id = $1 ORDER BY consent_type`,
    [patientId]
  );
  return rows;
}

export async function getConsent(patientId, consentType) {
  const { rows } = await query(
    `SELECT * FROM patient_consents WHERE patient_id = $1 AND consent_type = $2`,
    [patientId, consentType]
  );
  return rows[0] || null;
}

export async function upsertConsent({ patientId, consentType, granted, ipAddress, userAgent, version }) {
  const [row] = await query(
    `INSERT INTO patient_consents (patient_id, consent_type, granted, granted_at, ip_address, user_agent, version)
     VALUES ($1, $2, $3, CASE WHEN $3 THEN NOW() ELSE NULL END, $4, $5, $6)
     ON CONFLICT (patient_id, consent_type)
     DO UPDATE SET granted = EXCLUDED.granted,
                   granted_at = CASE WHEN EXCLUDED.granted THEN NOW() ELSE NULL END,
                   revoked_at = CASE WHEN NOT EXCLUDED.granted THEN NOW() ELSE NULL END,
                   ip_address = EXCLUDED.ip_address,
                   user_agent = EXCLUDED.user_agent,
                   version = EXCLUDED.version,
                   updated_at = NOW()
     RETURNING *`,
    [patientId, consentType, granted, ipAddress || null, userAgent || null, version || '1.0']
  );
  return row;
}

export async function hasConsent(patientId, consentType) {
  const { rows } = await query(
    `SELECT granted FROM patient_consents WHERE patient_id = $1 AND consent_type = $2 AND granted = TRUE`,
    [patientId, consentType]
  );
  return rows.length > 0;
}
