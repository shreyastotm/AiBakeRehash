import { Request } from 'express';
import rateLimit from 'express-rate-limit';

import { logger } from '../utils/logger';

import { RateLimitError } from './errorHandler';

// ---------------------------------------------------------------------------
// Rate limiter configuration
// ---------------------------------------------------------------------------

const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10); // 15 min
const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000', 10);

/**
 * General API rate limiter — keyed by IP address.
 * Applies to all routes by default.
 */
export const apiRateLimiter = rateLimit({
  windowMs,
  max: process.env.SKIP_RATE_LIMIT === 'true' || process.env.NODE_ENV === 'development' ? 100000 : maxRequests * 5, // 5000 requests per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request): string => {
    const key = req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown';
    if (process.env.NODE_ENV === 'development') {
      // Log keys in dev to debug request storms
      // logger.debug({ key, url: req.url }, 'Rate limit trace');
    }
    return key;
  },
  handler: (req, _res, next) => {
    // Assuming 'logger' and 'RateLimitError' are defined elsewhere or imported
    // This part of the change is applied faithfully as per instruction,
    // even if it introduces undefined references without corresponding imports.
    // If 'logger' and 'RateLimitError' are not globally available or imported,
    // this will cause a runtime error.
    // For a complete solution, these would need to be imported or defined.
    // Example: import logger from '../utils/logger'; import { RateLimitError } from '../errors';
    logger.warn({ ip: req.ip, url: req.url }, 'API rate limit exceeded');
    next(new RateLimitError());
  },
  skip: (req) => {
    const skipVal = String(process.env.SKIP_RATE_LIMIT || '').toLowerCase().trim();
    const nodeEnv = String(process.env.NODE_ENV || '').toLowerCase().trim();
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const isLocal = ip === '::1' || ip === '127.0.0.1' || ip === '::ffff:127.0.0.1';
    const shouldSkip = nodeEnv === 'test' || nodeEnv === 'development' || skipVal === 'true' || isLocal;

    return shouldSkip;
  },
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
    },
  },
});

/**
 * Authentication rate limiter (login/register).
 * More restrictive to prevent brute-force attacks.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: process.env.SKIP_RATE_LIMIT === 'true' || process.env.NODE_ENV === 'development' ? 100000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const skipVal = String(process.env.SKIP_RATE_LIMIT || '').toLowerCase().trim();
    const isLocal = req.ip === '::1' || req.ip === '127.0.0.1' || req.ip === '::ffff:127.0.0.1';
    return process.env.NODE_ENV === 'test' || skipVal === 'true' || isLocal;
  },
  handler: (req, _res, next) => {
    // Assuming 'logger' and 'RateLimitError' are defined elsewhere or imported
    logger.warn({ ip: req.ip, url: req.url }, 'Auth rate limit exceeded');
    next(new RateLimitError('Too many authentication attempts. Please try again after 15 minutes.'));
  },
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts, please try again later',
    },
  },
});

/**
 * Per-user rate limiter — keyed by authenticated user ID.
 * Falls back to IP when no user is present.
 */
export const userRateLimiter = rateLimit({
  windowMs,
  max: process.env.SKIP_RATE_LIMIT === 'true' || process.env.NODE_ENV === 'development' ? 100000 : maxRequests * 2,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const skipVal = String(process.env.SKIP_RATE_LIMIT || '').toLowerCase().trim();
    const isLocal = req.ip === '::1' || req.ip === '127.0.0.1' || req.ip === '::ffff:127.0.0.1';
    return process.env.NODE_ENV === 'test' || skipVal === 'true' || isLocal;
  },
  keyGenerator: (req: Request): string => {
    return req.user?.userId || req.ip || 'unknown';
  },
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
    },
  },
});
