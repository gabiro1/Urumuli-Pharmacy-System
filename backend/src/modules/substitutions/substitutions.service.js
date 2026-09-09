import * as repository from './substitutions.repository.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';

export async function getSubstitutes(medicineId) {
  return repository.getSubstitutes(medicineId);
}

export async function searchSubstitutes(search) {
  if (!search || search.length < 2) throw new ValidationError('Search must be at least 2 characters');
  return repository.findSubstitutesByName(search);
}

export async function createSubstitution(data) {
  if (data.originalMedicineId === data.substituteMedicineId) throw new ValidationError('Cannot substitute medicine with itself');
  return repository.createSubstitution(data);
}

export async function approveSubstitution(id, userId) {
  const result = await repository.approveSubstitution(id, userId);
  if (!result) throw new NotFoundError('Substitution', id);
  return result;
}

export async function deleteSubstitution(id) {
  const result = await repository.deleteSubstitution(id);
  if (!result) throw new NotFoundError('Substitution', id);
  return result;
}
