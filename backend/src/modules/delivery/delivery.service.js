import * as repository from './delivery.repository.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';
import { assertResourceAccess } from '../../utils/resourceAccess.js';

const DELIVERY_STAFF_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'PHARMACIST'];

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

export async function getDelivery(id, user) {
  const delivery = await repository.getById(id);
  if (!delivery) throw new NotFoundError('Delivery', id);
  assertResourceAccess(user, delivery.patient_user_id, {
    staffRoles: DELIVERY_STAFF_ROLES,
    message: 'You can only access your own delivery information',
  });
  return delivery;
}

export async function getByOrder(orderId, user) {
  const delivery = await repository.getByOrderId(orderId);
  if (!delivery) throw new NotFoundError('Delivery');
  assertResourceAccess(user, delivery.patient_user_id, {
    staffRoles: DELIVERY_STAFF_ROLES,
    message: 'You can only access your own delivery information',
  });
  return delivery;
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
