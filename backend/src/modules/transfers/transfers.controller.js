import * as service from './transfers.service.js';
import { sendSuccess, sendCreated, sendPaginated } from '../../utils/response.js';

export async function listTransfers(req, res, next) {
  try { const r = await service.listTransfers(req.query); return sendPaginated(res, r.data, r.meta); } catch (e) { next(e); }
}
export async function getTransfer(req, res, next) {
  try { return sendSuccess(res, await service.getTransfer(req.params.id)); } catch (e) { next(e); }
}
export async function requestTransfer(req, res, next) {
  try { return sendCreated(res, await service.requestTransfer({ ...req.body, requestedBy: req.user.userId })); } catch (e) { next(e); }
}
export async function approveTransfer(req, res, next) {
  try { return sendSuccess(res, await service.approveTransfer(req.params.id, req.user.userId), 'Transfer approved'); } catch (e) { next(e); }
}
export async function shipTransfer(req, res, next) {
  try { return sendSuccess(res, await service.shipTransfer(req.params.id, req.user.userId), 'Transfer shipped'); } catch (e) { next(e); }
}
export async function receiveTransfer(req, res, next) {
  try { return sendSuccess(res, await service.receiveTransfer(req.params.id, req.user.userId), 'Transfer received'); } catch (e) { next(e); }
}
export async function rejectTransfer(req, res, next) {
  try { return sendSuccess(res, await service.rejectTransfer(req.params.id, req.user.userId), 'Transfer rejected'); } catch (e) { next(e); }
}
