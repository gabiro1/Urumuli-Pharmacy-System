import * as repository from './adherence.repository.js';
import { ValidationError } from '../../utils/errors.js';

export async function listEntries(patientId, filters) { return repository.listByPatient(patientId, filters); }
export async function markTaken(id) {
  const entry = await repository.markTaken(id);
  if (!entry) throw new ValidationError('Entry not found or already marked taken');
  return entry;
}
export async function createEntry(data) { return repository.createEntry(data); }
export async function getAdherenceRate(patientId, filters) { return repository.getAdherenceRate(patientId, filters); }
