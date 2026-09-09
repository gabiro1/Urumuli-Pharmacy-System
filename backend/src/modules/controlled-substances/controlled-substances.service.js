import * as repository from './controlled-substances.repository.js';
import { ValidationError } from '../../utils/errors.js';

export async function listEntries(filters) { return repository.listEntries(filters); }

export async function createEntry(data) {
  if (!data.medicineId || !data.schedule || !data.transactionType || !data.quantity || !data.reason) {
    throw new ValidationError('medicineId, schedule, transactionType, quantity, and reason are required');
  }
  if (!['I', 'II', 'III', 'IV', 'V'].includes(data.schedule)) throw new ValidationError('Invalid schedule');
  if (!['RECEIVED', 'DISPENSED', 'RETURNED', 'DESTROYED', 'TRANSFERRED'].includes(data.transactionType)) throw new ValidationError('Invalid transaction type');
  if (data.quantity <= 0) throw new ValidationError('Quantity must be positive');
  if (['DISPENSED', 'TRANSFERRED'].includes(data.transactionType) && !data.patientId && !data.destination) {
    throw new ValidationError('patientId or destination required for dispensing/transferring');
  }
  return repository.createEntry(data);
}

export async function getRunningBalance(medicineId) { return repository.getRunningBalance(medicineId); }
export async function getScheduleSummary() { return repository.getScheduleSummary(); }
