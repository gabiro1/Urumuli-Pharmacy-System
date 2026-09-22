import * as repository from './adherence.repository.js';
import { ValidationError } from '../../utils/errors.js';
import { assertResourceAccess } from '../../utils/resourceAccess.js';

export async function listEntries(patientId, filters, user) {
  assertResourceAccess(user, patientId);
  return repository.listByPatient(patientId, filters);
}
export async function markTaken(id, user) {
  const existing = await repository.getEntryById(id);
  if (!existing) throw new ValidationError('Entry not found or already marked taken');
  assertResourceAccess(user, existing.patient_id);
  const entry = await repository.markTaken(id);
  if (!entry) throw new ValidationError('Entry not found or already marked taken');
  return entry;
}
export async function createEntry(data) { return repository.createEntry(data); }
export async function getAdherenceRate(patientId, filters, user) {
  assertResourceAccess(user, patientId);
  return repository.getAdherenceRate(patientId, filters);
}
