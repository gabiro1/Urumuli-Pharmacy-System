import * as repository from './delivery.repository.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';

const VALID_TRANSITIONS = {
  PENDING: ['PICKED_UP', 'CANCELLED'],
  PICKED_UP: ['IN_TRANSIT', 'CANCELLED'],
  IN_TRANSIT: ['OUT_FOR_DELIVERY', 'FAILED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'FAILED'],
  FAILED: ['PICKED_UP'],
  RETURNED: [],
  DELIVERED: [],
  CANCELLED: [],
};

export async function createDelivery(data) {
  return repository.create(data);
}

export async function getDelivery(id) {
  const delivery = await repository.getById(id);
  if (!delivery) throw new NotFoundError('Delivery', id);
  return delivery;
}

export async function getByOrder(orderId) {
  return repository.getByOrderId(orderId);
}

export async function updateDeliveryStatus(id, status, extra = {}) {
  const delivery = await repository.getById(id);
  if (!delivery) throw new NotFoundError('Delivery', id);

  const allowed = VALID_TRANSITIONS[delivery.status];
  if (!allowed || !allowed.includes(status)) {
    throw new ValidationError(`Cannot transition from ${delivery.status} to ${status}`);
  }

  return repository.updateStatus(id, status, extra);
}

export async function listDeliveries(filters) {
  return repository.listDeliveries(filters);
}
