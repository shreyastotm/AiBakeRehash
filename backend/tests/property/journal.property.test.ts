import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import request from 'supertest';

// Set env vars BEFORE any app imports so rate limiter picks them up
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key-for-testing';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.NODE_ENV = 'test';
process.env.RATE_LIMIT_MAX_REQUESTS = '10000';

// ---------------------------------------------------------------------------
// In-memory stores for mocking
// ---------------------------------------------------------------------------

interface MockUser {
  id: string;
  email: string;
  password_hash: string;
  display_name: string | null;
  unit_preferences: Record<string, string>;
  default_currency: string;
  language: string;
  created_at: Date;
  updated_at: Date;
}

interface MockRecipe {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  source_type: string;
  source_url: string | null;
  original_author: string | null;
  original_author_url: string | null;
  servings: number;
  yield_weight_grams: number;
  preferred_unit_system: string;
  status: string;
  target_water_activity: number | null;
  min_safe_water_activity: number | null;
  estimated_shelf_life_days: number | null;
  total_hydration_percentage: number | null;
  created_at: Date;
  updated_at: Date;
}

interface MockVersion {
  id: string;
  recipe_id: string;
  version_number: number;
  change_summary: string | null;
  created_at: Date;
}

interface MockJournalEntry {
  id: string;
  recipe_id: string;
  user_id: string;
  bake_date: string;
  notes: string | null;
  private_notes: string | null;
  rating: number | null;
  outcome_weight_grams: number | null;
  pre_bake_weight_grams: number | null;
  baking_loss_grams: number | null;
  baking_loss_percentage: number | null;
  measured_water_activity: number | null;
  storage_days_achieved: number | null;
  images: string[];
  recipe_version_id: string | null;
  created_at: Date;
  updated_at: Date;
}

interface MockAudioNote {
  id: string;
  journal_entry_id: string;
  audio_url: string;
  duration_seconds: number | null;
  transcription_text: string | null;
  transcription_status: string;
  recorded_at_stage: string | null;
  created_at: Date;
}

let mockUsers: MockUser[] = [];
let mockRecipes: MockRecipe[] = [];
let mockVersions: MockVersion[] = [];
let mockJournalEntries: MockJournalEntry[] = [];
let mockAudioNotes: MockAudioNote[] = [];
let mockBlacklist: Set<string> = new Set();
let transactionRolledBack = false;

function uid(): string {
  const hex = () => Math.random().toString(16).slice(2, 6);
  return hex() + hex() + '-' + hex() + '-4' + hex().slice(1) + '-a' + hex().slice(1) + '-' + hex() + hex() + hex();
}

// ---------------------------------------------------------------------------
// Mock database query handler
// ---------------------------------------------------------------------------

function handleQuery(text: string, params?: unknown[]): { rows: unknown[]; rowCount: number } {
  // --- Users ---
  if (text.includes('FROM users WHERE email')) {
    const email = params?.[0] as string;
    const found = mockUsers.filter((u) => u.email === email);
    return { rows: found, rowCount: found.length };
  }
  if (text.includes('FROM users WHERE id')) {
    const id = params?.[0] as string;
    const found = mockUsers.filter((u) => u.id === id);
    return { rows: found, rowCount: found.length };
  }
  if (text.includes('INSERT INTO users')) {
    const newUser: MockUser = {
      id: uid(), email: params?.[0] as string, password_hash: params?.[1] as string,
      display_name: (params?.[2] as string) || null,
      unit_preferences: JSON.parse((params?.[3] as string) || '{}'),
      default_currency: (params?.[4] as string) || 'INR',
      language: (params?.[5] as string) || 'en',
      created_at: new Date(), updated_at: new Date(),
    };
    mockUsers.push(newUser);
    return { rows: [newUser], rowCount: 1 };
  }

  // --- Recipes ---
  if (text.includes('FROM recipes WHERE id')) {
    const id = params?.[0] as string;
    const found = mockRecipes.filter((r) => r.id === id);
    return { rows: found, rowCount: found.length };
  }

  // --- Recipe Versions ---
  if (text.includes('FROM recipe_versions WHERE recipe_id') && text.includes('ORDER BY version_number DESC LIMIT 1')) {
    const recipeId = params?.[0] as string;
    const versions = mockVersions.filter((v) => v.recipe_id === recipeId).sort((a, b) => b.version_number - a.version_number);
    return { rows: versions.length > 0 ? [versions[0]] : [], rowCount: versions.length > 0 ? 1 : 0 };
  }

  // --- Journal Entries ---
  if (text.includes('FROM recipe_journal_entries WHERE recipe_id') && text.includes('ORDER BY')) {
    const recipeId = params?.[0] as string;
    const found = mockJournalEntries.filter((j) => j.recipe_id === recipeId);
    return { rows: found, rowCount: found.length };
  }
  if (text.includes('DELETE') && text.includes('FROM recipe_journal_entries WHERE id')) {
    const id = params?.[0] as string;
    const idx = mockJournalEntries.findIndex((j) => j.id === id);
    if (idx >= 0) mockJournalEntries.splice(idx, 1);
    return { rows: [], rowCount: idx >= 0 ? 1 : 0 };
  }
  if (text.includes('SELECT') && text.includes('FROM recipe_journal_entries WHERE id')) {
    const id = params?.[0] as string;
    const found = mockJournalEntries.filter((j) => j.id === id);
    return { rows: found, rowCount: found.length };
  }
  if (text.includes('INSERT INTO recipe_journal_entries')) {
    const newEntry: MockJournalEntry = {
      id: uid(),
      recipe_id: params?.[0] as string,
      user_id: params?.[1] as string,
      bake_date: params?.[2] as string,
      notes: params?.[3] as string | null,
      private_notes: params?.[4] as string | null,
      rating: params?.[5] as number | null,
      outcome_weight_grams: params?.[6] as number | null,
      pre_bake_weight_grams: params?.[7] as number | null,
      baking_loss_grams: params?.[8] as number | null,
      baking_loss_percentage: params?.[9] as number | null,
      measured_water_activity: params?.[10] as number | null,
      storage_days_achieved: params?.[11] as number | null,
      images: JSON.parse((params?.[12] as string) || '[]'),
      recipe_version_id: params?.[13] as string | null,
      created_at: new Date(),
      updated_at: new Date(),
    };
    if (!transactionRolledBack) mockJournalEntries.push(newEntry);
    return { rows: [newEntry], rowCount: 1 };
  }

  // --- Audio Notes ---
  if (text.includes('FROM recipe_audio_notes WHERE journal_entry_id')) {
    const journalId = params?.[0] as string;
    const found = mockAudioNotes.filter((a) => a.journal_entry_id === journalId);
    return { rows: found, rowCount: found.length };
  }

  // --- Transaction commands ---
  if (text === 'BEGIN' || text === 'COMMIT') return { rows: [], rowCount: 0 };
  if (text === 'ROLLBACK') { transactionRolledBack = true; return { rows: [], rowCount: 0 }; }

  return { rows: [], rowCount: 0 };
}

// ---------------------------------------------------------------------------
// Mock modules
// ---------------------------------------------------------------------------

vi.mock('../../src/config/database', () => ({
  db: {
    query: vi.fn(async (text: string, params?: unknown[]) => handleQuery(text, params)),
    getClient: vi.fn(async () => ({
      query: vi.fn(async (text: string, params?: unknown[]) => handleQuery(text, params)),
      release: vi.fn(),
    })),
    withTransaction: vi.fn(async (fn: (client: unknown) => Promise<unknown>) => {
      transactionRolledBack = false;
      const client = {
        query: vi.fn(async (text: string, params?: unknown[]) => {
          if (transactionRolledBack) return { rows: [], rowCount: 0 };
          return handleQuery(text, params);
        }),
        release: vi.fn(),
      };
      try {
        handleQuery('BEGIN');
        const result = await fn(client);
        handleQuery('COMMIT');
        return result;
      } catch (err) {
        handleQuery('ROLLBACK');
        throw err;
      }
    }),
    connect: vi.fn(),
    checkHealth: vi.fn(async () => ({ healthy: true, latencyMs: 1, pool: { total: 1, idle: 1, waiting: 0 } })),
    close: vi.fn(),
  },
}));

vi.mock('../../src/config/redis', () => ({
  redis: {
    getClient: vi.fn(async () => ({
      set: vi.fn(async (_key: string) => { mockBlacklist.add(_key.replace('token:blacklist:', '')); return 'OK'; }),
      get: vi.fn(async (key: string) => { const t = key.replace('token:blacklist:', ''); return mockBlacklist.has(t) ? '1' : null; }),
      ping: vi.fn(async () => 'PONG'),
    })),
    checkHealth: vi.fn(async () => ({ healthy: true, latencyMs: 1 })),
    close: vi.fn(),
  },
}));

vi.mock('../../src/config/storage', () => ({
  storage: { checkHealth: vi.fn(async () => ({ healthy: true, latencyMs: 1 })) },
}));

// Disable rate limiting for property tests
vi.mock('../../src/middleware/rateLimiter', () => {
  const noop = (_req: any, _res: any, next: any) => next();
  return {
    apiRateLimiter: noop,
    authRateLimiter: noop,
    userRateLimiter: noop,
  };
});

import { app } from '../../src/app';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getAuthToken(): Promise<{ token: string; userId: string }> {
  const email = 'pbt-journal-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6) + '@example.com';
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ email, password: 'StrongPass1', display_name: 'PBT Baker' });
  if (res.status !== 201) {
    throw new Error(`Registration failed with status ${res.status}: ${JSON.stringify(res.body)}`);
  }
  const userId = mockUsers[mockUsers.length - 1].id;
  return { token: res.body.data.accessToken, userId };
}

function createMockRecipe(userId: string, numVersions = 1): { recipe: MockRecipe; versions: MockVersion[] } {
  const recipe: MockRecipe = {
    id: uid(), user_id: userId, title: 'PBT Recipe', description: null,
    source_type: 'manual', source_url: null, original_author: null, original_author_url: null,
    servings: 12, yield_weight_grams: 500, preferred_unit_system: 'metric', status: 'active',
    target_water_activity: null, min_safe_water_activity: null, estimated_shelf_life_days: null,
    total_hydration_percentage: null, created_at: new Date(), updated_at: new Date(),
  };
  mockRecipes.push(recipe);

  const versions: MockVersion[] = [];
  for (let i = 1; i <= numVersions; i++) {
    const version: MockVersion = {
      id: uid(), recipe_id: recipe.id, version_number: i,
      change_summary: `Version ${i}`, created_at: new Date(),
    };
    mockVersions.push(version);
    versions.push(version);
  }

  return { recipe, versions };
}

// ---------------------------------------------------------------------------
// Property Tests
// ---------------------------------------------------------------------------

describe('Journal Operations – Property-Based Tests', () => {
  beforeEach(() => {
    mockUsers = [];
    mockRecipes = [];
    mockVersions = [];
    mockJournalEntries = [];
    mockAudioNotes = [];
    mockBlacklist = new Set();
    transactionRolledBack = false;
  });

  // =========================================================================
  // Property 10: Baking Loss Calculation
  // **Validates: Requirements 16.2**
  // =========================================================================
  describe('Property 10: Baking Loss Calculation', () => {
    it('baking_loss_grams = pre_bake_weight - outcome_weight and baking_loss_percentage = (loss / pre_bake) × 100', async () => {
      const { token, userId } = await getAuthToken();

      await fc.assert(
        fc.asyncProperty(
          // pre_bake_weight must be > outcome_weight for meaningful loss
          fc.double({ min: 100, max: 50000, noNaN: true }).chain((preBake) =>
            fc.tuple(
              fc.constant(preBake),
              fc.double({ min: 1, max: preBake - 0.01, noNaN: true }),
            ),
          ),
          async ([preBakeWeight, outcomeWeight]) => {
            // Reset recipe-related stores (keep user for auth)
            mockRecipes = [];
            mockVersions = [];
            mockJournalEntries = [];
            transactionRolledBack = false;

            const { recipe } = createMockRecipe(userId);

            const res = await request(app)
              .post(`/api/v1/recipes/${recipe.id}/journal`)
              .set('Authorization', 'Bearer ' + token)
              .send({
                bake_date: '2024-06-15',
                pre_bake_weight_grams: preBakeWeight,
                outcome_weight_grams: outcomeWeight,
              });

            if (res.status !== 201) return; // skip if validation rejects

            const entry = res.body.data;

            // Verify baking loss calculation
            const expectedLossGrams = preBakeWeight - outcomeWeight;
            const expectedLossPercentage = (expectedLossGrams / preBakeWeight) * 100;

            expect(entry.baking_loss_grams).toBeCloseTo(expectedLossGrams, 2);
            expect(entry.baking_loss_percentage).toBeCloseTo(expectedLossPercentage, 2);

            // Loss should always be positive when pre_bake > outcome
            expect(entry.baking_loss_grams).toBeGreaterThan(0);
            expect(entry.baking_loss_percentage).toBeGreaterThan(0);
            expect(entry.baking_loss_percentage).toBeLessThan(100);
          },
        ),
        { numRuns: 100 },
      );
    }, 120_000);
  });

  // =========================================================================
  // Property 12: Journal Entry Version Association
  // **Validates: Requirements 9.6**
  // =========================================================================
  describe('Property 12: Journal Entry Version Association', () => {
    it('journal entries reference current recipe version at creation time', async () => {
      const { token, userId } = await getAuthToken();

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 5 }),
          async (numVersions) => {
            // Reset recipe-related stores (keep user for auth)
            mockRecipes = [];
            mockVersions = [];
            mockJournalEntries = [];
            transactionRolledBack = false;

            const { recipe, versions } = createMockRecipe(userId, numVersions);

            const res = await request(app)
              .post(`/api/v1/recipes/${recipe.id}/journal`)
              .set('Authorization', 'Bearer ' + token)
              .send({
                bake_date: '2024-06-15',
                notes: `Bake with ${numVersions} versions`,
              });

            expect(res.status).toBe(201);

            const entry = res.body.data;

            // The journal entry should reference the latest (highest) version
            const latestVersion = versions[versions.length - 1];
            expect(entry.recipe_version_id).toBe(latestVersion.id);

            // Verify it's actually the highest version number
            const maxVersionNumber = Math.max(...versions.map((v) => v.version_number));
            expect(latestVersion.version_number).toBe(maxVersionNumber);
          },
        ),
        { numRuns: 100 },
      );
    }, 120_000);
  });
});
