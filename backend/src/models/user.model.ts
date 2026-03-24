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
  business_brand_name?: string | null;
  business_manufacturer_name?: string | null;
  business_manufacturer_address?: string | null;
  business_fssai_license?: string | null;
  business_contact_number?: string | null;
  business_email_id?: string | null;
  default_recipe_creation_mode?: 'manual' | 'smart' | null;
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
  business_brand_name?: string;
  business_manufacturer_name?: string;
  business_manufacturer_address?: string;
  business_fssai_license?: string;
  business_contact_number?: string;
  business_email_id?: string;
  default_recipe_creation_mode?: 'manual' | 'smart';
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
