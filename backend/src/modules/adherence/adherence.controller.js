import * as service from './adherence.service.js';
import { sendSuccess, sendCreated, sendPaginated } from '../../utils/response.js';

export async function listEntries(req, res, next) {
  try { const r = await service.listEntries(req.params.patientId || req.user.userId, req.query); return sendPaginated(res, r.data, r.meta); } catch (e) { next(e); }
}
export async function markTaken(req, res, next) {
  try { return sendSuccess(res, await service.markTaken(req.params.id), 'Marked as taken'); } catch (e) { next(e); }
}
export async function createEntry(req, res, next) {
  try { return sendCreated(res, await service.createEntry({ ...req.body, patientId: req.user.userId })); } catch (e) { next(e); }
}
export async function getAdherenceRate(req, res, next) {
  try { return sendSuccess(res, await service.getAdherenceRate(req.params.patientId || req.user.userId, req.query)); } catch (e) { next(e); }
}
