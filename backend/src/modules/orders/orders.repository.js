import { query, queryOne } from '../../config/database.js';

export const findIdentityByPhone = (phone) => queryOne('SELECT * FROM patient_identities WHERE verified_phone = $1', [phone]);
export const findIdentityById = (id) => queryOne('SELECT * FROM patient_identities WHERE id = $1', [id]);
export const findIdentityByUser = (id) => queryOne('SELECT * FROM patient_identities WHERE user_id = $1', [id]);
export const createIdentityForUser = (userId, phone, fullName, email) => queryOne(
  `INSERT INTO patient_identities (user_id, verified_phone, full_name, email, profile_completion_status)
   VALUES ($1,$2,$3,$4,'COMPLETE')
   ON CONFLICT (verified_phone) DO UPDATE SET
     user_id=EXCLUDED.user_id,
     full_name=COALESCE(EXCLUDED.full_name, patient_identities.full_name),
     email=COALESCE(EXCLUDED.email, patient_identities.email),
     profile_completion_status='COMPLETE',
     verified_at=NOW()
   RETURNING *`,
  [userId, phone, fullName || null, email || null]
);

export async function getMedicine(id, client = null) {
  const sql = `SELECT m.*, c.name category_name FROM medicines m LEFT JOIN categories c ON c.id=m.category_id WHERE m.id=$1 AND m.is_active=true`;
  if (client) return (await client.query(sql, [id])).rows[0] || null;
  return queryOne(sql, [id]);
}

export const findOrder = (id) => queryOne(
  `SELECT o.*, pi.full_name patient_name, pi.verified_phone patient_phone, pi.email patient_email,
    CONCAT(u.first_name,' ',u.last_name) pharmacist_name
   FROM orders o JOIN patient_identities pi ON pi.id=o.patient_identity_id
   LEFT JOIN users u ON u.id=o.assigned_pharmacist_id
   WHERE o.id::text=$1 OR o.public_reference=$1`, [id]
);
export const getOrderItems = (id) => query('SELECT * FROM order_items WHERE order_id=$1 ORDER BY created_at', [id]);
export const getInstructions = (id) => query(
  `SELECT mi.* FROM medication_instructions mi JOIN order_items oi ON oi.id=mi.order_item_id
   WHERE oi.order_id=$1 AND mi.status='VERIFIED' ORDER BY mi.created_at`, [id]
);
export const getHistory = (id) => query('SELECT * FROM order_status_history WHERE order_id=$1 ORDER BY created_at', [id]);
export const getPrescriptionFiles = (id) => query(`SELECT pf.id,pf.mime_type,pf.byte_size,pf.created_at FROM prescription_files pf JOIN prescriptions p ON p.id=pf.prescription_id WHERE p.order_id=$1 ORDER BY pf.created_at`,[id]);
export const listOwnedOrders = (identityId) => query(
  `SELECT o.*, COUNT(oi.id)::int item_count FROM orders o LEFT JOIN order_items oi ON oi.order_id=o.id
   WHERE o.patient_identity_id=$1 GROUP BY o.id ORDER BY o.created_at DESC`, [identityId]
);
export const listQueue = ({ status, search, limit = 50 }) => {
  const params=[]; const conditions=[];
  if(status){params.push(status);conditions.push(`o.status=$${params.length}`)}
  if(search){params.push(`%${search}%`);conditions.push(`(o.public_reference ILIKE $${params.length} OR pi.full_name ILIKE $${params.length} OR pi.verified_phone ILIKE $${params.length})`)}
  params.push(Math.min(Number(limit)||50,100));
  return query(`SELECT o.*,pi.full_name patient_name,pi.verified_phone patient_phone,COUNT(oi.id)::int item_count
    FROM orders o JOIN patient_identities pi ON pi.id=o.patient_identity_id LEFT JOIN order_items oi ON oi.order_id=o.id
    ${conditions.length?`WHERE ${conditions.join(' AND ')}`:''} GROUP BY o.id,pi.id
    ORDER BY CASE o.status
      WHEN 'SUBMITTED_FOR_REVIEW' THEN 0
      WHEN 'UNDER_PHARMACIST_REVIEW' THEN 1
      WHEN 'CLARIFICATION_REQUIRED' THEN 2
      ELSE 3 END,
      o.created_at DESC LIMIT $${params.length}`,params);
};
export const updateOrderStatus = (client, id, status, pharmacistId = null) => client.query(
  `UPDATE orders SET status=$1,assigned_pharmacist_id=COALESCE($2,assigned_pharmacist_id) WHERE id=$3 RETURNING *`, [status,pharmacistId,id]
).then(r=>r.rows[0]);
export const addHistory = (client, data) => client.query(
  `INSERT INTO order_status_history(order_id,previous_status,new_status,actor_id,actor_role,reason,internal_note,metadata)
   VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
  [data.orderId,data.previousStatus,data.newStatus,data.actorId||null,data.actorRole,data.reason||null,data.internalNote||null,data.metadata||{}]
).then(r=>r.rows[0]);
export const addPrescriptionFile = (data) => queryOne(
  `INSERT INTO prescription_files(prescription_id,storage_key,original_extension,mime_type,byte_size,sha256,uploaded_by)
   VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id,prescription_id,mime_type,byte_size,created_at`,
  [data.prescriptionId,data.storageKey,data.extension,data.mimeType,data.size,data.sha256,data.uploadedBy||null]
);
export const findPrescriptionFile = (id) => queryOne(
  `SELECT pf.*,p.order_id,p.patient_identity_id FROM prescription_files pf JOIN prescriptions p ON p.id=pf.prescription_id WHERE pf.id=$1`, [id]
);
