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
  // joined fields
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

// ---------------------------------------------------------------------------
// Seed some ingredients for tests
// ---------------------------------------------------------------------------

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
  if (text.includes('FROM ingredient_master WHERE id')) {
    const id = params?.[0] as string;
    const found = mockIngredients.filter((i) => i.id === id);
    return { rows: found, rowCount: found.length };
  }
  if (text.includes('FROM ingredient_master') && !text.includes('WHERE')) {
    return { rows: mockIngredients, rowCount: mockIngredients.length };
  }

  // --- Inventory Items ---
  // COUNT query
  if (text.includes('SELECT COUNT') && text.includes('inventory_items')) {
    const userId = params?.[0] as string;
    const items = mockInventoryItems.filter((i) => i.user_id === userId);
    return { rows: [{ count: String(items.length) }], rowCount: 1 };
  }
  // SELECT with JOIN for list/get
  if (text.includes('FROM inventory_items ii') && text.includes('JOIN ingredient_master') && text.includes('WHERE ii.id')) {
    const id = params?.[0] as string;
    const item = mockInventoryItems.find((i) => i.id === id);
    if (item) {
      const ing = mockIngredients.find((i) => i.id === item.ingredient_master_id);
      return { rows: [{ ...item, ingredient_name: ing?.name || '', ingredient_category: ing?.category || '' }], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }
  if (text.includes('FROM inventory_items ii') && text.includes('JOIN ingredient_master') && text.includes('ii.user_id')) {
    const userId = params?.[0] as string;
    let items = mockInventoryItems.filter((i) => i.user_id === userId);

    // Handle low stock filter
    if (text.includes('ii.quantity_on_hand < ii.min_stock_level')) {
      items = items.filter((i) => i.min_stock_level !== null && i.quantity_on_hand < i.min_stock_level);
    }
    // Handle expiring soon filter
    if (text.includes('expiration_date') && text.includes('INTERVAL')) {
      const now = new Date();
      const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      items = items.filter((i) => {
        if (!i.expiration_date) return false;
        const exp = new Date(i.expiration_date);
        return exp >= now && exp <= sevenDaysLater;
      });
    }

    const enriched = items.map((item) => {
      const ing = mockIngredients.find((i) => i.id === item.ingredient_master_id);
      const daysUntilExpiry = item.expiration_date
        ? Math.ceil((new Date(item.expiration_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;
      return { ...item, ingredient_name: ing?.name || '', ingredient_category: ing?.category || '', days_until_expiry: daysUntilExpiry };
    });
    return { rows: enriched, rowCount: enriched.length };
  }
  // DELETE inventory item (must be checked before generic SELECT by id)
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
  // UPDATE inventory item (general)
  if (text.includes('UPDATE inventory_items') && text.includes('quantity_on_hand') && text.includes('cost_per_unit') && !text.includes('quantity_on_hand -')) {
    // Purchase update: SET quantity_on_hand = $1, cost_per_unit = $2 WHERE id = $3
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
  if (text.includes('UPDATE inventory_items') && text.includes('quantity_on_hand = quantity_on_hand -')) {
    // Deduction update
    const deductQty = params?.[0] as number;
    const id = params?.[1] as string;
    const item = mockInventoryItems.find((i) => i.id === id);
    if (item) {
      item.quantity_on_hand = item.quantity_on_hand - deductQty;
      item.updated_at = new Date();
    }
    return { rows: item ? [item] : [], rowCount: item ? 1 : 0 };
  }
  if (text.includes('UPDATE inventory_items')) {
    // Generic update — last param is the id
    const id = params?.[params!.length - 1] as string;
    const item = mockInventoryItems.find((i) => i.id === id);
    if (item) item.updated_at = new Date();
    return { rows: item ? [item] : [], rowCount: item ? 1 : 0 };
  }

  // --- Purchases ---
  // COUNT
  if (text.includes('SELECT COUNT') && text.includes('inventory_purchases')) {
    const userId = params?.[0] as string;
    const purchases = mockPurchases.filter((p) => p.user_id === userId);
    return { rows: [{ count: String(purchases.length) }], rowCount: 1 };
  }
  // SELECT list
  if (text.includes('FROM inventory_purchases ip') && text.includes('JOIN ingredient_master')) {
    const userId = params?.[0] as string;
    const purchases = mockPurchases.filter((p) => p.user_id === userId);
    const enriched = purchases.map((p) => {
      const ing = mockIngredients.find((i) => i.id === p.ingredient_master_id);
      return { ...p, ingredient_name: ing?.name || '' };
    });
    return { rows: enriched, rowCount: enriched.length };
  }
  // INSERT purchase
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

  // --- Usage report ---
  if (text.includes('SUM(ip.quantity)') && text.includes('GROUP BY')) {
    return { rows: [], rowCount: 0 };
  }

  // --- Value report ---
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

// Set env vars before importing app
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key-for-testing';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.NODE_ENV = 'test';

import { app } from '../../src/app';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getAuthToken(): Promise<{ token: string; userId: string }> {
  const email = 'inv-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6) + '@example.com';
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ email, password: 'StrongPass1', display_name: 'Inventory Tester' });
  const userId = mockUsers[mockUsers.length - 1].id;
  return { token: res.body.data.accessToken, userId };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Inventory API', () => {
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
  // POST /api/v1/inventory — Create
  // =========================================================================
  describe('POST /api/v1/inventory', () => {
    it('should create an inventory item', async () => {
      const { token } = await getAuthToken();
      const ingredientId = mockIngredients[0].id;

      const res = await request(app)
        .post('/api/v1/inventory')
        .set('Authorization', 'Bearer ' + token)
        .send({
          ingredient_master_id: ingredientId,
          quantity_on_hand: 1000,
          unit: 'grams',
          cost_per_unit: 0.40,
          currency: 'INR',
          min_stock_level: 200,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.ingredient_master_id).toBe(ingredientId);
      expect(res.body.data.quantity_on_hand).toBe(1000);
      expect(res.body.data.unit).toBe('grams');
      expect(res.body.data.ingredient_name).toBe('all-purpose flour');
    });

    it('should reject invalid ingredient_master_id', async () => {
      const { token } = await getAuthToken();

      const res = await request(app)
        .post('/api/v1/inventory')
        .set('Authorization', 'Bearer ' + token)
        .send({
          ingredient_master_id: 'not-a-uuid',
          quantity_on_hand: 100,
          unit: 'grams',
        });

      expect(res.status).toBe(400);
    });

    it('should reject missing required fields', async () => {
      const { token } = await getAuthToken();

      const res = await request(app)
        .post('/api/v1/inventory')
        .set('Authorization', 'Bearer ' + token)
        .send({ ingredient_master_id: mockIngredients[0].id });

      expect(res.status).toBe(400);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .post('/api/v1/inventory')
        .send({
          ingredient_master_id: uid(),
          quantity_on_hand: 100,
          unit: 'grams',
        });

      expect(res.status).toBe(401);
    });
  });

  // =========================================================================
  // PATCH /api/v1/inventory/:id — Update
  // =========================================================================
  describe('PATCH /api/v1/inventory/:id', () => {
    it('should update an inventory item', async () => {
      const { token, userId } = await getAuthToken();
      const ingredientId = mockIngredients[0].id;

      // Create item first
      const createRes = await request(app)
        .post('/api/v1/inventory')
        .set('Authorization', 'Bearer ' + token)
        .send({
          ingredient_master_id: ingredientId,
          quantity_on_hand: 500,
          unit: 'grams',
        });

      const itemId = createRes.body.data.id;

      const res = await request(app)
        .patch(`/api/v1/inventory/${itemId}`)
        .set('Authorization', 'Bearer ' + token)
        .send({ quantity_on_hand: 800 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject update for non-existent item', async () => {
      const { token } = await getAuthToken();
      const fakeId = uid();

      const res = await request(app)
        .patch(`/api/v1/inventory/${fakeId}`)
        .set('Authorization', 'Bearer ' + token)
        .send({ quantity_on_hand: 100 });

      expect(res.status).toBe(404);
    });

    it('should reject update for item owned by another user', async () => {
      const { token: token1, userId: userId1 } = await getAuthToken();
      const { token: token2 } = await getAuthToken();
      const ingredientId = mockIngredients[0].id;

      const createRes = await request(app)
        .post('/api/v1/inventory')
        .set('Authorization', 'Bearer ' + token1)
        .send({
          ingredient_master_id: ingredientId,
          quantity_on_hand: 500,
          unit: 'grams',
        });

      const itemId = createRes.body.data.id;

      const res = await request(app)
        .patch(`/api/v1/inventory/${itemId}`)
        .set('Authorization', 'Bearer ' + token2)
        .send({ quantity_on_hand: 999 });

      expect(res.status).toBe(403);
    });
  });

  // =========================================================================
  // POST /api/v1/inventory/purchases — Log Purchase
  // =========================================================================
  describe('POST /api/v1/inventory/purchases', () => {
    it('should log a purchase and update inventory quantity', async () => {
      const { token, userId } = await getAuthToken();
      const ingredientId = mockIngredients[0].id;

      // Create inventory item first
      await request(app)
        .post('/api/v1/inventory')
        .set('Authorization', 'Bearer ' + token)
        .send({
          ingredient_master_id: ingredientId,
          quantity_on_hand: 500,
          unit: 'grams',
          cost_per_unit: 0.30,
        });

      const res = await request(app)
        .post('/api/v1/inventory/purchases')
        .set('Authorization', 'Bearer ' + token)
        .send({
          ingredient_master_id: ingredientId,
          quantity: 1000,
          unit: 'grams',
          cost: 400,
          purchase_date: '2024-06-15',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.purchase).toBeDefined();
      expect(res.body.data.purchase.quantity).toBe(1000);
      expect(res.body.data.purchase.cost).toBe(400);
    });

    it('should log a purchase without matching inventory item', async () => {
      const { token } = await getAuthToken();
      const ingredientId = mockIngredients[1].id;

      const res = await request(app)
        .post('/api/v1/inventory/purchases')
        .set('Authorization', 'Bearer ' + token)
        .send({
          ingredient_master_id: ingredientId,
          quantity: 500,
          unit: 'grams',
          cost: 250,
          purchase_date: '2024-06-15',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.purchase).toBeDefined();
      expect(res.body.data.inventory_item).toBeNull();
    });

    it('should reject purchase with invalid ingredient', async () => {
      const { token } = await getAuthToken();

      const res = await request(app)
        .post('/api/v1/inventory/purchases')
        .set('Authorization', 'Bearer ' + token)
        .send({
          ingredient_master_id: 'not-a-uuid',
          quantity: 100,
          unit: 'grams',
          cost: 50,
          purchase_date: '2024-06-15',
        });

      expect(res.status).toBe(400);
    });

    it('should reject purchase with missing required fields', async () => {
      const { token } = await getAuthToken();

      const res = await request(app)
        .post('/api/v1/inventory/purchases')
        .set('Authorization', 'Bearer ' + token)
        .send({ ingredient_master_id: mockIngredients[0].id });

      expect(res.status).toBe(400);
    });
  });

  // =========================================================================
  // GET /api/v1/inventory/alerts — Low Stock & Expiration Alerts
  // =========================================================================
  describe('GET /api/v1/inventory/alerts', () => {
    it('should return low stock alerts', async () => {
      const { token, userId } = await getAuthToken();
      const ingredientId = mockIngredients[0].id;

      // Create item with quantity below min_stock_level
      mockInventoryItems.push({
        id: uid(),
        user_id: userId,
        ingredient_master_id: ingredientId,
        quantity_on_hand: 50,
        unit: 'grams',
        cost_per_unit: 0.40,
        currency: 'INR',
        purchase_date: null,
        expiration_date: null,
        supplier_id: null,
        min_stock_level: 200,
        reorder_quantity: 500,
        notes: null,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const res = await request(app)
        .get('/api/v1/inventory/alerts')
        .set('Authorization', 'Bearer ' + token);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      const lowStockAlert = res.body.data.find((a: any) => a.alert_type === 'low_stock');
      expect(lowStockAlert).toBeDefined();
      expect(lowStockAlert.quantity_on_hand).toBe(50);
      expect(lowStockAlert.min_stock_level).toBe(200);
    });

    it('should return expiration warning alerts', async () => {
      const { token, userId } = await getAuthToken();
      const ingredientId = mockIngredients[1].id;

      // Create item expiring in 3 days
      const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      mockInventoryItems.push({
        id: uid(),
        user_id: userId,
        ingredient_master_id: ingredientId,
        quantity_on_hand: 200,
        unit: 'grams',
        cost_per_unit: 1.50,
        currency: 'INR',
        purchase_date: null,
        expiration_date: threeDaysFromNow,
        supplier_id: null,
        min_stock_level: null,
        reorder_quantity: null,
        notes: null,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const res = await request(app)
        .get('/api/v1/inventory/alerts')
        .set('Authorization', 'Bearer ' + token);

      expect(res.status).toBe(200);
      const expiringAlert = res.body.data.find((a: any) => a.alert_type === 'expiring_soon');
      expect(expiringAlert).toBeDefined();
      expect(expiringAlert.ingredient_name).toBe('butter');
    });

    it('should return empty alerts when no issues', async () => {
      const { token, userId } = await getAuthToken();

      // Create healthy item (above min stock, no expiration)
      mockInventoryItems.push({
        id: uid(),
        user_id: userId,
        ingredient_master_id: mockIngredients[0].id,
        quantity_on_hand: 5000,
        unit: 'grams',
        cost_per_unit: 0.40,
        currency: 'INR',
        purchase_date: null,
        expiration_date: null,
        supplier_id: null,
        min_stock_level: 200,
        reorder_quantity: null,
        notes: null,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const res = await request(app)
        .get('/api/v1/inventory/alerts')
        .set('Authorization', 'Bearer ' + token);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app).get('/api/v1/inventory/alerts');
      expect(res.status).toBe(401);
    });
  });

  // =========================================================================
  // DELETE /api/v1/inventory/:id — Delete
  // =========================================================================
  describe('DELETE /api/v1/inventory/:id', () => {
    it('should delete an inventory item', async () => {
      const { token } = await getAuthToken();
      const ingredientId = mockIngredients[0].id;

      const createRes = await request(app)
        .post('/api/v1/inventory')
        .set('Authorization', 'Bearer ' + token)
        .send({
          ingredient_master_id: ingredientId,
          quantity_on_hand: 500,
          unit: 'grams',
        });

      const itemId = createRes.body.data.id;

      const res = await request(app)
        .delete(`/api/v1/inventory/${itemId}`)
        .set('Authorization', 'Bearer ' + token);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockInventoryItems.find((i) => i.id === itemId)).toBeUndefined();
    });

    it('should reject delete for non-existent item', async () => {
      const { token } = await getAuthToken();

      const res = await request(app)
        .delete(`/api/v1/inventory/${uid()}`)
        .set('Authorization', 'Bearer ' + token);

      expect(res.status).toBe(404);
    });

    it('should reject delete for item owned by another user', async () => {
      const { token: token1 } = await getAuthToken();
      const { token: token2 } = await getAuthToken();
      const ingredientId = mockIngredients[0].id;

      const createRes = await request(app)
        .post('/api/v1/inventory')
        .set('Authorization', 'Bearer ' + token1)
        .send({
          ingredient_master_id: ingredientId,
          quantity_on_hand: 500,
          unit: 'grams',
        });

      const itemId = createRes.body.data.id;

      const res = await request(app)
        .delete(`/api/v1/inventory/${itemId}`)
        .set('Authorization', 'Bearer ' + token2);

      expect(res.status).toBe(403);
    });
  });

  // =========================================================================
  // GET /api/v1/inventory — List
  // =========================================================================
  describe('GET /api/v1/inventory', () => {
    it('should list inventory items for authenticated user', async () => {
      const { token, userId } = await getAuthToken();

      // Add items directly
      mockInventoryItems.push({
        id: uid(), user_id: userId, ingredient_master_id: mockIngredients[0].id,
        quantity_on_hand: 1000, unit: 'grams', cost_per_unit: 0.40, currency: 'INR',
        purchase_date: null, expiration_date: null, supplier_id: null,
        min_stock_level: null, reorder_quantity: null, notes: null,
        created_at: new Date(), updated_at: new Date(),
      });

      const res = await request(app)
        .get('/api/v1/inventory')
        .set('Authorization', 'Bearer ' + token);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app).get('/api/v1/inventory');
      expect(res.status).toBe(401);
    });
  });
});
