const logger = require('../utils/logger');
const { StatusCodes } = require('http-status-codes');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  logger.error('Error Handler:', {
    error: error.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Invalid resource ID format';
    error = { message, statusCode: StatusCodes.BAD_REQUEST };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Resource already exists';
    error = { message, statusCode: StatusCodes.CONFLICT };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = { message, statusCode: StatusCodes.BAD_REQUEST };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = { message, statusCode: StatusCodes.UNAUTHORIZED };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = { message, statusCode: StatusCodes.UNAUTHORIZED };
  }

  // Ethereum/Web3 errors
  if (err.code === 'NETWORK_ERROR' || err.code === 'SERVER_ERROR') {
    const message = 'Blockchain network error. Please try again later.';
    error = { message, statusCode: StatusCodes.SERVICE_UNAVAILABLE };
  }

  if (err.code === 'INSUFFICIENT_FUNDS') {
    const message = 'Insufficient funds for transaction';
    error = { message, statusCode: StatusCodes.BAD_REQUEST };
  }

  if (err.code === 'UNPREDICTABLE_GAS_LIMIT') {
    const message = 'Transaction may fail or require more gas';
    error = { message, statusCode: StatusCodes.BAD_REQUEST };
  }

  // Contract call errors
  if (err.reason) {
    let message = 'Smart contract error';
    if (err.reason.includes('revert')) {
      // Extract revert reason
      const revertMatch = err.reason.match(/reverted with reason string '(.+)'/);
      if (revertMatch) {
        message = revertMatch[1];
      } else {
        message = err.reason;
      }
    }
    error = { message, statusCode: StatusCodes.BAD_REQUEST };
  }

  // Rate limiting errors
  if (err.status === 429) {
    const message = 'Too many requests. Please try again later.';
    error = { message, statusCode: StatusCodes.TOO_MANY_REQUESTS };
  }

  // Default error response
  const statusCode = error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
  const message = error.message || 'Internal server error';

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler; 