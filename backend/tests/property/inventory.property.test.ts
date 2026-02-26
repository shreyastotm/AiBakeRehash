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
  purchase_date: string | null;
  expiration_date: string | null;
  supplier_id: string | null;
  min_stock_level: number | null;
  reorder_quantity: number | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  ingredient_name?: string;
  ingredient_category?: string;
}

interface MockPurchase {
  id: string;
  user_id: string;
  ingredient_master_id: string;
  quantity: number;
  unit: string;
  cost: number;
  currency: string;
  supplier_id: string | null;
  invoice_number: string | null;
  purchase_date: string;
  notes: string | null;
  created_at: Date;
  ingredient_name?: string;
}

interface MockRecipe {
  id: string;
  user_id: string;
  title: string;
  servings: number;
  yield_weight_grams: number;
  status: string;
  [key: string]: unknown;
}

interface MockRecipeIngredient {
  id: string;
  recipe_id: string;
  display_name: string;
  ingredient_master_id: string;
  quantity_grams: number;
  position: number;
}

let mockUsers: MockUser[] = [];
let mockIngredients: MockIngredientMaster[] = [];
let mockInventoryItems: MockInventoryItem[] = [];
let mockPurchases: MockPurchase[] = [];
let mockRecipes: MockRecipe[] = [];
let mockRecipeIngredients: MockRecipeIngredient[] = [];
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
    { id: uid(), name: 'milk', category: 'dairy', default_density_g_per_ml: 1.03 },
    { id: uid(), name: 'eggs', category: 'other', default_density_g_per_ml: 1.03 },
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
  if (text.includes('FROM ingredient_master WHERE id')) {
    const id = params?.[0] as string;
    const found = mockIngredients.filter((i) => i.id === id);
    return { rows: found, rowCount: found.length };
  }
  if (text.includes('FROM ingredient_master') && !text.includes('WHERE')) {
    return { rows: mockIngredients, rowCount: mockIngredients.length };
  }
  if (text.includes('SELECT id, name, default_density_g_per_ml FROM ingredient_master')) {
    return { rows: mockIngredients, rowCount: mockIngredients.length };
  }

  // --- Inventory Items ---
  // COUNT query
  if (text.includes('SELECT COUNT') && text.includes('inventory_items')) {
    const userId = params?.[0] as string;
    const items = mockInventoryItems.filter((i) => i.user_id === userId);
    return { rows: [{ count: String(items.length) }], rowCount: 1 };
  }
  // SELECT with JOIN for list/get by id
  if (text.includes('FROM inventory_items ii') && text.includes('JOIN ingredient_master') && text.includes('WHERE ii.id')) {
    const id = params?.[0] as string;
    const item = mockInventoryItems.find((i) => i.id === id);
    if (item) {
      const ing = mockIngredients.find((i) => i.id === item.ingredient_master_id);
      return { rows: [{ ...item, ingredient_name: ing?.name || '', ingredient_category: ing?.category || '' }], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }
  // Low stock alerts query
  if (text.includes('FROM inventory_items ii') && text.includes('JOIN ingredient_master') && text.includes('ii.quantity_on_hand < ii.min_stock_level')) {
    const userId = params?.[0] as string;
    const items = mockInventoryItems.filter((i) =>
      i.user_id === userId && i.min_stock_level !== null && i.quantity_on_hand < i.min_stock_level
    );
    const enriched = items.map((item) => {
      const ing = mockIngredients.find((i) => i.id === item.ingredient_master_id);
      return { ...item, ingredient_name: ing?.name || '', ingredient_category: ing?.category || '' };
    });
    return { rows: enriched, rowCount: enriched.length };
  }
  // Expiring soon query
  if (text.includes('FROM inventory_items ii') && text.includes('JOIN ingredient_master') && text.includes('expiration_date') && text.includes('INTERVAL')) {
    const userId = params?.[0] as string;
    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const items = mockInventoryItems.filter((i) => {
      if (i.user_id !== userId || !i.expiration_date) return false;
      const exp = new Date(i.expiration_date);
      return exp >= now && exp <= sevenDaysLater;
    });
    const enriched = items.map((item) => {
      const ing = mockIngredients.find((i) => i.id === item.ingredient_master_id);
      const daysUntilExpiry = Math.ceil((new Date(item.expiration_date!).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return { ...item, ingredient_name: ing?.name || '', ingredient_category: ing?.category || '', days_until_expiry: daysUntilExpiry };
    });
    return { rows: enriched, rowCount: enriched.length };
  }
  // SELECT with JOIN for list by user_id
  if (text.includes('FROM inventory_items ii') && text.includes('JOIN ingredient_master') && text.includes('ii.user_id')) {
    const userId = params?.[0] as string;
    const items = mockInventoryItems.filter((i) => i.user_id === userId);
    const enriched = items.map((item) => {
      const ing = mockIngredients.find((i) => i.id === item.ingredient_master_id);
      return { ...item, ingredient_name: ing?.name || '', ingredient_category: ing?.category || '' };
    });
    return { rows: enriched, rowCount: enriched.length };
  }
  // DELETE inventory item
  if (text.includes('DELETE FROM inventory_items WHERE id')) {
    const id = params?.[0] as string;
    const idx = mockInventoryItems.findIndex((i) => i.id === id);
    if (idx >= 0) mockInventoryItems.splice(idx, 1);
    return { rows: [], rowCount: idx >= 0 ? 1 : 0 };
  }
  // SELECT * FROM inventory_items WHERE id (ownership check)
  if (text.includes('FROM inventory_items WHERE id')) {
    const id = params?.[0] as string;
    const found = mockInventoryItems.filter((i) => i.id === id);
    return { rows: found, rowCount: found.length };
  }
  // SELECT for matching inventory item by user + ingredient + unit (WHERE clause)
  if (text.includes('FROM inventory_items') && text.includes('WHERE') && text.includes('AND ingredient_master_id') && text.includes('AND unit')) {
    const userId = params?.[0] as string;
    const ingredientId = params?.[1] as string;
    const unit = params?.[2] as string;
    const found = mockInventoryItems.filter((i) => i.user_id === userId && i.ingredient_master_id === ingredientId && i.unit === unit);
    return { rows: found.slice(0, 1), rowCount: Math.min(found.length, 1) };
  }
  // SELECT inventory items by user_id only (for deduction lookup)
  if (text.includes('FROM inventory_items WHERE user_id') && !text.includes('AND ingredient_master_id')) {
    const userId = params?.[0] as string;
    const found = mockInventoryItems.filter((i) => i.user_id === userId);
    return { rows: found, rowCount: found.length };
  }
  // INSERT inventory item
  if (text.includes('INSERT INTO inventory_items')) {
    const newItem: MockInventoryItem = {
      id: uid(),
      user_id: params?.[0] as string,
      ingredient_master_id: params?.[1] as string,
      quantity_on_hand: params?.[2] as number,
      unit: params?.[3] as string,
      cost_per_unit: params?.[4] as number | null,
      currency: (params?.[5] as string) || 'INR',
      purchase_date: params?.[6] as string | null,
      expiration_date: params?.[7] as string | null,
      supplier_id: params?.[8] as string | null,
      min_stock_level: params?.[9] as number | null,
      reorder_quantity: params?.[10] as number | null,
      notes: params?.[11] as string | null,
      created_at: new Date(),
      updated_at: new Date(),
    };
    if (!transactionRolledBack) mockInventoryItems.push(newItem);
    return { rows: [newItem], rowCount: 1 };
  }
  // UPDATE inventory item (purchase update: quantity + cost)
  if (text.includes('UPDATE inventory_items') && text.includes('quantity_on_hand') && text.includes('cost_per_unit') && !text.includes('quantity_on_hand -')) {
    const newQty = params?.[0] as number;
    const newCost = params?.[1] as number;
    const id = params?.[2] as string;
    const item = mockInventoryItems.find((i) => i.id === id);
    if (item) {
      item.quantity_on_hand = newQty;
      item.cost_per_unit = newCost;
      item.updated_at = new Date();
    }
    return { rows: item ? [item] : [], rowCount: item ? 1 : 0 };
  }
  // UPDATE inventory item (deduction)
  if (text.includes('UPDATE inventory_items') && text.includes('quantity_on_hand = quantity_on_hand -')) {
    const deductQty = params?.[0] as number;
    const id = params?.[1] as string;
    const item = mockInventoryItems.find((i) => i.id === id);
    if (item) {
      item.quantity_on_hand = item.quantity_on_hand - deductQty;
      item.updated_at = new Date();
    }
    return { rows: item ? [item] : [], rowCount: item ? 1 : 0 };
  }
  // UPDATE inventory item (generic)
  if (text.includes('UPDATE inventory_items')) {
    const id = params?.[params!.length - 1] as string;
    const item = mockInventoryItems.find((i) => i.id === id);
    if (item) item.updated_at = new Date();
    return { rows: item ? [item] : [], rowCount: item ? 1 : 0 };
  }

  // --- Purchases ---
  if (text.includes('SELECT COUNT') && text.includes('inventory_purchases')) {
    const userId = params?.[0] as string;
    const purchases = mockPurchases.filter((p) => p.user_id === userId);
    return { rows: [{ count: String(purchases.length) }], rowCount: 1 };
  }
  if (text.includes('FROM inventory_purchases ip') && text.includes('JOIN ingredient_master')) {
    const userId = params?.[0] as string;
    const purchases = mockPurchases.filter((p) => p.user_id === userId);
    const enriched = purchases.map((p) => {
      const ing = mockIngredients.find((i) => i.id === p.ingredient_master_id);
      return { ...p, ingredient_name: ing?.name || '' };
    });
    return { rows: enriched, rowCount: enriched.length };
  }
  if (text.includes('INSERT INTO inventory_purchases')) {
    const newPurchase: MockPurchase = {
      id: uid(),
      user_id: params?.[0] as string,
      ingredient_master_id: params?.[1] as string,
      quantity: params?.[2] as number,
      unit: params?.[3] as string,
      cost: params?.[4] as number,
      currency: (params?.[5] as string) || 'INR',
      supplier_id: params?.[6] as string | null,
      invoice_number: params?.[7] as string | null,
      purchase_date: params?.[8] as string,
      notes: params?.[9] as string | null,
      created_at: new Date(),
    };
    if (!transactionRolledBack) mockPurchases.push(newPurchase);
    return { rows: [newPurchase], rowCount: 1 };
  }

  // --- Recipes (for deduction) ---
  if (text.includes('FROM recipes WHERE id')) {
    const id = params?.[0] as string;
    const found = mockRecipes.filter((r) => r.id === id);
    return { rows: found, rowCount: found.length };
  }

  // --- Recipe Ingredients (for deduction) ---
  if (text.includes('FROM recipe_ingredients WHERE recipe_id')) {
    const recipeId = params?.[0] as string;
    const found = mockRecipeIngredients.filter((ri) => ri.recipe_id === recipeId);
    return { rows: found, rowCount: found.length };
  }

  // --- Reports ---
  if (text.includes('SUM(ip.quantity)') && text.includes('GROUP BY')) {
    return { rows: [], rowCount: 0 };
  }
  if (text.includes('SUM(ii.quantity_on_hand') && text.includes('GROUP BY')) {
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
  const email = 'pbt-inv-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6) + '@example.com';
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ email, password: 'StrongPass1', display_name: 'PBT Inventory' });
  if (res.status !== 201) {
    throw new Error(`Registration failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  const userId = mockUsers[mockUsers.length - 1].id;
  return { token: res.body.data.accessToken, userId };
}

// ---------------------------------------------------------------------------
// Property Tests
// ---------------------------------------------------------------------------

describe('Inventory Operations – Property-Based Tests', () => {
  beforeEach(() => {
    mockUsers = [];
    mockIngredients = [];
    mockInventoryItems = [];
    mockPurchases = [];
    mockRecipes = [];
    mockRecipeIngredients = [];
    mockBlacklist = new Set();
    transactionRolledBack = false;
    seedIngredients();
  });

  // =========================================================================
  // Property 18: Inventory Transaction Completeness
  // **Validates: Requirements 101.7**
  // current_quantity = initial_quantity + sum(purchases) - sum(deductions)
  // =========================================================================
  describe('Property 18: Inventory Transaction Completeness', () => {
    it('current_quantity = initial_quantity + sum(purchases) after logging purchases', async () => {
      const { token, userId } = await getAuthToken();

      await fc.assert(
        fc.asyncProperty(
          // initial quantity
          fc.double({ min: 100, max: 10000, noNaN: true }),
          // array of purchase quantities (1-5 purchases)
          fc.array(fc.double({ min: 1, max: 5000, noNaN: true }), { minLength: 1, maxLength: 5 }),
          async (initialQty, purchaseQtys) => {
            // Reset inventory state (keep user for auth)
            mockInventoryItems = [];
            mockPurchases = [];
            transactionRolledBack = false;

            const ingredientId = mockIngredients[0].id;

            // Create inventory item with initial quantity
            const createRes = await request(app)
              .post('/api/v1/inventory')
              .set('Authorization', 'Bearer ' + token)
              .send({
                ingredient_master_id: ingredientId,
                quantity_on_hand: initialQty,
                unit: 'grams',
                cost_per_unit: 0.40,
              });

            if (createRes.status !== 201) return;

            // Log each purchase
            let expectedQuantity = initialQty;
            for (const qty of purchaseQtys) {
              const purchaseRes = await request(app)
                .post('/api/v1/inventory/purchases')
                .set('Authorization', 'Bearer ' + token)
                .send({
                  ingredient_master_id: ingredientId,
                  quantity: qty,
                  unit: 'grams',
                  cost: qty * 0.40,
                  purchase_date: '2024-06-15',
                });

              if (purchaseRes.status !== 201) return;
              expectedQuantity += qty;
            }

            // Verify: current quantity = initial + sum(purchases)
            const actualItem = mockInventoryItems.find(
              (i) => i.user_id === userId && i.ingredient_master_id === ingredientId,
            );
            expect(actualItem).toBeDefined();
            expect(actualItem!.quantity_on_hand).toBeCloseTo(expectedQuantity, 2);
          },
        ),
        { numRuns: 100 },
      );
    }, 120_000);
  });

  // =========================================================================
  // Property 19: Low Stock Alert Triggering
  // **Validates: Requirements 102.3**
  // Alert created when quantity < min_stock_level
  // =========================================================================
  describe('Property 19: Low Stock Alert Triggering', () => {
    it('alert is created when quantity_on_hand < min_stock_level', async () => {
      const { token, userId } = await getAuthToken();

      await fc.assert(
        fc.asyncProperty(
          // min_stock_level
          fc.double({ min: 100, max: 5000, noNaN: true }),
          // quantity_on_hand as a fraction of min_stock_level (0.01 to 0.99 = below, 1.01 to 3.0 = above)
          fc.double({ min: 0.01, max: 3.0, noNaN: true }),
          async (minStockLevel, quantityFraction) => {
            mockInventoryItems = [];
            transactionRolledBack = false;

            const ingredientId = mockIngredients[0].id;
            const quantityOnHand = minStockLevel * quantityFraction;
            const isLowStock = quantityOnHand < minStockLevel;

            // Directly insert inventory item into mock store
            mockInventoryItems.push({
              id: uid(),
              user_id: userId,
              ingredient_master_id: ingredientId,
              quantity_on_hand: quantityOnHand,
              unit: 'grams',
              cost_per_unit: 0.40,
              currency: 'INR',
              purchase_date: null,
              expiration_date: null,
              supplier_id: null,
              min_stock_level: minStockLevel,
              reorder_quantity: null,
              notes: null,
              created_at: new Date(),
              updated_at: new Date(),
            });

            const alertsRes = await request(app)
              .get('/api/v1/inventory/alerts')
              .set('Authorization', 'Bearer ' + token);

            expect(alertsRes.status).toBe(200);

            const lowStockAlerts = alertsRes.body.data.filter(
              (a: any) => a.alert_type === 'low_stock',
            );

            if (isLowStock) {
              // Should have a low stock alert
              expect(lowStockAlerts.length).toBeGreaterThanOrEqual(1);
              expect(lowStockAlerts[0].quantity_on_hand).toBeCloseTo(quantityOnHand, 2);
              expect(lowStockAlerts[0].min_stock_level).toBeCloseTo(minStockLevel, 2);
            } else {
              // Should NOT have a low stock alert
              expect(lowStockAlerts.length).toBe(0);
            }
          },
        ),
        { numRuns: 100 },
      );
    }, 120_000);
  });

  // =========================================================================
  // Property 21: Inventory Sufficiency Warning
  // **Validates: Requirements 103.6**
  // Warning shown when recipe quantity > available inventory
  // =========================================================================
  describe('Property 21: Inventory Sufficiency Warning', () => {
    it('warning generated when recipe ingredient quantity exceeds available inventory', async () => {
      const { token, userId } = await getAuthToken();

      await fc.assert(
        fc.asyncProperty(
          // inventory quantity on hand (grams) — use integers to avoid floating point edge cases
          fc.integer({ min: 10, max: 5000 }),
          // recipe ingredient quantity (grams) — can be more or less than inventory
          fc.integer({ min: 10, max: 10000 }),
          async (inventoryQty, recipeQty) => {
            mockInventoryItems = [];
            mockRecipes = [];
            mockRecipeIngredients = [];
            transactionRolledBack = false;

            const ingredientId = mockIngredients[0].id;
            const recipeId = uid();
            const isInsufficient = recipeQty > inventoryQty;

            // Create inventory item
            mockInventoryItems.push({
              id: uid(),
              user_id: userId,
              ingredient_master_id: ingredientId,
              quantity_on_hand: inventoryQty,
              unit: 'grams',
              cost_per_unit: 0.40,
              currency: 'INR',
              purchase_date: null,
              expiration_date: null,
              supplier_id: null,
              min_stock_level: null,
              reorder_quantity: null,
              notes: null,
              created_at: new Date(),
              updated_at: new Date(),
            });

            // Create recipe with one ingredient
            mockRecipes.push({
              id: recipeId,
              user_id: userId,
              title: 'PBT Recipe',
              servings: 12,
              yield_weight_grams: 500,
              status: 'active',
            });

            mockRecipeIngredients.push({
              id: uid(),
              recipe_id: recipeId,
              display_name: 'all-purpose flour',
              ingredient_master_id: ingredientId,
              quantity_grams: recipeQty,
              position: 1,
            });

            // Request deduction preview (confirm=false)
            const deductRes = await request(app)
              .post('/api/v1/inventory/deduct')
              .set('Authorization', 'Bearer ' + token)
              .send({
                recipe_id: recipeId,
                scaling_factor: 1,
                confirm: false,
              });

            expect(deductRes.status).toBe(200);

            const warnings = deductRes.body.data.deductions.warnings;

            if (isInsufficient) {
              // Should have an insufficiency warning
              expect(warnings.length).toBeGreaterThanOrEqual(1);
              const hasInsufficientWarning = warnings.some(
                (w: string) => w.toLowerCase().includes('insufficient'),
              );
              expect(hasInsufficientWarning).toBe(true);
            } else {
              // Should NOT have an insufficiency warning
              const hasInsufficientWarning = warnings.some(
                (w: string) => w.toLowerCase().includes('insufficient'),
              );
              expect(hasInsufficientWarning).toBe(false);
            }
          },
        ),
        { numRuns: 100 },
      );
    }, 120_000);
  });
});
