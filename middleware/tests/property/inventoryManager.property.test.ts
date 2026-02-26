/**
 * Property-based tests for the Inventory Manager
 *
 * Property 20: Inventory Deduction on Bake Logging
 * Validates: Requirements 103.1
 *
 * Verifies that logging a bake deducts correct ingredient quantities from
 * inventory: new_quantity = old_quantity - deducted_quantity. Also checks
 * structural invariants of the deduction result.
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  calculateDeductions,
  applyDeductions,
  type DeductionIngredient,
  type InventoryItem,
} from '../../src/inventoryManager';
import type { IngredientDensity } from '../../src/unitConverter';

// ── Constants (must match unitConverter) ─────────────────────────────────────

const WEIGHT_UNITS = ['g', 'kg', 'oz', 'lb'] as const;

const GRAMS_PER: Record<string, number> = {
  g: 1,
  kg: 1000,
  oz: 28.3495,
  lb: 453.592,
};

// ── Arbitraries ──────────────────────────────────────────────────────────────

const arbWeightUnit = fc.constantFrom(...WEIGHT_UNITS);

const arbIngredient: fc.Arbitrary<DeductionIngredient> = fc.record({
  id: fc.uuid(),
  display_name: fc.string({ minLength: 1, maxLength: 30 }),
  ingredient_master_id: fc.uuid(),
  quantity_grams: fc.double({ min: 0.1, max: 5000, noNaN: true }),
});

const arbScalingFactor = fc.double({ min: 0.1, max: 10, noNaN: true });

/**
 * Build a consistent set of ingredients with matching inventory and density
 * lookups. Inventory stock is always sufficient (large enough) so we can
 * focus on the deduction math without triggering insufficient-stock warnings.
 */
function arbRecipeWithInventory() {
  return fc
    .array(
      fc.tuple(
        arbIngredient,
        arbWeightUnit,
        fc.double({ min: 100, max: 100_000, noNaN: true }), // quantity_on_hand
        fc.double({ min: 0, max: 50, noNaN: true }),         // min_stock_level (or null)
        fc.boolean(),                                         // has min_stock_level?
      ),
      { minLength: 1, maxLength: 10 },
    )
    .map((tuples) => {
      const ingredients: DeductionIngredient[] = [];
      const inventoryLookup = new Map<string, InventoryItem>();
      const densityLookup = new Map<string, IngredientDensity>();

      for (const [ing, unit, stock, minLevel, hasMinLevel] of tuples) {
        const masterId = ing.ingredient_master_id;
        ingredients.push(ing);

        inventoryLookup.set(masterId, {
          id: `inv-${masterId}`,
          ingredient_master_id: masterId,
          quantity_on_hand: stock,
          unit,
          min_stock_level: hasMinLevel ? minLevel : null,
        });

        densityLookup.set(masterId, {
          id: masterId,
          name: ing.display_name,
          default_density_g_per_ml: null, // weight units don't need density
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

/** Manually compute expected deduction quantity in inventory unit */
function expectedDeductionInUnit(
  quantityGrams: number,
  scalingFactor: number,
  inventoryUnit: string,
): number {
  const scaledGrams = quantityGrams * scalingFactor;
  const gramsPerUnit = GRAMS_PER[inventoryUnit] ?? 1;
  return scaledGrams / gramsPerUnit;
}

// ── Property Tests ───────────────────────────────────────────────────────────

describe('Inventory Manager – Property-Based Tests', () => {
  it('Property 20a: new_stock = current_stock - deducted_quantity for every deduction', () => {
    fc.assert(
      fc.property(
        arbRecipeWithInventory(),
        arbScalingFactor,
        ({ ingredients, inventoryLookup, densityLookup }, scalingFactor) => {
          const result = calculateDeductions(
            ingredients,
            scalingFactor,
            inventoryLookup,
            densityLookup,
          );

          for (const d of result.deductions) {
            const err = relativeError(d.new_stock, d.current_stock - d.quantity_to_deduct);
            expect(err).toBeLessThanOrEqual(1e-9);
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it('Property 20b: deducted quantity matches scaled grams converted to inventory unit', () => {
    fc.assert(
      fc.property(
        arbRecipeWithInventory(),
        arbScalingFactor,
        ({ ingredients, inventoryLookup, densityLookup }, scalingFactor) => {
          const result = calculateDeductions(
            ingredients,
            scalingFactor,
            inventoryLookup,
            densityLookup,
          );

          for (let i = 0; i < ingredients.length; i++) {
            const ing = ingredients[i];
            const inv = inventoryLookup.get(ing.ingredient_master_id)!;
            const d = result.deductions[i];

            const expected = expectedDeductionInUnit(
              ing.quantity_grams,
              scalingFactor,
              inv.unit,
            );
            const err = relativeError(d.quantity_to_deduct, expected);
            expect(err).toBeLessThanOrEqual(1e-9);
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it('Property 20c: number of deductions equals number of tracked ingredients', () => {
    fc.assert(
      fc.property(
        arbRecipeWithInventory(),
        arbScalingFactor,
        ({ ingredients, inventoryLookup, densityLookup }, scalingFactor) => {
          const result = calculateDeductions(
            ingredients,
            scalingFactor,
            inventoryLookup,
            densityLookup,
          );

          // All ingredients have inventory entries in our arbitrary
          expect(result.deductions.length).toBe(ingredients.length);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('Property 20d: scaling factor of 1.0 deducts raw converted quantity', () => {
    fc.assert(
      fc.property(
        arbRecipeWithInventory(),
        ({ ingredients, inventoryLookup, densityLookup }) => {
          const result = calculateDeductions(
            ingredients,
            1.0,
            inventoryLookup,
            densityLookup,
          );

          for (let i = 0; i < ingredients.length; i++) {
            const ing = ingredients[i];
            const inv = inventoryLookup.get(ing.ingredient_master_id)!;
            const d = result.deductions[i];

            const expected = expectedDeductionInUnit(ing.quantity_grams, 1.0, inv.unit);
            const err = relativeError(d.quantity_to_deduct, expected);
            expect(err).toBeLessThanOrEqual(1e-9);
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it('Property 20e: doubling scaling factor doubles deducted quantities', () => {
    fc.assert(
      fc.property(
        arbRecipeWithInventory(),
        fc.double({ min: 0.1, max: 5, noNaN: true }),
        ({ ingredients, inventoryLookup, densityLookup }, factor) => {
          const single = calculateDeductions(
            ingredients,
            factor,
            inventoryLookup,
            densityLookup,
          );
          const doubled = calculateDeductions(
            ingredients,
            factor * 2,
            inventoryLookup,
            densityLookup,
          );

          for (let i = 0; i < single.deductions.length; i++) {
            const err = relativeError(
              doubled.deductions[i].quantity_to_deduct,
              single.deductions[i].quantity_to_deduct * 2,
            );
            expect(err).toBeLessThanOrEqual(1e-6);
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it('Property 20f: applyDeductions produces one transaction per deduction', () => {
    fc.assert(
      fc.property(
        arbRecipeWithInventory(),
        arbScalingFactor,
        fc.uuid(),
        ({ ingredients, inventoryLookup, densityLookup }, scalingFactor, journalId) => {
          const { deductions } = calculateDeductions(
            ingredients,
            scalingFactor,
            inventoryLookup,
            densityLookup,
          );

          // applyDeductions needs inventory lookup keyed by inventory item id
          const invByItemId = new Map<string, InventoryItem>();
          for (const inv of inventoryLookup.values()) {
            invByItemId.set(inv.id, inv);
          }

          const applied = applyDeductions(deductions, journalId, invByItemId);

          expect(applied.transactions.length).toBe(deductions.length);
          for (const tx of applied.transactions) {
            expect(tx.transaction_type).toBe('deduction');
            expect(tx.reference_type).toBe('journal_entry');
            expect(tx.reference_id).toBe(journalId);
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it('Property 20g: ingredients not in inventory are skipped with a warning', () => {
    fc.assert(
      fc.property(
        arbIngredient,
        arbScalingFactor,
        (ingredient, scalingFactor) => {
          // Empty inventory lookup → ingredient not tracked
          const emptyInventory = new Map<string, InventoryItem>();
          const densityLookup = new Map<string, IngredientDensity>();

          const result = calculateDeductions(
            [ingredient],
            scalingFactor,
            emptyInventory,
            densityLookup,
          );

          expect(result.deductions.length).toBe(0);
          expect(result.warnings.length).toBe(1);
          expect(result.warnings[0]).toContain('not tracked in inventory');
        },
      ),
      { numRuns: 100 },
    );
  });
});
