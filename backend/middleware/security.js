const {randomUUID} = require('node:crypto');
const cors = require('cors');
const helmet = require('helmet');
const {rateLimit, ipKeyGenerator} = require('express-rate-limit');
const {sessionId} = require('../services/sessionService');

const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);
const localOrigins = /^http:\/\/(localhost|127\.0\.0\.1):(3000|4173|5173)$/;
const errorResponse = (res, status, message) => res.status(status).json({success:false, message});
const csrfHeader = req => req.get('X-Requested-With') === 'XMLHttpRequest';

function installSecurity(app) {
  const production = process.env.NODE_ENV === 'production';
  const allowed = new Set((process.env.FRONTEND_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean));
  // Express trusts only the named proxy addresses/subnets, never arbitrary forwarded headers.
  if (process.env.TRUST_PROXY) app.set('trust proxy', process.env.TRUST_PROXY.split(',').map(value => value.trim()).filter(Boolean));
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    req.requestId = randomUUID();
    const namespace = /^\/api\/[a-z-]+(?=\/|$)/.exec(req.path)?.[0];
    res.set('X-Request-Id', req.requestId).set('Cache-Control', 'no-store');
    res.once('finish', () => {
      const status = res.statusCode;
      const login = req.method === 'POST' && req.path === '/api/auth/login';
      if (login || status === 401 || status === 403 || status === 429 || status >= 500 ||
          req.securityEvent || (req.user && !safeMethods.has(req.method))) {
        console.info(JSON.stringify({
          timestamp:new Date().toISOString(), requestId:req.requestId,
          event:req.securityEvent || (login ? 'login' : 'api_request'),
          actor:req.user || req.auditActor ? String(req.user?._id || req.auditActor) : null,
          method:req.method, route:req.route ? (req.baseUrl || namespace || '') + req.route.path : namespace || null,
          resource:Object.values(req.params || {}).find(value => typeof value === 'string' && /^[0-9a-f]{24}$/i.test(value)) || null,
          status, outcome:status < 400 ? 'success' : 'failure',
        }));
      }
    });
    next();
  });
  app.use(helmet({
    strictTransportSecurity: production ? undefined : false,
    contentSecurityPolicy: {directives:{defaultSrc:["'none'"], frameAncestors:["'none'"], upgradeInsecureRequests:null}},
    crossOriginResourcePolicy: {policy:'same-site'},
  }));
  app.use((req, res, next) => {
    if (process.env.REQUIRE_HTTPS === 'true' && !req.secure && req.path !== '/api/health') {
      return errorResponse(res, 403, 'HTTPS is required.');
    }
    const origin = req.get('Origin');
    if (origin && !allowed.has(origin) && origin !== req.protocol + '://' + req.get('Host') &&
        (production || !localOrigins.test(origin))) {
      return errorResponse(res, 403, 'Origin is not allowed.');
    }
    if (!safeMethods.has(req.method) && (sessionId(req) || req.get('X-Session-Mode') === 'cookie' || origin) && !csrfHeader(req)) {
      req.securityEvent = 'csrf_rejected';
      return errorResponse(res, 403, 'Request verification failed.');
    }
    next();
  });
  app.use(cors({origin:true, credentials:true, exposedHeaders:['X-Request-Id','Retry-After','RateLimit','RateLimit-Policy']}));
  app.use('/api', rateLimit({windowMs:60_000,limit:6000,standardHeaders:'draft-8',legacyHeaders:false,
    handler:(req,res) => errorResponse(res,429,'Too many requests. Try again shortly.')}));
}

function hasUnsafeKey(value) {
  if (!value || typeof value !== 'object') return false;
  const pending = [value];
  while (pending.length) {
    const item = pending.pop();
    for (const [key, child] of Object.entries(item)) {
      if (key.startsWith('$') || key.includes('.') || ['__proto__','constructor','prototype'].includes(key)) return true;
      if (child && typeof child === 'object') pending.push(child);
    }
  }
  return false;
}

function validateInput(req, res, next) {
  if (hasUnsafeKey(req.body) || hasUnsafeKey(req.query)) {
    req.securityEvent = 'unsafe_input';
    return errorResponse(res, 400, 'Invalid request fields.');
  }
  next();
}

const loginLimitOptions = {
  windowMs:15 * 60_000, standardHeaders:'draft-8', legacyHeaders:false, skipSuccessfulRequests:true,
  handler:(req,res) => errorResponse(res,429,'Too many sign-in attempts. Try again later.'),
};
const loginByIp = rateLimit({...loginLimitOptions,limit:100});
const loginByIdentifier = rateLimit({
  ...loginLimitOptions,limit:8,
  keyGenerator:req => ipKeyGenerator(req.ip) + ':' + String(req.body?.studentId || req.body?.email || req.body?.identifier || '').trim().toLowerCase().slice(0,254),
});

module.exports = {installSecurity,validateInput,loginByIp,loginByIdentifier};
