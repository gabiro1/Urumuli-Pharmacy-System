import * as cartRepository from './cart.repository.js';
import { mapMedicine } from '../../utils/serializers.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';

function toItem(row) {
  const { quantity, ...medicine } = row;
  return { medicine: mapMedicine(medicine), quantity: Number(quantity) };
}

export const getCart = async (userId) => {
  const rows = await cartRepository.listCart(userId);
  return { items: rows.map(toItem) };
};

export const addItem = async (userId, medicineId, quantity = 1) => {
  await cartRepository.upsertItem(userId, medicineId, quantity);
  const row = await getCartItem(userId, medicineId);
  return toItem(row);
};

export const updateItem = async (userId, medicineId, quantity) => {
  if (quantity <= 0) {
    await cartRepository.removeItem(userId, medicineId);
    return null;
  }
  const updated = await cartRepository.setQuantity(userId, medicineId, quantity);
  if (!updated) throw new NotFoundError('Cart item', medicineId);
  const row = await getCartItem(userId, medicineId);
  return toItem(row);
};

export const removeItem = async (userId, medicineId) => {
  const removed = await cartRepository.removeItem(userId, medicineId);
  if (removed.rowCount === 0) throw new NotFoundError('Cart item', medicineId);
  return true;
};

export const clearCart = async (userId) => {
  const result = await cartRepository.clearCart(userId);
  return { cleared: (result.rowCount || 0) > 0 };
};

async function getCartItem(userId, medicineId) {
  const row = await cartRepository.findCartItem(userId, medicineId);
  if (!row) throw new ValidationError('That medicine is no longer available in the cart');
  return row;
}