import * as service from './delivery.service.js';
import { sendSuccess, sendCreated, sendPaginated } from '../../utils/response.js';

export async function getByOrder(req, res, next) {
  try {
    const delivery = await service.getByOrder(req.params.orderId);
    return sendSuccess(res, delivery);
  } catch (error) { next(error); }
}

export async function getDelivery(req, res, next) {
  try {
    const delivery = await service.getDelivery(req.params.id);
    return sendSuccess(res, delivery);
  } catch (error) { next(error); }
}

export async function createDelivery(req, res, next) {
  try {
    const delivery = await service.createDelivery({ ...req.body, orderId: req.params.orderId });
    return sendCreated(res, delivery, 'Delivery created');
  } catch (error) { next(error); }
}

export async function updateStatus(req, res, next) {
  try {
    const delivery = await service.updateDeliveryStatus(req.params.id, req.body.status, req.body);
    return sendSuccess(res, delivery, 'Delivery status updated');
  } catch (error) { next(error); }
}

export async function listDeliveries(req, res, next) {
  try {
    const result = await service.listDeliveries(req.query);
    return sendPaginated(res, result.data, result.meta);
  } catch (error) { next(error); }
}
