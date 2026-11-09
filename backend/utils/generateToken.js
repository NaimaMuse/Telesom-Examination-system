const jwt = require('jsonwebtoken');

/**
 * Generate a JSON Web Token for authenticated user
 * @param {string|mongoose.Types.ObjectId} userId - User ID to encode in token
 * @returns {string} Signed JWT token
 */
const generateToken = (userId, authVersion = 0) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('Server configuration error: JWT_SECRET is not set');
  }

  const expiresIn = process.env.JWT_EXPIRES_IN || '1h';
  const algorithm = process.env.JWT_ALGORITHM || 'HS256';
  if (!['HS256','HS384','HS512'].includes(algorithm)) throw new Error('Invalid JWT algorithm');

  return jwt.sign({ id: userId, authVersion }, secret, {
    expiresIn,
    algorithm,
  });
};

module.exports = generateToken;
