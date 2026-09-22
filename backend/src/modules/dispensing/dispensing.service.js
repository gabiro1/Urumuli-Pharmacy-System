import * as repository from './dispensing.repository.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';
import { assertResourceAccess } from '../../utils/resourceAccess.js';

export async function listRecords(filters) {
  return repository.listRecords(filters);
}

export async function getRecord(id, user) {
  const record = await repository.getRecord(id);
  if (!record) throw new NotFoundError('Dispensing record', id);
  assertResourceAccess(user, record.patient_id, {
    staffRoles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'PHARMACIST'],
  });
  return record;
}

export async function dispense(data) {
  if (!data.patientId || !data.pharmacistId || !data.medicineId || !data.quantityDispensed) {
    throw new ValidationError('Missing required fields: patientId, pharmacistId, medicineId, quantityDispensed');
  }
  if (data.quantityDispensed <= 0) {
    throw new ValidationError('Quantity must be greater than 0');
  }
  return repository.createRecord(data);
}

export async function returnDispensing(id, pharmacistId, notes) {
  const record = await repository.getRecord(id);
  if (!record) throw new NotFoundError('Dispensing record', id);
  if (record.status === 'RETURNED') throw new ValidationError('Record already returned');
  if (record.status === 'CANCELLED') throw new ValidationError('Cannot return a cancelled record');

  const updated = await repository.updateStatus(id, 'RETURNED', notes || 'Returned to stock');

  if (record.stock_batch_id) {
    await repository.returnStock(record.stock_batch_id, record.quantity_dispensed);
  }

  return updated;
}

export async function getRecordsByPrescription(prescriptionId) {
  return repository.getRecordsByPrescription(prescriptionId);
}

export async function getStats(filters) {
  return repository.getDispensingStats(filters);
}
