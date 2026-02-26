import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';

// ---------------------------------------------------------------------------
// In-memory stores for mocking
// ---------------------------------------------------------------------------

interface MockUser {
  id: string; email: string; password_hash: string; display_name: string | null;
  unit_preferences: Record<string, string>; default_currency: string; language: string;
  created_at: Date; updated_at: Date;
}
interface MockSupplier {
  id: string; user_id: string; name: string; contact_person: string | null;
  phone: string | null; email: string | null; address: string | null;
  notes: string | null; created_at: Date; updated_at: Date;
}
interface MockPackagingItem {
  id: string; user_id: string; name: string; cost_per_unit: number;
  currency: string; quantity_on_hand: number | null; notes: string | null;
  created_at: Date; updated_at: Date;
}
interface MockDeliveryZone {
  id: string; user_id: string; zone_name: string; base_charge: number;
  per_km_charge: number | null; free_delivery_threshold: number | null;
  currency: string; created_at: Date; updated_at: Date;
}
interface MockInventoryItem {
  id: string; user_id: string; ingredient_master_id: string;
  quantity_on_hand: number; unit: string; cost_per_unit: number | null;
  currency: string; supplier_id: string | null;
}
interface MockIngredientMaster {
  id: string; name: string; category: string; default_density_g_per_ml: number | null;
}

let mockUsers: MockUser[] = [];
let mockSuppliers: MockSupplier[] = [];
let mockPackagingItems: MockPackagingItem[] = [];
let mockDeliveryZones: MockDeliveryZone[] = [];
let mockInventoryItems: MockInventoryItem[] = [];
let mockIngredients: MockIngredientMaster[] = [];
let mockBlacklist: Set<string> = new Set();

function uid(): string {
  const hex = () => Math.random().toString(16).slice(2, 6);
  return hex() + hex() + '-' + hex() + '-4' + hex().slice(1) + '-a' + hex().slice(1) + '-' + hex() + hex() + hex();
}

function seedIngredients(): void {
  mockIngredients = [
    { id: uid(), name: 'all-purpose flour', category: 'flour', default_density_g_per_ml: 0.53 },
    { id: uid(), name: 'butter', category: 'fat', default_density_g_per_ml: 0.91 },
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

  // --- Suppliers ---
  if (text.includes('DELETE FROM suppliers WHERE id')) {
    const id = params?.[0] as string;
    const idx = mockSuppliers.findIndex((s) => s.id === id);
    if (idx >= 0) mockSuppliers.splice(idx, 1);
    return { rows: [], rowCount: idx >= 0 ? 1 : 0 };
  }
  if (text.includes('UPDATE suppliers SET')) {
    const id = params?.[params!.length - 1] as string;
    const supplier = mockSuppliers.find((s) => s.id === id);
    if (supplier) {
      supplier.updated_at = new Date();
      // Apply name update if present
      if (text.includes('name =') && params && params.length > 1) {
        supplier.name = params[0] as string;
      }
    }
    return { rows: supplier ? [supplier] : [], rowCount: supplier ? 1 : 0 };
  }
  if (text.includes('INSERT INTO suppliers')) {
    const newSupplier: MockSupplier = {
      id: uid(), user_id: params?.[0] as string, name: params?.[1] as string,
      contact_person: params?.[2] as string | null, phone: params?.[3] as string | null,
      email: params?.[4] as string | null, address: params?.[5] as string | null,
      notes: params?.[6] as string | null, created_at: new Date(), updated_at: new Date(),
    };
    mockSuppliers.push(newSupplier);
    return { rows: [newSupplier], rowCount: 1 };
  }
  if (text.includes('FROM suppliers WHERE id')) {
    const id = params?.[0] as string;
    const found = mockSuppliers.filter((s) => s.id === id);
    return { rows: found, rowCount: found.length };
  }
  if (text.includes('FROM suppliers WHERE user_id')) {
    const userId = params?.[0] as string;
    const found = mockSuppliers.filter((s) => s.user_id === userId);
    return { rows: found, rowCount: found.length };
  }

  // --- Packaging Items ---
  if (text.includes('DELETE FROM packaging_items WHERE id')) {
    const id = params?.[0] as string;
    const idx = mockPackagingItems.findIndex((p) => p.id === id);
    if (idx >= 0) mockPackagingItems.splice(idx, 1);
    return { rows: [], rowCount: idx >= 0 ? 1 : 0 };
  }
  if (text.includes('UPDATE packaging_items SET')) {
    const id = params?.[params!.length - 1] as string;
    const item = mockPackagingItems.find((p) => p.id === id);
    if (item) {
      item.updated_at = new Date();
      if (text.includes('cost_per_unit =') && params && params.length > 1) {
        item.cost_per_unit = params[0] as number;
      }
    }
    return { rows: item ? [item] : [], rowCount: item ? 1 : 0 };
  }
  if (text.includes('INSERT INTO packaging_items')) {
    const newItem: MockPackagingItem = {
      id: uid(), user_id: params?.[0] as string, name: params?.[1] as string,
      cost_per_unit: params?.[2] as number, currency: (params?.[3] as string) || 'INR',
      quantity_on_hand: params?.[4] as number | null, notes: params?.[5] as string | null,
      created_at: new Date(), updated_at: new Date(),
    };
    mockPackagingItems.push(newItem);
    return { rows: [newItem], rowCount: 1 };
  }
  if (text.includes('FROM packaging_items WHERE id')) {
    const id = params?.[0] as string;
    const found = mockPackagingItems.filter((p) => p.id === id);
    return { rows: found, rowCount: found.length };
  }
  if (text.includes('FROM packaging_items WHERE user_id')) {
    const userId = params?.[0] as string;
    const found = mockPackagingItems.filter((p) => p.user_id === userId);
    return { rows: found, rowCount: found.length };
  }

  // --- Delivery Zones ---
  if (text.includes('DELETE FROM delivery_zones WHERE id')) {
    const id = params?.[0] as string;
    const idx = mockDeliveryZones.findIndex((z) => z.id === id);
    if (idx >= 0) mockDeliveryZones.splice(idx, 1);
    return { rows: [], rowCount: idx >= 0 ? 1 : 0 };
  }
  if (text.includes('UPDATE delivery_zones SET')) {
    const id = params?.[params!.length - 1] as string;
    const zone = mockDeliveryZones.find((z) => z.id === id);
    if (zone) {
      zone.updated_at = new Date();
      if (text.includes('base_charge =') && params && params.length > 1) {
        zone.base_charge = params[0] as number;
      }
    }
    return { rows: zone ? [zone] : [], rowCount: zone ? 1 : 0 };
  }
  if (text.includes('INSERT INTO delivery_zones')) {
    const newZone: MockDeliveryZone = {
      id: uid(), user_id: params?.[0] as string, zone_name: params?.[1] as string,
      base_charge: params?.[2] as number, per_km_charge: params?.[3] as number | null,
      free_delivery_threshold: params?.[4] as number | null,
      currency: (params?.[5] as string) || 'INR',
      created_at: new Date(), updated_at: new Date(),
    };
    mockDeliveryZones.push(newZone);
    return { rows: [newZone], rowCount: 1 };
  }
  if (text.includes('FROM delivery_zones WHERE id')) {
    const id = params?.[0] as string;
    const found = mockDeliveryZones.filter((z) => z.id === id);
    return { rows: found, rowCount: found.length };
  }
  if (text.includes('FROM delivery_zones WHERE user_id')) {
    const userId = params?.[0] as string;
    const found = mockDeliveryZones.filter((z) => z.user_id === userId);
    return { rows: found, rowCount: found.length };
  }

  // --- Inventory Items (for supplier-ingredient association) ---
  if (text.includes('FROM inventory_items ii') && text.includes('JOIN ingredient_master') && text.includes('supplier_id')) {
    const supplierId = params?.[0] as string;
    const userId = params?.[1] as string;
    const found = mockInventoryItems
      .filter((i) => i.supplier_id === supplierId && i.user_id === userId)
      .map((i) => {
        const ing = mockIngredients.find((m) => m.id === i.ingredient_master_id);
        return {
          inventory_item_id: i.id,
          ingredient_master_id: i.ingredient_master_id,
          ingredient_name: ing?.name || '',
          ingredient_category: ing?.category || '',
          quantity_on_hand: i.quantity_on_hand,
          unit: i.unit,
          cost_per_unit: i.cost_per_unit,
          currency: i.currency,
        };
      });
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
      const client = {
        query: vi.fn(async (text: string, params?: unknown[]) => handleQuery(text, params)),
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
  const email = 'sup-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6) + '@example.com';
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ email, password: 'StrongPass1', display_name: 'Supplier Tester' });
  const userId = mockUsers[mockUsers.length - 1].id;
  return { token: res.body.data.accessToken, userId };
}


// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Supplier & Packaging API', () => {
  beforeEach(() => {
    mockUsers = [];
    mockSuppliers = [];
    mockPackagingItems = [];
    mockDeliveryZones = [];
    mockInventoryItems = [];
    mockIngredients = [];
    mockBlacklist = new Set();
    seedIngredients();
  });

  // =========================================================================
  // Supplier CRUD
  // =========================================================================
  describe('Supplier CRUD', () => {
    it('POST /api/v1/suppliers — should create a supplier', async () => {
      const { token } = await getAuthToken();
      const res = await request(app)
        .post('/api/v1/suppliers')
        .set('Authorization', 'Bearer ' + token)
        .send({ name: 'Flour Mill Co', contact_person: 'Raj', phone: '+91-9876543210', email: 'raj@flourmill.com' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Flour Mill Co');
      expect(res.body.data.contact_person).toBe('Raj');
      expect(res.body.data.email).toBe('raj@flourmill.com');
    });

    it('POST /api/v1/suppliers — should reject missing name', async () => {
      const { token } = await getAuthToken();
      const res = await request(app)
        .post('/api/v1/suppliers')
        .set('Authorization', 'Bearer ' + token)
        .send({ contact_person: 'Raj' });

      expect(res.status).toBe(400);
    });

    it('POST /api/v1/suppliers — should reject unauthenticated', async () => {
      const res = await request(app)
        .post('/api/v1/suppliers')
        .send({ name: 'Test' });

      expect(res.status).toBe(401);
    });

    it('GET /api/v1/suppliers — should list suppliers', async () => {
      const { token } = await getAuthToken();

      await request(app).post('/api/v1/suppliers').set('Authorization', 'Bearer ' + token)
        .send({ name: 'Supplier A' });
      await request(app).post('/api/v1/suppliers').set('Authorization', 'Bearer ' + token)
        .send({ name: 'Supplier B' });

      const res = await request(app)
        .get('/api/v1/suppliers')
        .set('Authorization', 'Bearer ' + token);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
    });

    it('GET /api/v1/suppliers/:id — should get supplier details', async () => {
      const { token } = await getAuthToken();
      const createRes = await request(app).post('/api/v1/suppliers').set('Authorization', 'Bearer ' + token)
        .send({ name: 'Detail Supplier', phone: '123' });

      const supplierId = createRes.body.data.id;
      const res = await request(app)
        .get(`/api/v1/suppliers/${supplierId}`)
        .set('Authorization', 'Bearer ' + token);

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Detail Supplier');
    });

    it('GET /api/v1/suppliers/:id — should 404 for non-existent', async () => {
      const { token } = await getAuthToken();
      const res = await request(app)
        .get(`/api/v1/suppliers/${uid()}`)
        .set('Authorization', 'Bearer ' + token);

      expect(res.status).toBe(404);
    });

    it('PATCH /api/v1/suppliers/:id — should update supplier', async () => {
      const { token } = await getAuthToken();
      const createRes = await request(app).post('/api/v1/suppliers').set('Authorization', 'Bearer ' + token)
        .send({ name: 'Old Name' });

      const supplierId = createRes.body.data.id;
      const res = await request(app)
        .patch(`/api/v1/suppliers/${supplierId}`)
        .set('Authorization', 'Bearer ' + token)
        .send({ name: 'New Name' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('PATCH /api/v1/suppliers/:id — should 403 for other user', async () => {
      const { token: token1 } = await getAuthToken();
      const { token: token2 } = await getAuthToken();

      const createRes = await request(app).post('/api/v1/suppliers').set('Authorization', 'Bearer ' + token1)
        .send({ name: 'User1 Supplier' });

      const res = await request(app)
        .patch(`/api/v1/suppliers/${createRes.body.data.id}`)
        .set('Authorization', 'Bearer ' + token2)
        .send({ name: 'Hijacked' });

      expect(res.status).toBe(403);
    });

    it('DELETE /api/v1/suppliers/:id — should delete supplier', async () => {
      const { token } = await getAuthToken();
      const createRes = await request(app).post('/api/v1/suppliers').set('Authorization', 'Bearer ' + token)
        .send({ name: 'To Delete' });

      const supplierId = createRes.body.data.id;
      const res = await request(app)
        .delete(`/api/v1/suppliers/${supplierId}`)
        .set('Authorization', 'Bearer ' + token);

      expect(res.status).toBe(200);
      expect(res.body.data.message).toBe('Supplier deleted successfully');
      expect(mockSuppliers.find((s) => s.id === supplierId)).toBeUndefined();
    });

    it('DELETE /api/v1/suppliers/:id — should 404 for non-existent', async () => {
      const { token } = await getAuthToken();
      const res = await request(app)
        .delete(`/api/v1/suppliers/${uid()}`)
        .set('Authorization', 'Bearer ' + token);

      expect(res.status).toBe(404);
    });
  });

  // =========================================================================
  // Supplier-Ingredient Association
  // =========================================================================
  describe('Supplier-Ingredient Association', () => {
    it('GET /api/v1/suppliers/:id/ingredients — should list ingredients from supplier', async () => {
      const { token, userId } = await getAuthToken();
      const createRes = await request(app).post('/api/v1/suppliers').set('Authorization', 'Bearer ' + token)
        .send({ name: 'Ingredient Supplier' });

      const supplierId = createRes.body.data.id;

      // Add inventory items linked to this supplier
      mockInventoryItems.push({
        id: uid(), user_id: userId, ingredient_master_id: mockIngredients[0].id,
        quantity_on_hand: 1000, unit: 'grams', cost_per_unit: 0.40, currency: 'INR',
        supplier_id: supplierId,
      });

      const res = await request(app)
        .get(`/api/v1/suppliers/${supplierId}/ingredients`)
        .set('Authorization', 'Bearer ' + token);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].ingredient_name).toBe('all-purpose flour');
    });

    it('GET /api/v1/suppliers/:id/ingredients — should return empty for supplier with no ingredients', async () => {
      const { token } = await getAuthToken();
      const createRes = await request(app).post('/api/v1/suppliers').set('Authorization', 'Bearer ' + token)
        .send({ name: 'Empty Supplier' });

      const res = await request(app)
        .get(`/api/v1/suppliers/${createRes.body.data.id}/ingredients`)
        .set('Authorization', 'Bearer ' + token);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });
  });

  // =========================================================================
  // Packaging CRUD
  // =========================================================================
  describe('Packaging CRUD', () => {
    it('POST /api/v1/packaging — should create packaging item', async () => {
      const { token } = await getAuthToken();
      const res = await request(app)
        .post('/api/v1/packaging')
        .set('Authorization', 'Bearer ' + token)
        .send({ name: 'Cake Box 8 inch', cost_per_unit: 25.00, quantity_on_hand: 50 });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Cake Box 8 inch');
      expect(res.body.data.cost_per_unit).toBe(25);
      expect(res.body.data.currency).toBe('INR');
    });

    it('POST /api/v1/packaging — should reject missing name', async () => {
      const { token } = await getAuthToken();
      const res = await request(app)
        .post('/api/v1/packaging')
        .set('Authorization', 'Bearer ' + token)
        .send({ cost_per_unit: 10 });

      expect(res.status).toBe(400);
    });

    it('POST /api/v1/packaging — should reject missing cost', async () => {
      const { token } = await getAuthToken();
      const res = await request(app)
        .post('/api/v1/packaging')
        .set('Authorization', 'Bearer ' + token)
        .send({ name: 'Box' });

      expect(res.status).toBe(400);
    });

    it('GET /api/v1/packaging — should list packaging items', async () => {
      const { token } = await getAuthToken();

      await request(app).post('/api/v1/packaging').set('Authorization', 'Bearer ' + token)
        .send({ name: 'Box A', cost_per_unit: 10 });
      await request(app).post('/api/v1/packaging').set('Authorization', 'Bearer ' + token)
        .send({ name: 'Box B', cost_per_unit: 20 });

      const res = await request(app)
        .get('/api/v1/packaging')
        .set('Authorization', 'Bearer ' + token);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
    });

    it('PATCH /api/v1/packaging/:id — should update packaging item', async () => {
      const { token } = await getAuthToken();
      const createRes = await request(app).post('/api/v1/packaging').set('Authorization', 'Bearer ' + token)
        .send({ name: 'Old Box', cost_per_unit: 15 });

      const res = await request(app)
        .patch(`/api/v1/packaging/${createRes.body.data.id}`)
        .set('Authorization', 'Bearer ' + token)
        .send({ cost_per_unit: 20 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('PATCH /api/v1/packaging/:id — should 403 for other user', async () => {
      const { token: token1 } = await getAuthToken();
      const { token: token2 } = await getAuthToken();

      const createRes = await request(app).post('/api/v1/packaging').set('Authorization', 'Bearer ' + token1)
        .send({ name: 'User1 Box', cost_per_unit: 10 });

      const res = await request(app)
        .patch(`/api/v1/packaging/${createRes.body.data.id}`)
        .set('Authorization', 'Bearer ' + token2)
        .send({ cost_per_unit: 99 });

      expect(res.status).toBe(403);
    });

    it('DELETE /api/v1/packaging/:id — should delete packaging item', async () => {
      const { token } = await getAuthToken();
      const createRes = await request(app).post('/api/v1/packaging').set('Authorization', 'Bearer ' + token)
        .send({ name: 'Delete Me', cost_per_unit: 5 });

      const itemId = createRes.body.data.id;
      const res = await request(app)
        .delete(`/api/v1/packaging/${itemId}`)
        .set('Authorization', 'Bearer ' + token);

      expect(res.status).toBe(200);
      expect(mockPackagingItems.find((p) => p.id === itemId)).toBeUndefined();
    });

    it('DELETE /api/v1/packaging/:id — should 404 for non-existent', async () => {
      const { token } = await getAuthToken();
      const res = await request(app)
        .delete(`/api/v1/packaging/${uid()}`)
        .set('Authorization', 'Bearer ' + token);

      expect(res.status).toBe(404);
    });
  });

  // =========================================================================
  // Delivery Zone CRUD
  // =========================================================================
  describe('Delivery Zone CRUD', () => {
    it('POST /api/v1/delivery-zones — should create delivery zone', async () => {
      const { token } = await getAuthToken();
      const res = await request(app)
        .post('/api/v1/delivery-zones')
        .set('Authorization', 'Bearer ' + token)
        .send({ zone_name: 'Local', base_charge: 50, per_km_charge: 10, free_delivery_threshold: 500 });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.zone_name).toBe('Local');
      expect(res.body.data.base_charge).toBe(50);
      expect(res.body.data.per_km_charge).toBe(10);
      expect(res.body.data.free_delivery_threshold).toBe(500);
      expect(res.body.data.currency).toBe('INR');
    });

    it('POST /api/v1/delivery-zones — should reject missing zone_name', async () => {
      const { token } = await getAuthToken();
      const res = await request(app)
        .post('/api/v1/delivery-zones')
        .set('Authorization', 'Bearer ' + token)
        .send({ base_charge: 50 });

      expect(res.status).toBe(400);
    });

    it('POST /api/v1/delivery-zones — should reject missing base_charge', async () => {
      const { token } = await getAuthToken();
      const res = await request(app)
        .post('/api/v1/delivery-zones')
        .set('Authorization', 'Bearer ' + token)
        .send({ zone_name: 'Test' });

      expect(res.status).toBe(400);
    });

    it('GET /api/v1/delivery-zones — should list delivery zones', async () => {
      const { token } = await getAuthToken();

      await request(app).post('/api/v1/delivery-zones').set('Authorization', 'Bearer ' + token)
        .send({ zone_name: 'Zone A', base_charge: 30 });
      await request(app).post('/api/v1/delivery-zones').set('Authorization', 'Bearer ' + token)
        .send({ zone_name: 'Zone B', base_charge: 60 });

      const res = await request(app)
        .get('/api/v1/delivery-zones')
        .set('Authorization', 'Bearer ' + token);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
    });

    it('PATCH /api/v1/delivery-zones/:id — should update zone', async () => {
      const { token } = await getAuthToken();
      const createRes = await request(app).post('/api/v1/delivery-zones').set('Authorization', 'Bearer ' + token)
        .send({ zone_name: 'Old Zone', base_charge: 40 });

      const res = await request(app)
        .patch(`/api/v1/delivery-zones/${createRes.body.data.id}`)
        .set('Authorization', 'Bearer ' + token)
        .send({ base_charge: 60 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('PATCH /api/v1/delivery-zones/:id — should 403 for other user', async () => {
      const { token: token1 } = await getAuthToken();
      const { token: token2 } = await getAuthToken();

      const createRes = await request(app).post('/api/v1/delivery-zones').set('Authorization', 'Bearer ' + token1)
        .send({ zone_name: 'User1 Zone', base_charge: 30 });

      const res = await request(app)
        .patch(`/api/v1/delivery-zones/${createRes.body.data.id}`)
        .set('Authorization', 'Bearer ' + token2)
        .send({ base_charge: 999 });

      expect(res.status).toBe(403);
    });

    it('DELETE /api/v1/delivery-zones/:id — should delete zone', async () => {
      const { token } = await getAuthToken();
      const createRes = await request(app).post('/api/v1/delivery-zones').set('Authorization', 'Bearer ' + token)
        .send({ zone_name: 'Delete Zone', base_charge: 20 });

      const zoneId = createRes.body.data.id;
      const res = await request(app)
        .delete(`/api/v1/delivery-zones/${zoneId}`)
        .set('Authorization', 'Bearer ' + token);

      expect(res.status).toBe(200);
      expect(mockDeliveryZones.find((z) => z.id === zoneId)).toBeUndefined();
    });

    it('DELETE /api/v1/delivery-zones/:id — should 404 for non-existent', async () => {
      const { token } = await getAuthToken();
      const res = await request(app)
        .delete(`/api/v1/delivery-zones/${uid()}`)
        .set('Authorization', 'Bearer ' + token);

      expect(res.status).toBe(404);
    });
  });
});
