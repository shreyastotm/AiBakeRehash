import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, verifyRefreshToken, generateAccessToken, TokenPayload } from '../utils/jwt';
import { logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// Extend Express Request to carry authenticated user info
// ---------------------------------------------------------------------------

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return null;
  }
  return header.slice(7);
}

// ---------------------------------------------------------------------------
// Middleware: require a valid access token
// ---------------------------------------------------------------------------

/**
 * Protect a route — rejects with 401 if no valid access token is present.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);

  if (!token) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch (err) {
    logger.warn({ err }, 'Invalid or expired access token');
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}

// ---------------------------------------------------------------------------
// Middleware: optional auth (sets req.user if token present, but doesn't block)
// ---------------------------------------------------------------------------

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);

  if (token) {
    try {
      req.user = verifyAccessToken(token);
    } catch {
      // token invalid — proceed without user context
    }
  }

  next();
}

// ---------------------------------------------------------------------------
// Handler: refresh access token using a refresh token
// ---------------------------------------------------------------------------

/**
 * POST /api/auth/refresh
 * Body: { refreshToken: string }
 * Returns a new access token if the refresh token is valid.
 */
export function handleTokenRefresh(req: Request, res: Response): void {
  const { refreshToken } = req.body as { refreshToken?: string };

  if (!refreshToken) {
    res.status(400).json({ success: false, error: 'Refresh token is required' });
    return;
  }

  try {
    const payload = verifyRefreshToken(refreshToken);
    const accessToken = generateAccessToken(payload);
    res.json({ success: true, data: { accessToken } });
  } catch (err) {
    logger.warn({ err }, 'Invalid or expired refresh token');
    res.status(401).json({ success: false, error: 'Invalid or expired refresh token' });
  }
}
