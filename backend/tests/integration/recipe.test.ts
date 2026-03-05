import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';

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

interface MockIngredient {
  id: string;
  recipe_id: string;
  ingredient_master_id: string;
  display_name: string;
  quantity_original: number;
  unit_original: string;
  quantity_grams: number;
  position: number;
  is_flour: boolean;
  is_liquid: boolean;
}

interface MockSection {
  id: string;
  recipe_id: string;
  type: string;
  title: string | null;
  position: number;
}

interface MockStep {
  id: string;
  recipe_id: string;
  section_id: string | null;
  instruction: string;
  duration_seconds: number | null;
  temperature_celsius: number | null;
  position: number;
  dependency_step_id: string | null;
}

interface MockVersion {
  id: string;
  recipe_id: string;
  version_number: number;
  change_summary: string | null;
  created_at: Date;
}

interface MockSnapshot {
  id: string;
  version_id: string;
  snapshot_data: Record<string, unknown>;
}

let mockUsers: MockUser[] = [];
let mockRecipes: MockRecipe[] = [];
let mockIngredients: MockIngredient[] = [];
let mockSections: MockSection[] = [];
let mockSteps: MockStep[] = [];
let mockVersions: MockVersion[] = [];
let mockSnapshots: MockSnapshot[] = [];
let mockBlacklist: Set<string> = new Set();
let transactionActive = false;
let transactionRolledBack = false;

function uid(): string {
  // Generate a valid v4 UUID format for route validation compatibility
  const hex = () => Math.random().toString(16).slice(2, 6);
  return hex() + hex() + '-' + hex() + '-4' + hex().slice(1) + '-a' + hex().slice(1) + '-' + hex() + hex() + hex();
}

// ---------------------------------------------------------------------------
// Mock database
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
  // Search (ILIKE) — must come before generic recipe list handlers
  if (text.includes('ILIKE') && text.includes('COUNT(*)')) {
    const userId = params?.[0] as string;
    const searchTerm = (params?.[1] as string || '').replace(/%/g, '').toLowerCase();
    let filtered = mockRecipes.filter((r) => r.user_id === userId);
    if (searchTerm) {
      filtered = filtered.filter((r) =>
        r.title.toLowerCase().includes(searchTerm) ||
        (r.description || '').toLowerCase().includes(searchTerm),
      );
    }
    return { rows: [{ count: String(filtered.length) }], rowCount: 1 };
  }
  if (text.includes('ILIKE') && text.includes('ORDER BY')) {
    const userId = params?.[0] as string;
    const searchTerm = (params?.[1] as string || '').replace(/%/g, '').toLowerCase();
    let filtered = mockRecipes.filter((r) => r.user_id === userId);
    if (searchTerm) {
      filtered = filtered.filter((r) =>
        r.title.toLowerCase().includes(searchTerm) ||
        (r.description || '').toLowerCase().includes(searchTerm),
      );
    }
    return { rows: filtered, rowCount: filtered.length };
  }

  if (text.includes('SELECT') && text.includes('COUNT(*)') && text.includes('FROM recipes')) {
    const userId = params?.[0] as string;
    let filtered = mockRecipes.filter((r) => r.user_id === userId);
    // Apply status filter if present
    if (params && params.length > 1 && text.includes('status')) {
      filtered = filtered.filter((r) => r.status === params[1]);
    }
    return { rows: [{ count: String(filtered.length) }], rowCount: 1 };
  }
  if (text.includes('SELECT') && text.includes('FROM recipes') && text.includes('WHERE') && text.includes('user_id') && text.includes('ORDER BY')) {
    const userId = params?.[0] as string;
    let filtered = mockRecipes.filter((r) => r.user_id === userId);
    if (params && params.length > 2 && text.includes('status =')) {
      filtered = filtered.filter((r) => r.status === params[1]);
    }
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
      // Simple field update based on params
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
      // Cascade
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
  if (text.includes('SELECT') && text.includes('FROM recipe_versions') && text.includes('JOIN') && text.includes('recipe_version_snapshots')) {
    const recipeId = params?.[0] as string;
    const vA = params?.[1] as number;
    const vB = params?.[2] as number;
    const versions = mockVersions.filter((v) => v.recipe_id === recipeId && (v.version_number === vA || v.version_number === vB));
    const rows = versions.map((v) => {
      const snap = mockSnapshots.find((s) => s.version_id === v.id);
      return { ...v, snapshot_data: snap?.snapshot_data || {} };
    }).sort((a, b) => a.version_number - b.version_number);
    return { rows, rowCount: rows.length };
  }
  if (text.includes('SELECT') && text.includes('FROM recipe_versions WHERE recipe_id')) {
    const recipeId = params?.[0] as string;
    const found = mockVersions.filter((v) => v.recipe_id === recipeId).sort((a, b) => b.version_number - a.version_number);
    return { rows: found, rowCount: found.length };
  }
  if (text.includes('INSERT INTO recipe_versions')) {
    // Handle both parameterized and literal version inserts
    let recipeId: string;
    let versionNumber: number;
    let changeSummary: string | null;

    if (text.includes("'Initial version'")) {
      // Literal insert: VALUES ($1, 1, 'Initial version')
      recipeId = params?.[0] as string;
      versionNumber = 1;
      changeSummary = 'Initial version';
    } else {
      // Parameterized insert: VALUES ($1, $2, $3)
      recipeId = params?.[0] as string;
      versionNumber = params?.[1] as number;
      changeSummary = params?.[2] as string | null;
    }

    const newVersion: MockVersion = {
      id: uid(), recipe_id: recipeId,
      version_number: versionNumber, change_summary: changeSummary,
      created_at: new Date(),
    };
    if (!transactionRolledBack) mockVersions.push(newVersion);
    return { rows: [newVersion], rowCount: 1 };
  }

  // --- Snapshots ---
  if (text.includes('FROM recipe_version_snapshots WHERE recipe_version_id')) {
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
  if (text === 'BEGIN' || text === 'COMMIT') {
    transactionActive = text === 'BEGIN';
    return { rows: [], rowCount: 0 };
  }
  if (text === 'ROLLBACK') {
    transactionRolledBack = true;
    transactionActive = false;
    return { rows: [], rowCount: 0 };
  }

  return { rows: [], rowCount: 0 };
}

// ---------------------------------------------------------------------------
// Mock modules
// ---------------------------------------------------------------------------

const mockQueryFn = vi.fn(async (text: string, params?: unknown[]) => handleQuery(text, params));

vi.mock('../../src/config/database', () => ({
  db: {
    query: (...args: unknown[]) => mockQueryFn(args[0] as string, args[1] as unknown[]),
    getClient: vi.fn(async () => ({
      query: (...args: unknown[]) => {
        const result = handleQuery(args[0] as string, args[1] as unknown[]);
        return Promise.resolve(result);
      },
      release: vi.fn(),
    })),
    withTransaction: vi.fn(async (fn: (client: unknown) => Promise<unknown>) => {
      transactionActive = true;
      transactionRolledBack = false;
      const client = {
        query: (...args: unknown[]) => {
          if (transactionRolledBack) return Promise.resolve({ rows: [], rowCount: 0 });
          const result = handleQuery(args[0] as string, args[1] as unknown[]);
          return Promise.resolve(result);
        },
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
      set: vi.fn(async (_key: string, _val: string) => {
        mockBlacklist.add(_key.replace('token:blacklist:', ''));
        return 'OK';
      }),
      get: vi.fn(async (key: string) => {
        const token = key.replace('token:blacklist:', '');
        return mockBlacklist.has(token) ? '1' : null;
      }),
      ping: vi.fn(async () => 'PONG'),
    })),
    checkHealth: vi.fn(async () => ({ healthy: true, latencyMs: 1 })),
    close: vi.fn(),
  },
}));

vi.mock('../../src/config/storage', () => ({
  storage: {
    checkHealth: vi.fn(async () => ({ healthy: true, latencyMs: 1 })),
  },
}));

// Mock middleware modules used by recipe.service.ts via require()
vi.mock('../../../middleware/src/recipeScaler', () => ({
  scaleByYield: vi.fn((recipe: any, targetYield: number) => {
    const factor = targetYield / recipe.yield_weight_grams;
    return {
      recipe: {
        ...recipe,
        yield_weight_grams: targetYield,
        servings: recipe.servings * factor,
        scaling_factor: factor,
        original_yield_grams: recipe.yield_weight_grams,
        original_servings: recipe.servings,
        ingredients: recipe.ingredients.map((ing: any) => ({
          ...ing,
          quantity_grams: ing.quantity_grams * factor,
          quantity_original: ing.quantity_original * factor,
          scaling_factor: factor,
        })),
      },
      scaling_factor: factor,
      warnings: [],
    };
  }),
  scaleByServings: vi.fn((recipe: any, targetServings: number) => {
    const factor = targetServings / recipe.servings;
    return {
      recipe: {
        ...recipe,
        servings: targetServings,
        yield_weight_grams: recipe.yield_weight_grams * factor,
        scaling_factor: factor,
        original_yield_grams: recipe.yield_weight_grams,
        original_servings: recipe.servings,
        ingredients: recipe.ingredients.map((ing: any) => ({
          ...ing,
          quantity_grams: ing.quantity_grams * factor,
          quantity_original: ing.quantity_original * factor,
          scaling_factor: factor,
        })),
      },
      scaling_factor: factor,
      warnings: [],
    };
  }),
}));

vi.mock('../../../middleware/src/nutritionCalculator', () => ({
  calculateNutrition: vi.fn(() => ({
    total: { energy_kcal: 0, protein_g: 0, fat_g: 0, carbs_g: 0, fiber_g: 0 },
    per_100g: { energy_kcal: 0, protein_g: 0, fat_g: 0, carbs_g: 0, fiber_g: 0 },
    per_serving: { energy_kcal: 0, protein_g: 0, fat_g: 0, carbs_g: 0, fiber_g: 0 },
  })),
}));

// Set env vars before importing app
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key-for-testing';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.NODE_ENV = 'test';

import { app } from '../../src/app';

// ---------------------------------------------------------------------------
// Helper: register and get token
// ---------------------------------------------------------------------------

async function getAuthToken(): Promise<string> {
  const email = 'baker-' + Date.now() + '@example.com';
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ email, password: 'StrongPass1', display_name: 'Test Baker' });
  return res.body.data.accessToken;
}

const sampleRecipe = {
  title: 'Classic Chocolate Chip Cookies',
  description: 'Soft and chewy cookies',
  source_type: 'manual',
  servings: 24,
  yield_weight_grams: 600,
  ingredients: [
    {
      ingredient_master_id: 'a0000000-0000-4000-a000-000000000001',
      display_name: 'All-purpose flour',
      quantity_original: 250,
      unit_original: 'grams',
      quantity_grams: 250,
      position: 1,
      is_flour: true,
      is_liquid: false,
    },
    {
      ingredient_master_id: 'a0000000-0000-4000-a000-000000000002',
      display_name: 'Butter',
      quantity_original: 113,
      unit_original: 'grams',
      quantity_grams: 113,
      position: 2,
      is_flour: false,
      is_liquid: false,
    },
  ],
  sections: [
    {
      type: 'prep',
      title: 'Prepare Dough',
      position: 1,
      steps: [
        { instruction: 'Cream butter and sugar', duration_seconds: 180, position: 1 },
        { instruction: 'Add flour gradually', duration_seconds: 120, position: 2 },
      ],
    },
    {
      type: 'bake',
      title: 'Bake',
      position: 2,
      steps: [
        { instruction: 'Bake at 180C for 12 minutes', duration_seconds: 720, temperature_celsius: 180, position: 1 },
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Recipe API', () => {
  beforeEach(() => {
    mockUsers = [];
    mockRecipes = [];
    mockIngredients = [];
    mockSections = [];
    mockSteps = [];
    mockVersions = [];
    mockSnapshots = [];
    mockBlacklist = new Set();
    transactionActive = false;
    transactionRolledBack = false;
  });

  // =========================================================================
  // POST /api/v1/recipes — Create
  // =========================================================================
  describe('POST /api/v1/recipes', () => {
    it('should create a recipe with ingredients, sections, and steps', async () => {
      const token = await getAuthToken();
      const res = await request(app)
        .post('/api/v1/recipes')
        .set('Authorization', 'Bearer ' + token)
        .send(sampleRecipe);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Classic Chocolate Chip Cookies');
      expect(res.body.data.servings).toBe(24);
      expect(res.body.data.yield_weight_grams).toBe(600);
      expect(res.body.data.ingredients).toHaveLength(2);
      expect(res.body.data.sections).toHaveLength(2);
      expect(res.body.data.ingredients[0].display_name).toBe('All-purpose flour');
      expect(res.body.data.sections[0].steps).toHaveLength(2);
      expect(res.body.data.sections[1].steps).toHaveLength(1);
    });

    it('should create initial version on recipe creation', async () => {
      const token = await getAuthToken();
      await request(app)
        .post('/api/v1/recipes')
        .set('Authorization', 'Bearer ' + token)
        .send(sampleRecipe);

      // Check that a version was created
      expect(mockVersions).toHaveLength(1);
      expect(mockVersions[0].version_number).toBe(1);
      expect(mockVersions[0].change_summary).toBe('Initial version');
      expect(mockSnapshots).toHaveLength(1);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .post('/api/v1/recipes')
        .send(sampleRecipe);

      expect(res.status).toBe(401);
    });

    it('should reject missing title', async () => {
      const token = await getAuthToken();
      const res = await request(app)
        .post('/api/v1/recipes')
        .set('Authorization', 'Bearer ' + token)
        .send({ servings: 12, yield_weight_grams: 500 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject invalid servings', async () => {
      const token = await getAuthToken();
      const res = await request(app)
        .post('/api/v1/recipes')
        .set('Authorization', 'Bearer ' + token)
        .send({ title: 'Test', servings: 0, yield_weight_grams: 500 });

      expect(res.status).toBe(400);
    });
  });

  // =========================================================================
  // GET /api/v1/recipes — List
  // =========================================================================
  describe('GET /api/v1/recipes', () => {
    it('should list user recipes', async () => {
      const token = await getAuthToken();
      await request(app).post('/api/v1/recipes').set('Authorization', 'Bearer ' + token).send(sampleRecipe);
      await request(app).post('/api/v1/recipes').set('Authorization', 'Bearer ' + token).send({ ...sampleRecipe, title: 'Banana Bread' });

      const res = await request(app)
        .get('/api/v1/recipes')
        .set('Authorization', 'Bearer ' + token);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.recipes).toHaveLength(2);
      expect(res.body.data.total).toBe(2);
    });

    it('should not return other users recipes', async () => {
      const token1 = await getAuthToken();
      const token2 = await getAuthToken();
      await request(app).post('/api/v1/recipes').set('Authorization', 'Bearer ' + token1).send(sampleRecipe);

      const res = await request(app)
        .get('/api/v1/recipes')
        .set('Authorization', 'Bearer ' + token2);

      expect(res.status).toBe(200);
      expect(res.body.data.recipes).toHaveLength(0);
    });
  });

  // =========================================================================
  // GET /api/v1/recipes/:id — Get by ID
  // =========================================================================
  describe('GET /api/v1/recipes/:id', () => {
    it('should retrieve recipe with all related data', async () => {
      const token = await getAuthToken();
      const createRes = await request(app)
        .post('/api/v1/recipes')
        .set('Authorization', 'Bearer ' + token)
        .send(sampleRecipe);

      const recipeId = createRes.body.data.id;
      const res = await request(app)
        .get('/api/v1/recipes/' + recipeId)
        .set('Authorization', 'Bearer ' + token);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(recipeId);
      expect(res.body.data.ingredients).toHaveLength(2);
      expect(res.body.data.sections).toHaveLength(2);
    });

    it('should return 404 for non-existent recipe', async () => {
      const token = await getAuthToken();
      const res = await request(app)
        .get('/api/v1/recipes/a0000000-0000-4000-a000-000000000099')
        .set('Authorization', 'Bearer ' + token);

      expect(res.status).toBe(404);
    });

    it('should return 403 for recipe owned by another user', async () => {
      const token1 = await getAuthToken();
      const token2 = await getAuthToken();
      const createRes = await request(app)
        .post('/api/v1/recipes')
        .set('Authorization', 'Bearer ' + token1)
        .send(sampleRecipe);

      const recipeId = createRes.body.data.id;
      const res = await request(app)
        .get('/api/v1/recipes/' + recipeId)
        .set('Authorization', 'Bearer ' + token2);

      expect(res.status).toBe(403);
    });
  });

  // =========================================================================
  // PATCH /api/v1/recipes/:id — Update
  // =========================================================================
  describe('PATCH /api/v1/recipes/:id', () => {
    it('should update recipe and create new version', async () => {
      const token = await getAuthToken();
      const createRes = await request(app)
        .post('/api/v1/recipes')
        .set('Authorization', 'Bearer ' + token)
        .send(sampleRecipe);

      const recipeId = createRes.body.data.id;
      const res = await request(app)
        .patch('/api/v1/recipes/' + recipeId)
        .set('Authorization', 'Bearer ' + token)
        .send({ title: 'Updated Cookies', change_summary: 'Changed title' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Updated Cookies');
      // Should have 2 versions now (initial + update)
      expect(mockVersions.filter((v) => v.recipe_id === recipeId)).toHaveLength(2);
    });

    it('should replace ingredients when provided', async () => {
      const token = await getAuthToken();
      const createRes = await request(app)
        .post('/api/v1/recipes')
        .set('Authorization', 'Bearer ' + token)
        .send(sampleRecipe);

      const recipeId = createRes.body.data.id;
      const res = await request(app)
        .patch('/api/v1/recipes/' + recipeId)
        .set('Authorization', 'Bearer ' + token)
        .send({
          ingredients: [
            {
              ingredient_master_id: 'a0000000-0000-4000-a000-000000000003',
              display_name: 'Sugar',
              quantity_original: 200,
              unit_original: 'grams',
              quantity_grams: 200,
              position: 1,
            },
          ],
        });

      expect(res.status).toBe(200);
      // Should have only 1 ingredient now (replaced)
      const recipeIngredients = mockIngredients.filter((i) => i.recipe_id === recipeId);
      expect(recipeIngredients).toHaveLength(1);
      expect(recipeIngredients[0].display_name).toBe('Sugar');
    });
  });

  // =========================================================================
  // DELETE /api/v1/recipes/:id — Delete
  // =========================================================================
  describe('DELETE /api/v1/recipes/:id', () => {
    it('should delete recipe with cascade', async () => {
      const token = await getAuthToken();
      const createRes = await request(app)
        .post('/api/v1/recipes')
        .set('Authorization', 'Bearer ' + token)
        .send(sampleRecipe);

      const recipeId = createRes.body.data.id;
      const res = await request(app)
        .delete('/api/v1/recipes/' + recipeId)
        .set('Authorization', 'Bearer ' + token);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // Verify cascade
      expect(mockRecipes.find((r) => r.id === recipeId)).toBeUndefined();
      expect(mockIngredients.filter((i) => i.recipe_id === recipeId)).toHaveLength(0);
      expect(mockSections.filter((s) => s.recipe_id === recipeId)).toHaveLength(0);
      expect(mockSteps.filter((s) => s.recipe_id === recipeId)).toHaveLength(0);
      expect(mockVersions.filter((v) => v.recipe_id === recipeId)).toHaveLength(0);
    });

    it('should return 404 for non-existent recipe', async () => {
      const token = await getAuthToken();
      const res = await request(app)
        .delete('/api/v1/recipes/a0000000-0000-4000-a000-000000000099')
        .set('Authorization', 'Bearer ' + token);

      expect(res.status).toBe(404);
    });

    it('should return 403 when deleting another users recipe', async () => {
      const token1 = await getAuthToken();
      const token2 = await getAuthToken();
      const createRes = await request(app)
        .post('/api/v1/recipes')
        .set('Authorization', 'Bearer ' + token1)
        .send(sampleRecipe);

      const recipeId = createRes.body.data.id;
      const res = await request(app)
        .delete('/api/v1/recipes/' + recipeId)
        .set('Authorization', 'Bearer ' + token2);

      expect(res.status).toBe(403);
    });
  });

  // =========================================================================
  // Versioning endpoints
  // =========================================================================
  describe('Recipe Versioning', () => {
    it('GET /api/v1/recipes/:id/versions should list versions', async () => {
      const token = await getAuthToken();
      const createRes = await request(app)
        .post('/api/v1/recipes')
        .set('Authorization', 'Bearer ' + token)
        .send(sampleRecipe);

      const recipeId = createRes.body.data.id;

      // Update to create version 2
      await request(app)
        .patch('/api/v1/recipes/' + recipeId)
        .set('Authorization', 'Bearer ' + token)
        .send({ title: 'V2 Cookies' });

      const res = await request(app)
        .get('/api/v1/recipes/' + recipeId + '/versions')
        .set('Authorization', 'Bearer ' + token);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      // Sorted DESC by version_number
      expect(res.body.data[0].version_number).toBe(2);
      expect(res.body.data[1].version_number).toBe(1);
    });

    it('POST /api/v1/recipes/:id/versions should create new version with snapshot', async () => {
      const token = await getAuthToken();
      const createRes = await request(app)
        .post('/api/v1/recipes')
        .set('Authorization', 'Bearer ' + token)
        .send(sampleRecipe);

      const recipeId = createRes.body.data.id;
      const res = await request(app)
        .post('/api/v1/recipes/' + recipeId + '/versions')
        .set('Authorization', 'Bearer ' + token)
        .send({ change_summary: 'Manual snapshot' });

      expect(res.status).toBe(201);
      expect(res.body.data.version_number).toBe(2);
      expect(res.body.data.change_summary).toBe('Manual snapshot');
      expect(res.body.data.snapshot).toBeDefined();
    });
  });

  // =========================================================================
  // Search endpoint
  // =========================================================================
  describe('GET /api/v1/recipes/search', () => {
    it('should search recipes by title', async () => {
      const token = await getAuthToken();
      await request(app).post('/api/v1/recipes').set('Authorization', 'Bearer ' + token)
        .send({ ...sampleRecipe, title: 'Chocolate Cake' });
      await request(app).post('/api/v1/recipes').set('Authorization', 'Bearer ' + token)
        .send({ ...sampleRecipe, title: 'Vanilla Cupcakes' });
      await request(app).post('/api/v1/recipes').set('Authorization', 'Bearer ' + token)
        .send({ ...sampleRecipe, title: 'Chocolate Brownies' });

      const res = await request(app)
        .get('/api/v1/recipes/search?q=chocolate')
        .set('Authorization', 'Bearer ' + token);

      expect(res.status).toBe(200);
      expect(res.body.data.recipes).toHaveLength(2);
      expect(res.body.data.total).toBe(2);
    });

    it('should return empty results for no match', async () => {
      const token = await getAuthToken();
      await request(app).post('/api/v1/recipes').set('Authorization', 'Bearer ' + token)
        .send(sampleRecipe);

      const res = await request(app)
        .get('/api/v1/recipes/search?q=nonexistent')
        .set('Authorization', 'Bearer ' + token);

      expect(res.status).toBe(200);
      expect(res.body.data.recipes).toHaveLength(0);
    });

    it('should search by description', async () => {
      const token = await getAuthToken();
      await request(app).post('/api/v1/recipes').set('Authorization', 'Bearer ' + token)
        .send({ ...sampleRecipe, title: 'Test Recipe', description: 'A delicious eggless cake' });

      const res = await request(app)
        .get('/api/v1/recipes/search?q=eggless')
        .set('Authorization', 'Bearer ' + token);

      expect(res.status).toBe(200);
      expect(res.body.data.recipes).toHaveLength(1);
    });
  });

  // =========================================================================
  // POST /api/v1/recipes/:id/scale — Scaling
  // =========================================================================
  describe('POST /api/v1/recipes/:id/scale', () => {
    it('should scale recipe by target servings', async () => {
      const token = await getAuthToken();
      const createRes = await request(app)
        .post('/api/v1/recipes')
        .set('Authorization', 'Bearer ' + token)
        .send(sampleRecipe);

      const recipeId = createRes.body.data.id;
      const res = await request(app)
        .post('/api/v1/recipes/' + recipeId + '/scale')
        .set('Authorization', 'Bearer ' + token)
        .send({ targetServings: 48 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.scaling_factor).toBeCloseTo(2.0, 1);
      expect(res.body.data.recipe.servings).toBe(48);
      // Ingredients should be doubled
      for (const ing of res.body.data.recipe.ingredients) {
        expect(ing.scaling_factor).toBeCloseTo(2.0, 1);
      }
    });

    it('should scale recipe by target yield grams', async () => {
      const token = await getAuthToken();
      const createRes = await request(app)
        .post('/api/v1/recipes')
        .set('Authorization', 'Bearer ' + token)
        .send(sampleRecipe);

      const recipeId = createRes.body.data.id;
      const res = await request(app)
        .post('/api/v1/recipes/' + recipeId + '/scale')
        .set('Authorization', 'Bearer ' + token)
        .send({ targetYieldGrams: 1200 });

      expect(res.status).toBe(200);
      expect(res.body.data.scaling_factor).toBeCloseTo(2.0, 1);
      expect(res.body.data.recipe.yield_weight_grams).toBe(1200);
    });

    it('should return 403 when scaling another users recipe', async () => {
      const token1 = await getAuthToken();
      const token2 = await getAuthToken();
      const createRes = await request(app)
        .post('/api/v1/recipes')
        .set('Authorization', 'Bearer ' + token1)
        .send(sampleRecipe);

      const recipeId = createRes.body.data.id;
      const res = await request(app)
        .post('/api/v1/recipes/' + recipeId + '/scale')
        .set('Authorization', 'Bearer ' + token2)
        .send({ targetServings: 48 });

      expect(res.status).toBe(403);
    });
  });

  // =========================================================================
  // Pagination and sorting
  // =========================================================================
  describe('Pagination and Sorting', () => {
    it('should paginate recipe list', async () => {
      const token = await getAuthToken();
      // Create 3 recipes
      for (let i = 1; i <= 3; i++) {
        await request(app)
          .post('/api/v1/recipes')
          .set('Authorization', 'Bearer ' + token)
          .send({ ...sampleRecipe, title: `Recipe ${i}` });
      }

      const res = await request(app)
        .get('/api/v1/recipes?page=1&limit=2')
        .set('Authorization', 'Bearer ' + token);

      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(3);
      expect(res.body.data.page).toBe(1);
      expect(res.body.data.limit).toBe(2);
    });

    it('should filter recipes by status', async () => {
      const token = await getAuthToken();
      await request(app).post('/api/v1/recipes').set('Authorization', 'Bearer ' + token)
        .send({ ...sampleRecipe, title: 'Active Recipe', status: 'active' });
      await request(app).post('/api/v1/recipes').set('Authorization', 'Bearer ' + token)
        .send({ ...sampleRecipe, title: 'Draft Recipe', status: 'draft' });

      const res = await request(app)
        .get('/api/v1/recipes?status=draft')
        .set('Authorization', 'Bearer ' + token);

      expect(res.status).toBe(200);
      expect(res.body.data.recipes.every((r: any) => r.status === 'draft')).toBe(true);
    });
  });
});
