import * as service from './medication-history.service.js';
import { sendSuccess, sendCreated, sendPaginated } from '../../utils/response.js';

export async function listHistory(req, res, next) {
  try {
    const patientId = req.params.patientId || req.user.userId;
    const result = await service.listHistory(patientId, req.query);
    return sendPaginated(res, result.data, result.meta);
  } catch (error) { next(error); }
}

export async function getEntry(req, res, next) {
  try {
    const entry = await service.getEntry(req.params.id);
    return sendSuccess(res, entry);
  } catch (error) { next(error); }
}

export async function addEntry(req, res, next) {
  try {
    const entry = await service.addEntry(req.body);
    return sendCreated(res, entry, 'Medication history entry created');
  } catch (error) { next(error); }
}

export async function updateEntry(req, res, next) {
  try {
    const entry = await service.updateEntry(req.params.id, req.body);
    return sendSuccess(res, entry, 'Medication history entry updated');
  } catch (error) { next(error); }
}

export async function getActiveMeds(req, res, next) {
  try {
    const patientId = req.params.patientId || req.user.userId;
    const meds = await service.getActiveMedications(patientId);
    return sendSuccess(res, meds);
  } catch (error) { next(error); }
}

export async function getTimeline(req, res, next) {
  try {
    const patientId = req.params.patientId || req.user.userId;
    const timeline = await service.getTimeline(patientId);
    return sendSuccess(res, timeline);
  } catch (error) { next(error); }
}
