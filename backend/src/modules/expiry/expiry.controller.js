import * as expiryService from './expiry.service.js';
import { sendSuccess, sendCreated } from '../../utils/response.js';
import { NotFoundError } from '../../utils/errors.js';

export async function listAlerts(req, res, next) {
  try {
    const result = await expiryService.listAlerts(req.query);
    return sendSuccess(res, result.data, 'Success', 200, result.meta);
  } catch (error) { next(error); }
}

export async function getStats(req, res, next) {
  try {
    const stats = await expiryService.getStats();
    return sendSuccess(res, stats);
  } catch (error) { next(error); }
}

export async function acknowledgeAlert(req, res, next) {
  try {
    const alert = await expiryService.acknowledgeAlert(req.params.id, req.user.userId);
    return sendSuccess(res, alert, 'Alert acknowledged');
  } catch (error) { next(error); }
}

export async function dismissAlert(req, res, next) {
  try {
    const alert = await expiryService.dismissAlert(req.params.id, req.user.userId);
    return sendSuccess(res, alert, 'Alert dismissed');
  } catch (error) { next(error); }
}

export async function markDisposed(req, res, next) {
  try {
    const alert = await expiryService.markDisposed(req.params.id, req.user.userId);
    return sendSuccess(res, alert, 'Batch marked as disposed');
  } catch (error) { next(error); }
}

export async function runScan(req, res, next) {
  try {
    const result = await expiryService.runExpiryScan();
    return sendSuccess(res, result, `Expiry scan complete. Found ${result.scanned} new alerts.`);
  } catch (error) { next(error); }
}
