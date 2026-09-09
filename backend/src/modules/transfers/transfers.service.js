import * as repository from './transfers.repository.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';

export async function listTransfers(filters) { return repository.listTransfers(filters); }
export async function getTransfer(id) {
  const t = await repository.getTransfer(id);
  if (!t) throw new NotFoundError('Transfer', id);
  return t;
}
export async function requestTransfer(data) {
  if (data.fromPharmacyId === data.toPharmacyId) throw new ValidationError('Cannot transfer to same pharmacy');
  if (!data.medicineId || !data.quantity || !data.requestedBy) throw new ValidationError('medicineId, quantity, requestedBy required');
  if (data.quantity <= 0) throw new ValidationError('Quantity must be positive');
  return repository.createTransfer(data);
}
export async function approveTransfer(id, userId) {
  const t = await repository.updateStatus(id, 'APPROVED', userId);
  if (!t) throw new NotFoundError('Transfer', id);
  return t;
}
export async function shipTransfer(id, userId) {
  const t = await repository.updateStatus(id, 'IN_TRANSIT', userId);
  if (!t) throw new NotFoundError('Transfer', id);
  return t;
}
export async function receiveTransfer(id, userId) {
  return repository.processReceived(id);
}
export async function rejectTransfer(id, userId) {
  const t = await repository.updateStatus(id, 'REJECTED', userId);
  if (!t) throw new NotFoundError('Transfer', id);
  return t;
}
