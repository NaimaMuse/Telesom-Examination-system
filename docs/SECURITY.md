# Security deployment notes

## Application controls

- Browser sign-in uses an opaque, random session cookie. MongoDB stores its SHA-256 digest and expiration. Sessions expire after 12 hours, and sign-out deletes the session. Password resets invalidate existing sessions through the account’s authentication version. Production cookies use `Secure`, `HttpOnly`, `SameSite=Lax`, and the `__Host-` prefix. The browser no longer stores credentials in local storage.
- Existing programmatic clients can still sign in without a browser origin and use bearer JWTs. The API validates the configured HMAC algorithm, signature, expiry, authentication version, and a one-hour maximum token age. Bearer sign-out invalidates the account’s existing sessions. Browser sessions do not use refresh tokens.
- The API limits failed logins per IP and per identifier/IP pair. Invalid credentials produce a generic message. New and reset passwords use Argon2id, and existing bcrypt hashes migrate after successful staff sign-in. Teacher passwords remain admin-managed.
- Helmet adds API response headers. The built React frontend includes a Content Security Policy that limits scripts to the app origin and retains the existing inline styling and Google Fonts. The API checks CORS origins, requires a custom CSRF header on cookie writes, rejects MongoDB operator and prototype keys in external input, limits request sizes, and omits internal error details.
- Protected routes retain role and record ownership checks. Account, roster, assessment, attendance, and makeup-class workflows keep their existing permissions. Resource pagination rejects invalid page numbers and limits page size.
- Profile photos are decoded and re-encoded with size and pixel limits. Documents have size, extension, MIME, and signature checks. Downloads remain private, permission-checked attachments. Attendance import files use randomized temporary names.
- Structured application logs capture sign-ins, sign-outs, sensitive API writes, rejected requests, and failures with a request ID and status. The audit logger excludes passwords, credentials, session cookies, and request bodies.

## Production configuration

1. Install dependencies from the lockfiles with `npm ci` in both the backend and frontend. Build the frontend and restart the API. Existing browser users will sign in once to start a cookie session.
2. Serve the frontend and `/api` under the same HTTPS site. The default `VITE_API_URL=/api` works when a reverse proxy serves the API there. If the frontend and API use separate origins on the same site, set `VITE_API_URL` to the HTTPS API URL and list the exact frontend origin in `FRONTEND_ORIGINS`. Set `TRUST_PROXY` to the actual trusted reverse proxy addresses, enable `REQUIRE_HTTPS=true` after verifying that Express recognizes proxied HTTPS, and redirect HTTP at the proxy. Set an equivalent CSP with `frame-ancestors 'none'` as a response header at the frontend host.
3. Use a random production `JWT_SECRET` of at least 32 bytes and keep backend environment values in the host’s secret store. Production bootstrap uses `INITIAL_ADMIN_PASSWORD` supplied through that store. Demo seeding is disabled in production. Run a supported, patched Node.js LTS release and install the native dependencies for the deployment platform.
4. Restrict MongoDB to a private network and a dedicated least-privilege account. Enable database TLS and set `MONGO_REQUIRE_TLS=true`. Configure encryption at rest, encrypted backups, credential rotation, retention, and periodic restore tests at the database host.
5. Forward logs to a restricted, append-only collector with alerts and retention. Login throttles are process-local. A multi-instance deployment needs a shared throttling store or equivalent edge limits. Restrict origin and database access with the host firewall, and configure WAF or DDoS protection, deployment scanning, and a recovery plan.

## Controls that require a separate rollout

- Admin MFA, passkeys, email verification, recovery emails, and device management require a new account workflow and enrollment or delivery infrastructure. Student ID-only login is preserved and remains a risk because an ID alone can be guessed or shared.
- Authenticated downloads use the current application permission checks. Signed links, malware scanning, storage quotas, sensitive-field encryption, and centrally enforced log integrity require storage, scanning, or key-management decisions.
- Existing endpoints keep their URLs and existing write semantics. API versioning, generalized idempotency keys, and high-risk re-authentication need client integration. Add signature verification if the application introduces webhooks.
