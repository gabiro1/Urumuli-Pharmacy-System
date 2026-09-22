import * as repository from './medication-history.repository.js';
import { NotFoundError } from '../../utils/errors.js';
import { assertResourceAccess } from '../../utils/resourceAccess.js';

export async function listHistory(patientId, filters, user) {
  assertResourceAccess(user, patientId);
  return repository.listPatientHistory(patientId, filters);
}

export async function getActiveMedications(patientId, user) {
  assertResourceAccess(user, patientId);
  return repository.getActiveMedications(patientId);
}

export async function getTimeline(patientId, user) {
  assertResourceAccess(user, patientId);
  return repository.getPatientTimeline(patientId);
}

export async function addEntry(data) {
  return repository.addEntry(data);
}

export async function updateEntry(id, updates) {
  const entry = await repository.getHistoryById(id);
  if (!entry) throw new NotFoundError('Medication history entry', id);

  if (updates.status && ['COMPLETED', 'DISCONTINUED'].includes(updates.status) && !updates.endDate) {
    updates.endDate = new Date().toISOString().split('T')[0];
  }

  return repository.updateEntry(id, updates);
}

export async function getEntry(id, user) {
  const entry = await repository.getHistoryById(id);
  if (!entry) throw new NotFoundError('Medication history entry', id);
  assertResourceAccess(user, entry.patient_id);
  return entry;
}
