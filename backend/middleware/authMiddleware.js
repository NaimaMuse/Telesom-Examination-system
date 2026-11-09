const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const {sessionId,readSession} = require('../services/sessionService');

const deny = (res, next, status, message) => {
  res.status(status);
  return next(new Error(message));
};

async function protect(req, res, next) {
  try {
    const id = sessionId(req);
    const authorization = req.headers.authorization;
    let userId, authVersion;
    if (id) {
      const session = await readSession(id);
      userId = session?.user;
      authVersion = session?.authVersion;
      req.browserSession = true;
    } else {
      if (!authorization?.startsWith('Bearer ')) return deny(res,next,401,'Not authorized, no token provided or invalid format');
      const secret = process.env.JWT_SECRET;
      const algorithm = process.env.JWT_ALGORITHM || 'HS256';
      if (!secret || !['HS256','HS384','HS512'].includes(algorithm)) throw new Error('Invalid JWT configuration');
      try {
        const decoded = jwt.verify(authorization.slice(7), secret, {algorithms:[algorithm],maxAge:'1h'});
        userId = decoded.id || decoded.userId || decoded._id;
        authVersion = decoded.authVersion;
      } catch (error) {
        return deny(res,next,401,error.name === 'TokenExpiredError' ? 'Session expired. Please sign in again.' : 'Not authorized, invalid or malformed token');
      }
    }
    if (!mongoose.isValidObjectId(userId)) return deny(res,next,401,'Session expired. Please sign in again.');
    const user = await User.findById(userId).select('-password');
    if (!user) return deny(res,next,401,'Session expired. Please sign in again.');
    if (!user.isActive) return deny(res,next,403,'Account is inactive, please contact administrator');
    if ((authVersion || 0) !== (user.authVersion || 0)) return deny(res,next,401,'Session expired. Please sign in again.');

    req.user = user;
    return next();
  } catch (error) {
    res.status(500);
    next(error);
  }
}

module.exports = {protect,authMiddleware:protect};
