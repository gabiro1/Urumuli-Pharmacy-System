import * as service from './reorder.service.js';
import { sendSuccess, sendPaginated } from '../../utils/response.js';

export async function listSuggestions(req, res, next) {
  try { const r = await service.listSuggestions(req.query); return sendPaginated(res, r.data, r.meta); } catch (e) { next(e); }
}
export async function generateSuggestions(req, res, next) {
  try { const r = await service.generateSuggestions(); return sendSuccess(res, { generated: r.length, suggestions: r }); } catch (e) { next(e); }
}
export async function approveSuggestion(req, res, next) {
  try { return sendSuccess(res, await service.approveSuggestion(req.params.id, req.user.userId)); } catch (e) { next(e); }
}
export async function markOrdered(req, res, next) {
  try { return sendSuccess(res, await service.markOrdered(req.params.id)); } catch (e) { next(e); }
}
export async function dismissSuggestion(req, res, next) {
  try { return sendSuccess(res, await service.dismissSuggestion(req.params.id)); } catch (e) { next(e); }
}
