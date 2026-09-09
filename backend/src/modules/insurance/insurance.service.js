import * as repository from './insurance.repository.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';

export async function listProviders(filters) { return repository.listProviders(filters); }
export async function getProvider(id) {
  const p = await repository.getProvider(id);
  if (!p) throw new NotFoundError('Insurance provider', id);
  return p;
}
export async function createProvider(data) {
  if (!data.name || !data.code) throw new ValidationError('name and code required');
  return repository.createProvider(data);
}
export async function updateProvider(id, data) {
  const p = await repository.updateProvider(id, data);
  if (!p) throw new NotFoundError('Insurance provider', id);
  return p;
}
export async function listClaims(filters) { return repository.listClaims(filters); }
export async function getClaim(id) {
  const c = await repository.getClaim(id);
  if (!c) throw new NotFoundError('Insurance claim', id);
  return c;
}
export async function createClaim(data) {
  if (!data.patientId || !data.totalAmount) throw new ValidationError('patientId and totalAmount required');
  return repository.createClaim(data);
}
export async function updateClaimStatus(id, status, extra) {
  const c = await repository.updateClaimStatus(id, status, extra);
  if (!c) throw new NotFoundError('Insurance claim', id);
  return c;
}
