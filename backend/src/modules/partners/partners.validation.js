import Joi from 'joi';
import { ForbiddenError } from '../../utils/errors.js';

const partnerSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).required(),
  logo_url: Joi.string().trim().uri().allow('', null),
  website_url: Joi.string().trim().uri().allow('', null),
  partner_type: Joi.string().trim().valid('PHARMACY', 'INSURANCE', 'OTHER').default('PHARMACY'),
  description: Joi.string().trim().max(1000).allow('', null),
  display_order: Joi.number().integer().min(0).default(0),
  is_active: Joi.boolean().default(true),
});

export function validateCreatePartner(req, res, next) {
  const { error, value } = partnerSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    return next(new ForbiddenError(error.details.map((d) => d.message).join(', ')));
  }
  req.body = value;
  next();
}

export function validateUpdatePartner(req, res, next) {
  const schema = partnerSchema.fork(
    ['name'],
    (field) => field.optional()
  );
  const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    return next(new ForbiddenError(error.details.map((d) => d.message).join(', ')));
  }
  req.body = value;
  next();
}
