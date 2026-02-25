import pino from 'pino';
import { randomUUID } from 'crypto';

// ---------------------------------------------------------------------------
// Sensitive data patterns for masking
// ---------------------------------------------------------------------------

const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'password',
  'password_hash',
  'token',
  'accessToken',
  'refreshToken',
  'secret',
  'creditCard',
  'ssn',
  'email',
  'phone',
  'address',
];

// ---------------------------------------------------------------------------
// Logger instance
// ---------------------------------------------------------------------------

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: REDACT_PATHS,
    censor: '[REDACTED]',
  },
  serializers: {
    err: pino.stdSerializers.err,
    req: (req) => ({
      method: req.method,
      url: req.url,
      requestId: req.id,
      remoteAddress: req.socket?.remoteAddress,
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
  transport:
    process.env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss.l' } }
      : undefined,
  base: {
    service: 'aibake-api',
    env: process.env.NODE_ENV || 'development',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

// ---------------------------------------------------------------------------
// Request ID generation
// ---------------------------------------------------------------------------

/**
 * Generate a unique request ID. Uses the incoming `X-Request-Id` header if
 * present, otherwise creates a new UUID v4.
 */
export function getRequestId(incomingHeader?: string): string {
  return incomingHeader || randomUUID();
}

// ---------------------------------------------------------------------------
// Child logger factory
// ---------------------------------------------------------------------------

/**
 * Create a child logger bound to a specific request ID.
 * Attach this to `req.log` so all downstream logging carries the ID.
 */
export function createRequestLogger(requestId: string) {
  return logger.child({ requestId });
}
