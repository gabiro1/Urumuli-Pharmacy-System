import * as repository from './refills.repository.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';
import { assertResourceAccess } from '../../utils/resourceAccess.js';
import { createNotification } from '../../services/notification.service.js';

export async function listReminders(patientId, filters, user) {
  assertResourceAccess(user, patientId);
  return repository.listReminders(patientId, filters);
}

export async function createReminder(data) {
  if (!data.patientId || !data.medicineName) throw new ValidationError('patientId and medicineName required');
  return repository.createReminder(data);
}

async function loadOwnedReminder(id, user) {
  const reminder = await repository.getReminder(id);
  if (!reminder) throw new NotFoundError('Refill reminder', id);
  assertResourceAccess(user, reminder.patient_id, { message: 'You do not have permission to modify this reminder' });
  return reminder;
}

export async function cancelReminder(id, user) {
  await loadOwnedReminder(id, user);
  const updated = await repository.updateReminder(id, { status: 'CANCELLED' });
  if (!updated) throw new NotFoundError('Refill reminder', id);
  return updated;
}

export async function completeReminder(id, user) {
  await loadOwnedReminder(id, user);
  const updated = await repository.updateReminder(id, { status: 'COMPLETED' });
  if (!updated) throw new NotFoundError('Refill reminder', id);
  return updated;
}

export async function processDueReminders() {
  const due = await repository.getDueReminders();
  for (const r of due) {
    await createNotification({
      userId: r.patient_id,
      type: 'REFILL_REMINDER',
      title: `Refill reminder: ${r.medicine_name}`,
      message: `Your medication ${r.medicine_name} needs to be refilled by ${r.next_refill_date}`,
      referenceType: 'REFILL_REMINDER',
      referenceId: r.id,
    });
    await repository.updateReminder(r.id, { status: 'SENT', lastNotifiedAt: new Date().toISOString() });
  }
  return { notified: due.length };
}

export async function deleteReminder(id, user) {
  await loadOwnedReminder(id, user);
  const deleted = await repository.deleteReminder(id);
  if (!deleted) throw new NotFoundError('Refill reminder', id);
  return deleted;
}
