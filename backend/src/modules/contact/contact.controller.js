import * as contactRepository from './contact.repository.js';
import { sendCreated, sendPaginated, sendSuccess } from '../../utils/response.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';

export async function createMessage(req, res, next) {
  try {
    const message = await contactRepository.createMessage(req.body);
    return sendCreated(res, message, 'Message received successfully');
  } catch (error) {
    next(error);
  }
}

export async function listMessages(req, res, next) {
  try {
    const { status, search } = req.query;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
    const offset = (page - 1) * limit;
    const { rows, total } = await contactRepository.listMessages({ status, search, limit, offset });
    return sendPaginated(res, rows, {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
}

export async function getMessage(req, res, next) {
  try {
    const message = await contactRepository.findMessageById(req.params.id);
    if (!message) throw new NotFoundError('Message', req.params.id);
    return sendSuccess(res, message);
  } catch (error) {
    next(error);
  }
}

export async function updateMessageStatus(req, res, next) {
  try {
    const status = String(req.body.status || '').toUpperCase();
    const allowed = ['NEW', 'READ', 'RESOLVED'];
    if (!allowed.includes(status)) {
      throw new ValidationError(`Status must be one of: ${allowed.join(', ')}`);
    }
    const message = await contactRepository.updateMessageStatus(req.params.id, status);
    if (!message) throw new NotFoundError('Message', req.params.id);
    return sendSuccess(res, message, `Message marked as ${status}`);
  } catch (error) {
    next(error);
  }
}
