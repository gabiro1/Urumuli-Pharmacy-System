import * as service from './consent.service.js';
import { sendSuccess, sendCreated } from '../../utils/response.js';

export async function getMyConsents(req, res, next) {
  try {
    const consents = await service.getConsents(req.user.userId);
    return sendSuccess(res, consents);
  } catch (error) { next(error); }
}

export async function updateConsent(req, res, next) {
  try {
    const consent = await service.updateConsent(
      req.user.userId, req.params.type, req.body.granted,
      req.ip, req.get('User-Agent')
    );
    return sendSuccess(res, consent, 'Consent updated');
  } catch (error) { next(error); }
}

export async function bulkUpdate(req, res, next) {
  try {
    const results = await service.bulkUpdate(req.user.userId, req.body.consents, req.ip, req.get('User-Agent'));
    return sendSuccess(res, results, 'Consents updated');
  } catch (error) { next(error); }
}
