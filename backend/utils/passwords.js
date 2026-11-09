const argon2 = require('argon2');
const bcrypt = require('bcryptjs');

const hashPassword = password => argon2.hash(password, {
  type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1,
});
const isLegacyHash = hash => typeof hash === 'string' && /^\$2[aby]\$/.test(hash);
const verifyPassword = async (password, hash) => {
  if (typeof hash !== 'string') return false;
  if (isLegacyHash(hash)) return bcrypt.compare(password, hash);
  return hash.startsWith('$argon2id$') && argon2.verify(hash, password);
};

module.exports = { hashPassword, verifyPassword, isLegacyHash };
