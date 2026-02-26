// ---------------------------------------------------------------------------
// User model types — mirrors the `users` table in PostgreSQL
// ---------------------------------------------------------------------------

export interface User {
  id: string;
  email: string;
  password_hash: string;
  display_name: string | null;
  unit_preferences: Record<string, string>; // e.g. { "sugar": "cups" }
  default_currency: string;
  language: string;
  created_at: Date;
  updated_at: Date;
}

/** User object safe to return in API responses (no password hash). */
export type SafeUser = Omit<User, 'password_hash'>;

export interface CreateUserInput {
  email: string;
  password: string;
  display_name?: string;
}

export interface UpdateUserPreferencesInput {
  display_name?: string;
  unit_preferences?: Record<string, string>;
  default_currency?: string;
  language?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

/** Strip password_hash from a user row. */
export function toSafeUser(user: User): SafeUser {
  const { password_hash: _, ...safe } = user;
  return safe;
}
