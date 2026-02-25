import jwt, { JwtPayload } from 'jsonwebtoken';
import type { StringValue } from 'ms';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return secret;
}

function getRefreshSecret(): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    throw new Error('JWT_REFRESH_SECRET environment variable is required');
  }
  return secret;
}

const ACCESS_EXPIRATION: StringValue = (process.env.JWT_EXPIRATION || '24h') as StringValue;
const REFRESH_EXPIRATION: StringValue = (process.env.JWT_REFRESH_EXPIRATION || '7d') as StringValue;

// ---------------------------------------------------------------------------
// Token payload
// ---------------------------------------------------------------------------

export interface TokenPayload {
  userId: string;
  email: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

/**
 * Generate an access + refresh token pair for the given user.
 */
export function generateTokens(payload: TokenPayload): TokenPair {
  const accessToken = jwt.sign(payload, getSecret(), { expiresIn: ACCESS_EXPIRATION });
  const refreshToken = jwt.sign(payload, getRefreshSecret(), { expiresIn: REFRESH_EXPIRATION });

  return { accessToken, refreshToken };
}

/**
 * Generate only an access token (e.g. after a refresh).
 */
export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, getSecret(), { expiresIn: ACCESS_EXPIRATION });
}

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

/**
 * Verify and decode an access token. Throws on invalid / expired tokens.
 */
export function verifyAccessToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, getSecret()) as JwtPayload & TokenPayload;
  return { userId: decoded.userId, email: decoded.email };
}

/**
 * Verify and decode a refresh token. Throws on invalid / expired tokens.
 */
export function verifyRefreshToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, getRefreshSecret()) as JwtPayload & TokenPayload;
  return { userId: decoded.userId, email: decoded.email };
}
