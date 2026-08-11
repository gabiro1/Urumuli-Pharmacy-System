import * as auditRepository from './audit.repository.js';
import { parsePagination } from '../../utils/pagination.js';
import { NotFoundError } from '../../utils/errors.js';
import { mapAuditLog } from '../../utils/serializers.js';

export const getAuditLogs = async (queryParams) => {
  const { limit, offset } = parsePagination(queryParams);
  const filters = {
    userId: queryParams.userId || null,
    action: queryParams.action || null,
    entity: queryParams.entity || null,
    fromDate: queryParams.fromDate ? new Date(queryParams.fromDate) : null,
    toDate: queryParams.toDate ? new Date(queryParams.toDate) : null,
    limit,
    offset,
  };
  const { rows, total } = await auditRepository.listAuditLogs(filters);
  return {
    logs: rows.map((row) => mapAuditLog(row)),
    pagination: {
      total,
      limit,
      offset,
      page: Math.floor(offset / limit) + 1,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getAuditLogById = async (id) => {
  const log = await auditRepository.findAuditLogById(id);
  if (!log) {
    throw new NotFoundError(`Audit log with id ${id} not found`);
  }
  return mapAuditLog(log);
};
