import { db } from '../config/database';
import {
  NotFoundError,
  ForbiddenError,
} from '../middleware/errorHandler';
import {
  Supplier,
  CreateSupplierInput,
  UpdateSupplierInput,
  PackagingItem,
  CreatePackagingItemInput,
  UpdatePackagingItemInput,
  DeliveryZone,
  CreateDeliveryZoneInput,
  UpdateDeliveryZoneInput,
  SupplierIngredient,
} from '../models/supplier.model';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function assertSupplierOwnership(
  supplierId: string,
  userId: string,
): Promise<Supplier> {
  const result = await db.query('SELECT * FROM suppliers WHERE id = $1', [supplierId]);
  if (!result.rows[0]) {
    throw new NotFoundError('Supplier');
  }
  const supplier = result.rows[0] as Supplier;
  if (supplier.user_id !== userId) {
    throw new ForbiddenError('You do not own this supplier');
  }
  return supplier;
}

async function assertPackagingOwnership(
  itemId: string,
  userId: string,
): Promise<PackagingItem> {
  const result = await db.query('SELECT * FROM packaging_items WHERE id = $1', [itemId]);
  if (!result.rows[0]) {
    throw new NotFoundError('Packaging item');
  }
  const item = result.rows[0] as PackagingItem;
  if (item.user_id !== userId) {
    throw new ForbiddenError('You do not own this packaging item');
  }
  return item;
}

async function assertDeliveryZoneOwnership(
  zoneId: string,
  userId: string,
): Promise<DeliveryZone> {
  const result = await db.query('SELECT * FROM delivery_zones WHERE id = $1', [zoneId]);
  if (!result.rows[0]) {
    throw new NotFoundError('Delivery zone');
  }
  const zone = result.rows[0] as DeliveryZone;
  if (zone.user_id !== userId) {
    throw new ForbiddenError('You do not own this delivery zone');
  }
  return zone;
}


// ---------------------------------------------------------------------------
// Supplier CRUD
// ---------------------------------------------------------------------------

export async function listSuppliers(userId: string): Promise<Supplier[]> {
  const result = await db.query<Supplier>(
    'SELECT * FROM suppliers WHERE user_id = $1 ORDER BY name ASC',
    [userId],
  );
  return result.rows;
}

export async function getSupplier(supplierId: string, userId: string): Promise<Supplier> {
  return assertSupplierOwnership(supplierId, userId);
}

export async function createSupplier(userId: string, input: CreateSupplierInput): Promise<Supplier> {
  const result = await db.query<Supplier>(
    `INSERT INTO suppliers (user_id, name, contact_person, phone, email, address, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      userId,
      input.name,
      input.contact_person ?? null,
      input.phone ?? null,
      input.email ?? null,
      input.address ?? null,
      input.notes ?? null,
    ],
  );
  return result.rows[0];
}

export async function updateSupplier(
  supplierId: string,
  userId: string,
  input: UpdateSupplierInput,
): Promise<Supplier> {
  await assertSupplierOwnership(supplierId, userId);

  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIdx = 1;

  const fields: Array<[string, unknown]> = [
    ['name', input.name],
    ['contact_person', input.contact_person],
    ['phone', input.phone],
    ['email', input.email],
    ['address', input.address],
    ['notes', input.notes],
  ];

  for (const [field, value] of fields) {
    if (value !== undefined) {
      setClauses.push(`${field} = $${paramIdx++}`);
      values.push(value);
    }
  }

  if (setClauses.length > 0) {
    setClauses.push('updated_at = NOW()');
    values.push(supplierId);
    await db.query(
      `UPDATE suppliers SET ${setClauses.join(', ')} WHERE id = $${paramIdx}`,
      values,
    );
  }

  return assertSupplierOwnership(supplierId, userId);
}

export async function deleteSupplier(supplierId: string, userId: string): Promise<void> {
  await assertSupplierOwnership(supplierId, userId);
  await db.query('DELETE FROM suppliers WHERE id = $1', [supplierId]);
}

export async function getSupplierIngredients(
  supplierId: string,
  userId: string,
): Promise<SupplierIngredient[]> {
  await assertSupplierOwnership(supplierId, userId);

  const result = await db.query<SupplierIngredient>(
    `SELECT ii.id AS inventory_item_id, ii.ingredient_master_id,
            im.name AS ingredient_name, im.category AS ingredient_category,
            ii.quantity_on_hand, ii.unit, ii.cost_per_unit, ii.currency
     FROM inventory_items ii
     JOIN ingredient_master im ON im.id = ii.ingredient_master_id
     WHERE ii.supplier_id = $1 AND ii.user_id = $2
     ORDER BY im.name ASC`,
    [supplierId, userId],
  );

  return result.rows;
}

// ---------------------------------------------------------------------------
// Packaging CRUD
// ---------------------------------------------------------------------------

export async function listPackagingItems(userId: string): Promise<PackagingItem[]> {
  const result = await db.query<PackagingItem>(
    'SELECT * FROM packaging_items WHERE user_id = $1 ORDER BY name ASC',
    [userId],
  );
  return result.rows;
}

export async function createPackagingItem(
  userId: string,
  input: CreatePackagingItemInput,
): Promise<PackagingItem> {
  const result = await db.query<PackagingItem>(
    `INSERT INTO packaging_items (user_id, name, cost_per_unit, currency, quantity_on_hand, notes)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      userId,
      input.name,
      input.cost_per_unit,
      input.currency || 'INR',
      input.quantity_on_hand ?? null,
      input.notes ?? null,
    ],
  );
  return result.rows[0];
}

export async function updatePackagingItem(
  itemId: string,
  userId: string,
  input: UpdatePackagingItemInput,
): Promise<PackagingItem> {
  await assertPackagingOwnership(itemId, userId);

  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIdx = 1;

  const fields: Array<[string, unknown]> = [
    ['name', input.name],
    ['cost_per_unit', input.cost_per_unit],
    ['currency', input.currency],
    ['quantity_on_hand', input.quantity_on_hand],
    ['notes', input.notes],
  ];

  for (const [field, value] of fields) {
    if (value !== undefined) {
      setClauses.push(`${field} = $${paramIdx++}`);
      values.push(value);
    }
  }

  if (setClauses.length > 0) {
    setClauses.push('updated_at = NOW()');
    values.push(itemId);
    await db.query(
      `UPDATE packaging_items SET ${setClauses.join(', ')} WHERE id = $${paramIdx}`,
      values,
    );
  }

  return assertPackagingOwnership(itemId, userId);
}

export async function deletePackagingItem(itemId: string, userId: string): Promise<void> {
  await assertPackagingOwnership(itemId, userId);
  await db.query('DELETE FROM packaging_items WHERE id = $1', [itemId]);
}

// ---------------------------------------------------------------------------
// Delivery Zone CRUD
// ---------------------------------------------------------------------------

export async function listDeliveryZones(userId: string): Promise<DeliveryZone[]> {
  const result = await db.query<DeliveryZone>(
    'SELECT * FROM delivery_zones WHERE user_id = $1 ORDER BY zone_name ASC',
    [userId],
  );
  return result.rows;
}

export async function createDeliveryZone(
  userId: string,
  input: CreateDeliveryZoneInput,
): Promise<DeliveryZone> {
  const result = await db.query<DeliveryZone>(
    `INSERT INTO delivery_zones (user_id, zone_name, base_charge, per_km_charge, free_delivery_threshold, currency)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      userId,
      input.zone_name,
      input.base_charge,
      input.per_km_charge ?? null,
      input.free_delivery_threshold ?? null,
      input.currency || 'INR',
    ],
  );
  return result.rows[0];
}

export async function updateDeliveryZone(
  zoneId: string,
  userId: string,
  input: UpdateDeliveryZoneInput,
): Promise<DeliveryZone> {
  await assertDeliveryZoneOwnership(zoneId, userId);

  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIdx = 1;

  const fields: Array<[string, unknown]> = [
    ['zone_name', input.zone_name],
    ['base_charge', input.base_charge],
    ['per_km_charge', input.per_km_charge],
    ['free_delivery_threshold', input.free_delivery_threshold],
    ['currency', input.currency],
  ];

  for (const [field, value] of fields) {
    if (value !== undefined) {
      setClauses.push(`${field} = $${paramIdx++}`);
      values.push(value);
    }
  }

  if (setClauses.length > 0) {
    setClauses.push('updated_at = NOW()');
    values.push(zoneId);
    await db.query(
      `UPDATE delivery_zones SET ${setClauses.join(', ')} WHERE id = $${paramIdx}`,
      values,
    );
  }

  return assertDeliveryZoneOwnership(zoneId, userId);
}

export async function deleteDeliveryZone(zoneId: string, userId: string): Promise<void> {
  await assertDeliveryZoneOwnership(zoneId, userId);
  await db.query('DELETE FROM delivery_zones WHERE id = $1', [zoneId]);
}

// ---------------------------------------------------------------------------
// Delivery charge calculation (used by property tests)
// ---------------------------------------------------------------------------

export function calculateDeliveryCharge(
  orderValue: number,
  distanceKm: number,
  zone: { base_charge: number; per_km_charge: number | null; free_delivery_threshold: number | null },
): number {
  // Free delivery if order exceeds threshold
  if (zone.free_delivery_threshold != null && orderValue >= zone.free_delivery_threshold) {
    return 0;
  }

  let charge = zone.base_charge;
  if (zone.per_km_charge != null && distanceKm > 0) {
    charge += zone.per_km_charge * distanceKm;
  }

  return Math.round(charge * 100) / 100;
}

// ---------------------------------------------------------------------------
// Bulk pricing calculation (used by property tests)
// ---------------------------------------------------------------------------

export interface BulkPricingTier {
  min_quantity: number;
  price_per_unit: number;
}

export function calculateBulkPrice(
  quantity: number,
  tiers: BulkPricingTier[],
): { price_per_unit: number; total_price: number; tier_applied: BulkPricingTier } {
  // Sort tiers by min_quantity descending to find the highest applicable tier
  const sorted = [...tiers].sort((a, b) => b.min_quantity - a.min_quantity);

  // Find the highest tier where quantity >= min_quantity
  const applicableTier = sorted.find((t) => quantity >= t.min_quantity);

  if (!applicableTier) {
    // Fall back to the tier with the lowest min_quantity
    const fallback = tiers.reduce((a, b) => (a.min_quantity < b.min_quantity ? a : b));
    return {
      price_per_unit: fallback.price_per_unit,
      total_price: Math.round(fallback.price_per_unit * quantity * 100) / 100,
      tier_applied: fallback,
    };
  }

  return {
    price_per_unit: applicableTier.price_per_unit,
    total_price: Math.round(applicableTier.price_per_unit * quantity * 100) / 100,
    tier_applied: applicableTier,
  };
}
