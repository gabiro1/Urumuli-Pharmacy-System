import * as repository from './medication-history.repository.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';

export async function listHistory(patientId, filters) {
  return repository.listPatientHistory(patientId, filters);
}

export async function getActiveMedications(patientId) {
  return repository.getActiveMedications(patientId);
}

export async function getTimeline(patientId) {
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

export async function getEntry(id) {
  const entry = await repository.getHistoryById(id);
  if (!entry) throw new NotFoundError('Medication history entry', id);
  return entry;
}
