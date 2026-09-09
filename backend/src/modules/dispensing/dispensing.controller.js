import * as service from './dispensing.service.js';
import { sendSuccess, sendCreated, sendPaginated } from '../../utils/response.js';

export async function listRecords(req, res, next) {
  try {
    const result = await service.listRecords(req.query);
    return sendPaginated(res, result.data, result.meta);
  } catch (error) { next(error); }
}

export async function getRecord(req, res, next) {
  try {
    const record = await service.getRecord(req.params.id);
    return sendSuccess(res, record);
  } catch (error) { next(error); }
}

export async function dispense(req, res, next) {
  try {
    const record = await service.dispense({
      ...req.body,
      pharmacistId: req.user.userId,
    });
    return sendCreated(res, record, 'Medicine dispensed successfully');
  } catch (error) { next(error); }
}

export async function returnDispensing(req, res, next) {
  try {
    const record = await service.returnDispensing(req.params.id, req.user.userId, req.body.notes);
    return sendSuccess(res, record, 'Dispensing record returned');
  } catch (error) { next(error); }
}

export async function getByPrescription(req, res, next) {
  try {
    const records = await service.getRecordsByPrescription(req.params.prescriptionId);
    return sendSuccess(res, records);
  } catch (error) { next(error); }
}

export async function getStats(req, res, next) {
  try {
    const stats = await service.getStats(req.query);
    return sendSuccess(res, stats);
  } catch (error) { next(error); }
}
