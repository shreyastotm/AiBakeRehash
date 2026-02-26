/**
 * Unit tests for the Cost Calculator
 *
 * Covers:
 * - All cost components (ingredient, overhead, packaging, labor)
 * - Missing inventory data (should throw error)
 * - Zero costs
 * - Very large numbers
 * - Cost per serving and cost per 100g calculations
 *
 * Requirements: 104.1, 104.2, 104.3, 72.2
 */
import { describe, it, expect } from 'vitest';
import {
  calculateRecipeCost,
  MissingInventoryDataError,
  InvalidRecipeDataError,
  type CostIngredient,
  type InventoryItem,
} from '../../src/costCalculator';
import type { IngredientDensity } from '../../src/unitConverter';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeIngredient(overrides: Partial<CostIngredient> & { ingredient_master_id: string }): CostIngredient {
  return {
    id: overrides.id ?? 'ing-1',
    display_name: overrides.display_name ?? 'Test Ingredient',
    ingredient_master_id: overrides.ingredient_master_id,
    quantity_grams: overrides.quantity_grams ?? 100,
  };
}

function makeInventory(id: string, costPerUnit: number, unit = 'g', currency = 'INR'): InventoryItem {
  return { ingredient_master_id: id, cost_per_unit: costPerUnit, unit, currency };
}

function makeDensity(id: string, density: number | null = 1.0): IngredientDensity {
  return { id, name: 'ingredient', default_density_g_per_ml: density };
}

/** Flour: 250g at ₹0.04/g */
const flour: CostIngredient = makeIngredient({ id: 'i1', ingredient_master_id: 'flour-id', display_name: 'All-purpose flour', quantity_grams: 250 });
/** Butter: 113g at ₹0.12/g */
const butter: CostIngredient = makeIngredient({ id: 'i2', ingredient_master_id: 'butter-id', display_name: 'Butter', quantity_grams: 113 });
/** Sugar: 200g at ₹0.05/g */
const sugar: CostIngredient = makeIngredient({ id: 'i3', ingredient_master_id: 'sugar-id', display_name: 'Sugar', quantity_grams: 200 });

function defaultInventoryMap(): Map<string, InventoryItem> {
  return new Map([
    ['flour-id', makeInventory('flour-id', 0.04)],
    ['butter-id', makeInventory('butter-id', 0.12)],
    ['sugar-id', makeInventory('sugar-id', 0.05)],
  ]);
}

function defaultDensityMap(): Map<string, IngredientDensity> {
  return new Map([
    ['flour-id', makeDensity('flour-id', 0.53)],
    ['butter-id', makeDensity('butter-id', 0.91)],
    ['sugar-id', makeDensity('sugar-id', 0.85)],
  ]);
}

// ── All cost components (Req 104.1, 104.3) ───────────────────────────────────

describe('calculateRecipeCost – all cost components', () => {
  it('calculates ingredient cost as sum of quantity × cost_per_unit', () => {
    const result = calculateRecipeCost(
      [flour, butter, sugar],
      24, 600,
      defaultInventoryMap(),
      defaultDensityMap(),
    );
    // flour: 250 × 0.04 = 10, butter: 113 × 0.12 = 13.56, sugar: 200 × 0.05 = 10
    const expectedIngredientCost = 250 * 0.04 + 113 * 0.12 + 200 * 0.05;
    expect(result.ingredient_cost).toBeCloseTo(expectedIngredientCost, 2);
    expect(result.total_cost).toBeCloseTo(expectedIngredientCost, 2);
  });

  it('adds overhead, packaging, and labor to total cost', () => {
    const result = calculateRecipeCost(
      [flour],
      12, 300,
      defaultInventoryMap(),
      defaultDensityMap(),
      50, 25, 100,
    );
    const ingredientCost = 250 * 0.04; // 10
    expect(result.ingredient_cost).toBeCloseTo(ingredientCost, 2);
    expect(result.overhead_cost).toBe(50);
    expect(result.packaging_cost).toBe(25);
    expect(result.labor_cost).toBe(100);
    expect(result.total_cost).toBeCloseTo(ingredientCost + 50 + 25 + 100, 2);
  });

  it('returns correct currency', () => {
    const result = calculateRecipeCost(
      [flour], 12, 300,
      defaultInventoryMap(), defaultDensityMap(),
      0, 0, 0, 'USD',
    );
    expect(result.currency).toBe('USD');
  });

  it('defaults currency to INR', () => {
    const result = calculateRecipeCost(
      [flour], 12, 300,
      defaultInventoryMap(), defaultDensityMap(),
    );
    expect(result.currency).toBe('INR');
  });

  it('returns a breakdown entry for each ingredient', () => {
    const result = calculateRecipeCost(
      [flour, butter, sugar],
      24, 600,
      defaultInventoryMap(),
      defaultDensityMap(),
    );
    expect(result.breakdown).toHaveLength(3);
    expect(result.breakdown[0].ingredient_name).toBe('All-purpose flour');
    expect(result.breakdown[1].ingredient_name).toBe('Butter');
    expect(result.breakdown[2].ingredient_name).toBe('Sugar');
  });

  it('breakdown entries contain correct fields', () => {
    const result = calculateRecipeCost(
      [flour], 12, 300,
      defaultInventoryMap(), defaultDensityMap(),
    );
    const entry = result.breakdown[0];
    expect(entry.ingredient_name).toBe('All-purpose flour');
    expect(entry.quantity_grams).toBe(250);
    expect(entry.cost_per_unit).toBe(0.04);
    expect(entry.unit).toBe('g');
    expect(entry.total_cost).toBeCloseTo(10, 2);
  });
});

// ── Missing inventory data (Req 104.5) ───────────────────────────────────────

describe('calculateRecipeCost – missing inventory data', () => {
  it('throws MissingInventoryDataError when ingredient not in inventory', () => {
    const emptyInventory = new Map<string, InventoryItem>();
    expect(() =>
      calculateRecipeCost([flour], 12, 300, emptyInventory, defaultDensityMap()),
    ).toThrow(MissingInventoryDataError);
  });

  it('error message includes ingredient name', () => {
    const emptyInventory = new Map<string, InventoryItem>();
    expect(() =>
      calculateRecipeCost([flour], 12, 300, emptyInventory, defaultDensityMap()),
    ).toThrow(/All-purpose flour/);
  });

  it('throws when one of multiple ingredients is missing', () => {
    const partialInventory = new Map<string, InventoryItem>([
      ['flour-id', makeInventory('flour-id', 0.04)],
      // butter-id missing
    ]);
    expect(() =>
      calculateRecipeCost([flour, butter], 12, 300, partialInventory, defaultDensityMap()),
    ).toThrow(MissingInventoryDataError);
  });
});

// ── Invalid recipe data ──────────────────────────────────────────────────────

describe('calculateRecipeCost – invalid recipe data', () => {
  it('throws when ingredients array is empty', () => {
    expect(() =>
      calculateRecipeCost([], 12, 300, defaultInventoryMap(), defaultDensityMap()),
    ).toThrow(InvalidRecipeDataError);
  });

  it('throws when servings is zero', () => {
    expect(() =>
      calculateRecipeCost([flour], 0, 300, defaultInventoryMap(), defaultDensityMap()),
    ).toThrow(InvalidRecipeDataError);
  });

  it('throws when servings is negative', () => {
    expect(() =>
      calculateRecipeCost([flour], -5, 300, defaultInventoryMap(), defaultDensityMap()),
    ).toThrow(InvalidRecipeDataError);
  });

  it('throws when yield weight is zero', () => {
    expect(() =>
      calculateRecipeCost([flour], 12, 0, defaultInventoryMap(), defaultDensityMap()),
    ).toThrow(InvalidRecipeDataError);
  });

  it('throws when yield weight is negative', () => {
    expect(() =>
      calculateRecipeCost([flour], 12, -100, defaultInventoryMap(), defaultDensityMap()),
    ).toThrow(InvalidRecipeDataError);
  });
});

// ── Zero costs ───────────────────────────────────────────────────────────────

describe('calculateRecipeCost – zero costs', () => {
  it('handles zero cost_per_unit in inventory', () => {
    const inventory = new Map<string, InventoryItem>([
      ['flour-id', makeInventory('flour-id', 0)],
    ]);
    const result = calculateRecipeCost(
      [flour], 12, 300, inventory, defaultDensityMap(),
    );
    expect(result.ingredient_cost).toBe(0);
    expect(result.total_cost).toBe(0);
  });

  it('handles zero overhead, packaging, and labor', () => {
    const result = calculateRecipeCost(
      [flour], 12, 300,
      defaultInventoryMap(), defaultDensityMap(),
      0, 0, 0,
    );
    expect(result.overhead_cost).toBe(0);
    expect(result.packaging_cost).toBe(0);
    expect(result.labor_cost).toBe(0);
    expect(result.total_cost).toBeCloseTo(result.ingredient_cost, 2);
  });

  it('handles zero quantity_grams ingredient', () => {
    const zeroIng = makeIngredient({ ingredient_master_id: 'flour-id', display_name: 'Flour', quantity_grams: 0 });
    const result = calculateRecipeCost(
      [zeroIng], 12, 300,
      defaultInventoryMap(), defaultDensityMap(),
    );
    expect(result.ingredient_cost).toBe(0);
    expect(result.breakdown[0].total_cost).toBe(0);
  });
});

// ── Very large numbers ───────────────────────────────────────────────────────

describe('calculateRecipeCost – very large numbers', () => {
  it('handles very large ingredient quantities', () => {
    const bigIng = makeIngredient({
      ingredient_master_id: 'flour-id',
      display_name: 'Flour',
      quantity_grams: 1_000_000,
    });
    const result = calculateRecipeCost(
      [bigIng], 1000, 1_000_000,
      defaultInventoryMap(), defaultDensityMap(),
    );
    expect(result.ingredient_cost).toBeCloseTo(1_000_000 * 0.04, 0);
    expect(result.total_cost).toBeCloseTo(40_000, 0);
  });

  it('handles very large overhead costs', () => {
    const result = calculateRecipeCost(
      [flour], 12, 300,
      defaultInventoryMap(), defaultDensityMap(),
      1_000_000, 500_000, 250_000,
    );
    expect(result.total_cost).toBeCloseTo(result.ingredient_cost + 1_750_000, 0);
  });

  it('handles very large servings count', () => {
    const result = calculateRecipeCost(
      [flour], 100_000, 300,
      defaultInventoryMap(), defaultDensityMap(),
    );
    expect(result.cost_per_serving).toBeCloseTo(result.total_cost / 100_000, 6);
  });
});

// ── Cost per serving and cost per 100g (Req 104.4, 72.2) ────────────────────

describe('calculateRecipeCost – per-serving and per-100g', () => {
  it('calculates cost_per_serving as total_cost / servings', () => {
    const result = calculateRecipeCost(
      [flour, butter, sugar],
      24, 600,
      defaultInventoryMap(), defaultDensityMap(),
      50, 25, 100,
    );
    expect(result.cost_per_serving).toBeCloseTo(result.total_cost / 24, 4);
  });

  it('calculates cost_per_100g as (total_cost / yield_grams) × 100', () => {
    const result = calculateRecipeCost(
      [flour, butter, sugar],
      24, 600,
      defaultInventoryMap(), defaultDensityMap(),
      50, 25, 100,
    );
    expect(result.cost_per_100g).toBeCloseTo((result.total_cost / 600) * 100, 4);
  });

  it('cost_per_serving changes with servings count', () => {
    const r12 = calculateRecipeCost([flour], 12, 300, defaultInventoryMap(), defaultDensityMap());
    const r24 = calculateRecipeCost([flour], 24, 300, defaultInventoryMap(), defaultDensityMap());
    // Same total cost, double servings → half per-serving cost
    expect(r12.cost_per_serving).toBeCloseTo(r24.cost_per_serving * 2, 4);
  });

  it('cost_per_100g changes with yield weight', () => {
    const r300 = calculateRecipeCost([flour], 12, 300, defaultInventoryMap(), defaultDensityMap());
    const r600 = calculateRecipeCost([flour], 12, 600, defaultInventoryMap(), defaultDensityMap());
    // Same total cost, double yield → half per-100g cost
    expect(r300.cost_per_100g).toBeCloseTo(r600.cost_per_100g * 2, 4);
  });
});

// ── Inventory unit conversion ────────────────────────────────────────────────

describe('calculateRecipeCost – inventory unit conversion', () => {
  it('converts grams to kg when inventory uses kg', () => {
    const inventory = new Map<string, InventoryItem>([
      ['flour-id', makeInventory('flour-id', 40, 'kg')], // ₹40/kg
    ]);
    const result = calculateRecipeCost(
      [flour], 12, 300, inventory, defaultDensityMap(),
    );
    // 250g = 0.25kg, 0.25 × 40 = 10
    expect(result.ingredient_cost).toBeCloseTo(10, 2);
  });

  it('handles single ingredient recipe', () => {
    const result = calculateRecipeCost(
      [flour], 1, 250,
      defaultInventoryMap(), defaultDensityMap(),
    );
    expect(result.breakdown).toHaveLength(1);
    expect(result.ingredient_cost).toBeCloseTo(250 * 0.04, 2);
  });
});
