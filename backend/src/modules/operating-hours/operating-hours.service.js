import * as repository from './operating-hours.repository.js';
import { ValidationError } from '../../utils/errors.js';

export async function getPharmacyHours(pharmacyId) {
  return repository.getPharmacyHours(pharmacyId);
}

export async function updateHours(pharmacyId, hours) {
  if (!Array.isArray(hours) || hours.length === 0) {
    throw new ValidationError('Hours must be a non-empty array');
  }
  for (const h of hours) {
    if (h.dayOfWeek < 0 || h.dayOfWeek > 6) throw new ValidationError('dayOfWeek must be 0-6');
    if (!h.isClosed && (!h.openTime || !h.closeTime)) throw new ValidationError('openTime and closeTime required when not closed');
  }
  return repository.upsertHours(pharmacyId, hours);
}

export async function checkOpen(pharmacyId) {
  return repository.isPharmacyOpen(pharmacyId);
}

export async function getStaffAvailability(pharmacyId) {
  return repository.getStaffAvailability(pharmacyId);
}

export async function setStaffStatus(userId, pharmacyId, status) {
  if (!['AVAILABLE', 'BUSY', 'OFFLINE'].includes(status)) throw new ValidationError('Invalid status');
  return repository.updateStaffAvailability(userId, pharmacyId, status);
}
