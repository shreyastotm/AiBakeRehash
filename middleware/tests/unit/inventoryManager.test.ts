/**
 * Unit tests for the Inventory Manager
 *
 * Covers:
 * - Deduction calculation with unit conversion
 * - Insufficient stock warning generation
 * - Low stock alert triggering
 * - Transaction rollback on error (InvalidDeductionError)
 * - Inventory transaction logging
 *
 * Requirements: 103.1, 103.2, 103.3, 103.6
 */
import { describe, it, expect } from 'vitest';
import {
  calculateDeductions,
  applyDeductions,
  InvalidDeductionError,
  InsufficientStockError,
  type DeductionIngredient,
  type InventoryItem,
  type Deduction,
} from '../../src/inventoryManager';
import type { IngredientDensity } from '../../src/unitConverter';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeIngredient(overrides: Partial<DeductionIngredient> = {}): DeductionIngredient {
  return {
    id: overrides.id ?? 'ing-1',
    display_name: overrides.display_name ?? 'All-purpose flour',
    ingredient_master_id: overrides.ingredient_master_id ?? 'flour-id',
    quantity_grams: overrides.quantity_grams ?? 250,
  };
}

function makeInventory(overrides: Partial<InventoryItem> & { ingredient_master_id: string }): InventoryItem {
  return {
    id: overrides.id ?? `inv-${overrides.ingredient_master_id}`,
    ingredient_master_id: overrides.ingredient_master_id,
    quantity_on_hand: overrides.quantity_on_hand ?? 1000,
    unit: overrides.unit ?? 'g',
    min_stock_level: overrides.min_stock_level ?? null,
  };
}

function makeDensity(id: string, density: number | null = null): IngredientDensity {
  return { id, name: 'ingredient', default_density_g_per_ml: density };
}

const flour = makeIngredient();
const butter = makeIngredient({
  id: 'ing-2',
  display_name: 'Butter',
  ingredient_master_id: 'butter-id',
  quantity_grams: 113,
});
const sugar = makeIngredient({
  id: 'ing-3',
  display_name: 'Sugar',
  ingredient_master_id: 'sugar-id',
  quantity_grams: 200,
});

function defaultInventoryLookup(): Map<string, InventoryItem> {
  return new Map([
    ['flour-id', makeInventory({ ingredient_master_id: 'flour-id', quantity_on_hand: 1000, unit: 'g' })],
    ['butter-id', makeInventory({ ingredient_master_id: 'butter-id', quantity_on_hand: 500, unit: 'g' })],
    ['sugar-id', makeInventory({ ingredient_master_id: 'sugar-id', quantity_on_hand: 2000, unit: 'g' })],
  ]);
}

function defaultDensityLookup(): Map<string, IngredientDensity> {
  return new Map([
    ['flour-id', makeDensity('flour-id', 0.53)],
    ['butter-id', makeDensity('butter-id', 0.91)],
    ['sugar-id', makeDensity('sugar-id', 0.85)],
  ]);
}

// ── Deduction calculation with unit conversion (Req 103.1) ───────────────────

describe('calculateDeductions – unit conversion', () => {
  it('deducts correct grams when inventory unit is grams', () => {
    const result = calculateDeductions([flour], 1, defaultInventoryLookup(), defaultDensityLookup());
    expect(result.deductions).toHaveLength(1);
    expect(result.deductions[0].quantity_to_deduct).toBeCloseTo(250, 4);
    expect(result.deductions[0].unit).toBe('g');
  });

  it('converts grams to kg when inventory unit is kg', () => {
    const inventory = new Map([
      ['flour-id', makeInventory({ ingredient_master_id: 'flour-id', quantity_on_hand: 10, unit: 'kg' })],
    ]);
    const result = calculateDeductions([flour], 1, inventory, defaultDensityLookup());
    // 250g = 0.25kg
    expect(result.deductions[0].quantity_to_deduct).toBeCloseTo(0.25, 4);
    expect(result.deductions[0].unit).toBe('kg');
  });

  it('converts grams to oz when inventory unit is oz', () => {
    const inventory = new Map([
      ['flour-id', makeInventory({ ingredient_master_id: 'flour-id', quantity_on_hand: 100, unit: 'oz' })],
    ]);
    const result = calculateDeductions([flour], 1, inventory, defaultDensityLookup());
    // 250g / 28.3495 ≈ 8.818
    expect(result.deductions[0].quantity_to_deduct).toBeCloseTo(250 / 28.3495, 3);
  });

  it('converts grams to lb when inventory unit is lb', () => {
    const inventory = new Map([
      ['flour-id', makeInventory({ ingredient_master_id: 'flour-id', quantity_on_hand: 10, unit: 'lb' })],
    ]);
    const result = calculateDeductions([flour], 1, inventory, defaultDensityLookup());
    // 250g / 453.592 ≈ 0.5512
    expect(result.deductions[0].quantity_to_deduct).toBeCloseTo(250 / 453.592, 3);
  });

  it('falls back to grams for unsupported inventory unit', () => {
    const inventory = new Map([
      ['flour-id', makeInventory({ ingredient_master_id: 'flour-id', quantity_on_hand: 5000, unit: 'pieces' })],
    ]);
    const result = calculateDeductions([flour], 1, inventory, defaultDensityLookup());
    // Unsupported unit → treated as grams
    expect(result.deductions[0].quantity_to_deduct).toBeCloseTo(250, 4);
  });

  it('applies scaling factor to deduction quantity', () => {
    const result = calculateDeductions([flour], 2, defaultInventoryLookup(), defaultDensityLookup());
    // 250g × 2 = 500g
    expect(result.deductions[0].quantity_to_deduct).toBeCloseTo(500, 4);
  });

  it('applies fractional scaling factor', () => {
    const result = calculateDeductions([flour], 0.5, defaultInventoryLookup(), defaultDensityLookup());
    // 250g × 0.5 = 125g
    expect(result.deductions[0].quantity_to_deduct).toBeCloseTo(125, 4);
  });

  it('calculates new_stock correctly as current - deducted', () => {
    const result = calculateDeductions([flour], 1, defaultInventoryLookup(), defaultDensityLookup());
    const d = result.deductions[0];
    expect(d.new_stock).toBeCloseTo(d.current_stock - d.quantity_to_deduct, 4);
    expect(d.new_stock).toBeCloseTo(1000 - 250, 4);
  });

  it('handles multiple ingredients with different units', () => {
    const inventory = new Map([
      ['flour-id', makeInventory({ ingredient_master_id: 'flour-id', quantity_on_hand: 5, unit: 'kg' })],
      ['butter-id', makeInventory({ ingredient_master_id: 'butter-id', quantity_on_hand: 500, unit: 'g' })],
      ['sugar-id', makeInventory({ ingredient_master_id: 'sugar-id', quantity_on_hand: 10, unit: 'lb' })],
    ]);
    const result = calculateDeductions([flour, butter, sugar], 1, inventory, defaultDensityLookup());
    expect(result.deductions).toHaveLength(3);
    expect(result.deductions[0].unit).toBe('kg');
    expect(result.deductions[1].unit).toBe('g');
    expect(result.deductions[2].unit).toBe('lb');
    expect(result.deductions[0].quantity_to_deduct).toBeCloseTo(0.25, 3);
    expect(result.deductions[1].quantity_to_deduct).toBeCloseTo(113, 3);
    expect(result.deductions[2].quantity_to_deduct).toBeCloseTo(200 / 453.592, 3);
  });
});

// ── Insufficient stock warning generation (Req 103.2) ────────────────────────

describe('calculateDeductions – insufficient stock warnings', () => {
  it('generates warning when deduction exceeds stock', () => {
    const inventory = new Map([
      ['flour-id', makeInventory({ ingredient_master_id: 'flour-id', quantity_on_hand: 100, unit: 'g' })],
    ]);
    const result = calculateDeductions([flour], 1, inventory, defaultDensityLookup());
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('Insufficient');
    expect(result.warnings[0]).toContain('All-purpose flour');
  });

  it('does not generate warning when stock is sufficient', () => {
    const result = calculateDeductions([flour], 1, defaultInventoryLookup(), defaultDensityLookup());
    expect(result.warnings).toHaveLength(0);
  });

  it('does not generate warning when stock exactly equals deduction', () => {
    const inventory = new Map([
      ['flour-id', makeInventory({ ingredient_master_id: 'flour-id', quantity_on_hand: 250, unit: 'g' })],
    ]);
    const result = calculateDeductions([flour], 1, inventory, defaultDensityLookup());
    expect(result.warnings).toHaveLength(0);
  });

  it('still includes deduction entry even when stock is insufficient', () => {
    const inventory = new Map([
      ['flour-id', makeInventory({ ingredient_master_id: 'flour-id', quantity_on_hand: 50, unit: 'g' })],
    ]);
    const result = calculateDeductions([flour], 1, inventory, defaultDensityLookup());
    expect(result.deductions).toHaveLength(1);
    expect(result.deductions[0].new_stock).toBeLessThan(0);
  });

  it('generates warning for ingredient not tracked in inventory', () => {
    const emptyInventory = new Map<string, InventoryItem>();
    const result = calculateDeductions([flour], 1, emptyInventory, defaultDensityLookup());
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('not tracked in inventory');
    expect(result.deductions).toHaveLength(0);
  });

  it('generates multiple warnings for multiple insufficient ingredients', () => {
    const inventory = new Map([
      ['flour-id', makeInventory({ ingredient_master_id: 'flour-id', quantity_on_hand: 10, unit: 'g' })],
      ['butter-id', makeInventory({ ingredient_master_id: 'butter-id', quantity_on_hand: 5, unit: 'g' })],
    ]);
    const result = calculateDeductions([flour, butter], 1, inventory, defaultDensityLookup());
    const insufficientWarnings = result.warnings.filter((w) => w.includes('Insufficient'));
    expect(insufficientWarnings).toHaveLength(2);
  });

  it('warns for insufficient stock after scaling', () => {
    const inventory = new Map([
      ['flour-id', makeInventory({ ingredient_master_id: 'flour-id', quantity_on_hand: 400, unit: 'g' })],
    ]);
    // 250g × 2 = 500g > 400g
    const result = calculateDeductions([flour], 2, inventory, defaultDensityLookup());
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('Insufficient');
  });
});

// ── Low stock alert triggering (Req 103.3) ───────────────────────────────────

describe('applyDeductions – low stock alerts', () => {
  it('generates low stock alert when new_stock falls below min_stock_level', () => {
    const inventoryItem = makeInventory({
      ingredient_master_id: 'flour-id',
      quantity_on_hand: 300,
      unit: 'g',
      min_stock_level: 100,
    });
    const deductions: Deduction[] = [
      {
        inventory_item_id: inventoryItem.id,
        ingredient_name: 'All-purpose flour',
        quantity_to_deduct: 250,
        unit: 'g',
        current_stock: 300,
        new_stock: 50, // 50 < 100 min
      },
    ];
    const invByItemId = new Map([[inventoryItem.id, inventoryItem]]);
    const result = applyDeductions(deductions, 'journal-1', invByItemId);
    expect(result.low_stock_alerts).toHaveLength(1);
    expect(result.low_stock_alerts[0].ingredient_name).toBe('All-purpose flour');
    expect(result.low_stock_alerts[0].current_stock).toBe(50);
    expect(result.low_stock_alerts[0].min_stock_level).toBe(100);
  });

  it('does not generate alert when new_stock is above min_stock_level', () => {
    const inventoryItem = makeInventory({
      ingredient_master_id: 'flour-id',
      quantity_on_hand: 1000,
      unit: 'g',
      min_stock_level: 100,
    });
    const deductions: Deduction[] = [
      {
        inventory_item_id: inventoryItem.id,
        ingredient_name: 'All-purpose flour',
        quantity_to_deduct: 250,
        unit: 'g',
        current_stock: 1000,
        new_stock: 750,
      },
    ];
    const invByItemId = new Map([[inventoryItem.id, inventoryItem]]);
    const result = applyDeductions(deductions, 'journal-1', invByItemId);
    expect(result.low_stock_alerts).toHaveLength(0);
  });

  it('does not generate alert when min_stock_level is null', () => {
    const inventoryItem = makeInventory({
      ingredient_master_id: 'flour-id',
      quantity_on_hand: 300,
      unit: 'g',
      min_stock_level: null,
    });
    const deductions: Deduction[] = [
      {
        inventory_item_id: inventoryItem.id,
        ingredient_name: 'All-purpose flour',
        quantity_to_deduct: 250,
        unit: 'g',
        current_stock: 300,
        new_stock: 50,
      },
    ];
    const invByItemId = new Map([[inventoryItem.id, inventoryItem]]);
    const result = applyDeductions(deductions, 'journal-1', invByItemId);
    expect(result.low_stock_alerts).toHaveLength(0);
  });

  it('generates alerts for multiple ingredients below threshold', () => {
    const flourInv = makeInventory({
      id: 'inv-flour',
      ingredient_master_id: 'flour-id',
      quantity_on_hand: 300,
      unit: 'g',
      min_stock_level: 200,
    });
    const butterInv = makeInventory({
      id: 'inv-butter',
      ingredient_master_id: 'butter-id',
      quantity_on_hand: 200,
      unit: 'g',
      min_stock_level: 150,
    });
    const deductions: Deduction[] = [
      {
        inventory_item_id: 'inv-flour',
        ingredient_name: 'All-purpose flour',
        quantity_to_deduct: 250,
        unit: 'g',
        current_stock: 300,
        new_stock: 50,
      },
      {
        inventory_item_id: 'inv-butter',
        ingredient_name: 'Butter',
        quantity_to_deduct: 113,
        unit: 'g',
        current_stock: 200,
        new_stock: 87,
      },
    ];
    const invByItemId = new Map([
      ['inv-flour', flourInv],
      ['inv-butter', butterInv],
    ]);
    const result = applyDeductions(deductions, 'journal-1', invByItemId);
    expect(result.low_stock_alerts).toHaveLength(2);
  });

  it('alert includes correct unit from deduction', () => {
    const inventoryItem = makeInventory({
      ingredient_master_id: 'flour-id',
      quantity_on_hand: 5,
      unit: 'kg',
      min_stock_level: 2,
    });
    const deductions: Deduction[] = [
      {
        inventory_item_id: inventoryItem.id,
        ingredient_name: 'All-purpose flour',
        quantity_to_deduct: 4,
        unit: 'kg',
        current_stock: 5,
        new_stock: 1,
      },
    ];
    const invByItemId = new Map([[inventoryItem.id, inventoryItem]]);
    const result = applyDeductions(deductions, 'journal-1', invByItemId);
    expect(result.low_stock_alerts[0].unit).toBe('kg');
  });
});

// ── Transaction rollback on error (InvalidDeductionError) ────────────────────

describe('calculateDeductions – validation errors', () => {
  it('throws InvalidDeductionError when ingredients array is empty', () => {
    expect(() =>
      calculateDeductions([], 1, defaultInventoryLookup(), defaultDensityLookup()),
    ).toThrow(InvalidDeductionError);
  });

  it('throws InvalidDeductionError when scaling factor is zero', () => {
    expect(() =>
      calculateDeductions([flour], 0, defaultInventoryLookup(), defaultDensityLookup()),
    ).toThrow(InvalidDeductionError);
  });

  it('throws InvalidDeductionError when scaling factor is negative', () => {
    expect(() =>
      calculateDeductions([flour], -1, defaultInventoryLookup(), defaultDensityLookup()),
    ).toThrow(InvalidDeductionError);
  });
});

describe('applyDeductions – validation errors', () => {
  it('throws InvalidDeductionError when deductions array is empty', () => {
    expect(() =>
      applyDeductions([], 'journal-1', new Map()),
    ).toThrow(InvalidDeductionError);
  });

  it('throws InvalidDeductionError when journal entry ID is empty', () => {
    const deductions: Deduction[] = [
      {
        inventory_item_id: 'inv-1',
        ingredient_name: 'Flour',
        quantity_to_deduct: 100,
        unit: 'g',
        current_stock: 500,
        new_stock: 400,
      },
    ];
    expect(() =>
      applyDeductions(deductions, '', new Map()),
    ).toThrow(InvalidDeductionError);
  });
});

// ── Inventory transaction logging (Req 103.6) ───────────────────────────────

describe('applyDeductions – transaction logging', () => {
  const inventoryItem = makeInventory({
    ingredient_master_id: 'flour-id',
    quantity_on_hand: 1000,
    unit: 'g',
    min_stock_level: null,
  });

  const singleDeduction: Deduction[] = [
    {
      inventory_item_id: inventoryItem.id,
      ingredient_name: 'All-purpose flour',
      quantity_to_deduct: 250,
      unit: 'g',
      current_stock: 1000,
      new_stock: 750,
    },
  ];

  it('creates one transaction per deduction', () => {
    const invByItemId = new Map([[inventoryItem.id, inventoryItem]]);
    const result = applyDeductions(singleDeduction, 'journal-1', invByItemId);
    expect(result.transactions).toHaveLength(1);
  });

  it('transaction has type "deduction"', () => {
    const invByItemId = new Map([[inventoryItem.id, inventoryItem]]);
    const result = applyDeductions(singleDeduction, 'journal-1', invByItemId);
    expect(result.transactions[0].transaction_type).toBe('deduction');
  });

  it('transaction references journal entry', () => {
    const invByItemId = new Map([[inventoryItem.id, inventoryItem]]);
    const result = applyDeductions(singleDeduction, 'journal-42', invByItemId);
    expect(result.transactions[0].reference_type).toBe('journal_entry');
    expect(result.transactions[0].reference_id).toBe('journal-42');
  });

  it('transaction records correct quantity and unit', () => {
    const invByItemId = new Map([[inventoryItem.id, inventoryItem]]);
    const result = applyDeductions(singleDeduction, 'journal-1', invByItemId);
    expect(result.transactions[0].quantity).toBe(250);
    expect(result.transactions[0].unit).toBe('g');
  });

  it('transaction references correct inventory item', () => {
    const invByItemId = new Map([[inventoryItem.id, inventoryItem]]);
    const result = applyDeductions(singleDeduction, 'journal-1', invByItemId);
    expect(result.transactions[0].inventory_item_id).toBe(inventoryItem.id);
  });

  it('creates transactions for multiple deductions', () => {
    const butterInv = makeInventory({
      id: 'inv-butter',
      ingredient_master_id: 'butter-id',
      quantity_on_hand: 500,
      unit: 'g',
      min_stock_level: null,
    });
    const deductions: Deduction[] = [
      ...singleDeduction,
      {
        inventory_item_id: 'inv-butter',
        ingredient_name: 'Butter',
        quantity_to_deduct: 113,
        unit: 'g',
        current_stock: 500,
        new_stock: 387,
      },
    ];
    const invByItemId = new Map([
      [inventoryItem.id, inventoryItem],
      ['inv-butter', butterInv],
    ]);
    const result = applyDeductions(deductions, 'journal-1', invByItemId);
    expect(result.transactions).toHaveLength(2);
    expect(result.transactions[0].inventory_item_id).toBe(inventoryItem.id);
    expect(result.transactions[1].inventory_item_id).toBe('inv-butter');
  });
});

// ── End-to-end flow: calculateDeductions → applyDeductions ───────────────────

describe('inventory manager – end-to-end flow', () => {
  it('full flow: calculate then apply deductions with alerts', () => {
    const inventory = new Map([
      ['flour-id', makeInventory({
        id: 'inv-flour',
        ingredient_master_id: 'flour-id',
        quantity_on_hand: 300,
        unit: 'g',
        min_stock_level: 100,
      })],
      ['butter-id', makeInventory({
        id: 'inv-butter',
        ingredient_master_id: 'butter-id',
        quantity_on_hand: 500,
        unit: 'g',
        min_stock_level: null,
      })],
    ]);

    const calcResult = calculateDeductions([flour, butter], 1, inventory, defaultDensityLookup());
    expect(calcResult.deductions).toHaveLength(2);
    expect(calcResult.warnings).toHaveLength(0);

    // Build inventory lookup by item id for applyDeductions
    const invByItemId = new Map<string, InventoryItem>();
    for (const inv of inventory.values()) {
      invByItemId.set(inv.id, inv);
    }

    const applyResult = applyDeductions(calcResult.deductions, 'journal-99', invByItemId);
    expect(applyResult.transactions).toHaveLength(2);
    // Flour: 300 - 250 = 50 < 100 min → alert
    expect(applyResult.low_stock_alerts).toHaveLength(1);
    expect(applyResult.low_stock_alerts[0].ingredient_name).toBe('All-purpose flour');
  });
});
