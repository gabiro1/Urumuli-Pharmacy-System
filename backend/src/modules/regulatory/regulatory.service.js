import * as repository from './regulatory.repository.js';
import * as expiryRepository from '../expiry/expiry.repository.js';
import * as dispensingRepository from '../dispensing/dispensing.repository.js';
import { query } from '../../config/database.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';

const REPORT_TYPES = ['MONTHLY_SALES', 'CONTROLLED_SUBSTANCE', 'EXPIRY_WASTE', 'DISPENSING_LOG', 'ADVERSE_EVENTS', 'STOCK_RECONCILIATION', 'STAFF_VERIFICATION', 'PATIENT_OUTCOMES'];

export async function listReports(filters) { return repository.listReports(filters); }
export async function getReport(id) {
  const r = await repository.getReport(id);
  if (!r) throw new NotFoundError('Regulatory report', id);
  return r;
}

export async function generateReport(data) {
  if (!data.reportType || !data.periodStart || !data.periodEnd) throw new ValidationError('reportType, periodStart, periodEnd required');
  if (!REPORT_TYPES.includes(data.reportType)) throw new ValidationError(`Invalid report type. Must be one of: ${REPORT_TYPES.join(', ')}`);

  let metadata = {};
  switch (data.reportType) {
    case 'CONTROLLED_SUBSTANCE': {
      const { rows } = await query(
        `SELECT schedule, transaction_type, SUM(quantity) AS total
         FROM controlled_substance_register
         WHERE created_at BETWEEN $1 AND $2
         GROUP BY schedule, transaction_type ORDER BY schedule`,
        [data.periodStart, data.periodEnd]
      );
      metadata = { transactions: rows };
      break;
    }
    case 'EXPIRY_WASTE': {
      const stats = await expiryRepository.getExpiryStats();
      metadata = stats;
      break;
    }
    case 'DISPENSING_LOG': {
      const stats = await dispensingRepository.getDispensingStats({ startDate: data.periodStart, endDate: data.periodEnd });
      metadata = stats;
      break;
    }
    case 'MONTHLY_SALES': {
      const { rows } = await query(
        `SELECT DATE_TRUNC('day', created_at) AS day, COUNT(*) AS orders, COALESCE(SUM(total_amount), 0) AS revenue
         FROM orders WHERE status = 'COMPLETED' AND created_at BETWEEN $1 AND $2
         GROUP BY 1 ORDER BY 1`,
        [data.periodStart, data.periodEnd]
      );
      metadata = { dailySales: rows };
      break;
    }
    default:
      metadata = { note: 'Report data will be populated by background job' };
  }

  return repository.createReport({ ...data, status: 'GENERATED', metadata });
}

export async function submitReport(id, userId) {
  const r = await repository.updateReport(id, { status: 'SUBMITTED', submittedAt: new Date().toISOString() });
  if (!r) throw new NotFoundError('Regulatory report', id);
  return r;
}

export async function deleteReport(id) {
  const r = await repository.deleteReport(id);
  if (!r) throw new NotFoundError('Regulatory report or already submitted');
  return r;
}
