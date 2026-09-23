const { validationResult } = require('express-validator');

/**
 * Collects validation errors thrown by express-validator and
 * returns them as a friendly 400 response.
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((e) => e.msg);
    return res.status(400).json({
      success: false,
      message: messages.join(' | '),
      errors: errors.array(),
    });
  }
  next();
};

/**
 * Global 404 fallback for unknown API routes.
 */
const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};

/**
 * Central error handler. Every thrown error in route handlers
 * passes through here so the client always gets clean JSON.
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message || 'Server Error';

  // Mongoose duplicate key error (email / studentId already exists)
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue || {})[0];
    message = `Duplicate value for ${field}: "${err.keyValue?.[field]}". This value is already registered.`;
  }

  // Mongoose validation error (schema-level rules)
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(' | ');
  }

  // Invalid ObjectId passed in a URL
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid id format (${err.value}). Please check the id you provided.`;
  }

  // Invalid JSON body
  if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Invalid JSON in request body.';
  }

  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
};

module.exports = { validateRequest, notFound, errorHandler };