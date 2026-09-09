import { query, queryOne } from '../../config/database.js';

export async function listFeedback({ patientId, feedbackType, page = 1, limit = 20 } = {}) {
  const conditions = [];
  const params = [];
  let idx = 1;
  if (patientId) { conditions.push(`pf.patient_id = $${idx++}`); params.push(patientId); }
  if (feedbackType) { conditions.push(`pf.feedback_type = $${idx++}`); params.push(feedbackType); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;
  const countResult = await query(`SELECT COUNT(*) FROM patient_feedback pf ${where}`, params);
  const total = parseInt(countResult.rows[0].count, 10);
  const { rows } = await query(
    `SELECT pf.*, u.full_name AS patient_name FROM patient_feedback pf
     JOIN users u ON u.id = pf.patient_id ${where} ORDER BY pf.created_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, limit, offset]
  );
  return { data: rows, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
}

export async function createFeedback(data) {
  const [row] = await query(
    `INSERT INTO patient_feedback (patient_id, order_id, conversation_id, feedback_type, rating, comment)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [data.patientId, data.orderId || null, data.conversationId || null, data.feedbackType, data.rating, data.comment || null]
  );
  return row;
}

export async function getAverageRating({ feedbackType, startDate, endDate } = {}) {
  const conditions = [];
  const params = [];
  let idx = 1;
  if (feedbackType) { conditions.push(`pf.feedback_type = $${idx++}`); params.push(feedbackType); }
  if (startDate) { conditions.push(`pf.created_at >= $${idx++}`); params.push(startDate); }
  if (endDate) { conditions.push(`pf.created_at <= $${idx++}`); params.push(endDate); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await query(
    `SELECT ROUND(AVG(rating), 2) AS avg_rating, COUNT(*) AS total_reviews,
            COUNT(*) FILTER (WHERE rating = 5) AS five_star,
            COUNT(*) FILTER (WHERE rating = 4) AS four_star,
            COUNT(*) FILTER (WHERE rating = 3) AS three_star,
            COUNT(*) FILTER (WHERE rating = 2) AS two_star,
            COUNT(*) FILTER (WHERE rating = 1) AS one_star
     FROM patient_feedback pf ${where}`, params
  );
  return rows[0];
}
