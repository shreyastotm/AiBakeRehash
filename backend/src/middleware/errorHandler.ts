import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// Application error classes
// ---------------------------------------------------------------------------

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode = 500,
    code = 'INTERNAL_ERROR',
    isOperational = true,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class ValidationError extends AppError {
  public readonly details: unknown[];

  constructor(message = 'Validation failed', details: unknown[] = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409, 'CONFLICT');
  }
}

// ---------------------------------------------------------------------------
// Error response shape
// ---------------------------------------------------------------------------

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown[];
    requestId?: string;
  };
}

// ---------------------------------------------------------------------------
// Error handler middleware
// ---------------------------------------------------------------------------

/**
 * Express error-handling middleware. Must be registered after all routes.
 * Produces a consistent JSON error envelope and logs the error.
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const requestId = req.requestId;

  // Determine status and code
  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let details: unknown[] | undefined;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    if (err instanceof ValidationError) {
      details = err.details;
    }
  }

  // Log — operational errors at warn, unexpected at error
  const logPayload = {
    err,
    requestId,
    statusCode,
    method: req.method,
    url: req.originalUrl,
  };

  if (err instanceof AppError && err.isOperational) {
    logger.warn(logPayload, `Operational error: ${err.message}`);
  } else {
    logger.error(logPayload, `Unexpected error: ${err.message}`);
  }

  // Never leak internal details in production
  const message =
    statusCode === 500 && process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message;

  const body: ErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details && details.length > 0 ? { details } : {}),
      ...(requestId ? { requestId } : {}),
    },
  };

  res.status(statusCode).json(body);
}

// ---------------------------------------------------------------------------
// 404 catch-all middleware
// ---------------------------------------------------------------------------

/**
 * Register after all routes to catch unmatched paths.
 */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl}`));
}
