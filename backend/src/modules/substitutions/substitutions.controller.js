import * as service from './substitutions.service.js';
import { sendSuccess, sendCreated } from '../../utils/response.js';

export async function getForMedicine(req, res, next) {
  try {
    const subs = await service.getSubstitutes(req.params.medicineId);
    return sendSuccess(res, subs);
  } catch (error) { next(error); }
}

export async function search(req, res, next) {
  try {
    const subs = await service.searchSubstitutes(req.query.q);
    return sendSuccess(res, subs);
  } catch (error) { next(error); }
}

export async function create(req, res, next) {
  try {
    const sub = await service.createSubstitution(req.body);
    return sendCreated(res, sub, 'Substitution added');
  } catch (error) { next(error); }
}

export async function approve(req, res, next) {
  try {
    const sub = await service.approveSubstitution(req.params.id, req.user.userId);
    return sendSuccess(res, sub, 'Substitution approved');
  } catch (error) { next(error); }
}

export async function remove(req, res, next) {
  try {
    await service.deleteSubstitution(req.params.id);
    return sendSuccess(res, null, 'Substitution removed');
  } catch (error) { next(error); }
}
