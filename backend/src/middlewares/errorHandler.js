import { AppError } from '../utils/errors.js';
import { env } from '../config/env.js';

const errorCounts = {
  total: 0,
  byStatus: {},
  byCode: {},
  lastReset: Date.now(),
};

const ERROR_WINDOW_MS = 60000;

export function getErrorStats() {
  const now = Date.now();
  if (now - errorCounts.lastReset > ERROR_WINDOW_MS) {
    errorCounts.total = 0;
    errorCounts.byStatus = {};
    errorCounts.byCode = {};
    errorCounts.lastReset = now;
  }
  return { ...errorCounts };
}

export function errorHandler(err, req, res, _next) {
  errorCounts.total++;
  const status = err.statusCode || 500;
  errorCounts.byStatus[status] = (errorCounts.byStatus[status] || 0) + 1;
  const code = err.code || 'UNKNOWN';
  errorCounts.byCode[code] = (errorCounts.byCode[code] || 0) + 1;

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code,
      requestId: req.id,
      ...(err.details && { details: err.details }),
      ...(env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  }

  if (err.name === 'SyntaxError' && err.status === 400) {
    return res.status(400).json({
      success: false,
      error: 'Invalid JSON payload',
      code: 'INVALID_JSON',
      requestId: req.id,
    });
  }

  if (err.name === 'MulterError') {
    return res.status(400).json({
      success: false,
      error: err.code === 'LIMIT_FILE_SIZE' ? 'File too large' : err.message,
      code: 'FILE_UPLOAD_ERROR',
      requestId: req.id,
    });
  }

  console.error(`[ERROR] ${req.id} ${req.method} ${req.originalUrl}:`, err);

  return res.status(500).json({
    success: false,
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    requestId: req.id,
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

export function notFoundHandler(req, res) {
  return res.status(404).json({
    success: false,
    error: 'Route not found',
    code: 'ROUTE_NOT_FOUND',
    requestId: req.id,
  });
}
