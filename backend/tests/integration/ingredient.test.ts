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

interface MockIngredientMaster {
  id: string;
  name: string;
  category: string;
  default_density_g_per_ml: number | null;
  nutrition_per_100g: Record<string, number> | null;
  allergen_flags: Record<string, boolean> | null;
  is_composite: boolean;
  created_at: Date;
  updated_at: Date;
}

interface MockAlias {
  id: string;
  ingredient_master_id: string;
  alias_name: string;
  alias_type: string;
  locale: string | null;
}

let mockUsers: MockUser[] = [];
let mockIngredients: MockIngredientMaster[] = [];
let mockAliases: MockAlias[] = [];
let mockBlacklist: Set<string> = new Set();

function uid(): string {
  const hex = () => Math.random().toString(16).slice(2, 6);
  return hex() + hex() + '-' + hex() + '-4' + hex().slice(1) + '-a' + hex().slice(1) + '-' + hex() + hex() + hex();
}

// ---------------------------------------------------------------------------
// Seed data helper
// ---------------------------------------------------------------------------

function seedIngredients(): void {
  mockIngredients = [
    {
      id: uid(), name: 'all-purpose flour', category: 'flour',
      default_density_g_per_ml: 0.53, is_composite: false,
      nutrition_per_100g: { energy_kcal: 364, protein_g: 10.3, fat_g: 1.0, carbs_g: 76.3, fiber_g: 2.7 },
      allergen_flags: { gluten: true },
      created_at: new Date(), updated_at: new Date(),
    },
    {
      id: uid(), name: 'butter', category: 'fat',
      default_density_g_per_ml: 0.91, is_composite: false,
      nutrition_per_100g: { energy_kcal: 717, protein_g: 0.9, fat_g: 81.1, carbs_g: 0.1 },
      allergen_flags: { dairy: true },
      created_at: new Date(), updated_at: new Date(),
    },
    {
      id: uid(), name: 'granulated sugar', category: 'sugar',
      default_density_g_per_ml: 0.85, is_composite: false,
      nutrition_per_100g: { energy_kcal: 387, protein_g: 0, fat_g: 0, carbs_g: 100 },
      allergen_flags: null,
      created_at: new Date(), updated_at: new Date(),
    },
    {
      id: uid(), name: 'cardamom', category: 'spice',
      default_density_g_per_ml: null, is_composite: false,
      nutrition_per_100g: { energy_kcal: 311, protein_g: 10.8, fat_g: 6.7, carbs_g: 68.5 },
      allergen_flags: null,
      created_at: new Date(), updated_at: new Date(),
    },
    {
      id: uid(), name: 'whole wheat flour', category: 'flour',
      default_density_g_per_ml: 0.51, is_composite: false,
      nutrition_per_100g: { energy_kcal: 340, protein_g: 13.2, fat_g: 2.5, carbs_g: 72.0, fiber_g: 10.7 },
      allergen_flags: { gluten: true },
      created_at: new Date(), updated_at: new Date(),
    },
  ];

  // Add aliases
  const flourId = mockIngredients[0].id;
  const wheatFlourId = mockIngredients[4].id;
  const cardamomId = mockIngredients[3].id;

  mockAliases = [
    { id: uid(), ingredient_master_id: flourId, alias_name: 'maida', alias_type: 'regional', locale: 'hi' },
    { id: uid(), ingredient_master_id: flourId, alias_name: 'AP flour', alias_type: 'abbreviation', locale: null },
    { id: uid(), ingredient_master_id: wheatFlourId, alias_name: 'atta', alias_type: 'regional', locale: 'hi' },
    { id: uid(), ingredient_master_id: cardamomId, alias_name: 'elaichi', alias_type: 'regional', locale: 'hi' },
  ];
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

  // --- Ingredient master: COUNT ---
  if (text.includes('COUNT(*)') && text.includes('FROM ingredient_master')) {
    let filtered = [...mockIngredients];
    if (text.includes('category =') && params && params.length > 0) {
      filtered = filtered.filter((i) => i.category === params[0]);
    }
    return { rows: [{ count: String(filtered.length) }], rowCount: 1 };
  }

  // --- Ingredient master: SELECT all with ORDER BY (list) ---
  if (text.includes('SELECT *') && text.includes('FROM ingredient_master') && text.includes('ORDER BY') && !text.includes('WHERE id')) {
    let filtered = [...mockIngredients];
    if (text.includes('category =') && params && params.length > 0) {
      filtered = filtered.filter((i) => i.category === params[0]);
    }
    filtered.sort((a, b) => a.name.localeCompare(b.name));
    return { rows: filtered, rowCount: filtered.length };
  }

  // --- Ingredient master: SELECT by id ---
  if (text.includes('FROM ingredient_master WHERE id')) {
    const id = params?.[0] as string;
    const found = mockIngredients.filter((i) => i.id === id);
    return { rows: found, rowCount: found.length };
  }

  // --- Ingredient master: SELECT for search (id, name, category, density) ---
  if (text.includes('SELECT id, name, category, default_density_g_per_ml FROM ingredient_master')) {
    const rows = mockIngredients.map((i) => ({
      id: i.id, name: i.name, category: i.category,
      default_density_g_per_ml: i.default_density_g_per_ml,
    }));
    return { rows, rowCount: rows.length };
  }

  // --- Ingredient master: INSERT ---
  if (text.includes('INSERT INTO ingredient_master')) {
    const newIng: MockIngredientMaster = {
      id: uid(),
      name: params?.[0] as string,
      category: params?.[1] as string,
      default_density_g_per_ml: params?.[2] as number | null,
      nutrition_per_100g: params?.[3] ? (typeof params[3] === 'string' ? JSON.parse(params[3]) : params[3]) as Record<string, number> : null,
      allergen_flags: params?.[4] ? (typeof params[4] === 'string' ? JSON.parse(params[4]) : params[4]) as Record<string, boolean> : null,
      is_composite: (params?.[5] as boolean) || false,
      created_at: new Date(), updated_at: new Date(),
    };
    mockIngredients.push(newIng);
    return { rows: [newIng], rowCount: 1 };
  }

  // --- Aliases: SELECT by ingredient_master_id ---
  if (text.includes('FROM ingredient_aliases WHERE ingredient_master_id')) {
    const ingId = params?.[0] as string;
    const found = mockAliases.filter((a) => a.ingredient_master_id === ingId).sort((a, b) => a.alias_name.localeCompare(b.alias_name));
    return { rows: found, rowCount: found.length };
  }

  // --- Aliases: SELECT all ---
  if (text.includes('SELECT ingredient_master_id, alias_name FROM ingredient_aliases')) {
    const rows = mockAliases.map((a) => ({
      ingredient_master_id: a.ingredient_master_id,
      alias_name: a.alias_name,
    }));
    return { rows, rowCount: rows.length };
  }

  return { rows: [], rowCount: 0 };
}

const mockQueryFn = vi.fn(async (text: string, params?: unknown[]) => handleQuery(text, params));

vi.mock('../../src/config/database', () => ({
  db: {
    query: (...args: unknown[]) => mockQueryFn(args[0] as string, args[1] as unknown[]),
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
  const email = 'baker-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6) + '@example.com';
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ email, password: 'StrongPass1', display_name: 'Test Baker' });
  return res.body.data.accessToken;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Ingredient API', () => {
  beforeEach(() => {
    mockUsers = [];
    mockIngredients = [];
    mockAliases = [];
    mockBlacklist = new Set();
    seedIngredients();
  });

  // =========================================================================
  // GET /api/v1/ingredients — List
  // =========================================================================
  describe('GET /api/v1/ingredients', () => {
    it('should list all ingredients with pagination', async () => {
      const res = await request(app).get('/api/v1/ingredients');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.ingredients).toHaveLength(5);
      expect(res.body.data.total).toBe(5);
      expect(res.body.data.page).toBe(1);
      expect(res.body.data.limit).toBe(20);
    });

    it('should filter by category', async () => {
      const res = await request(app).get('/api/v1/ingredients?category=flour');

      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(2);
      expect(res.body.data.ingredients).toHaveLength(2);
      expect(res.body.data.ingredients.every((i: any) => i.category === 'flour')).toBe(true);
    });

    it('should respect page and limit params', async () => {
      const res = await request(app).get('/api/v1/ingredients?page=1&limit=2');

      expect(res.status).toBe(200);
      expect(res.body.data.page).toBe(1);
      expect(res.body.data.limit).toBe(2);
      expect(res.body.data.total).toBe(5);
    });

    it('should return ingredients sorted by name', async () => {
      const res = await request(app).get('/api/v1/ingredients');

      const names = res.body.data.ingredients.map((i: any) => i.name);
      const sorted = [...names].sort();
      expect(names).toEqual(sorted);
    });
  });

  // =========================================================================
  // GET /api/v1/ingredients/:id — Get by ID
  // =========================================================================
  describe('GET /api/v1/ingredients/:id', () => {
    it('should retrieve ingredient with nutrition, density, and aliases', async () => {
      const ingredientId = mockIngredients[0].id; // all-purpose flour
      const res = await request(app).get('/api/v1/ingredients/' + ingredientId);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('all-purpose flour');
      expect(res.body.data.category).toBe('flour');
      expect(res.body.data.default_density_g_per_ml).toBe(0.53);
      expect(res.body.data.nutrition_per_100g).toBeDefined();
      expect(res.body.data.nutrition_per_100g.energy_kcal).toBe(364);
      expect(res.body.data.allergen_flags).toEqual({ gluten: true });
      expect(res.body.data.aliases).toHaveLength(2);
      expect(res.body.data.aliases.map((a: any) => a.alias_name)).toContain('maida');
      expect(res.body.data.aliases.map((a: any) => a.alias_name)).toContain('AP flour');
    });

    it('should return 404 for non-existent ingredient', async () => {
      const res = await request(app).get('/api/v1/ingredients/a0000000-0000-4000-a000-000000000099');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 for invalid UUID', async () => {
      const res = await request(app).get('/api/v1/ingredients/not-a-uuid');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // =========================================================================
  // POST /api/v1/ingredients — Create
  // =========================================================================
  describe('POST /api/v1/ingredients', () => {
    it('should create a custom ingredient', async () => {
      const token = await getAuthToken();
      const res = await request(app)
        .post('/api/v1/ingredients')
        .set('Authorization', 'Bearer ' + token)
        .send({
          name: 'Khoya',
          category: 'dairy',
          default_density_g_per_ml: 1.1,
          nutrition_per_100g: { energy_kcal: 321, protein_g: 14.6, fat_g: 25.0, carbs_g: 8.5 },
          allergen_flags: { dairy: true },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('khoya'); // lowercased
      expect(res.body.data.category).toBe('dairy');
      expect(res.body.data.default_density_g_per_ml).toBe(1.1);
      expect(res.body.data.nutrition_per_100g).toBeDefined();
      expect(res.body.data.allergen_flags).toEqual({ dairy: true });
    });

    it('should create ingredient without optional fields', async () => {
      const token = await getAuthToken();
      const res = await request(app)
        .post('/api/v1/ingredients')
        .set('Authorization', 'Bearer ' + token)
        .send({ name: 'Rose Water', category: 'liquid' });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('rose water');
      expect(res.body.data.default_density_g_per_ml).toBeNull();
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .post('/api/v1/ingredients')
        .send({ name: 'Test', category: 'other' });

      expect(res.status).toBe(401);
    });

    it('should reject missing name', async () => {
      const token = await getAuthToken();
      const res = await request(app)
        .post('/api/v1/ingredients')
        .set('Authorization', 'Bearer ' + token)
        .send({ category: 'flour' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject invalid category', async () => {
      const token = await getAuthToken();
      const res = await request(app)
        .post('/api/v1/ingredients')
        .set('Authorization', 'Bearer ' + token)
        .send({ name: 'Test', category: 'invalid' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // =========================================================================
  // GET /api/v1/ingredients/search — Fuzzy search
  // =========================================================================
  describe('GET /api/v1/ingredients/search', () => {
    it('should find ingredients by canonical name', async () => {
      const res = await request(app).get('/api/v1/ingredients/search?q=flour');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      // Should find flour-related ingredients
      const names = res.body.data.map((r: any) => r.ingredient_name);
      expect(names.some((n: string) => n.includes('flour'))).toBe(true);
    });

    it('should find ingredients by alias (regional name)', async () => {
      const res = await request(app).get('/api/v1/ingredients/search?q=maida');

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      // Should find all-purpose flour via alias
      const aliasMatches = res.body.data.filter((r: any) => r.match_type === 'alias');
      expect(aliasMatches.length).toBeGreaterThan(0);
      expect(aliasMatches[0].matched_alias).toBe('maida');
    });

    it('should return results with similarity scores', async () => {
      const res = await request(app).get('/api/v1/ingredients/search?q=butter');

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      for (const result of res.body.data) {
        expect(result.similarity_score).toBeGreaterThan(0);
        expect(result.similarity_score).toBeLessThanOrEqual(1);
        expect(result.match_type).toBeDefined();
        expect(result.ingredient_id).toBeDefined();
        expect(result.ingredient_name).toBeDefined();
        expect(result.category).toBeDefined();
      }
    });

    it('should rank results by similarity (highest first)', async () => {
      const res = await request(app).get('/api/v1/ingredients/search?q=sugar');

      expect(res.status).toBe(200);
      if (res.body.data.length > 1) {
        for (let i = 1; i < res.body.data.length; i++) {
          expect(res.body.data[i - 1].similarity_score).toBeGreaterThanOrEqual(
            res.body.data[i].similarity_score,
          );
        }
      }
    });

    it('should indicate alias matches vs canonical matches', async () => {
      const res = await request(app).get('/api/v1/ingredients/search?q=elaichi');

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      const aliasMatch = res.body.data.find((r: any) => r.match_type === 'alias');
      expect(aliasMatch).toBeDefined();
      expect(aliasMatch.matched_alias).toBe('elaichi');
      expect(aliasMatch.ingredient_name).toBe('cardamom');
    });

    it('should reject missing query parameter', async () => {
      const res = await request(app).get('/api/v1/ingredients/search');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return empty array for no matches', async () => {
      const res = await request(app).get('/api/v1/ingredients/search?q=xyznonexistent');

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });
  });
});
