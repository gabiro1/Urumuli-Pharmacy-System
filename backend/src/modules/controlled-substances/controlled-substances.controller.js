import * as service from './controlled-substances.service.js';
import { sendSuccess, sendCreated, sendPaginated } from '../../utils/response.js';

export async function listEntries(req, res, next) {
  try { const r = await service.listEntries(req.query); return sendPaginated(res, r.data, r.meta); } catch (e) { next(e); }
}
export async function createEntry(req, res, next) {
  try { return sendCreated(res, await service.createEntry({ ...req.body, pharmacistId: req.user.userId })); } catch (e) { next(e); }
}
export async function getBalance(req, res, next) {
  try { return sendSuccess(res, await service.getRunningBalance(req.params.medicineId)); } catch (e) { next(e); }
}
export async function getSummary(req, res, next) {
  try { return sendSuccess(res, await service.getScheduleSummary()); } catch (e) { next(e); }
}
