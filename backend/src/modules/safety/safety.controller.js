import { sendSuccess, sendCreated } from '../../utils/response.js';
import * as safetyService from './safety.service.js';

export async function checkDrugInteractions(req, res, next) {
  try {
    const result = await safetyService.checkDrugInteractions({
      ...req.query,
      ...req.body,
    });
    return sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function listInteractions(req, res, next) {
  try {
    const result = await safetyService.listInteractions(req.query);
    return sendSuccess(res, result.data, 'Success', 200, result.meta);
  } catch (error) {
    next(error);
  }
}

export async function createInteraction(req, res, next) {
  try {
    const interaction = await safetyService.createInteraction(req.body);
    return sendCreated(res, interaction, 'Drug interaction registered');
  } catch (error) {
    next(error);
  }
}

export async function deleteInteraction(req, res, next) {
  try {
    const interaction = await safetyService.deleteInteraction(req.params.id);
    return sendSuccess(res, interaction, 'Drug interaction removed');
  } catch (error) {
    next(error);
  }
}
