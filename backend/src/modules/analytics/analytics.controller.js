import { sendSuccess } from '../../utils/response.js';
import * as analyticsService from './analytics.service.js';

export async function getOverview(req, res, next) {
  try {
    const overview = await analyticsService.getOverview(req.query);
    return sendSuccess(res, overview);
  } catch (error) {
    next(error);
  }
}
