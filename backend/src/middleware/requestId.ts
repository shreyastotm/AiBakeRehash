import { Request, Response, NextFunction } from 'express';
import { Logger } from 'pino';
import { getRequestId, createRequestLogger } from '../utils/logger';

// ---------------------------------------------------------------------------
// Extend Express Request to carry request ID and scoped logger
// ---------------------------------------------------------------------------

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      log?: Logger;
    }
  }
}

/**
 * Middleware that assigns a unique request ID to every incoming request.
 * - Reads `X-Request-Id` header if provided (for distributed tracing)
 * - Otherwise generates a UUID v4
 * - Attaches `requestId` to the request object and sets the response header
 * - Creates a child logger bound to the request ID
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = getRequestId(req.headers['x-request-id'] as string | undefined);

  req.requestId = requestId;
  req.log = createRequestLogger(requestId);

  // Echo back in response header for client-side correlation
  res.setHeader('X-Request-Id', requestId);

  next();
}
