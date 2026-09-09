import * as service from './feedback.service.js';
import { sendSuccess, sendCreated, sendPaginated } from '../../utils/response.js';

export async function listFeedback(req, res, next) {
  try { const r = await service.listFeedback(req.query); return sendPaginated(res, r.data, r.meta); } catch (e) { next(e); }
}
export async function submitFeedback(req, res, next) {
  try { return sendCreated(res, await service.submitFeedback({ ...req.body, patientId: req.user.userId })); } catch (e) { next(e); }
}
export async function getAverageRating(req, res, next) {
  try { return sendSuccess(res, await service.getAverageRating(req.query)); } catch (e) { next(e); }
}
