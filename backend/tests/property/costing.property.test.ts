import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import request from 'supertest';

// Set env vars BEFORE any app imports
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key-for-testing';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.NODE_ENV = 'test';
process.env.RATE_LIMIT_MAX_REQUESTS = '10000';

// ---------------------------------------------------------------------------
// In-memory stores
// ---------------------------------------------------------------------------

interface MockUser {
  id: string; email: string; password_hash: string; display_name: string | null;
  unit_preferences: Record<string, string>; default_currency: string; language: string;
  created_at: Date; updated_at: Date;
}
interface MockIngredientMaster {
  id: string; name: string; category: string; default_density_g_per_ml: number | null;
}
interface MockInventoryItem {
  id: string; user_id: string; ingredient_master_id: string;
  quantity_on_hand: number; unit: string; cost_per_unit: number | null; currency: string;
}
interface MockRecipe {
  id: string; user_id: string; title: string; servings: number;
  yield_weight_grams: number; status: string;
}
interface MockRecipeIngredient {
  id: string; recipe_id: string; display_name: string;
  ingredient_master_id: string; quantity_grams: number; position: number;
}
interface MockRecipeCost {
  id: string; recipe_id: string; ingredient_cost: number; overhead_cost: number;
  packaging_cost: number; labor_cost: number; total_cost: number;
  currency: string; calculated_at: Date;
}

let mockUsers: MockUser[] = [];
let mockIngredients: MockIngredientMaster[] = [];
let mockInventoryItems: MockInventoryItem[] = [];
let mockRecipes: MockRecipe[] = [];
let mockRecipeIngredients: MockRecipeIngredient[] = [];
let mockRecipeCosts: MockRecipeCost[] = [];
let mockBlacklist: Set<string> = new Set();
let transactionRolledBack = false;

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

  // --- Inventory Items ---
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

  // --- Transaction commands ---
  if (/^(BEGIN|COMMIT|ROLLBACK|SELECT 1)$/i.test(text.trim())) {
    return { rows: [], rowCount: 0 };
  }

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
  const email = 'pbt-cost-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6) + '@example.com';
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ email, password: 'StrongPass1', display_name: 'PBT Costing' });
  if (res.status !== 201) {
    throw new Error(`Registration failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  const userId = mockUsers[mockUsers.length - 1].id;
  return { token: res.body.data.accessToken, userId };
}

function createRecipeWithIngredients(userId: string, ingredientQuantities: number[]): string {
  const recipeId = uid();
  mockRecipes.push({
    id: recipeId,
    user_id: userId,
    title: 'PBT Cost Recipe',
    servings: 8,
    yield_weight_grams: 1000,
    status: 'draft',
  });
  ingredientQuantities.forEach((qty, idx) => {
    if (idx < mockIngredients.length) {
      mockRecipeIngredients.push({
        id: uid(),
        recipe_id: recipeId,
        display_name: mockIngredients[idx].name,
        ingredient_master_id: mockIngredients[idx].id,
        quantity_grams: qty,
        position: idx + 1,
      });
    }
  });
  return recipeId;
}

function addInventoryForUser(userId: string, costPerUnit: number): void {
  for (const ing of mockIngredients) {
    mockInventoryItems.push({
      id: uid(),
      user_id: userId,
      ingredient_master_id: ing.id,
      quantity_on_hand: 5000,
      unit: 'g',
      cost_per_unit: costPerUnit,
      currency: 'INR',
    });
  }
}

// ---------------------------------------------------------------------------
// Property Tests
// ---------------------------------------------------------------------------

describe('Costing Operations – Property-Based Tests', () => {
  beforeEach(() => {
    mockUsers = [];
    mockIngredients = [];
    mockInventoryItems = [];
    mockRecipes = [];
    mockRecipeIngredients = [];
    mockRecipeCosts = [];
    mockBlacklist = new Set();
    transactionRolledBack = false;
    seedIngredients();
  });

  // =========================================================================
  // Property 23: Cost Recalculation on Price Change
  // **Validates: Requirements 104.8**
  // When ingredient prices change, recalculating recipe cost should reflect
  // the new prices. The new total should differ proportionally to the price
  // change.
  // =========================================================================
  describe('Property 23: Cost Recalculation on Price Change', () => {
    it('recipe cost updates when ingredient prices change', async () => {
      const { token, userId } = await getAuthToken();

      await fc.assert(
        fc.asyncProperty(
          // original cost_per_unit (INR per gram)
          fc.double({ min: 0.01, max: 1.0, noNaN: true }),
          // new cost_per_unit (INR per gram) — different from original
          fc.double({ min: 0.01, max: 1.0, noNaN: true }),
          // ingredient quantities for 3 ingredients
          fc.array(fc.double({ min: 10, max: 1000, noNaN: true }), { minLength: 3, maxLength: 3 }),
          async (originalCost, newCost, quantities) => {
            // Reset per-iteration state
            mockInventoryItems = [];
            mockRecipes = [];
            mockRecipeIngredients = [];
            mockRecipeCosts = [];
            transactionRolledBack = false;

            const recipeId = createRecipeWithIngredients(userId, quantities);
            addInventoryForUser(userId, originalCost);

            // First calculation with original prices
            const res1 = await request(app)
              .post(`/api/v1/recipes/${recipeId}/cost/calculate`)
              .set('Authorization', 'Bearer ' + token)
              .send({});

            if (res1.status !== 201) return;

            const firstTotal = res1.body.data.total_cost;
            const firstIngredientCost = res1.body.data.ingredient_cost;

            // Change all inventory item prices
            for (const item of mockInventoryItems) {
              item.cost_per_unit = newCost;
            }

            // Recalculate with new prices
            const res2 = await request(app)
              .post(`/api/v1/recipes/${recipeId}/cost/calculate`)
              .set('Authorization', 'Bearer ' + token)
              .send({});

            if (res2.status !== 201) return;

            const secondTotal = res2.body.data.total_cost;
            const secondIngredientCost = res2.body.data.ingredient_cost;

            // The ingredient cost should scale proportionally to the price change
            // new_ingredient_cost / old_ingredient_cost ≈ newCost / originalCost
            if (firstIngredientCost > 0 && originalCost > 0) {
              const expectedRatio = newCost / originalCost;
              const actualRatio = secondIngredientCost / firstIngredientCost;
              expect(actualRatio).toBeCloseTo(expectedRatio, 1);
            }

            // Total cost should reflect the new ingredient cost (no overhead/packaging/labor)
            expect(secondTotal).toBeCloseTo(secondIngredientCost, 2);

            // If prices went up, total should go up; if down, total should go down
            if (newCost > originalCost) {
              expect(secondTotal).toBeGreaterThan(firstTotal - 0.01);
            } else if (newCost < originalCost) {
              expect(secondTotal).toBeLessThan(firstTotal + 0.01);
            }
          },
        ),
        { numRuns: 100 },
      );
    }, 120_000);
  });

  // =========================================================================
  // Property 24: Packaging Cost Inclusion
  // **Validates: Requirements 115.4**
  // total_cost = ingredient_cost + overhead_cost + packaging_cost + labor_cost
  // =========================================================================
  describe('Property 24: Packaging Cost Inclusion', () => {
    it('total_cost = ingredient_cost + overhead_cost + packaging_cost + labor_cost', async () => {
      const { token, userId } = await getAuthToken();

      await fc.assert(
        fc.asyncProperty(
          // overhead cost
          fc.double({ min: 0, max: 500, noNaN: true }),
          // packaging cost
          fc.double({ min: 0, max: 500, noNaN: true }),
          // labor cost
          fc.double({ min: 0, max: 500, noNaN: true }),
          // ingredient quantities
          fc.array(fc.double({ min: 10, max: 1000, noNaN: true }), { minLength: 3, maxLength: 3 }),
          async (overhead, packaging, labor, quantities) => {
            // Reset per-iteration state
            mockInventoryItems = [];
            mockRecipes = [];
            mockRecipeIngredients = [];
            mockRecipeCosts = [];
            transactionRolledBack = false;

            const recipeId = createRecipeWithIngredients(userId, quantities);
            addInventoryForUser(userId, 0.05);

            const res = await request(app)
              .post(`/api/v1/recipes/${recipeId}/cost/calculate`)
              .set('Authorization', 'Bearer ' + token)
              .send({
                overhead_cost: overhead,
                packaging_cost: packaging,
                labor_cost: labor,
              });

            if (res.status !== 201) return;

            const data = res.body.data;
            const expectedTotal = data.ingredient_cost + data.overhead_cost + data.packaging_cost + data.labor_cost;

            // Verify the total cost formula
            expect(data.total_cost).toBeCloseTo(expectedTotal, 2);

            // Verify the individual components match what we sent
            expect(data.overhead_cost).toBeCloseTo(overhead, 2);
            expect(data.packaging_cost).toBeCloseTo(packaging, 2);
            expect(data.labor_cost).toBeCloseTo(labor, 2);

            // Ingredient cost must be positive (we have ingredients with cost)
            expect(data.ingredient_cost).toBeGreaterThan(0);

            // Total must be >= ingredient cost (overhead/packaging/labor are non-negative)
            expect(data.total_cost).toBeGreaterThanOrEqual(data.ingredient_cost - 0.01);
          },
        ),
        { numRuns: 100 },
      );
    }, 120_000);
  });

  // =========================================================================
  // Property 28: Profit Margin Calculation
  // **Validates: Requirements 119.1**
  // profit_margin = ((price - cost) / price) × 100
  // The pricing endpoint uses: price = cost / (1 - margin/100), then rounds
  // up to nearest rupee. The actual_profit_margin is recalculated after
  // rounding.
  // =========================================================================
  describe('Property 28: Profit Margin Calculation', () => {
    it('profit_margin = ((price - cost) / price) × 100', async () => {
      const { token, userId } = await getAuthToken();

      await fc.assert(
        fc.asyncProperty(
          // target profit margin percent (1-99, excluding 100 which is invalid)
          fc.double({ min: 1, max: 99, noNaN: true }),
          // ingredient quantities
          fc.array(fc.double({ min: 50, max: 500, noNaN: true }), { minLength: 3, maxLength: 3 }),
          async (targetMargin, quantities) => {
            // Reset per-iteration state
            mockInventoryItems = [];
            mockRecipes = [];
            mockRecipeIngredients = [];
            mockRecipeCosts = [];
            transactionRolledBack = false;

            const recipeId = createRecipeWithIngredients(userId, quantities);
            addInventoryForUser(userId, 0.05);

            // First calculate cost so pricing has something to work with
            const costRes = await request(app)
              .post(`/api/v1/recipes/${recipeId}/cost/calculate`)
              .set('Authorization', 'Bearer ' + token)
              .send({});

            if (costRes.status !== 201) return;

            // Now calculate pricing with the target margin
            const pricingRes = await request(app)
              .post(`/api/v1/recipes/${recipeId}/pricing`)
              .set('Authorization', 'Bearer ' + token)
              .send({ target_profit_margin_percent: targetMargin });

            if (pricingRes.status !== 200) return;

            const data = pricingRes.body.data;
            const price = data.suggested_selling_price;
            const cost = data.total_cost;
            const profit = data.profit_amount;
            const actualMargin = data.actual_profit_margin;

            // Verify: profit = price - cost
            expect(profit).toBeCloseTo(price - cost, 2);

            // Verify: actual_margin = ((price - cost) / price) × 100
            const expectedMargin = ((price - cost) / price) * 100;
            expect(actualMargin).toBeCloseTo(expectedMargin, 2);

            // Price is rounded up to nearest rupee, so actual margin >= target margin
            expect(actualMargin).toBeGreaterThanOrEqual(targetMargin - 0.01);

            // Selling price must be greater than cost
            expect(price).toBeGreaterThan(cost);
          },
        ),
        { numRuns: 100 },
      );
    }, 120_000);
  });
});
