/**
 * Middleware to handle 404 Not Found routes
 */
const notFound = (req, res, next) => {
  const error = new Error(`Resource Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

/**
 * Centralized error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }
  const requestedStatus = err.statusCode || err.status || res.statusCode;
  const statusCode =
    Number.isInteger(requestedStatus) && requestedStatus >= 400 && requestedStatus <= 599
      ? requestedStatus
      : 500;

  res.status(statusCode).json({
    success: false,
    message: err.message,
    // Only show stack trace in development mode for easier debugging
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};

module.exports = {
  notFound,
  errorHandler,
};
