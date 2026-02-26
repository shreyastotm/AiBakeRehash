/**
 * Property-based tests for the Cost Calculator
 *
 * Property 22: Recipe Cost Calculation
 * Validates: Requirements 104.1, 72.3
 *
 * Verifies that total ingredient cost equals the sum of (quantity × cost_per_unit)
 * for all ingredients, and that derived figures (per-serving, per-100g, total)
 * are mathematically consistent.
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  calculateRecipeCost,
  type CostIngredient,
  type InventoryItem,
} from '../../src/costCalculator';
import type { IngredientDensity } from '../../src/unitConverter';

// ── Arbitraries ──────────────────────────────────────────────────────────────

/** Weight units only – avoids density requirement in conversion */
const WEIGHT_UNITS = ['g', 'kg', 'oz', 'lb'] as const;
const arbWeightUnit = fc.constantFrom(...WEIGHT_UNITS);

/** Grams-per-weight-unit factors (must match unitConverter constants) */
const GRAMS_PER: Record<string, number> = {
  g: 1,
  kg: 1000,
  oz: 28.3495,
  lb: 453.592,
};

const arbIngredient: fc.Arbitrary<CostIngredient> = fc.record({
  id: fc.uuid(),
  display_name: fc.string({ minLength: 1, maxLength: 30 }),
  ingredient_master_id: fc.uuid(),
  quantity_grams: fc.double({ min: 0.1, max: 10_000, noNaN: true }),
});

const arbCostPerUnit = fc.double({ min: 0.01, max: 1000, noNaN: true });
const arbServings = fc.double({ min: 0.5, max: 100, noNaN: true });
const arbYieldGrams = fc.double({ min: 1, max: 50_000, noNaN: true });
const arbOverhead = fc.double({ min: 0, max: 5000, noNaN: true });

/** Build a consistent set of ingredients + inventory + density lookups */
function arbRecipeWithInventory() {
  return fc
    .array(
      fc.tuple(arbIngredient, arbCostPerUnit, arbWeightUnit),
      { minLength: 1, maxLength: 15 },
    )
    .map((tuples) => {
      const ingredients: CostIngredient[] = [];
      const inventoryLookup = new Map<string, InventoryItem>();
      const densityLookup = new Map<string, IngredientDensity>();

      for (const [ing, costPerUnit, unit] of tuples) {
        // Ensure unique ingredient_master_id per entry
        const masterId = ing.ingredient_master_id;
        ingredients.push(ing);

        inventoryLookup.set(masterId, {
          ingredient_master_id: masterId,
          cost_per_unit: costPerUnit,
          unit,
          currency: 'INR',
        });

        densityLookup.set(masterId, {
          id: masterId,
          name: ing.display_name,
          default_density_g_per_ml: null, // not needed for weight units
        });
      }

      return { ingredients, inventoryLookup, densityLookup };
    });
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function relativeError(a: number, b: number): number {
  if (a === 0 && b === 0) return 0;
  return Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b), 1e-12);
}

/**
 * Manually compute expected ingredient cost for a single ingredient.
 * Mirrors the logic in costCalculator: convert grams → inventory unit,
 * then multiply by cost_per_unit.
 */
function expectedIngredientCost(
  quantityGrams: number,
  costPerUnit: number,
  inventoryUnit: string,
): number {
  const gramsPerUnit = GRAMS_PER[inventoryUnit] ?? 1;
  const quantityInUnit = quantityGrams / gramsPerUnit;
  return quantityInUnit * costPerUnit;
}

// ── Property Tests ───────────────────────────────────────────────────────────

describe('Cost Calculator – Property-Based Tests', () => {
  it('Property 22a: total ingredient cost equals sum of (quantity_in_unit × cost_per_unit) for all ingredients', () => {
    fc.assert(
      fc.property(
        arbRecipeWithInventory(),
        arbServings,
        arbYieldGrams,
        ({ ingredients, inventoryLookup, densityLookup }, servings, yieldGrams) => {
          const result = calculateRecipeCost(
            ingredients,
            servings,
            yieldGrams,
            inventoryLookup,
            densityLookup,
          );

          let expectedTotal = 0;
          for (const ing of ingredients) {
            const inv = inventoryLookup.get(ing.ingredient_master_id)!;
            expectedTotal += expectedIngredientCost(
              ing.quantity_grams,
              inv.cost_per_unit,
              inv.unit,
            );
          }

          const err = relativeError(result.ingredient_cost, expectedTotal);
          expect(err).toBeLessThanOrEqual(1e-9);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('Property 22b: total_cost equals ingredient_cost + overhead + packaging + labor', () => {
    fc.assert(
      fc.property(
        arbRecipeWithInventory(),
        arbServings,
        arbYieldGrams,
        arbOverhead,
        arbOverhead,
        arbOverhead,
        ({ ingredients, inventoryLookup, densityLookup }, servings, yieldGrams, overhead, packaging, labor) => {
          const result = calculateRecipeCost(
            ingredients,
            servings,
            yieldGrams,
            inventoryLookup,
            densityLookup,
            overhead,
            packaging,
            labor,
          );

          const expectedTotal =
            result.ingredient_cost + overhead + packaging + labor;
          const err = relativeError(result.total_cost, expectedTotal);
          expect(err).toBeLessThanOrEqual(1e-9);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('Property 22c: cost_per_serving equals total_cost / servings', () => {
    fc.assert(
      fc.property(
        arbRecipeWithInventory(),
        arbServings,
        arbYieldGrams,
        ({ ingredients, inventoryLookup, densityLookup }, servings, yieldGrams) => {
          const result = calculateRecipeCost(
            ingredients,
            servings,
            yieldGrams,
            inventoryLookup,
            densityLookup,
          );

          const expected = result.total_cost / servings;
          const err = relativeError(result.cost_per_serving, expected);
          expect(err).toBeLessThanOrEqual(1e-9);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('Property 22d: cost_per_100g equals (total_cost / yield_weight_grams) × 100', () => {
    fc.assert(
      fc.property(
        arbRecipeWithInventory(),
        arbServings,
        arbYieldGrams,
        ({ ingredients, inventoryLookup, densityLookup }, servings, yieldGrams) => {
          const result = calculateRecipeCost(
            ingredients,
            servings,
            yieldGrams,
            inventoryLookup,
            densityLookup,
          );

          const expected = (result.total_cost / yieldGrams) * 100;
          const err = relativeError(result.cost_per_100g, expected);
          expect(err).toBeLessThanOrEqual(1e-9);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('Property 22e: breakdown length matches ingredient count and breakdown costs sum to ingredient_cost', () => {
    fc.assert(
      fc.property(
        arbRecipeWithInventory(),
        arbServings,
        arbYieldGrams,
        ({ ingredients, inventoryLookup, densityLookup }, servings, yieldGrams) => {
          const result = calculateRecipeCost(
            ingredients,
            servings,
            yieldGrams,
            inventoryLookup,
            densityLookup,
          );

          expect(result.breakdown.length).toBe(ingredients.length);

          const breakdownSum = result.breakdown.reduce(
            (sum, item) => sum + item.total_cost,
            0,
          );
          const err = relativeError(breakdownSum, result.ingredient_cost);
          expect(err).toBeLessThanOrEqual(1e-9);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('Property 22f: all cost values are non-negative', () => {
    fc.assert(
      fc.property(
        arbRecipeWithInventory(),
        arbServings,
        arbYieldGrams,
        arbOverhead,
        ({ ingredients, inventoryLookup, densityLookup }, servings, yieldGrams, overhead) => {
          const result = calculateRecipeCost(
            ingredients,
            servings,
            yieldGrams,
            inventoryLookup,
            densityLookup,
            overhead,
          );

          expect(result.ingredient_cost).toBeGreaterThanOrEqual(0);
          expect(result.total_cost).toBeGreaterThanOrEqual(0);
          expect(result.cost_per_serving).toBeGreaterThanOrEqual(0);
          expect(result.cost_per_100g).toBeGreaterThanOrEqual(0);
          for (const item of result.breakdown) {
            expect(item.total_cost).toBeGreaterThanOrEqual(0);
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it('Property 22g: doubling all ingredient quantities doubles ingredient_cost', () => {
    fc.assert(
      fc.property(
        arbRecipeWithInventory(),
        arbServings,
        arbYieldGrams,
        ({ ingredients, inventoryLookup, densityLookup }, servings, yieldGrams) => {
          const original = calculateRecipeCost(
            ingredients,
            servings,
            yieldGrams,
            inventoryLookup,
            densityLookup,
          );

          const doubled = ingredients.map((ing) => ({
            ...ing,
            quantity_grams: ing.quantity_grams * 2,
          }));

          const scaledResult = calculateRecipeCost(
            doubled,
            servings,
            yieldGrams,
            inventoryLookup,
            densityLookup,
          );

          const err = relativeError(
            scaledResult.ingredient_cost,
            original.ingredient_cost * 2,
          );
          expect(err).toBeLessThanOrEqual(1e-6);
        },
      ),
      { numRuns: 200 },
    );
  });
});
