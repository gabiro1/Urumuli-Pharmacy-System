import * as service from './operating-hours.service.js';
import { sendSuccess } from '../../utils/response.js';

export async function getHours(req, res, next) {
  try {
    const hours = await service.getPharmacyHours(req.params.pharmacyId);
    return sendSuccess(res, hours);
  } catch (error) { next(error); }
}

export async function updateHours(req, res, next) {
  try {
    const hours = await service.updateHours(req.params.pharmacyId, req.body.hours);
    return sendSuccess(res, hours, 'Operating hours updated');
  } catch (error) { next(error); }
}

export async function checkOpen(req, res, next) {
  try {
    const isOpen = await service.checkOpen(req.params.pharmacyId);
    return sendSuccess(res, { isOpen });
  } catch (error) { next(error); }
}

export async function getStaffAvailability(req, res, next) {
  try {
    const staff = await service.getStaffAvailability(req.params.pharmacyId);
    return sendSuccess(res, staff);
  } catch (error) { next(error); }
}

export async function setStaffStatus(req, res, next) {
  try {
    const result = await service.setStaffStatus(req.user.userId, req.params.pharmacyId, req.body.status);
    return sendSuccess(res, result, 'Status updated');
  } catch (error) { next(error); }
}
