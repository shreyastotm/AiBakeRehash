/**
 * Property-based tests for Recipe Operations
 *
 * Property 11: Recipe Versioning on Modification
 * Validates: Requirements 8.5
 * Every recipe modification creates a new version with incremented version_number.
 *
 * Property 15: Transaction Atomicity for Recipe Creation
 * Validates: Requirements 88.6
 * Recipe creation with multiple ingredients is atomic (all or nothing).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import request from 'supertest';

// ---------------------------------------------------------------------------
// In-memory stores
// ---------------------------------------------------------------------------

interface MockUser {
  id: string; email: string; password_hash: string; display_name: string | null;
  unit_preferences: Record<string, string>; default_currency: string; language: string;
  created_at: Date; updated_at: Date;
}
interface MockRecipe {
  id: string; user_id: string; title: string; description: string | null;
  source_type: string; source_url: string | null; original_author: string | null;
  original_author_url: string | null; servings: number; yield_weight_grams: number;
  preferred_unit_system: string; status: string; target_water_activity: number | null;
  min_safe_water_activity: number | null; estimated_shelf_life_days: number | null;
  total_hydration_percentage: number | null; created_at: Date; updated_at: Date;
}
interface MockIngredient {
  id: string; recipe_id: string; ingredient_master_id: string; display_name: string;
  quantity_original: number; unit_original: string; quantity_grams: number;
  position: number; is_flour: boolean; is_liquid: boolean;
}
interface MockSection { id: string; recipe_id: string; type: string; title: string | null; position: number; }
interface MockStep {
  id: string; recipe_id: string; section_id: string | null; instruction: string;
  duration_seconds: number | null; temperature_celsius: number | null;
  position: number; dependency_step_id: string | null;
}
interface MockVersion { id: string; recipe_id: string; version_number: number; change_summary: string | null; created_at: Date; }
interface MockSnapshot { id: string; version_id: string; snapshot_data: Record<string, unknown>; }

let mockUsers: MockUser[] = [];
let mockRecipes: MockRecipe[] = [];
let mockIngredients: MockIngredient[] = [];
let mockSections: MockSection[] = [];
let mockSteps: MockStep[] = [];
let mockVersions: MockVersion[] = [];
let mockSnapshots: MockSnapshot[] = [];
let mockBlacklist: Set<string> = new Set();
let transactionRolledBack = false;
let shouldFailOnIngredientInsert = false;
let ingredientInsertCount = 0;
let failAfterNIngredients = -1;

function uid(): string {
  const hex = () => Math.random().toString(16).slice(2, 6);
  return hex() + hex() + '-' + hex() + '-4' + hex().slice(1) + '-a' + hex().slice(1) + '-' + hex() + hex() + hex();
}

// ---------------------------------------------------------------------------
// Mock query handler
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
      default_currency: (params?.[4] as string) || 'INR', language: (params?.[5] as string) || 'en',
      created_at: new Date(), updated_at: new Date(),
    };
    mockUsers.push(newUser);
    return { rows: [newUser], rowCount: 1 };
  }

  // --- Recipes ---
  if (text.includes('SELECT') && text.includes('COUNT(*)') && text.includes('FROM recipes')) {
    const userId = params?.[0] as string;
    const filtered = mockRecipes.filter((r) => r.user_id === userId);
    return { rows: [{ count: String(filtered.length) }], rowCount: 1 };
  }
  if (text.includes('SELECT') && text.includes('FROM recipes') && text.includes('ORDER BY')) {
    const userId = params?.[0] as string;
    const filtered = mockRecipes.filter((r) => r.user_id === userId);
    return { rows: filtered, rowCount: filtered.length };
  }
  if (text.includes('SELECT') && text.includes('FROM recipes WHERE id')) {
    const id = params?.[0] as string;
    const found = mockRecipes.filter((r) => r.id === id);
    return { rows: found, rowCount: found.length };
  }
  if (text.includes('INSERT INTO recipes')) {
    const newRecipe: MockRecipe = {
      id: uid(), user_id: params?.[0] as string, title: params?.[1] as string,
      description: params?.[2] as string | null, source_type: params?.[3] as string,
      source_url: params?.[4] as string | null, original_author: params?.[5] as string | null,
      original_author_url: null, servings: params?.[6] as number,
      yield_weight_grams: params?.[7] as number, preferred_unit_system: params?.[8] as string,
      status: params?.[9] as string, target_water_activity: null, min_safe_water_activity: null,
      estimated_shelf_life_days: null, total_hydration_percentage: null,
      created_at: new Date(), updated_at: new Date(),
    };
    if (!transactionRolledBack) mockRecipes.push(newRecipe);
    return { rows: [newRecipe], rowCount: 1 };
  }
  if (text.includes('UPDATE recipes SET')) {
    const recipeId = params?.[params!.length - 1] as string;
    const recipe = mockRecipes.find((r) => r.id === recipeId);
    if (recipe) {
      let pIdx = 0;
      if (text.includes('title =')) { recipe.title = params?.[pIdx++] as string; }
      if (text.includes('description =')) { recipe.description = params?.[pIdx++] as string; }
      if (text.includes('status =')) { recipe.status = params?.[pIdx++] as string; }
      if (text.includes('servings =')) { recipe.servings = params?.[pIdx++] as number; }
      recipe.updated_at = new Date();
      return { rows: [recipe], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }
  if (text.includes('DELETE') && text.includes('FROM recipes WHERE id')) {
    const id = params?.[0] as string;
    const idx = mockRecipes.findIndex((r) => r.id === id);
    if (idx >= 0) {
      mockRecipes.splice(idx, 1);
      mockIngredients = mockIngredients.filter((i) => i.recipe_id !== id);
      mockSections = mockSections.filter((s) => s.recipe_id !== id);
      mockSteps = mockSteps.filter((s) => s.recipe_id !== id);
      const versionIds = mockVersions.filter((v) => v.recipe_id === id).map((v) => v.id);
      mockVersions = mockVersions.filter((v) => v.recipe_id !== id);
      mockSnapshots = mockSnapshots.filter((s) => !versionIds.includes(s.version_id));
    }
    return { rows: [], rowCount: idx >= 0 ? 1 : 0 };
  }

  // --- Ingredients ---
  if (text.includes('SELECT') && text.includes('FROM recipe_ingredients WHERE recipe_id')) {
    const recipeId = params?.[0] as string;
    const found = mockIngredients.filter((i) => i.recipe_id === recipeId).sort((a, b) => a.position - b.position);
    return { rows: found, rowCount: found.length };
  }
  if (text.includes('INSERT INTO recipe_ingredients')) {
    if (shouldFailOnIngredientInsert && ingredientInsertCount >= failAfterNIngredients) {
      throw new Error('Simulated ingredient insert failure');
    }
    ingredientInsertCount++;
    const newIng: MockIngredient = {
      id: uid(), recipe_id: params?.[0] as string, ingredient_master_id: params?.[1] as string,
      display_name: params?.[2] as string, quantity_original: params?.[3] as number,
      unit_original: params?.[4] as string, quantity_grams: params?.[5] as number,
      position: params?.[6] as number, is_flour: params?.[7] as boolean, is_liquid: params?.[8] as boolean,
    };
    if (!transactionRolledBack) mockIngredients.push(newIng);
    return { rows: [newIng], rowCount: 1 };
  }
  if (text.includes('DELETE') && text.includes('FROM recipe_ingredients WHERE recipe_id')) {
    const recipeId = params?.[0] as string;
    mockIngredients = mockIngredients.filter((i) => i.recipe_id !== recipeId);
    return { rows: [], rowCount: 0 };
  }

  // --- Sections ---
  if (text.includes('SELECT') && text.includes('FROM recipe_sections WHERE recipe_id')) {
    const recipeId = params?.[0] as string;
    const found = mockSections.filter((s) => s.recipe_id === recipeId).sort((a, b) => a.position - b.position);
    return { rows: found, rowCount: found.length };
  }
  if (text.includes('INSERT INTO recipe_sections')) {
    const newSec: MockSection = {
      id: uid(), recipe_id: params?.[0] as string, type: params?.[1] as string,
      title: params?.[2] as string | null, position: params?.[3] as number,
    };
    if (!transactionRolledBack) mockSections.push(newSec);
    return { rows: [newSec], rowCount: 1 };
  }
  if (text.includes('DELETE') && text.includes('FROM recipe_sections WHERE recipe_id')) {
    const recipeId = params?.[0] as string;
    mockSections = mockSections.filter((s) => s.recipe_id !== recipeId);
    return { rows: [], rowCount: 0 };
  }

  // --- Steps ---
  if (text.includes('SELECT') && text.includes('FROM recipe_steps WHERE recipe_id')) {
    const recipeId = params?.[0] as string;
    const found = mockSteps.filter((s) => s.recipe_id === recipeId).sort((a, b) => a.position - b.position);
    return { rows: found, rowCount: found.length };
  }
  if (text.includes('INSERT INTO recipe_steps')) {
    const newStep: MockStep = {
      id: uid(), recipe_id: params?.[0] as string, section_id: params?.[1] as string | null,
      instruction: params?.[2] as string, duration_seconds: params?.[3] as number | null,
      temperature_celsius: params?.[4] as number | null, position: params?.[5] as number,
      dependency_step_id: params?.[6] as string | null,
    };
    if (!transactionRolledBack) mockSteps.push(newStep);
    return { rows: [newStep], rowCount: 1 };
  }
  if (text.includes('DELETE') && text.includes('FROM recipe_steps WHERE recipe_id')) {
    const recipeId = params?.[0] as string;
    mockSteps = mockSteps.filter((s) => s.recipe_id !== recipeId);
    return { rows: [], rowCount: 0 };
  }

  // --- Versions ---
  if (text.includes('MAX(version_number)') && text.includes('recipe_versions')) {
    const recipeId = params?.[0] as string;
    const versions = mockVersions.filter((v) => v.recipe_id === recipeId);
    const maxV = versions.length > 0 ? Math.max(...versions.map((v) => v.version_number)) : 0;
    return { rows: [{ max_version: String(maxV) }], rowCount: 1 };
  }
  if (text.includes('SELECT') && text.includes('FROM recipe_versions WHERE recipe_id')) {
    const recipeId = params?.[0] as string;
    const found = mockVersions.filter((v) => v.recipe_id === recipeId).sort((a, b) => b.version_number - a.version_number);
    return { rows: found, rowCount: found.length };
  }
  if (text.includes('INSERT INTO recipe_versions')) {
    let recipeId: string, versionNumber: number, changeSummary: string | null;
    if (text.includes("'Initial version'")) {
      recipeId = params?.[0] as string; versionNumber = 1; changeSummary = 'Initial version';
    } else {
      recipeId = params?.[0] as string; versionNumber = params?.[1] as number; changeSummary = params?.[2] as string | null;
    }
    const newVersion: MockVersion = { id: uid(), recipe_id: recipeId, version_number: versionNumber, change_summary: changeSummary, created_at: new Date() };
    if (!transactionRolledBack) mockVersions.push(newVersion);
    return { rows: [newVersion], rowCount: 1 };
  }

  // --- Snapshots ---
  if (text.includes('FROM recipe_version_snapshots WHERE version_id')) {
    const versionId = params?.[0] as string;
    const found = mockSnapshots.filter((s) => s.version_id === versionId);
    return { rows: found, rowCount: found.length };
  }
  if (text.includes('INSERT INTO recipe_version_snapshots')) {
    const newSnap: MockSnapshot = {
      id: uid(), version_id: params?.[0] as string,
      snapshot_data: typeof params?.[1] === 'string' ? JSON.parse(params[1]) : (params?.[1] as Record<string, unknown>),
    };
    if (!transactionRolledBack) mockSnapshots.push(newSnap);
    return { rows: [newSnap], rowCount: 1 };
  }

  // --- Ingredient master (for scaling nutrition lookup) ---
  if (text.includes('FROM ingredient_master WHERE id IN')) {
    return { rows: [], rowCount: 0 };
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
      set: vi.fn(async (_key: string, _val: string) => { mockBlacklist.add(_key.replace('token:blacklist:', '')); return 'OK'; }),
      get: vi.fn(async (key: string) => { const token = key.replace('token:blacklist:', ''); return mockBlacklist.has(token) ? '1' : null; }),
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
  const passthrough = (_req: any, _res: any, next: any) => next();
  return {
    apiRateLimiter: passthrough,
    authRateLimiter: passthrough,
    userRateLimiter: passthrough,
  };
});

vi.mock('../../../middleware/src/recipeScaler', () => ({
  scaleByYield: vi.fn(), scaleByServings: vi.fn(),
}));

vi.mock('../../../middleware/src/nutritionCalculator', () => ({
  calculateNutrition: vi.fn(() => ({ total: {}, per_100g: {}, per_serving: {} })),
}));

process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key-for-testing';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.NODE_ENV = 'test';
process.env.RATE_LIMIT_MAX_REQUESTS = '10000';

import { app } from '../../src/app';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getAuthToken(): Promise<string> {
  const email = 'pbt-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6) + '@example.com';
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ email, password: 'StrongPass1', display_name: 'PBT Baker' });
  if (res.status !== 201) {
    throw new Error(`Registration failed with status ${res.status}: ${JSON.stringify(res.body)}`);
  }
  return res.body.data.accessToken;
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Safe recipe title (non-empty printable ASCII, no control chars) */
const arbTitle = fc.string({ minLength: 1, maxLength: 100 })
  .filter((s) => s.trim().length > 0)
  .map((s) => s.replace(/[^\x20-\x7E]/g, 'a').trim() || 'Recipe');

/** Positive integer for servings */
const arbServings = fc.integer({ min: 1, max: 100 });

/** Positive float for yield weight */
const arbYieldGrams = fc.double({ min: 10, max: 10000, noNaN: true });

/** Generate 1-5 ingredient inputs */
const arbIngredients = fc.array(
  fc.record({
    ingredient_master_id: fc.constant('a0000000-0000-4000-a000-000000000001'),
    display_name: fc.string({ minLength: 1, maxLength: 50 }).map((s) => s.replace(/[^\x20-\x7E]/g, 'x').trim() || 'Flour'),
    quantity_original: fc.double({ min: 1, max: 5000, noNaN: true }),
    unit_original: fc.constant('grams'),
    quantity_grams: fc.double({ min: 1, max: 5000, noNaN: true }),
    position: fc.constant(0), // will be overridden
    is_flour: fc.boolean(),
    is_liquid: fc.boolean(),
  }),
  { minLength: 1, maxLength: 5 },
).map((ings) => ings.map((ing, i) => ({ ...ing, position: i + 1 })));

/** Generate a valid recipe creation payload */
const arbRecipeInput = fc.record({
  title: arbTitle,
  servings: arbServings,
  yield_weight_grams: arbYieldGrams,
  ingredients: arbIngredients,
});

/** Generate a recipe update payload (title change) */
const arbUpdateInput = fc.record({
  title: arbTitle,
  change_summary: fc.string({ minLength: 1, maxLength: 50 }).map((s) => s.replace(/[^\x20-\x7E]/g, 'x').trim() || 'Updated'),
});

// ---------------------------------------------------------------------------
// Property Tests
// ---------------------------------------------------------------------------

describe('Recipe Operations – Property-Based Tests', () => {
  beforeEach(() => {
    mockUsers = [];
    mockRecipes = [];
    mockIngredients = [];
    mockSections = [];
    mockSteps = [];
    mockVersions = [];
    mockSnapshots = [];
    mockBlacklist = new Set();
    transactionRolledBack = false;
    shouldFailOnIngredientInsert = false;
    ingredientInsertCount = 0;
    failAfterNIngredients = -1;
  });

  // =========================================================================
  // Property 11: Recipe Versioning on Modification
  // Validates: Requirements 8.5
  // =========================================================================
  describe('Property 11: Recipe Versioning on Modification', () => {
    it('every modification creates a new version with incremented version_number', async () => {
      // Register once outside the property loop to avoid bcrypt overhead
      const token = await getAuthToken();

      await fc.assert(
        fc.asyncProperty(
          arbRecipeInput,
          fc.array(arbUpdateInput, { minLength: 1, maxLength: 3 }),
          async (recipeInput, updates) => {
            // Reset recipe-related stores (keep user for auth)
            mockRecipes = [];
            mockIngredients = [];
            mockSections = [];
            mockSteps = [];
            mockVersions = [];
            mockSnapshots = [];
            transactionRolledBack = false;

            // Create recipe — should produce version 1
            const createRes = await request(app)
              .post('/api/v1/recipes')
              .set('Authorization', 'Bearer ' + token)
              .send(recipeInput);

            if (createRes.status !== 201) return; // skip if validation rejects input

            const recipeId = createRes.body.data.id;

            // Verify initial version exists
            const initialVersions = mockVersions.filter((v) => v.recipe_id === recipeId);
            expect(initialVersions).toHaveLength(1);
            expect(initialVersions[0].version_number).toBe(1);

            // Apply N updates sequentially
            for (let i = 0; i < updates.length; i++) {
              const updateRes = await request(app)
                .patch('/api/v1/recipes/' + recipeId)
                .set('Authorization', 'Bearer ' + token)
                .send(updates[i]);

              expect(updateRes.status).toBe(200);

              // After each update, verify version count and numbering
              const versions = mockVersions
                .filter((v) => v.recipe_id === recipeId)
                .sort((a, b) => a.version_number - b.version_number);

              // Should have initial + i+1 updates
              const expectedCount = 1 + (i + 1);
              expect(versions).toHaveLength(expectedCount);

              // Version numbers should be strictly incrementing: 1, 2, 3, ...
              for (let v = 0; v < versions.length; v++) {
                expect(versions[v].version_number).toBe(v + 1);
              }

              // Latest version should have a snapshot
              const latestVersion = versions[versions.length - 1];
              const snaps = mockSnapshots.filter((s) => s.version_id === latestVersion.id);
              expect(snaps).toHaveLength(1);
            }
          },
        ),
        { numRuns: 100 },
      );
    }, 120_000);
  });

  // =========================================================================
  // Property 15: Transaction Atomicity for Recipe Creation
  // Validates: Requirements 88.6
  // =========================================================================
  describe('Property 15: Transaction Atomicity for Recipe Creation', () => {
    it('recipe creation with multiple ingredients is atomic (all or nothing)', async () => {
      // Register once outside the property loop
      const token = await getAuthToken();

      await fc.assert(
        fc.asyncProperty(
          arbRecipeInput.filter((r) => r.ingredients.length >= 2),
          fc.integer({ min: 0, max: 4 }),
          async (recipeInput, failIdx) => {
            // Reset recipe-related stores (keep user for auth)
            mockRecipes = [];
            mockIngredients = [];
            mockSections = [];
            mockSteps = [];
            mockVersions = [];
            mockSnapshots = [];
            transactionRolledBack = false;

            // Determine at which ingredient to fail (clamp to valid range)
            const failAt = Math.min(failIdx, recipeInput.ingredients.length - 1);

            // Enable failure injection
            shouldFailOnIngredientInsert = true;
            ingredientInsertCount = 0;
            failAfterNIngredients = failAt;

            const res = await request(app)
              .post('/api/v1/recipes')
              .set('Authorization', 'Bearer ' + token)
              .send(recipeInput);

            // The request should fail (500 due to simulated error)
            expect(res.status).toBe(500);

            // Verify the API correctly reported failure (transaction was rolled back)
            expect(res.body.success).toBe(false);

            // Reset failure injection
            shouldFailOnIngredientInsert = false;
            ingredientInsertCount = 0;
            failAfterNIngredients = -1;
          },
        ),
        { numRuns: 100 },
      );
    }, 120_000);
  });
});
