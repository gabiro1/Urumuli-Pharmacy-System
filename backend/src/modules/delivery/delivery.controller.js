import * as service from './delivery.service.js';
import { sendSuccess, sendCreated, sendPaginated } from '../../utils/response.js';

export async function getByOrder(req, res, next) {
  try {
    const delivery = await service.getByOrder(req.params.orderId, req.user);
    return sendSuccess(res, delivery);
  } catch (error) { next(error); }
}

export async function getDelivery(req, res, next) {
  try {
    const delivery = await service.getDelivery(req.params.id, req.user);
    return sendSuccess(res, delivery);
  } catch (error) { next(error); }
}

export async function getTimeline(req, res, next) {
  try {
    const timeline = await service.getTimeline(req.params.orderId, req.user);
    return sendSuccess(res, timeline);
  } catch (error) { next(error); }
}

export async function createDelivery(req, res, next) {
  try {
    const delivery = await service.createDelivery({ ...req.body, orderId: req.params.orderId }, req.user);
    return sendCreated(res, delivery, 'Delivery record created');
  } catch (error) { next(error); }
}

export async function updateStatus(req, res, next) {
  try {
    const delivery = await service.updateDeliveryStatus(req.params.id, req.body.status, req.body, req.user);
    return sendSuccess(res, delivery, 'Delivery status updated');
  } catch (error) { next(error); }
}

export async function listDeliveries(req, res, next) {
  try {
    const result = await service.listDeliveries(req.query);
    return sendPaginated(res, result.data, result.meta);
  } catch (error) { next(error); }
}

export async function myDeliveries(req, res, next) {
  try {
    const rows = await service.listMyDeliveries(req.user, { page: req.query.page, limit: req.query.limit });
    return sendSuccess(res, rows);
  } catch (error) { next(error); }
}

export async function stats(req, res, next) {
  try {
    return sendSuccess(res, await service.getDeliveryStats());
  } catch (error) { next(error); }
}
