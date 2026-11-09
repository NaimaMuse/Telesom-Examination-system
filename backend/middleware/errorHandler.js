/**
 * Middleware to handle 404 Not Found routes
 */
const notFound = (req, res, next) => {
  const error = new Error('Resource not found');
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

  const message = statusCode >= 500 ? 'The server could not complete the request.'
    : err.code === 11000 ? 'A record with the same unique value already exists.'
    : err.message;
  res.status(statusCode).json({
    success: false,
    message,
  });
};

module.exports = {
  notFound,
  errorHandler,
};
