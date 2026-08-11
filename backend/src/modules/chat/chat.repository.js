import { query, queryOne } from '../../config/database.js';

const conversationFields = `
  c.id, c.patient_id, c.assigned_pharmacist_id, c.status, c.subject,
  c.context_type, c.context_id, c.priority, c.closed_at, c.closed_by,
  c.created_at, c.updated_at
`;

const conversationReturnFields = `
  id, patient_id, assigned_pharmacist_id, status, subject,
  context_type, context_id, priority, closed_at, closed_by,
  created_at, updated_at
`;

const lastMessageJoin = `
  LEFT JOIN LATERAL (
    SELECT lm.content AS last_message,
           lm.created_at AS last_message_at,
           lm.sender_role AS last_message_sender_role,
           (lm.read_at IS NOT NULL) AS last_message_read
    FROM conversation_messages lm
    WHERE lm.conversation_id = c.id
    ORDER BY lm.created_at DESC
    LIMIT 1
  ) lm ON true
`;

export async function createConversation(data) {
  const { patientId, subject, contextType, contextId, priority } = data;
  return queryOne(
    `INSERT INTO conversations (patient_id, subject, context_type, context_id, priority)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${conversationReturnFields}`,
    [patientId, subject, contextType || 'GENERAL', contextId || null, priority || 'NORMAL']
  );
}

export async function findConversationById(id) {
  return queryOne(
    `SELECT ${conversationFields},
            u1.first_name as patient_first_name, u1.last_name as patient_last_name, u1.email as patient_email, u1.phone as patient_phone,
            u2.first_name as pharmacist_first_name, u2.last_name as pharmacist_last_name
     FROM conversations c
     LEFT JOIN users u1 ON u1.id = c.patient_id
     LEFT JOIN users u2 ON u2.id = c.assigned_pharmacist_id
     WHERE c.id = $1`,
    [id]
  );
}

export async function listPatientConversations(patientId, { status, page = 1, limit = 20 }) {
  const conditions = ['c.patient_id = $1'];
  const params = [patientId];
  let idx = 2;

  if (status) {
    conditions.push(`c.status = $${idx++}`);
    params.push(status);
  }

  const where = conditions.join(' AND ');
  const offset = (page - 1) * limit;

  const countResult = await queryOne(
    `SELECT COUNT(*) as total FROM conversations c WHERE ${where}`,
    params
  );

  const rows = await query(
    `SELECT ${conversationFields},
            u.first_name as pharmacist_first_name, u.last_name as pharmacist_last_name,
            lm.last_message, lm.last_message_at, lm.last_message_sender_role, lm.last_message_read
     FROM conversations c
     LEFT JOIN users u ON u.id = c.assigned_pharmacist_id
     ${lastMessageJoin}
     WHERE ${where}
     ORDER BY COALESCE(lm.last_message_at, c.updated_at) DESC
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

export async function listPharmacistConversations(pharmacistId, { status, page = 1, limit = 20 }) {
  const conditions = ['c.assigned_pharmacist_id = $1'];
  const params = [pharmacistId];
  let idx = 2;

  if (status) {
    conditions.push(`c.status = $${idx++}`);
    params.push(status);
  }

  const where = conditions.join(' AND ');
  const offset = (page - 1) * limit;

  const countResult = await queryOne(
    `SELECT COUNT(*) as total FROM conversations c WHERE ${where}`,
    params
  );

  const rows = await query(
    `SELECT ${conversationFields},
            u1.first_name as patient_first_name, u1.last_name as patient_last_name, u1.email as patient_email,
            lm.last_message, lm.last_message_at, lm.last_message_sender_role, lm.last_message_read,
            COALESCE(uc.unread_count, 0)::int as unread_count
     FROM conversations c
     JOIN users u1 ON u1.id = c.patient_id
     ${lastMessageJoin}
     LEFT JOIN LATERAL (
       SELECT COUNT(*)::int AS unread_count
       FROM conversation_messages cm
       WHERE cm.conversation_id = c.id AND cm.read_at IS NULL AND cm.sender_id != $1
     ) uc ON true
     WHERE ${where}
     ORDER BY COALESCE(lm.last_message_at, c.updated_at) DESC
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

export async function listOpenConversations({ status, page = 1, limit = 50 }) {
  const conditions = [];
  const params = [];
  let idx = 1;

  if (status) {
    conditions.push(`c.status = $${idx++}`);
    params.push(status);
  } else {
    conditions.push(`c.status NOT IN ('CLOSED')`);
  }

  const where = conditions.join(' AND ');
  const offset = (page - 1) * limit;

  const countResult = await queryOne(
    `SELECT COUNT(*) as total FROM conversations c WHERE ${where}`,
    params
  );

  const rows = await query(
    `SELECT ${conversationFields},
            u1.first_name as patient_first_name, u1.last_name as patient_last_name, u1.email as patient_email, u1.phone as patient_phone,
            u2.first_name as pharmacist_first_name, u2.last_name as pharmacist_last_name,
            lm.last_message, lm.last_message_at, lm.last_message_sender_role, lm.last_message_read,
            COALESCE(uc.unread_count, 0)::int as unread_count
     FROM conversations c
     JOIN users u1 ON u1.id = c.patient_id
     LEFT JOIN users u2 ON u2.id = c.assigned_pharmacist_id
     ${lastMessageJoin}
     LEFT JOIN LATERAL (
       SELECT COUNT(*)::int AS unread_count
       FROM conversation_messages cm
       WHERE cm.conversation_id = c.id AND cm.read_at IS NULL AND cm.sender_id != c.assigned_pharmacist_id
     ) uc ON true
     WHERE ${where}
     ORDER BY c.priority DESC, COALESCE(lm.last_message_at, c.updated_at) DESC
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

export async function getUnreadCount(pharmacistId) {
  const result = await queryOne(
    `SELECT COUNT(*) as count
     FROM conversation_messages cm
     JOIN conversations c ON c.id = cm.conversation_id
     WHERE c.assigned_pharmacist_id = $1
       AND cm.read_at IS NULL
       AND cm.sender_id != $1
       AND cm.is_private_note = false`,
    [pharmacistId]
  );
  return parseInt(result?.count || 0, 10);
}

export async function updateConversationStatus(id, status, actorId) {
  const result = await queryOne(
    `UPDATE conversations SET status = $1, updated_at = NOW()
     WHERE id = $2 RETURNING ${conversationReturnFields}`,
    [status, id]
  );

  if (status === 'CLOSED') {
    await query(
      `UPDATE conversations SET closed_at = NOW(), closed_by = $1 WHERE id = $2`,
      [actorId, id]
    );
  }

  return result;
}

export async function assignConversation(id, pharmacistId) {
  return queryOne(
    `UPDATE conversations SET assigned_pharmacist_id = $1, status = 'WAITING_PATIENT', updated_at = NOW()
     WHERE id = $2 RETURNING ${conversationReturnFields}`,
    [pharmacistId, id]
  );
}

export async function unassignConversation(id) {
  return queryOne(
    `UPDATE conversations SET assigned_pharmacist_id = NULL, status = 'WAITING_PHARMACIST', updated_at = NOW()
     WHERE id = $1 RETURNING ${conversationReturnFields}`,
    [id]
  );
}

const messageFields = `
  id, conversation_id, sender_id, sender_role, content,
  attachment_url, attachment_type, attachment_name,
  is_private_note, read_at, created_at
`;

export async function createMessage(data) {
  const { conversationId, senderId, senderRole, content, attachmentUrl, attachmentType, attachmentName, isPrivateNote } = data;
  return queryOne(
    `INSERT INTO conversation_messages (conversation_id, sender_id, sender_role, content, attachment_url, attachment_type, attachment_name, is_private_note)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING ${messageFields}`,
    [conversationId, senderId, senderRole, content, attachmentUrl || null, attachmentType || null, attachmentName || null, isPrivateNote || false]
  );
}

export async function getMessages(conversationId, { page = 1, limit = 50 }) {
  const offset = (page - 1) * limit;

  const countResult = await queryOne(
    `SELECT COUNT(*) as total FROM conversation_messages WHERE conversation_id = $1`,
    [conversationId]
  );

  const rows = await query(
    `SELECT cm.id, cm.conversation_id, cm.sender_id, cm.sender_role, cm.content,
            cm.attachment_url, cm.attachment_type, cm.attachment_name,
            cm.is_private_note, cm.read_at, cm.created_at,
            u.first_name, u.last_name, u.role
     FROM conversation_messages cm
     JOIN users u ON u.id = cm.sender_id
     WHERE cm.conversation_id = $1
     ORDER BY cm.created_at ASC
     LIMIT $${limit ? 2 : 1} OFFSET $${limit ? 3 : 2}`,
    limit ? [conversationId, limit, offset] : [conversationId]
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

export async function markMessagesAsRead(conversationId, userId) {
  return query(
    `UPDATE conversation_messages
     SET read_at = NOW()
     WHERE conversation_id = $1
       AND sender_id != $2
       AND read_at IS NULL
       AND is_private_note = false`,
    [conversationId, userId]
  );
}

export async function addConversationEvent(data) {
  const { conversationId, eventType, actorId, oldValue, newValue, description } = data;
  return queryOne(
    `INSERT INTO conversation_events (conversation_id, event_type, actor_id, old_value, new_value, description)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [conversationId, eventType, actorId, oldValue, newValue, description]
  );
}

export async function getCannedReplies(category) {
  if (category) {
    return query(
      `SELECT * FROM canned_replies WHERE is_active = true AND category = $1 ORDER BY title`,
      [category]
    );
  }
  return query(
    `SELECT * FROM canned_replies WHERE is_active = true ORDER BY category, title`
  );
}

export async function createCannedReply(data) {
  const { title, content, category, createdBy } = data;
  return queryOne(
    `INSERT INTO canned_replies (title, content, category, created_by)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [title, content, category || null, createdBy || null]
  );
}
