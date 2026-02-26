import { PoolClient } from 'pg';
import { db } from '../config/database';
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from '../middleware/errorHandler';
import {
  InventoryItem,
  InventoryItemWithIngredient,
  InventoryPurchase,
  CreateInventoryItemInput,
  UpdateInventoryItemInput,
  CreatePurchaseInput,
  InventoryListQuery,
  PurchaseListQuery,
  InventoryAlert,
  UsageReportItem,
  ValueReportItem,
} from '../models/inventory.model';
import {
  calculateDeductions,
  applyDeductions,
  type DeductionIngredient,
  type InventoryItem as MwInventoryItem,
  type DeductionResult,
} from '../../../middleware/src/inventoryManager';
import { type IngredientDensity } from '../../../middleware/src/unitConverter';
import { logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function assertItemOwnership(
  itemId: string,
  userId: string,
  client?: PoolClient,
): Promise<InventoryItem> {
  const queryFn = client
    ? (text: string, params: unknown[]) => client.query(text, params)
    : db.query.bind(db);

  const result = await queryFn(
    'SELECT * FROM inventory_items WHERE id = $1',
    [itemId],
  );

  if (!result.rows[0]) {
    throw new NotFoundError('Inventory item');
  }

  const item = result.rows[0] as InventoryItem;
  if (item.user_id !== userId) {
    throw new ForbiddenError('You do not own this inventory item');
  }

  return item;
}

// ---------------------------------------------------------------------------
// List inventory items
// ---------------------------------------------------------------------------

export async function listInventoryItems(
  userId: string,
  query: InventoryListQuery,
): Promise<{ items: InventoryItemWithIngredient[]; total: number; page: number; limit: number }> {
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(100, Math.max(1, query.limit || 20));
  const offset = (page - 1) * limit;

  const conditions: string[] = ['ii.user_id = $1'];
  const params: unknown[] = [userId];
  let paramIdx = 2;

  if (query.category) {
    conditions.push(`im.category = $${paramIdx++}`);
    params.push(query.category);
  }
  if (query.low_stock) {
    conditions.push('ii.min_stock_level IS NOT NULL AND ii.quantity_on_hand < ii.min_stock_level');
  }
  if (query.expiring_soon) {
    conditions.push(`ii.expiration_date IS NOT NULL AND ii.expiration_date <= CURRENT_DATE + INTERVAL '7 days'`);
  }

  const where = conditions.join(' AND ');

  const countResult = await db.query(
    `SELECT COUNT(*) FROM inventory_items ii
     JOIN ingredient_master im ON im.id = ii.ingredient_master_id
     WHERE ${where}`,
    params,
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const dataResult = await db.query<InventoryItemWithIngredient>(
    `SELECT ii.*, im.name AS ingredient_name, im.category AS ingredient_category
     FROM inventory_items ii
     JOIN ingredient_master im ON im.id = ii.ingredient_master_id
     WHERE ${where}
     ORDER BY im.name ASC
     LIMIT $${paramIdx++} OFFSET $${paramIdx}`,
    [...params, limit, offset],
  );

  return { items: dataResult.rows, total, page, limit };
}

// ---------------------------------------------------------------------------
// Get single inventory item
// ---------------------------------------------------------------------------

export async function getInventoryItem(
  itemId: string,
  userId: string,
): Promise<InventoryItemWithIngredient> {
  const result = await db.query<InventoryItemWithIngredient>(
    `SELECT ii.*, im.name AS ingredient_name, im.category AS ingredient_category
     FROM inventory_items ii
     JOIN ingredient_master im ON im.id = ii.ingredient_master_id
     WHERE ii.id = $1`,
    [itemId],
  );

  if (!result.rows[0]) {
    throw new NotFoundError('Inventory item');
  }
  if (result.rows[0].user_id !== userId) {
    throw new ForbiddenError('You do not own this inventory item');
  }

  return result.rows[0];
}

// ---------------------------------------------------------------------------
// Create inventory item
// ---------------------------------------------------------------------------

export async function createInventoryItem(
  userId: string,
  input: CreateInventoryItemInput,
): Promise<InventoryItemWithIngredient> {
  // Verify ingredient exists
  const ingredientResult = await db.query(
    'SELECT id FROM ingredient_master WHERE id = $1',
    [input.ingredient_master_id],
  );
  if (!ingredientResult.rows[0]) {
    throw new ValidationError('Ingredient not found');
  }

  const result = await db.query<InventoryItem>(
    `INSERT INTO inventory_items
      (user_id, ingredient_master_id, quantity_on_hand, unit, cost_per_unit,
       currency, purchase_date, expiration_date, supplier_id,
       min_stock_level, reorder_quantity, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [
      userId,
      input.ingredient_master_id,
      input.quantity_on_hand,
      input.unit,
      input.cost_per_unit ?? null,
      input.currency || 'INR',
      input.purchase_date ?? null,
      input.expiration_date ?? null,
      input.supplier_id ?? null,
      input.min_stock_level ?? null,
      input.reorder_quantity ?? null,
      input.notes ?? null,
    ],
  );

  return getInventoryItem(result.rows[0].id, userId);
}

// ---------------------------------------------------------------------------
// Update inventory item
// ---------------------------------------------------------------------------

export async function updateInventoryItem(
  itemId: string,
  userId: string,
  input: UpdateInventoryItemInput,
): Promise<InventoryItemWithIngredient> {
  await assertItemOwnership(itemId, userId);

  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIdx = 1;

  const fields: Array<[string, unknown]> = [
    ['quantity_on_hand', input.quantity_on_hand],
    ['unit', input.unit],
    ['cost_per_unit', input.cost_per_unit],
    ['currency', input.currency],
    ['purchase_date', input.purchase_date],
    ['expiration_date', input.expiration_date],
    ['supplier_id', input.supplier_id],
    ['min_stock_level', input.min_stock_level],
    ['reorder_quantity', input.reorder_quantity],
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
      `UPDATE inventory_items SET ${setClauses.join(', ')} WHERE id = $${paramIdx}`,
      values,
    );
  }

  return getInventoryItem(itemId, userId);
}

// ---------------------------------------------------------------------------
// Delete inventory item
// ---------------------------------------------------------------------------

export async function deleteInventoryItem(
  itemId: string,
  userId: string,
): Promise<void> {
  await assertItemOwnership(itemId, userId);
  await db.query('DELETE FROM inventory_items WHERE id = $1', [itemId]);
}

// ---------------------------------------------------------------------------
// Log purchase and update inventory
// ---------------------------------------------------------------------------

export async function logPurchase(
  userId: string,
  input: CreatePurchaseInput,
): Promise<{ purchase: InventoryPurchase; inventory_item: InventoryItemWithIngredient | null }> {
  return db.withTransaction(async (client) => {
    // Verify ingredient exists
    const ingredientResult = await client.query(
      'SELECT id FROM ingredient_master WHERE id = $1',
      [input.ingredient_master_id],
    );
    if (!ingredientResult.rows[0]) {
      throw new ValidationError('Ingredient not found');
    }

    // Create purchase record
    const purchaseResult = await client.query<InventoryPurchase>(
      `INSERT INTO inventory_purchases
        (user_id, ingredient_master_id, quantity, unit, cost, currency,
         supplier_id, invoice_number, purchase_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        userId,
        input.ingredient_master_id,
        input.quantity,
        input.unit,
        input.cost,
        input.currency || 'INR',
        input.supplier_id ?? null,
        input.invoice_number ?? null,
        input.purchase_date,
        input.notes ?? null,
      ],
    );

    // Auto-update inventory quantity if matching item exists
    const inventoryResult = await client.query<InventoryItem>(
      `SELECT * FROM inventory_items
       WHERE user_id = $1 AND ingredient_master_id = $2 AND unit = $3
       LIMIT 1`,
      [userId, input.ingredient_master_id, input.unit],
    );

    let updatedItem: InventoryItemWithIngredient | null = null;

    if (inventoryResult.rows[0]) {
      const item = inventoryResult.rows[0];
      const newQuantity = Number(item.quantity_on_hand) + Number(input.quantity);

      await client.query(
        `UPDATE inventory_items
         SET quantity_on_hand = $1, cost_per_unit = $2, updated_at = NOW()
         WHERE id = $3`,
        [newQuantity, input.cost / input.quantity, item.id],
      );

      // Fetch updated item with ingredient info
      const updatedResult = await client.query<InventoryItemWithIngredient>(
        `SELECT ii.*, im.name AS ingredient_name, im.category AS ingredient_category
         FROM inventory_items ii
         JOIN ingredient_master im ON im.id = ii.ingredient_master_id
         WHERE ii.id = $1`,
        [item.id],
      );
      updatedItem = updatedResult.rows[0] || null;
    }

    return { purchase: purchaseResult.rows[0], inventory_item: updatedItem };
  });
}

// ---------------------------------------------------------------------------
// List purchases
// ---------------------------------------------------------------------------

export async function listPurchases(
  userId: string,
  query: PurchaseListQuery,
): Promise<{ purchases: (InventoryPurchase & { ingredient_name: string })[]; total: number; page: number; limit: number }> {
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(100, Math.max(1, query.limit || 20));
  const offset = (page - 1) * limit;

  const conditions: string[] = ['ip.user_id = $1'];
  const params: unknown[] = [userId];
  let paramIdx = 2;

  if (query.ingredient_master_id) {
    conditions.push(`ip.ingredient_master_id = $${paramIdx++}`);
    params.push(query.ingredient_master_id);
  }
  if (query.supplier_id) {
    conditions.push(`ip.supplier_id = $${paramIdx++}`);
    params.push(query.supplier_id);
  }
  if (query.from_date) {
    conditions.push(`ip.purchase_date >= $${paramIdx++}`);
    params.push(query.from_date);
  }
  if (query.to_date) {
    conditions.push(`ip.purchase_date <= $${paramIdx++}`);
    params.push(query.to_date);
  }

  const where = conditions.join(' AND ');

  const countResult = await db.query(
    `SELECT COUNT(*) FROM inventory_purchases ip WHERE ${where}`,
    params,
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const dataResult = await db.query(
    `SELECT ip.*, im.name AS ingredient_name
     FROM inventory_purchases ip
     JOIN ingredient_master im ON im.id = ip.ingredient_master_id
     WHERE ${where}
     ORDER BY ip.purchase_date DESC, ip.created_at DESC
     LIMIT $${paramIdx++} OFFSET $${paramIdx}`,
    [...params, limit, offset],
  );

  return { purchases: dataResult.rows as (InventoryPurchase & { ingredient_name: string })[], total, page, limit };
}

// ---------------------------------------------------------------------------
// Inventory alerts (low stock + expiring soon)
// ---------------------------------------------------------------------------

export async function getAlerts(
  userId: string,
): Promise<InventoryAlert[]> {
  const alerts: InventoryAlert[] = [];

  // Low stock items
  const lowStockResult = await db.query<InventoryItemWithIngredient>(
    `SELECT ii.*, im.name AS ingredient_name, im.category AS ingredient_category
     FROM inventory_items ii
     JOIN ingredient_master im ON im.id = ii.ingredient_master_id
     WHERE ii.user_id = $1
       AND ii.min_stock_level IS NOT NULL
       AND ii.quantity_on_hand < ii.min_stock_level
     ORDER BY im.name`,
    [userId],
  );

  for (const item of lowStockResult.rows) {
    alerts.push({
      id: item.id,
      ingredient_master_id: item.ingredient_master_id,
      ingredient_name: item.ingredient_name,
      alert_type: 'low_stock',
      quantity_on_hand: item.quantity_on_hand,
      unit: item.unit,
      min_stock_level: item.min_stock_level,
      expiration_date: null,
      days_until_expiry: null,
    });
  }

  // Expiring soon items (within 7 days)
  const expiringResult = await db.query(
    `SELECT ii.*, im.name AS ingredient_name, im.category AS ingredient_category,
            (ii.expiration_date - CURRENT_DATE) AS days_until_expiry
     FROM inventory_items ii
     JOIN ingredient_master im ON im.id = ii.ingredient_master_id
     WHERE ii.user_id = $1
       AND ii.expiration_date IS NOT NULL
       AND ii.expiration_date <= CURRENT_DATE + INTERVAL '7 days'
       AND ii.expiration_date >= CURRENT_DATE
     ORDER BY ii.expiration_date ASC`,
    [userId],
  );

  for (const item of expiringResult.rows as (InventoryItemWithIngredient & { days_until_expiry: number })[]) {
    alerts.push({
      id: item.id,
      ingredient_master_id: item.ingredient_master_id,
      ingredient_name: item.ingredient_name,
      alert_type: 'expiring_soon',
      quantity_on_hand: item.quantity_on_hand,
      unit: item.unit,
      min_stock_level: item.min_stock_level,
      expiration_date: item.expiration_date,
      days_until_expiry: item.days_until_expiry,
    });
  }

  return alerts;
}

// ---------------------------------------------------------------------------
// Inventory deduction (uses middleware inventoryManager)
// ---------------------------------------------------------------------------

export async function deductInventory(
  userId: string,
  recipeId: string,
  scalingFactor: number = 1,
  confirm: boolean = false,
): Promise<{ deductions: DeductionResult; applied: boolean; low_stock_alerts?: unknown[] }> {
  return db.withTransaction(async (client) => {
    // Verify recipe ownership
    const recipeResult = await client.query(
      'SELECT id, user_id FROM recipes WHERE id = $1',
      [recipeId],
    );
    if (!recipeResult.rows[0]) {
      throw new NotFoundError('Recipe');
    }
    if (recipeResult.rows[0].user_id !== userId) {
      throw new ForbiddenError('You do not own this recipe');
    }

    // Get recipe ingredients
    const ingredientsResult = await client.query(
      `SELECT id, display_name, ingredient_master_id, quantity_grams
       FROM recipe_ingredients WHERE recipe_id = $1 ORDER BY position`,
      [recipeId],
    );

    if (ingredientsResult.rows.length === 0) {
      throw new ValidationError('Recipe has no ingredients');
    }

    const ingredients: DeductionIngredient[] = ingredientsResult.rows.map((row: any) => ({
      id: row.id,
      display_name: row.display_name,
      ingredient_master_id: row.ingredient_master_id,
      quantity_grams: Number(row.quantity_grams),
    }));

    // Build inventory lookup
    const inventoryResult = await client.query(
      `SELECT id, ingredient_master_id, quantity_on_hand, unit, min_stock_level
       FROM inventory_items WHERE user_id = $1`,
      [userId],
    );

    const inventoryLookup = new Map<string, MwInventoryItem>();
    for (const row of inventoryResult.rows) {
      inventoryLookup.set(row.ingredient_master_id, {
        id: row.id,
        ingredient_master_id: row.ingredient_master_id,
        quantity_on_hand: Number(row.quantity_on_hand),
        unit: row.unit,
        min_stock_level: row.min_stock_level != null ? Number(row.min_stock_level) : null,
      });
    }

    // Build density lookup
    const densityResult = await client.query(
      'SELECT id, name, default_density_g_per_ml FROM ingredient_master',
    );

    const densityLookup = new Map<string, IngredientDensity>();
    for (const row of densityResult.rows) {
      densityLookup.set(row.id, {
        id: row.id,
        name: row.name,
        default_density_g_per_ml: row.default_density_g_per_ml != null
          ? Number(row.default_density_g_per_ml)
          : null,
      });
    }

    // Calculate deductions via middleware
    const deductionResult = calculateDeductions(
      ingredients,
      scalingFactor,
      inventoryLookup,
      densityLookup,
    );

    // If not confirmed, return preview
    if (!confirm) {
      return { deductions: deductionResult, applied: false };
    }

    // Apply deductions
    const applyResult = applyDeductions(
      deductionResult.deductions,
      recipeId, // using recipe_id as reference
      inventoryLookup,
    );

    // Execute DB updates for each deduction
    for (const deduction of deductionResult.deductions) {
      await client.query(
        `UPDATE inventory_items
         SET quantity_on_hand = quantity_on_hand - $1, updated_at = NOW()
         WHERE id = $2`,
        [deduction.quantity_to_deduct, deduction.inventory_item_id],
      );
    }

    return {
      deductions: deductionResult,
      applied: true,
      low_stock_alerts: applyResult.low_stock_alerts,
    };
  });
}

// ---------------------------------------------------------------------------
// Usage report (consumption over time)
// ---------------------------------------------------------------------------

export async function getUsageReport(
  userId: string,
  fromDate?: string,
  toDate?: string,
): Promise<UsageReportItem[]> {
  const conditions: string[] = ['ii.user_id = $1'];
  const params: unknown[] = [userId];
  let paramIdx = 2;

  // We track usage through purchases (negative = deductions tracked via quantity changes)
  // For now, report based on purchase history as a proxy for usage tracking
  if (fromDate) {
    conditions.push(`ip.purchase_date >= $${paramIdx++}`);
    params.push(fromDate);
  }
  if (toDate) {
    conditions.push(`ip.purchase_date <= $${paramIdx++}`);
    params.push(toDate);
  }

  const where = conditions.join(' AND ');

  const result = await db.query(
    `SELECT
       ip.ingredient_master_id,
       im.name AS ingredient_name,
       im.category,
       SUM(ip.quantity) AS total_purchased,
       ip.unit,
       COUNT(*)::int AS purchase_count
     FROM inventory_purchases ip
     JOIN ingredient_master im ON im.id = ip.ingredient_master_id
     JOIN inventory_items ii ON ii.ingredient_master_id = ip.ingredient_master_id AND ii.user_id = ip.user_id
     WHERE ${where}
     GROUP BY ip.ingredient_master_id, im.name, im.category, ip.unit
     ORDER BY im.name`,
    params,
  );

  return result.rows.map((row: any) => ({
    ingredient_master_id: row.ingredient_master_id,
    ingredient_name: row.ingredient_name,
    category: row.category,
    total_deducted: Number(row.total_purchased),
    unit: row.unit,
    deduction_count: row.purchase_count,
  }));
}

// ---------------------------------------------------------------------------
// Value report (total inventory value by category)
// ---------------------------------------------------------------------------

export async function getValueReport(
  userId: string,
): Promise<ValueReportItem[]> {
  const result = await db.query(
    `SELECT
       im.category,
       COUNT(*)::int AS item_count,
       COALESCE(SUM(ii.quantity_on_hand * COALESCE(ii.cost_per_unit, 0)), 0) AS total_value,
       ii.currency
     FROM inventory_items ii
     JOIN ingredient_master im ON im.id = ii.ingredient_master_id
     WHERE ii.user_id = $1
     GROUP BY im.category, ii.currency
     ORDER BY total_value DESC`,
    [userId],
  );

  return result.rows.map((row: any) => ({
    category: row.category,
    item_count: row.item_count,
    total_value: Number(row.total_value),
    currency: row.currency,
  }));
}
