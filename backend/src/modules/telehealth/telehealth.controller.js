import * as service from './telehealth.service.js';
import { sendSuccess, sendCreated, sendPaginated } from '../../utils/response.js';

export async function listSessions(req, res, next) {
  try { const r = await service.listSessions(req.query); return sendPaginated(res, r.data, r.meta); } catch (e) { next(e); }
}
export async function getSession(req, res, next) {
  try { return sendSuccess(res, await service.getSession(req.params.id)); } catch (e) { next(e); }
}
export async function scheduleSession(req, res, next) {
  try { return sendCreated(res, await service.scheduleSession(req.body)); } catch (e) { next(e); }
}
export async function startSession(req, res, next) {
  try { return sendSuccess(res, await service.startSession(req.params.id), 'Session started'); } catch (e) { next(e); }
}
export async function endSession(req, res, next) {
  try { return sendSuccess(res, await service.endSession(req.params.id, req.body.durationMinutes), 'Session ended'); } catch (e) { next(e); }
}
export async function cancelSession(req, res, next) {
  try { return sendSuccess(res, await service.cancelSession(req.params.id), 'Session cancelled'); } catch (e) { next(e); }
}
export async function getUpcoming(req, res, next) {
  try { return sendSuccess(res, await service.getUpcoming(req.user.userId)); } catch (e) { next(e); }
}
