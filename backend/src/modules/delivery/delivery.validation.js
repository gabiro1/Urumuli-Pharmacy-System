import Joi from 'joi';
import { DELIVERY_STATUSES } from './deliveryState.js';

const phone = Joi.string().trim().pattern(/^\+?[0-9\s\-().]{9,20}$/);

export const createDeliverySchema = Joi.object({
  deliveryPartnerName: Joi.string().trim().max(255).allow('', null),
  trackingNumber: Joi.string().trim().max(255).allow('', null),
  trackingUrl: Joi.string().trim().uri().allow('', null),
  estimatedDelivery: Joi.date().iso().allow(null),
  deliveryAddress: Joi.string().trim().min(5).max(1000).allow('', null),
  recipientName: Joi.string().trim().max(255).allow('', null),
  recipientPhone: phone.allow('', null),
  deliveryNotes: Joi.string().trim().max(2000).allow('', null),
}).unknown(false);

export const updateStatusSchema = Joi.object({
  status: Joi.string().valid(...DELIVERY_STATUSES).required(),
  // Who took the parcel off the rider.
  receiverName: Joi.string().trim().max(255).allow('', null),
  // Why an attempt failed or the parcel came back.
  failureReason: Joi.string().trim().min(3).max(1000).allow('', null),
  confirmationNote: Joi.string().trim().max(2000).allow('', null),
  locationNote: Joi.string().trim().max(255).allow('', null),
  note: Joi.string().trim().max(2000).allow('', null),
  deliveryNotes: Joi.string().trim().max(2000).allow('', null),
  trackingNumber: Joi.string().trim().max(255).allow('', null),
  trackingUrl: Joi.string().trim().uri().allow('', null),
  estimatedDelivery: Joi.date().iso().allow(null),
  latitude: Joi.number().min(-90).max(90),
  longitude: Joi.number().min(-180).max(180),
}).unknown(false);

export const listQuerySchema = Joi.object({
  status: Joi.string().valid(...DELIVERY_STATUSES),
  scope: Joi.string().valid('open', 'delivered', 'all').default('open'),
  search: Joi.string().trim().max(120).allow(''),
  from: Joi.date().iso(),
  to: Joi.date().iso(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
}).unknown(true);
