import { db } from '../config/database';
import { redis } from '../config/redis';
import { hashPassword, verifyPassword } from '../utils/password';
import { generateTokens, TokenPair } from '../utils/jwt';
import {
  ConflictError,
  UnauthorizedError,
  NotFoundError,
} from '../middleware/errorHandler';
import {
  User,
  SafeUser,
  CreateUserInput,
  UpdateUserPreferencesInput,
  LoginInput,
  toSafeUser,
} from '../models/user.model';
import { logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// Token blacklist (Redis-backed)
// ---------------------------------------------------------------------------

const BLACKLIST_PREFIX = 'token:blacklist:';
const BLACKLIST_TTL_SECONDS = 60 * 60 * 24; // 24 h — matches access token lifetime

async function blacklistToken(token: string): Promise<void> {
  try {
    const client = await redis.getClient();
    await client.set(`${BLACKLIST_PREFIX}${token}`, '1', 'EX', BLACKLIST_TTL_SECONDS);
  } catch {
    // Redis unavailable — log but don't block logout
    logger.warn('Redis unavailable — token blacklist skipped');
  }
}

export async function isTokenBlacklisted(token: string): Promise<boolean> {
  try {
    const client = await redis.getClient();
    const result = await client.get(`${BLACKLIST_PREFIX}${token}`);
    return result !== null;
  } catch {
    // Redis unavailable — assume not blacklisted
    return false;
  }
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export async function registerUser(input: CreateUserInput): Promise<{ user: SafeUser; tokens: TokenPair }> {
  const { email, password, display_name } = input;
  const normalizedEmail = email.toLowerCase().trim();

  // Check for existing user
  const existing = await db.query<User>(
    'SELECT id FROM users WHERE email = $1',
    [normalizedEmail],
  );
  if (existing.rowCount && existing.rowCount > 0) {
    throw new ConflictError('A user with this email already exists');
  }

  const passwordHash = await hashPassword(password);

  const result = await db.query<User>(
    `INSERT INTO users (email, password_hash, display_name, unit_preferences, default_currency, language)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [normalizedEmail, passwordHash, display_name || null, '{}', 'INR', 'en'],
  );

  const user = result.rows[0];
  const tokens = generateTokens({ userId: user.id, email: user.email });

  return { user: toSafeUser(user), tokens };
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

export async function loginUser(input: LoginInput): Promise<{ user: SafeUser; tokens: TokenPair }> {
  const { email, password } = input;
  const normalizedEmail = email.toLowerCase().trim();

  const result = await db.query<User>(
    'SELECT * FROM users WHERE email = $1',
    [normalizedEmail],
  );

  if (!result.rowCount || result.rowCount === 0) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const user = result.rows[0];
  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const tokens = generateTokens({ userId: user.id, email: user.email });

  return { user: toSafeUser(user), tokens };
}

// ---------------------------------------------------------------------------
// Logout (blacklist token)
// ---------------------------------------------------------------------------

export async function logoutUser(token: string): Promise<void> {
  await blacklistToken(token);
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export async function getUserProfile(userId: string): Promise<SafeUser> {
  const result = await db.query<User>(
    'SELECT * FROM users WHERE id = $1',
    [userId],
  );

  if (!result.rowCount || result.rowCount === 0) {
    throw new NotFoundError('User');
  }

  return toSafeUser(result.rows[0]);
}

export async function updateUserPreferences(
  userId: string,
  input: UpdateUserPreferencesInput,
): Promise<SafeUser> {
  // Build dynamic SET clause from provided fields
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (input.display_name !== undefined) {
    setClauses.push(`display_name = $${paramIndex++}`);
    values.push(input.display_name);
  }
  if (input.unit_preferences !== undefined) {
    setClauses.push(`unit_preferences = $${paramIndex++}`);
    values.push(JSON.stringify(input.unit_preferences));
  }
  if (input.default_currency !== undefined) {
    setClauses.push(`default_currency = $${paramIndex++}`);
    values.push(input.default_currency);
  }
  if (input.language !== undefined) {
    setClauses.push(`language = $${paramIndex++}`);
    values.push(input.language);
  }

  if (setClauses.length === 0) {
    return getUserProfile(userId);
  }

  setClauses.push(`updated_at = NOW()`);
  values.push(userId);

  const result = await db.query<User>(
    `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values,
  );

  if (!result.rowCount || result.rowCount === 0) {
    throw new NotFoundError('User');
  }

  return toSafeUser(result.rows[0]);
}
