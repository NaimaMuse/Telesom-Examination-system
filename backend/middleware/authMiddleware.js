const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');

/**
 * Authentication middleware that verifies JWT and attaches user to req.user
 */
const protect = async (req, res, next) => {
  try {
    let token;

    // 1. Check for Authorization header with Bearer token
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      res.status(401);
      return next(new Error('Not authorized, no token provided or invalid format'));
    }

    // 2. Ensure JWT_SECRET is configured
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      res.status(500);
      return next(new Error('Server configuration error: JWT_SECRET is not set'));
    }

    // 3. Verify token with secret and configured algorithm
    const algorithm = process.env.JWT_ALGORITHM || 'HS256';
    let decoded;

    try {
      decoded = jwt.verify(token, jwtSecret, { algorithms: [algorithm] });
    } catch (err) {
      res.status(401);
      if (err.name === 'TokenExpiredError') {
        return next(new Error('Not authorized, token has expired'));
      }
      return next(new Error('Not authorized, invalid or malformed token'));
    }

    // 4. Extract and validate user ID from decoded payload
    const userId = decoded.id || decoded.userId || decoded._id;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      res.status(401);
      return next(new Error('Not authorized, invalid user ID in token payload'));
    }

    // 5. Load user from database excluding password
    const user = await User.findById(userId).select('-password');

    // 6. Check if user still exists
    if (!user) {
      res.status(401);
      return next(new Error('Not authorized, user account not found or deleted'));
    }

    // 7. Check if user account is active
    if (!user.isActive) {
      res.status(403);
      return next(new Error('Account is inactive, please contact administrator'));
    }

    // 8. Attach authenticated user to request object
    req.user = user;
    next();
  } catch (error) {
    // Forward unexpected errors to the centralized error handler
    res.status(500);
    next(error);
  }
};

module.exports = {
  protect,
  authMiddleware: protect,
};
