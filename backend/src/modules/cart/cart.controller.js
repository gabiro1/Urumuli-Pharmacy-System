import * as cartService from './cart.service.js';
import { sendSuccess, sendCreated } from '../../utils/response.js';

export async function getCart(req, res, next) {
  try {
    return sendSuccess(res, await cartService.getCart(req.user.userId));
  } catch (error) {
    next(error);
  }
}

export async function addItem(req, res, next) {
  try {
    const { medicineId, quantity } = req.body;
    return sendCreated(res, await cartService.addItem(req.user.userId, medicineId, quantity), 'Item added to cart');
  } catch (error) {
    next(error);
  }
}

export async function updateItem(req, res, next) {
  try {
    const { quantity } = req.body;
    return sendSuccess(res, await cartService.updateItem(req.user.userId, req.params.medicineId, quantity), 'Cart updated');
  } catch (error) {
    next(error);
  }
}

export async function removeItem(req, res, next) {
  try {
    await cartService.removeItem(req.user.userId, req.params.medicineId);
    return sendSuccess(res, null, 'Item removed from cart');
  } catch (error) {
    next(error);
  }
}

export async function clearCart(req, res, next) {
  try {
    return sendSuccess(res, await cartService.clearCart(req.user.userId), 'Cart cleared');
  } catch (error) {
    next(error);
  }
}