import * as service from './refills.service.js';
import { sendSuccess, sendCreated, sendPaginated } from '../../utils/response.js';

export async function listReminders(req, res, next) {
  try {
    const patientId = req.params.patientId || req.user.userId;
    const result = await service.listReminders(patientId, req.query);
    return sendPaginated(res, result.data, result.meta);
  } catch (error) { next(error); }
}

export async function createReminder(req, res, next) {
  try {
    const reminder = await service.createReminder({ ...req.body, patientId: req.user.userId });
    return sendCreated(res, reminder, 'Refill reminder created');
  } catch (error) { next(error); }
}

export async function cancelReminder(req, res, next) {
  try {
    const reminder = await service.cancelReminder(req.params.id);
    return sendSuccess(res, reminder, 'Reminder cancelled');
  } catch (error) { next(error); }
}

export async function completeReminder(req, res, next) {
  try {
    const reminder = await service.completeReminder(req.params.id);
    return sendSuccess(res, reminder, 'Reminder completed');
  } catch (error) { next(error); }
}

export async function processDue(req, res, next) {
  try {
    const result = await service.processDueReminders();
    return sendSuccess(res, result, `Processed ${result.notified} due reminders`);
  } catch (error) { next(error); }
}
