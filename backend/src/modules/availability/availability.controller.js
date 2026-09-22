import * as availabilityService from './availability.service.js';
import * as availabilityOrderService from './availability-order.service.js';
import { sendSuccess, sendCreated } from '../../utils/response.js';

export async function createRequest(req, res, next) {
  try {
    const result = await availabilityService.createAvailabilityRequest(
      req.user.userId, req.body, req.ip, req.get('User-Agent')
    );
    return sendCreated(res, result, 'Availability request created');
  } catch (error) {
    next(error);
  }
}

export async function listMyRequests(req, res, next) {
  try {
    const result = await availabilityService.listMyRequests(req.user.userId);
    return sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function getRequestByConversation(req, res, next) {
  try {
    const result = await availabilityService.getRequestByConversation(
      req.params.conversationId, req.user.userId, req.user.role
    );
    return sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function getRequest(req, res, next) {
  try {
    const result = await availabilityService.getRequest(req.params.id, req.user.userId, req.user.role);
    return sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function createOrder(req, res, next) {
  try {
    const result = await availabilityOrderService.createOrderFromAvailability(
      req.params.id,
      req.user,
      req.body,
      req.get('Idempotency-Key')
    );
    return sendCreated(res, result, 'Order created; continue to payment');
  } catch (error) {
    next(error);
  }
}

export async function verifyRequest(req, res, next) {
  try {
    const result = await availabilityService.verifyRequest(
      req.params.id, req.body, req.user, req.ip, req.get('User-Agent')
    );
    return sendSuccess(res, result, 'Availability verified');
  } catch (error) {
    next(error);
  }
}

export async function syncInventory(req, res, next) {
  try {
    const result = await availabilityService.syncInventoryFromVerification(
      req.params.id, req.body, req.user, req.ip, req.get('User-Agent')
    );
    return sendSuccess(res, result, 'Inventory synchronised');
  } catch (error) {
    next(error);
  }
}
