import Joi from 'joi';
import { ValidationError } from '../../utils/errors.js';

const saleItemSchema = Joi.object({
  medicineId: Joi.string().uuid().required(),
  quantity: Joi.number().integer().min(1).max(10000).required(),
}).unknown(false);

const createSaleSchema = Joi.object({
  items: Joi.array().items(saleItemSchema).min(1).max(200).required(),
  customer: Joi.object({
    name: Joi.string().trim().max(200).allow('', null).default(null),
    phone: Joi.string().trim().max(50).allow('', null).default(null),
    email: Joi.string().trim().email().max(255).allow('', null).default(null),
  }).default({}),
  paymentMethod: Joi.string().valid('CASH', 'CARD', 'MOBILE_MONEY', 'INSURANCE', 'OTHER').default('CASH'),
  amountTendered: Joi.number().min(0).allow(null).default(null),
  discountAmount: Joi.number().min(0).default(0),
  taxAmount: Joi.number().min(0).default(0),
  pharmacistId: Joi.string().uuid().allow(null).default(null),
  prescriptionId: Joi.string().uuid().allow(null).default(null),
  notes: Joi.string().trim().max(2000).allow('', null).default(null),
}).unknown(false);

export function validateCreateSale(req, res, next) {
  const { error, value } = createSaleSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    return next(new ValidationError(error.details.map((d) => d.message).join(', ')));
  }
  req.body = value;
  next();
}
