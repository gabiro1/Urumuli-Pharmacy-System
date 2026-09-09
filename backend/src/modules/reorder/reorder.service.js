import * as repository from './reorder.repository.js';
import { NotFoundError } from '../../utils/errors.js';

export async function listSuggestions(filters) { return repository.listSuggestions(filters); }
export async function generateSuggestions() { return repository.generateSuggestions(); }
export async function approveSuggestion(id, userId) {
  const r = await repository.updateStatus(id, 'APPROVED', userId);
  if (!r) throw new NotFoundError('Reorder suggestion', id);
  return r;
}
export async function markOrdered(id) {
  const r = await repository.updateStatus(id, 'ORDERED');
  if (!r) throw new NotFoundError('Reorder suggestion', id);
  return r;
}
export async function dismissSuggestion(id) {
  const r = await repository.updateStatus(id, 'DISMISSED');
  if (!r) throw new NotFoundError('Reorder suggestion', id);
  return r;
}
