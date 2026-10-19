const jwt = require('jsonwebtoken');

/**
 * Generate a JSON Web Token for authenticated user
 * @param {string|mongoose.Types.ObjectId} userId - User ID to encode in token
 * @returns {string} Signed JWT token
 */
const generateToken = (userId) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('Server configuration error: JWT_SECRET is not set');
  }

  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  const algorithm = process.env.JWT_ALGORITHM || 'HS256';

  return jwt.sign({ id: userId }, secret, {
    expiresIn,
    algorithm,
  });
};

module.exports = generateToken;
