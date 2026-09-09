import * as repository from './telehealth.repository.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';

export async function listSessions(filters) { return repository.listSessions(filters); }
export async function getSession(id) {
  const s = await repository.getSession(id);
  if (!s) throw new NotFoundError('Telehealth session', id);
  return s;
}
export async function scheduleSession(data) {
  if (!data.patientId || !data.pharmacistId) throw new ValidationError('patientId and pharmacistId required');
  return repository.createSession(data);
}
export async function startSession(id) {
  return repository.updateSession(id, { status: 'IN_PROGRESS', startedAt: new Date().toISOString() });
}
export async function endSession(id, durationMinutes) {
  return repository.updateSession(id, { status: 'COMPLETED', endedAt: new Date().toISOString(), durationMinutes });
}
export async function cancelSession(id) {
  return repository.updateSession(id, { status: 'CANCELLED' });
}
export async function getUpcoming(userId) { return repository.getUpcomingForUser(userId); }
