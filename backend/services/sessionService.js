const {createHash, randomBytes} = require('node:crypto');
const Session = require('../models/Session');

const lifetime = 12 * 60 * 60 * 1000;
const cookieName = () => process.env.NODE_ENV === 'production' ? '__Host-telesom_session' : 'telesom_session';
const cookieOptions = () => ({httpOnly:true, secure:process.env.NODE_ENV === 'production', sameSite:'lax', path:'/'});
const digest = token => createHash('sha256').update(token).digest('hex');

function sessionId(req) {
  const prefix = cookieName() + '=';
  const value = (req.get('cookie') || '').split(';').map(part => part.trim()).find(part => part.startsWith(prefix))?.slice(prefix.length);
  return value && /^[A-Za-z0-9_-]{43}$/.test(value) ? digest(value) : null;
}

async function startSession(req, res, user) {
  const token = randomBytes(32).toString('base64url');
  const previous = sessionId(req);
  if (previous) await Session.deleteOne({_id:previous});
  await Session.create({_id:digest(token),user:user._id,authVersion:user.authVersion || 0,expiresAt:new Date(Date.now()+lifetime)});
  res.cookie(cookieName(), token, {...cookieOptions(),maxAge:lifetime});
}

function readSession(id) {
  return Session.findOne({_id:id,expiresAt:{$gt:new Date()}}).lean();
}

async function endSession(req, res) {
  const id = sessionId(req);
  const session = id ? await Session.findByIdAndDelete(id).select('user').lean() : null;
  res.clearCookie(cookieName(), cookieOptions());
  return session?.user;
}

module.exports = { sessionId, startSession, readSession, endSession };
