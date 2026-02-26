import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';

// ---------------------------------------------------------------------------
// In-memory stores
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
}

interface MockInventoryItem {
  id: string;
  user_id: string;
  ingredient_master_id: string;
  quantity_on_hand: number;
  unit: string;
  cost_per_unit: number | null;
  currency: string;
}

interface MockRecipe {
  id: string;
  user_id: string;
  title: string;
  servings: number;
  yield_weight_grams: number;
  status: string;
}

interface MockRecipeIngredient {
  id: string;
  recipe_id: string;
  display_name: string;
  ingredient_master_id: string;
  quantity_grams: number;
  position: number;
}

interface MockRecipeCost {
  id: string;
  recipe_id: string;
  ingredient_cost: number;
  overhead_cost: number;
  packaging_cost: number;
  labor_cost: number;
  total_cost: number;
  currency: string;
  calculated_at: Date;
}

let mockUsers: MockUser[] = [];
let mockIngredients: MockIngredientMaster[] = [];
let mockInventoryItems: MockInventoryItem[] = [];
let mockRecipes: MockRecipe[] = [];
let mockRecipeIngredients: MockRecipeIngredient[] = [];
let mockRecipeCosts: MockRecipeCost[] = [];
let mockBlacklist: Set<string> = new Set();

function uid(): string {
  const hex = () => Math.random().toString(16).slice(2, 6);
  return hex() + hex() + '-' + hex() + '-4' + hex().slice(1) + '-a' + hex().slice(1) + '-' + hex() + hex() + hex();
}

function seedIngredients(): void {
  mockIngredients = [
    { id: uid(), name: 'all-purpose flour', category: 'flour', default_density_g_per_ml: 0.53 },
    { id: uid(), name: 'butter', category: 'fat', default_density_g_per_ml: 0.91 },
    { id: uid(), name: 'sugar', category: 'sugar', default_density_g_per_ml: 0.85 },
  ];
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
      default_currency: (params?.[4] as string) || 'INR',
      language: (params?.[5] as string) || 'en',
      created_at: new Date(), updated_at: new Date(),
    };
    mockUsers.push(newUser);
    return { rows: [newUser], rowCount: 1 };
  }

  // --- Ingredient Master ---
  if (text.includes('FROM ingredient_master') && !text.includes('WHERE')) {
    return { rows: mockIngredients, rowCount: mockIngredients.length };
  }

  // --- Recipes ---
  if (text.includes('FROM recipes WHERE id')) {
    const id = params?.[0] as string;
    const found = mockRecipes.filter((r) => r.id === id);
    return { rows: found, rowCount: found.length };
  }

  // --- Recipe Ingredients ---
  if (text.includes('FROM recipe_ingredients WHERE recipe_id')) {
    const recipeId = params?.[0] as string;
    const found = mockRecipeIngredients.filter((ri) => ri.recipe_id === recipeId);
    return { rows: found, rowCount: found.length };
  }

  // --- Inventory Items (for cost calculation) ---
  if (text.includes('FROM inventory_items WHERE user_id')) {
    const userId = params?.[0] as string;
    const found = mockInventoryItems.filter((i) => i.user_id === userId);
    return { rows: found, rowCount: found.length };
  }

  // --- Recipe Costs ---
  if (text.includes('INSERT INTO recipe_costs')) {
    const newCost: MockRecipeCost = {
      id: uid(),
      recipe_id: params?.[0] as string,
      ingredient_cost: params?.[1] as number,
      overhead_cost: params?.[2] as number,
      packaging_cost: params?.[3] as number,
      labor_cost: params?.[4] as number,
      total_cost: params?.[5] as number,
      currency: params?.[6] as string,
      calculated_at: new Date(),
    };
    mockRecipeCosts.push(newCost);
    return { rows: [newCost], rowCount: 1 };
  }
  if (text.includes('FROM recipe_costs') && text.includes('recipe_id') && text.includes('LIMIT 1')) {
    const recipeId = params?.[0] as string;
    const found = mockRecipeCosts
      .filter((c) => c.recipe_id === recipeId)
      .sort((a, b) => b.calculated_at.getTime() - a.calculated_at.getTime());
    return { rows: found.slice(0, 1), rowCount: Math.min(found.length, 1) };
  }
  if (text.includes('FROM recipe_costs') && text.includes('recipe_id') && text.includes('ORDER BY calculated_at')) {
    const recipeId = params?.[0] as string;
    const found = mockRecipeCosts
      .filter((c) => c.recipe_id === recipeId)
      .sort((a, b) => b.calculated_at.getTime() - a.calculated_at.getTime());
    return { rows: found, rowCount: found.length };
  }
  // Profit margin report
  if (text.includes('DISTINCT ON') && text.includes('recipe_costs')) {
    const userId = params?.[0] as string;
    const userRecipeIds = mockRecipes.filter((r) => r.user_id === userId).map((r) => r.id);
    const latestCosts = new Map<string, MockRecipeCost>();
    for (const cost of mockRecipeCosts) {
      if (userRecipeIds.includes(cost.recipe_id)) {
        const existing = latestCosts.get(cost.recipe_id);
        if (!existing || cost.calculated_at > existing.calculated_at) {
          latestCosts.set(cost.recipe_id, cost);
        }
      }
    }
    const rows = Array.from(latestCosts.values()).map((c) => {
      const recipe = mockRecipes.find((r) => r.id === c.recipe_id);
      return { ...c, recipe_title: recipe?.title || '' };
    });
    return { rows, rowCount: rows.length };
  }
  // Cost trend report
  if (text.includes('recipe_costs rc') && text.includes('JOIN recipes r') && text.includes('ORDER BY rc.calculated_at ASC')) {
    const userId = params?.[0] as string;
    const userRecipeIds = mockRecipes.filter((r) => r.user_id === userId).map((r) => r.id);
    const rows = mockRecipeCosts
      .filter((c) => userRecipeIds.includes(c.recipe_id))
      .sort((a, b) => a.calculated_at.getTime() - b.calculated_at.getTime())
      .map((c) => {
        const recipe = mockRecipes.find((r) => r.id === c.recipe_id);
        return { ...c, recipe_title: recipe?.title || '' };
      });
    return { rows, rowCount: rows.length };
  }

  // --- Token blacklist ---
  if (text.includes('token_blacklist')) {
    if (text.includes('INSERT')) {
      mockBlacklist.add(params?.[0] as string);
      return { rows: [], rowCount: 1 };
    }
    if (text.includes('SELECT')) {
      const token = params?.[0] as string;
      return { rows: mockBlacklist.has(token) ? [{ token }] : [], rowCount: mockBlacklist.has(token) ? 1 : 0 };
    }
  }

  // --- BEGIN / COMMIT / ROLLBACK ---
  if (/^(BEGIN|COMMIT|ROLLBACK|SELECT 1)$/i.test(text.trim())) {
    return { rows: [], rowCount: 0 };
  }

  return { rows: [], rowCount: 0 };
}

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------

const mockQueryFn = vi.fn().mockImplementation(handleQuery);
const mockClientQuery = vi.fn().mockImplementation(handleQuery);
const mockClient = { query: mockClientQuery, release: vi.fn() };

vi.mock('../../src/config/database', () => ({
  db: {
    query: (...args: unknown[]) => mockQueryFn(...args),
    withTransaction: vi.fn().mockImplementation(async (fn: (client: typeof mockClient) => Promise<unknown>) => {
      mockClientQuery.mockImplementation(handleQuery);
      return fn(mockClient as any);
    }),
    getClient: vi.fn().mockResolvedValue(mockClient),
    connect: vi.fn(),
    close: vi.fn(),
    checkHealth: vi.fn().mockResolvedValue({ healthy: true, latencyMs: 1, pool: { total: 1, idle: 1, waiting: 0 } }),
    getPoolStats: vi.fn().mockReturnValue({ totalCount: 1, idleCount: 1, waitingCount: 0 }),
  },
}));

vi.mock('../../src/config/redis', () => ({
  redis: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    checkHealth: vi.fn().mockResolvedValue({ healthy: true, latencyMs: 1 }),
  },
}));

vi.mock('../../src/config/storage', () => ({
  storage: {
    checkHealth: vi.fn().mockResolvedValue({ healthy: true }),
  },
}));

// Set env vars before app import
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key-for-testing';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.NODE_ENV = 'test';
process.env.RATE_LIMIT_MAX_REQUESTS = '10000';

import { app } from '../../src/app';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function registerAndLogin(): Promise<{ token: string; userId: string }> {
  const email = `test-${uid()}@example.com`;
  const res = await request(app).post('/api/v1/auth/register').send({
    email,
    password: 'StrongPass1',
    display_name: 'Test User',
  });
  const userId = mockUsers[mockUsers.length - 1].id;
  return { token: res.body.data.accessToken, userId };
}


function createTestRecipe(userId: string): { recipe: MockRecipe; ingredients: MockRecipeIngredient[] } {
  const recipe: MockRecipe = {
    id: uid(),
    user_id: userId,
    title: 'Test Cake',
    servings: 8,
    yield_weight_grams: 1000,
    status: 'draft',
  };
  mockRecipes.push(recipe);

  const ingredients: MockRecipeIngredient[] = [
    { id: uid(), recipe_id: recipe.id, display_name: 'all-purpose flour', ingredient_master_id: mockIngredients[0].id, quantity_grams: 300, position: 1 },
    { id: uid(), recipe_id: recipe.id, display_name: 'butter', ingredient_master_id: mockIngredients[1].id, quantity_grams: 200, position: 2 },
    { id: uid(), recipe_id: recipe.id, display_name: 'sugar', ingredient_master_id: mockIngredients[2].id, quantity_grams: 150, position: 3 },
  ];
  mockRecipeIngredients.push(...ingredients);

  return { recipe, ingredients };
}

function addInventoryForUser(userId: string): void {
  for (const ing of mockIngredients) {
    mockInventoryItems.push({
      id: uid(),
      user_id: userId,
      ingredient_master_id: ing.id,
      quantity_on_hand: 1000,
      unit: 'g',
      cost_per_unit: 0.05,
      currency: 'INR',
    });
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Costing and Pricing Service', () => {
  beforeEach(() => {
    mockUsers = [];
    mockIngredients = [];
    mockInventoryItems = [];
    mockRecipes = [];
    mockRecipeIngredients = [];
    mockRecipeCosts = [];
    mockBlacklist = new Set();
    mockQueryFn.mockImplementation(handleQuery);
    mockClientQuery.mockImplementation(handleQuery);
    seedIngredients();
  });

  // -----------------------------------------------------------------------
  // POST /api/v1/recipes/:id/cost/calculate
  // -----------------------------------------------------------------------

  describe('POST /recipes/:id/cost/calculate', () => {
    it('should calculate recipe cost with all components', async () => {
      const { token, userId } = await registerAndLogin();
      const { recipe } = createTestRecipe(userId);
      addInventoryForUser(userId);

      const res = await request(app)
        .post(`/api/v1/recipes/${recipe.id}/cost/calculate`)
        .set('Authorization', `Bearer ${token}`)
        .send({ overhead_cost: 10, packaging_cost: 5, labor_cost: 20 });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('ingredient_cost');
      expect(res.body.data).toHaveProperty('overhead_cost', 10);
      expect(res.body.data).toHaveProperty('packaging_cost', 5);
      expect(res.body.data).toHaveProperty('labor_cost', 20);
      expect(res.body.data).toHaveProperty('total_cost');
      expect(res.body.data).toHaveProperty('cost_per_serving');
      expect(res.body.data).toHaveProperty('cost_per_100g');
      expect(res.body.data).toHaveProperty('breakdown');
      expect(res.body.data.total_cost).toBeGreaterThan(0);
      // total = ingredient + overhead + packaging + labor
      expect(res.body.data.total_cost).toBeCloseTo(
        res.body.data.ingredient_cost + 10 + 5 + 20,
        2,
      );
    });

    it('should calculate cost with defaults (zero overhead/packaging/labor)', async () => {
      const { token, userId } = await registerAndLogin();
      const { recipe } = createTestRecipe(userId);
      addInventoryForUser(userId);

      const res = await request(app)
        .post(`/api/v1/recipes/${recipe.id}/cost/calculate`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(201);
      expect(res.body.data.overhead_cost).toBe(0);
      expect(res.body.data.packaging_cost).toBe(0);
      expect(res.body.data.labor_cost).toBe(0);
      expect(res.body.data.total_cost).toBe(res.body.data.ingredient_cost);
    });

    it('should return error when recipe has no inventory data', async () => {
      const { token, userId } = await registerAndLogin();
      const { recipe } = createTestRecipe(userId);
      // No inventory added

      const res = await request(app)
        .post(`/api/v1/recipes/${recipe.id}/cost/calculate`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 404 for non-existent recipe', async () => {
      const { token } = await registerAndLogin();

      const res = await request(app)
        .post(`/api/v1/recipes/${uid()}/cost/calculate`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(404);
    });

    it('should return 403 for recipe owned by another user', async () => {
      const { token } = await registerAndLogin();
      const { token: token2, userId: userId2 } = await registerAndLogin();
      const { recipe } = createTestRecipe(userId2);
      addInventoryForUser(userId2);

      const res = await request(app)
        .post(`/api/v1/recipes/${recipe.id}/cost/calculate`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(403);
    });

    it('should store cost in recipe_costs table', async () => {
      const { token, userId } = await registerAndLogin();
      const { recipe } = createTestRecipe(userId);
      addInventoryForUser(userId);

      await request(app)
        .post(`/api/v1/recipes/${recipe.id}/cost/calculate`)
        .set('Authorization', `Bearer ${token}`)
        .send({ overhead_cost: 5 });

      expect(mockRecipeCosts.length).toBe(1);
      expect(mockRecipeCosts[0].recipe_id).toBe(recipe.id);
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .post(`/api/v1/recipes/${uid()}/cost/calculate`)
        .send({});

      expect(res.status).toBe(401);
    });
  });

  // -----------------------------------------------------------------------
  // GET /api/v1/recipes/:id/cost
  // -----------------------------------------------------------------------

  describe('GET /recipes/:id/cost', () => {
    it('should return current (latest) cost for recipe', async () => {
      const { token, userId } = await registerAndLogin();
      const { recipe } = createTestRecipe(userId);
      addInventoryForUser(userId);

      // Calculate cost first
      await request(app)
        .post(`/api/v1/recipes/${recipe.id}/cost/calculate`)
        .set('Authorization', `Bearer ${token}`)
        .send({ overhead_cost: 10 });

      const res = await request(app)
        .get(`/api/v1/recipes/${recipe.id}/cost`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('total_cost');
      expect(res.body.data).toHaveProperty('currency', 'INR');
    });

    it('should return 404 when no cost exists', async () => {
      const { token, userId } = await registerAndLogin();
      const { recipe } = createTestRecipe(userId);

      const res = await request(app)
        .get(`/api/v1/recipes/${recipe.id}/cost`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  // -----------------------------------------------------------------------
  // GET /api/v1/recipes/:id/cost/history
  // -----------------------------------------------------------------------

  describe('GET /recipes/:id/cost/history', () => {
    it('should return cost history for recipe', async () => {
      const { token, userId } = await registerAndLogin();
      const { recipe } = createTestRecipe(userId);
      addInventoryForUser(userId);

      // Calculate cost twice
      await request(app)
        .post(`/api/v1/recipes/${recipe.id}/cost/calculate`)
        .set('Authorization', `Bearer ${token}`)
        .send({ overhead_cost: 10 });

      await request(app)
        .post(`/api/v1/recipes/${recipe.id}/cost/calculate`)
        .set('Authorization', `Bearer ${token}`)
        .send({ overhead_cost: 20 });

      const res = await request(app)
        .get(`/api/v1/recipes/${recipe.id}/cost/history`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
    });
  });

  // -----------------------------------------------------------------------
  // POST /api/v1/recipes/:id/pricing
  // -----------------------------------------------------------------------

  describe('POST /recipes/:id/pricing', () => {
    it('should calculate pricing with target margin', async () => {
      const { token, userId } = await registerAndLogin();
      const { recipe } = createTestRecipe(userId);
      addInventoryForUser(userId);

      // Calculate cost first
      await request(app)
        .post(`/api/v1/recipes/${recipe.id}/cost/calculate`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      const res = await request(app)
        .post(`/api/v1/recipes/${recipe.id}/pricing`)
        .set('Authorization', `Bearer ${token}`)
        .send({ target_profit_margin_percent: 30 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('suggested_selling_price');
      expect(res.body.data).toHaveProperty('profit_amount');
      expect(res.body.data).toHaveProperty('actual_profit_margin');
      expect(res.body.data.suggested_selling_price).toBeGreaterThan(res.body.data.total_cost);
    });

    it('should support custom selling price', async () => {
      const { token, userId } = await registerAndLogin();
      const { recipe } = createTestRecipe(userId);
      addInventoryForUser(userId);

      await request(app)
        .post(`/api/v1/recipes/${recipe.id}/cost/calculate`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      const res = await request(app)
        .post(`/api/v1/recipes/${recipe.id}/pricing`)
        .set('Authorization', `Bearer ${token}`)
        .send({ target_profit_margin_percent: 30, custom_selling_price: 500 });

      expect(res.status).toBe(200);
      expect(res.body.data.suggested_selling_price).toBe(500);
    });

    it('should reject invalid margin', async () => {
      const { token, userId } = await registerAndLogin();
      const { recipe } = createTestRecipe(userId);

      const res = await request(app)
        .post(`/api/v1/recipes/${recipe.id}/pricing`)
        .set('Authorization', `Bearer ${token}`)
        .send({ target_profit_margin_percent: 100 });

      expect(res.status).toBe(400);
    });
  });

  // -----------------------------------------------------------------------
  // GET /api/v1/costing/reports/profit-margins
  // -----------------------------------------------------------------------

  describe('GET /costing/reports/profit-margins', () => {
    it('should return profit margin report', async () => {
      const { token, userId } = await registerAndLogin();
      const { recipe } = createTestRecipe(userId);
      addInventoryForUser(userId);

      await request(app)
        .post(`/api/v1/recipes/${recipe.id}/cost/calculate`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      const res = await request(app)
        .get('/api/v1/costing/reports/profit-margins')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // GET /api/v1/costing/reports/cost-trends
  // -----------------------------------------------------------------------

  describe('GET /costing/reports/cost-trends', () => {
    it('should return cost trend report', async () => {
      const { token, userId } = await registerAndLogin();
      const { recipe } = createTestRecipe(userId);
      addInventoryForUser(userId);

      await request(app)
        .post(`/api/v1/recipes/${recipe.id}/cost/calculate`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      const res = await request(app)
        .get('/api/v1/costing/reports/cost-trends')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});
