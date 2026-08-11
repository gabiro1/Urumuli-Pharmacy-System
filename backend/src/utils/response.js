export function sendSuccess(res, data = null, message = 'Success', statusCode = 200, meta = null) {
  const response = { success: true, message };
  if (data !== null) response.data = data;
  if (meta !== null) response.meta = meta;
  return res.status(statusCode).json(response);
}

export function sendCreated(res, data = null, message = 'Created successfully') {
  return sendSuccess(res, data, message, 201);
}

export function sendPaginated(res, data, meta) {
  return sendSuccess(res, data, 'Success', 200, meta);
}

export function sendError(res, error, statusCode = 500) {
  return res.status(statusCode).json({
    success: false,
    error: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
}
