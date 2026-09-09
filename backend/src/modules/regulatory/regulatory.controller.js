import * as service from './regulatory.service.js';
import { sendSuccess, sendCreated, sendPaginated } from '../../utils/response.js';

export async function listReports(req, res, next) {
  try { const r = await service.listReports(req.query); return sendPaginated(res, r.data, r.meta); } catch (e) { next(e); }
}
export async function getReport(req, res, next) {
  try { return sendSuccess(res, await service.getReport(req.params.id)); } catch (e) { next(e); }
}
export async function generateReport(req, res, next) {
  try { return sendCreated(res, await service.generateReport({ ...req.body, generatedBy: req.user.userId })); } catch (e) { next(e); }
}
export async function submitReport(req, res, next) {
  try { return sendSuccess(res, await service.submitReport(req.params.id, req.user.userId), 'Report submitted'); } catch (e) { next(e); }
}
export async function deleteReport(req, res, next) {
  try { await service.deleteReport(req.params.id); return sendSuccess(res, null, 'Report deleted'); } catch (e) { next(e); }
}
