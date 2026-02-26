/**
 * Property-based tests for Import/Export Operations
 *
 * Property 13: Recipe Export-Import Round-Trip
 * Validates: Requirements 49.5, 63.6
 * Exporting a recipe to JSON and importing it back produces an equivalent recipe.
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

  // --- Ingredients ---
  if (text.includes('SELECT') && text.includes('FROM recipe_ingredients WHERE recipe_id')) {
    const recipeId = params?.[0] as string;
    const found = mockIngredients.filter((i) => i.recipe_id === recipeId).sort((a, b) => a.position - b.position);
    return { rows: found, rowCount: found.length };
  }
  if (text.includes('INSERT INTO recipe_ingredients')) {
    const newIng: MockIngredient = {
      id: uid(), recipe_id: params?.[0] as string, ingredient_master_id: params?.[1] as string,
      display_name: params?.[2] as string, quantity_original: params?.[3] as number,
      unit_original: params?.[4] as string, quantity_grams: params?.[5] as number,
      position: params?.[6] as number, is_flour: params?.[7] as boolean, is_liquid: params?.[8] as boolean,
    };
    if (!transactionRolledBack) mockIngredients.push(newIng);
    return { rows: [newIng], rowCount: 1 };
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
      dependency_step_id: null,
    };
    if (!transactionRolledBack) mockSteps.push(newStep);
    return { rows: [newStep], rowCount: 1 };
  }

  // --- Versions ---
  if (text.includes('INSERT INTO recipe_versions')) {
    const recipeId = params?.[0] as string;
    let versionNumber = 1;
    let changeSummary: string | null = 'Imported recipe';
    if (params && params.length >= 3) {
      versionNumber = params[1] as number;
      changeSummary = params[2] as string | null;
    }
    const newVersion: MockVersion = { id: uid(), recipe_id: recipeId, version_number: versionNumber, change_summary: changeSummary, created_at: new Date() };
    if (!transactionRolledBack) mockVersions.push(newVersion);
    return { rows: [newVersion], rowCount: 1 };
  }

  // --- Snapshots ---
  if (text.includes('INSERT INTO recipe_version_snapshots')) {
    const newSnap: MockSnapshot = {
      id: uid(), version_id: params?.[0] as string,
      snapshot_data: typeof params?.[1] === 'string' ? JSON.parse(params[1]) : (params?.[1] as Record<string, unknown>),
    };
    if (!transactionRolledBack) mockSnapshots.push(newSnap);
    return { rows: [newSnap], rowCount: 1 };
  }

  // --- Ingredient master fuzzy search (for import matching) ---
  if (text.includes('similarity') && text.includes('ingredient_master')) {
    return { rows: [{ id: 'a0000000-0000-4000-a000-000000000001' }], rowCount: 1 };
  }
  if (text.includes('FROM ingredient_master WHERE LOWER')) {
    return { rows: [{ id: 'a0000000-0000-4000-a000-000000000001' }], rowCount: 1 };
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

vi.mock('../../src/middleware/rateLimiter', () => {
  const passthrough = (_req: any, _res: any, next: any) => next();
  return { apiRateLimiter: passthrough, authRateLimiter: passthrough, userRateLimiter: passthrough };
});

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
  const email = 'pbt-ie-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6) + '@example.com';
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ email, password: 'StrongPass1', display_name: 'PBT Baker' });
  if (res.status !== 201) throw new Error(`Registration failed: ${res.status}`);
  return res.body.data.accessToken;
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Safe non-empty printable ASCII string */
const arbSafeStr = (min: number, max: number) =>
  fc.string({ minLength: min, maxLength: max })
    .filter((s) => s.trim().length > 0)
    .map((s) => s.replace(/[^\x20-\x7E]/g, 'a').trim() || 'default');

const arbTitle = arbSafeStr(1, 80);

const arbSourceType = fc.constantFrom('manual' as const, 'image' as const, 'whatsapp' as const, 'url' as const);
const arbStatus = fc.constantFrom('draft' as const, 'active' as const, 'archived' as const);
const arbSectionType = fc.constantFrom('pre_prep' as const, 'prep' as const, 'bake' as const, 'rest' as const, 'notes' as const);
const arbUnitSystem = fc.constantFrom('metric', 'cups', 'hybrid', 'bakers_percent');
const arbUnit = fc.constantFrom('grams', 'kg', 'ml', 'cups', 'tbsp', 'tsp');

/** Generate an export-format ingredient */
const arbExportIngredient = fc.record({
  display_name: arbSafeStr(1, 40),
  quantity_original: fc.double({ min: 0.1, max: 5000, noNaN: true }),
  unit_original: arbUnit,
  quantity_grams: fc.double({ min: 0.1, max: 5000, noNaN: true }),
  position: fc.constant(0), // overridden below
  is_flour: fc.boolean(),
  is_liquid: fc.boolean(),
});

/** Generate an export-format step */
const arbExportStep = fc.record({
  instruction: arbSafeStr(1, 120),
  duration_seconds: fc.oneof(fc.constant(null), fc.integer({ min: 1, max: 7200 })),
  temperature_celsius: fc.oneof(fc.constant(null), fc.integer({ min: 50, max: 300 })),
  position: fc.constant(0), // overridden below
});

/** Generate an export-format section with steps */
const arbExportSection = fc.record({
  type: arbSectionType,
  title: fc.oneof(fc.constant(null), arbSafeStr(1, 40)),
  position: fc.constant(0), // overridden below
  steps: fc.array(arbExportStep, { minLength: 0, maxLength: 3 }),
}).map((sec) => ({
  ...sec,
  steps: sec.steps.map((step, i) => ({ ...step, position: i + 1 })),
}));

/** Generate a full export-format recipe payload (the shape produced by exportRecipe) */
const arbExportRecipe = fc.record({
  title: arbTitle,
  description: fc.oneof(fc.constant(null), arbSafeStr(1, 100)),
  source_type: arbSourceType,
  source_url: fc.oneof(fc.constant(null), fc.constant('https://example.com/recipe')),
  original_author: fc.oneof(fc.constant(null), arbSafeStr(1, 30)),
  servings: fc.integer({ min: 1, max: 100 }),
  yield_weight_grams: fc.double({ min: 10, max: 10000, noNaN: true }),
  preferred_unit_system: arbUnitSystem,
  status: arbStatus,
  ingredients: fc.array(arbExportIngredient, { minLength: 1, maxLength: 5 }),
  sections: fc.array(arbExportSection, { minLength: 0, maxLength: 3 }),
}).map((recipe) => ({
  ...recipe,
  ingredients: recipe.ingredients.map((ing, i) => ({ ...ing, position: i + 1 })),
  sections: recipe.sections.map((sec, i) => ({ ...sec, position: i + 1 })),
}));

// ---------------------------------------------------------------------------
// Property Tests
// ---------------------------------------------------------------------------

describe('Import/Export – Property-Based Tests', () => {
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
  });

  // =========================================================================
  // Property 13: Recipe Export-Import Round-Trip
  // Validates: Requirements 49.5, 63.6
  // =========================================================================
  describe('Property 13: Recipe Export-Import Round-Trip', () => {
    it('export(import(recipe)) produces an equivalent recipe', async () => {
      const token = await getAuthToken();

      await fc.assert(
        fc.asyncProperty(arbExportRecipe, async (recipeData) => {
          // Reset recipe stores between iterations (keep user for auth)
          mockRecipes = [];
          mockIngredients = [];
          mockSections = [];
          mockSteps = [];
          mockVersions = [];
          mockSnapshots = [];
          transactionRolledBack = false;

          // Step 1: Import the generated recipe via API
          const importPayload = { recipe: recipeData };
          const importRes = await request(app)
            .post('/api/v1/recipes/import')
            .set('Authorization', 'Bearer ' + token)
            .send(importPayload);

          expect(importRes.status).toBe(201);
          const importedRecipe = importRes.body.data;
          const recipeId = importedRecipe.id;
          expect(recipeId).toBeTruthy();

          // Step 2: Export the imported recipe via API
          const exportRes = await request(app)
            .get('/api/v1/recipes/' + recipeId + '/export')
            .set('Authorization', 'Bearer ' + token);

          expect(exportRes.status).toBe(200);
          const exported = exportRes.body.data;

          // Step 3: Verify round-trip equivalence on all key fields
          const exp = exported.recipe;

          // Scalar fields must match exactly
          expect(exp.title).toBe(recipeData.title);
          expect(exp.description).toBe(recipeData.description);
          expect(exp.source_type).toBe(recipeData.source_type);
          expect(exp.source_url).toBe(recipeData.source_url);
          expect(exp.original_author).toBe(recipeData.original_author);
          expect(exp.servings).toBe(recipeData.servings);
          expect(exp.yield_weight_grams).toBe(recipeData.yield_weight_grams);
          expect(exp.preferred_unit_system).toBe(recipeData.preferred_unit_system);
          expect(exp.status).toBe(recipeData.status);

          // Ingredient count and order must match
          expect(exp.ingredients).toHaveLength(recipeData.ingredients.length);
          for (let i = 0; i < recipeData.ingredients.length; i++) {
            const orig = recipeData.ingredients[i];
            const rt = exp.ingredients[i];
            expect(rt.display_name).toBe(orig.display_name);
            expect(rt.quantity_original).toBe(orig.quantity_original);
            expect(rt.unit_original).toBe(orig.unit_original);
            expect(rt.quantity_grams).toBe(orig.quantity_grams);
            expect(rt.position).toBe(orig.position);
            expect(rt.is_flour).toBe(orig.is_flour);
            expect(rt.is_liquid).toBe(orig.is_liquid);
          }

          // Section count and order must match
          expect(exp.sections).toHaveLength(recipeData.sections.length);
          for (let s = 0; s < recipeData.sections.length; s++) {
            const origSec = recipeData.sections[s];
            const rtSec = exp.sections[s];
            expect(rtSec.type).toBe(origSec.type);
            expect(rtSec.title).toBe(origSec.title);
            expect(rtSec.position).toBe(origSec.position);

            // Steps within each section
            expect(rtSec.steps).toHaveLength(origSec.steps.length);
            for (let t = 0; t < origSec.steps.length; t++) {
              const origStep = origSec.steps[t];
              const rtStep = rtSec.steps[t];
              expect(rtStep.instruction).toBe(origStep.instruction);
              expect(rtStep.duration_seconds).toBe(origStep.duration_seconds);
              expect(rtStep.temperature_celsius).toBe(origStep.temperature_celsius);
              expect(rtStep.position).toBe(origStep.position);
            }
          }
        }),
        { numRuns: 100 },
      );
    }, 120_000);
  });
});
