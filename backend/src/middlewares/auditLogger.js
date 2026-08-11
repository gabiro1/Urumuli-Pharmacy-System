import { query } from '../config/database.js';

const auditBuffer = [];
let flushTimer = null;
const FLUSH_INTERVAL = 1000;
const FLUSH_THRESHOLD = 50;

export async function createAuditLog({
  userId,
  action,
  entity,
  entityId,
  description,
  metadata,
  ipAddress,
  userAgent,
}) {
  auditBuffer.push({
    userId,
    action,
    entity,
    entityId: entityId || null,
    description: description || null,
    metadata: metadata ? JSON.stringify(metadata) : null,
    ipAddress: ipAddress || null,
    userAgent: userAgent || null,
  });

  if (auditBuffer.length >= FLUSH_THRESHOLD) {
    await flushAuditLogs();
  } else if (!flushTimer) {
    flushTimer = setTimeout(async () => {
      flushTimer = null;
      await flushAuditLogs();
    }, FLUSH_INTERVAL);
  }
}

async function flushAuditLogs() {
  if (auditBuffer.length === 0) return;

  const logs = auditBuffer.splice(0, auditBuffer.length);
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  try {
    const values = [];
    const placeholders = [];
    let idx = 1;

    for (const log of logs) {
      placeholders.push(
        `($${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++})`
      );
      values.push(
        log.userId, log.action, log.entity, log.entityId,
        log.description, log.metadata, log.ipAddress, log.userAgent
      );
    }

    await query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, description, metadata, ip_address, user_agent)
       VALUES ${placeholders.join(', ')}`,
      values
    );
  } catch (error) {
    console.error('Failed to flush audit logs:', error);
    for (const log of logs) {
      try {
        await query(
          `INSERT INTO audit_logs (user_id, action, entity, entity_id, description, metadata, ip_address, user_agent)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [log.userId, log.action, log.entity, log.entityId, log.description, log.metadata, log.ipAddress, log.userAgent]
        );
      } catch (retryError) {
        console.error('Failed to write individual audit log:', retryError);
      }
    }
  }
}

process.on('beforeExit', () => {
  flushAuditLogs();
});

export function auditMiddleware(action, entity) {
  return (req, res, next) => {
    res.on('finish', () => {
      if (res.statusCode < 400) {
        const userId = req.user?.userId;
        setImmediate(() => {
          createAuditLog({
            userId,
            action,
            entity,
            entityId: req.params.id || res.locals?.createdId || null,
            description: `${action} ${entity}`,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
          }).catch(console.error);
        });
      }
    });
    next();
  };
}
