const { createPublicKey } = require('node:crypto');
const jwt = require('jsonwebtoken');

let cachedKeys = new Map();
let expiresAt = 0;
let lastFetch = 0;
let pendingFetch;

async function googleKey(kid) {
  const now = Date.now();
  if (now < expiresAt && (cachedKeys.has(kid) || now - lastFetch < 60_000)) {
    return cachedKeys.get(kid);
  }
  if (!pendingFetch) {
    lastFetch = now;
    pendingFetch = (async () => {
      const response = await fetch('https://www.googleapis.com/oauth2/v3/certs', {
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) throw new Error('Could not fetch Google signing keys');
      const { keys } = await response.json();
      cachedKeys = new Map(keys.filter(key => key.kty === 'RSA' && key.alg === 'RS256')
        .map(key => [key.kid, createPublicKey({ key, format: 'jwk' })]));
      const maxAge = Number(/\bmax-age=(\d+)/i.exec(response.headers.get('cache-control') || '')?.[1] || 0);
      expiresAt = Date.now() + maxAge * 1000;
    })().finally(() => { pendingFetch = undefined; });
  }
  await pendingFetch;
  return cachedKeys.get(kid);
}

async function verifiedEmail(credential, clientId, nonce) {
  let decoded;
  try {
    decoded = jwt.decode(credential, { complete: true });
  } catch {
    return null;
  }
  if (decoded?.header?.alg !== 'RS256' || typeof decoded.header.kid !== 'string' ||
      decoded.payload?.nonce !== nonce) return null;

  const key = await googleKey(decoded.header.kid);
  if (!key) return null;
  let claims;
  try {
    claims = jwt.verify(credential, key, {
      algorithms: ['RS256'],
      issuer: ['accounts.google.com', 'https://accounts.google.com'],
      audience: clientId,
      maxAge: '10m',
      clockTolerance: 5,
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) return null;
    throw error;
  }
  if (!Number.isFinite(claims.exp) || typeof claims.sub !== 'string' ||
      claims.email_verified !== true || typeof claims.email !== 'string') return null;
  const email = claims.email.toLowerCase();
  // Google is authoritative for Gmail and hosted Workspace addresses.
  return email.endsWith('@gmail.com') || (claims.hd && email.endsWith('@' + claims.hd)) ? email : null;
}

module.exports = { verifiedEmail };
