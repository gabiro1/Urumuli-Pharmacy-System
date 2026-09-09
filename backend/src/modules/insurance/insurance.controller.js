import * as service from './insurance.service.js';
import { sendSuccess, sendCreated, sendPaginated } from '../../utils/response.js';

export async function listProviders(req, res, next) {
  try { const r = await service.listProviders(req.query); return sendPaginated(res, r.data, r.meta); } catch (e) { next(e); }
}
export async function getProvider(req, res, next) {
  try { return sendSuccess(res, await service.getProvider(req.params.id)); } catch (e) { next(e); }
}
export async function createProvider(req, res, next) {
  try { return sendCreated(res, await service.createProvider(req.body)); } catch (e) { next(e); }
}
export async function updateProvider(req, res, next) {
  try { return sendSuccess(res, await service.updateProvider(req.params.id, req.body)); } catch (e) { next(e); }
}
export async function listClaims(req, res, next) {
  try { const r = await service.listClaims({ ...req.query, patientId: req.query.patientId || req.user.userId }); return sendPaginated(res, r.data, r.meta); } catch (e) { next(e); }
}
export async function getClaim(req, res, next) {
  try { return sendSuccess(res, await service.getClaim(req.params.id)); } catch (e) { next(e); }
}
export async function createClaim(req, res, next) {
  try { return sendCreated(res, await service.createClaim({ ...req.body, patientId: req.user.userId })); } catch (e) { next(e); }
}
export async function updateClaimStatus(req, res, next) {
  try { return sendSuccess(res, await service.updateClaimStatus(req.params.id, req.body.status, req.body)); } catch (e) { next(e); }
}
