# Security Guidelines

Security is non-negotiable in AiBake. This document defines mandatory security controls across authentication, data access, input validation, and infrastructure.

## Authentication

### Passwords
- Hash with **bcrypt, 12 rounds** — never fewer
- Never store, log, or transmit plain-text passwords
- `password.ts` utility is the only place bcrypt is called

```typescript
// ✅ Always use the utility
import { hashPassword, verifyPassword } from '../utils/password';
const hash = await hashPassword(plainText); // 12 rounds

// ❌ Never call bcrypt directly or with fewer rounds
const hash = bcrypt.hash(plainText, 8);
```

### JWT Tokens
- Expiry: **24 hours** for access tokens
- Use `jwt.ts` utility for all token generation and verification
- Refresh tokens must be stored server-side (Redis) and invalidated on logout
- Token blacklist must be checked on every protected request (via `auth.middleware.ts`)

### Login Rate Limiting
- **5 failed attempts per account per 15 minutes** → account temporarily locked
- **Per-IP rate limiting** also applied to prevent credential stuffing
- Implement via `rateLimit.middleware.ts`

## Data Isolation — User_ID Everywhere

**Every database query that returns or modifies user data MUST filter by `user_id`.**

This is the most important security rule in AiBake. Failing to include `user_id` in a WHERE clause creates a critical data leakage vulnerability.

```typescript
// ✅ Correct — user can only see their own recipes
const result = await db.query(
  'SELECT * FROM recipes WHERE id = $1 AND user_id = $2',
  [recipeId, req.user.id]
);

// ❌ CRITICAL BUG — any authenticated user can access any recipe
const result = await db.query(
  'SELECT * FROM recipes WHERE id = $1',
  [recipeId]
);
```

Checklist for every API endpoint:
- [ ] Is `user_id` included in SELECT queries?
- [ ] Is `user_id` included in UPDATE queries?
- [ ] Is `user_id` validated before DELETE?
- [ ] Are 404 responses returned (not 403) when resource belongs to another user? (Don't leak existence)

## Secrets Management

### Development
- All secrets in `.env` file (never committed to git — listed in `.gitignore`)
- `.env.example` contains placeholder values only, never real secrets:
  ```
  JWT_SECRET=your-secret-key-here-use-openssl-rand-base64-32
  ```

### Production
- Use AWS Secrets Manager or HashiCorp Vault
- Rotate secrets on any suspected compromise
- Never log secrets, tokens, or API keys

### Hardcoded Secrets = Immediate Block
Any hardcoded secret in source code is a **critical security violation**. The `security-vulnerability-scanner` hook will flag these.

## SQL Injection Prevention

Parameterized queries only — no exceptions:

```typescript
// ✅ Safe
await db.query('SELECT * FROM users WHERE email = $1', [email]);

// ❌ SQL injection vulnerability
await db.query(`SELECT * FROM users WHERE email = '${email}'`);
```

The `database-schema-validator` hook checks for string concatenation patterns in SQL.

## XSS Prevention

- **Never use `dangerouslySetInnerHTML`** in React components
- React's JSX escapes values by default — don't break this by using raw HTML injection
- Sanitize any rich text before storage if user-generated HTML is ever allowed

## Input Validation

All API inputs must be validated at the controller level before reaching services:

| Input Type | Rule |
|------------|------|
| Quantities | Must be positive numbers with a maximum (e.g., 0.001–100,000g) |
| Costs/Prices | Must be ≥ 0, maximum ₹10,000,000 |
| Profit margin | Must be 0–99% (≥100% throws `InvalidMarginError`) |
| Water activity | Must be 0.00–1.00 |
| Email | RFC 5322 format validation |
| Password | Min 8 chars, at least one uppercase, one lowercase, one number |
| UUIDs | Must be valid UUID format (v4) |
| Text fields | Max length enforced (title: 255, description: 5000) |

## Security Headers

`helmet` middleware applies these headers on every response:
- `Content-Security-Policy`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security` (HTTPS only)
- `X-XSS-Protection`

CORS is configured to a whitelist of allowed origins — never `*` in production.

## Sensitive Data in Responses

API responses must never include:
- Password hashes
- JWT secrets or raw tokens
- Database internal IDs that expose schema
- Stack traces (in production)
- PII beyond what the requesting user owns

## Logging Security

```typescript
// ✅ Safe log
logger.info('User login', { userId: user.id, email: maskEmail(user.email) });

// ❌ Never log
logger.info('User login', { password: req.body.password }); // never
logger.error('DB error', { connectionString: dbUrl });      // never
```

Mask any email, phone, or PII in logs. `logger.ts` should have utilities for this.

## Dependency Security

- Run `npm audit` in CI and fail on critical/high vulnerabilities
- Keep dependencies up to date — target <6 months behind latest stable
- Use Snyk or Dependabot for automated vulnerability alerts

## CSRF Protection

- Use double-submit cookie pattern for state-changing requests from browser
- JWT in Authorization header (not cookie) is CSRF-safe by default
- If cookies are ever used for JWT storage, add `SameSite=Strict` or CSRF tokens

## File Upload Security

- Validate MIME type on server (not just extension)
- Validate file size: images ≤10MB, audio ≤50MB
- Scan uploaded files for malware before storing
- Store in cloud storage (S3/R2) — never on local filesystem in production
- Generate signed URLs for access — never expose bucket paths directly
