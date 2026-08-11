import { ValidationError } from '../utils/errors.js';

export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const data = req[source];
    if (typeof schema.safeParse === 'function') {
      const result = schema.safeParse(data);

      if (!result.success) {
        const details = result.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
        }));
        return next(new ValidationError('Validation failed', details));
      }

      req[source] = result.data;
      return next();
    }

    if (typeof schema.validate === 'function') {
      const { error, value } = schema.validate(data, {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        const details = error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message,
          code: detail.type,
        }));
        return next(new ValidationError('Validation failed', details));
      }

      req[source] = value;
      return next();
    }

    return next(new TypeError('Unsupported validation schema'));
  };
}

export function validateQuery(schema) {
  return validate(schema, 'query');
}

export function validateParams(schema) {
  return validate(schema, 'params');
}
