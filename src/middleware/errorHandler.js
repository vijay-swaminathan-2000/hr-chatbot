const { logger } = require('../utils/logger');
const DatabaseService = require('../config/database');

const errorHandler = async (err, req, res, next) => {
  // Log error details
  logger.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id
  });

  // Save error to database if user is authenticated
  if (req.user) {
    try {
      await DatabaseService.query(
        'INSERT INTO error_logs (user_id, error_type, error_message, stack_trace) VALUES ($1, $2, $3, $4)',
        [req.user.id, err.name || 'UnknownError', err.message, err.stack]
      );
    } catch (dbError) {
      logger.error('Failed to save error to database:', dbError);
    }
  }

  // Determine error response based on error type
  let statusCode = 500;
  let message = 'Internal server error';

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = err.message;
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Unauthorized access';
  } else if (err.name === 'ForbiddenError') {
    statusCode = 403;
    message = 'Access forbidden';
  } else if (err.name === 'NotFoundError') {
    statusCode = 404;
    message = 'Resource not found';
  } else if (err.code === 'ECONNREFUSED') {
    statusCode = 503;
    message = 'Service temporarily unavailable';
  }

  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'Something went wrong. Please try again later.';
  }

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = { errorHandler };
