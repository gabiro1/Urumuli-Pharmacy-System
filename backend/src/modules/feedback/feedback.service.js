import * as repository from './feedback.repository.js';
import { ValidationError } from '../../utils/errors.js';

export async function listFeedback(filters) { return repository.listFeedback(filters); }
export async function submitFeedback(data) {
  if (!data.patientId || !data.feedbackType || !data.rating) throw new ValidationError('patientId, feedbackType, rating required');
  if (data.rating < 1 || data.rating > 5) throw new ValidationError('Rating must be 1-5');
  return repository.createFeedback(data);
}
export async function getAverageRating(filters) { return repository.getAverageRating(filters); }
