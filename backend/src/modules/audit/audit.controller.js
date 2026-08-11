import * as auditService from './audit.service.js';
import { sendSuccess } from '../../utils/response.js';

export const listAuditLogs = async (req, res, next) => {
  try {
    const result = await auditService.getAuditLogs(req.query);
    sendSuccess(res, result, 'Success', 200, result.pagination);
  } catch (err) {
    next(err);
  }
};

export const getAuditLogById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await auditService.getAuditLogById(id);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};

const csvCell = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;

export const exportAuditLogs = async (req, res, next) => {
  try {
    const result = await auditService.getAuditLogs({ ...req.query, page: 1, limit: 10000 });
    const header = ['Timestamp', 'User', 'Email', 'Role', 'Action', 'Entity', 'Entity ID', 'Description'];
    const rows = result.logs.map((log) => [
      log.createdAt, log.user?.name, log.user?.email, log.user?.role,
      log.action, log.entityType, log.entityId, log.description,
    ]);
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${new Date().toISOString().slice(0, 10)}.csv"`);
    return res.send(`\uFEFF${csv}`);
  } catch (err) {
    next(err);
  }
};
