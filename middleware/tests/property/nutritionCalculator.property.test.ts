/**
 * Property-based tests for the Nutrition Calculator
 *
 * Property 4: Nutrition Calculation Consistency
 * Validates: Requirements 13.5, 20.5, 67.5
 *
 * Verifies that total nutrition equals the sum of individual ingredient
 * contributions weighted by quantity, and that per-100g / per-serving
 * derivations are mathematically consistent with the totals.
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  calculateNutrition,
  type NutritionIngredient,
  type NutritionPer100g,
  type NutritionTotals,
} from '../../src/nutritionCalculator';

// ── Arbitraries ──────────────────────────────────────────────────────────────

/** Realistic nutrition values per 100g */
const arbNutritionPer100g: fc.Arbitrary<NutritionPer100g> = fc.record({
  energy_kcal: fc.double({ min: 0, max: 900, noNaN: true }),
  protein_g: fc.double({ min: 0, max: 100, noNaN: true }),
  fat_g: fc.double({ min: 0, max: 100, noNaN: true }),
  carbs_g: fc.double({ min: 0, max: 100, noNaN: true }),
  fiber_g: fc.double({ min: 0, max: 50, noNaN: true }),
});

/** Ingredient with nutrition data */
const arbIngredientWithNutrition: fc.Arbitrary<NutritionIngredient> = fc.record({
  id: fc.uuid(),
  display_name: fc.string({ minLength: 1, maxLength: 30 }),
  quantity_grams: fc.double({ min: 0.1, max: 10_000, noNaN: true }),
  nutrition_per_100g: arbNutritionPer100g,
});

/** Ingredient without nutrition data (should be skipped) */
const arbIngredientWithoutNutrition: fc.Arbitrary<NutritionIngredient> = fc.record({
  id: fc.uuid(),
  display_name: fc.string({ minLength: 1, maxLength: 30 }),
  quantity_grams: fc.double({ min: 0.1, max: 10_000, noNaN: true }),
  nutrition_per_100g: fc.constant(null),
});

/** Non-empty array of ingredients with nutrition data (1–20 items) */
const arbIngredientsWithNutrition = fc.array(arbIngredientWithNutrition, { minLength: 1, maxLength: 20 });

/** Positive servings count */
const arbServings = fc.double({ min: 0.5, max: 100, noNaN: true });

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Relative error between two numbers, safe for zero values */
function relativeError(a: number, b: number): number {
  if (a === 0 && b === 0) return 0;
  return Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b), 1e-12);
}

/** Manually compute expected totals from ingredients */
function manualTotal(ingredients: NutritionIngredient[]): NutritionTotals {
  const totals = { energy_kcal: 0, protein_g: 0, fat_g: 0, carbs_g: 0, fiber_g: 0 };
  for (const ing of ingredients) {
    const nutr = ing.nutrition_per_100g;
    if (nutr == null) continue;
    const factor = ing.quantity_grams / 100;
    totals.energy_kcal += nutr.energy_kcal * factor;
    totals.protein_g += nutr.protein_g * factor;
    totals.fat_g += nutr.fat_g * factor;
    totals.carbs_g += nutr.carbs_g * factor;
    totals.fiber_g += (nutr.fiber_g ?? 0) * factor;
  }
  return totals;
}

const NUTRITION_KEYS: (keyof NutritionTotals)[] = [
  'energy_kcal', 'protein_g', 'fat_g', 'carbs_g', 'fiber_g',
];

// ── Property Tests ───────────────────────────────────────────────────────────

describe('Nutrition Calculator – Property-Based Tests', () => {
  it('Property 4a: total nutrition equals sum of (ingredient_nutrition × quantity / 100)', () => {
    fc.assert(
      fc.property(arbIngredientsWithNutrition, arbServings, (ingredients, servings) => {
        const result = calculateNutrition(ingredients, servings);
        const expected = manualTotal(ingredients);

        for (const key of NUTRITION_KEYS) {
          const err = relativeError(result.total[key], expected[key]);
          expect(err).toBeLessThanOrEqual(1e-9);
        }
      }),
      { numRuns: 200 },
    );
  });

  it('Property 4b: per-serving equals total / servings', () => {
    fc.assert(
      fc.property(arbIngredientsWithNutrition, arbServings, (ingredients, servings) => {
        const result = calculateNutrition(ingredients, servings);

        for (const key of NUTRITION_KEYS) {
          const expected = result.total[key] / servings;
          const err = relativeError(result.per_serving[key], expected);
          expect(err).toBeLessThanOrEqual(1e-9);
        }
      }),
      { numRuns: 200 },
    );
  });

  it('Property 4c: per-100g equals total × (100 / total_weight_grams)', () => {
    fc.assert(
      fc.property(arbIngredientsWithNutrition, arbServings, (ingredients, servings) => {
        const result = calculateNutrition(ingredients, servings);

        // total_weight_grams > 0 guaranteed since all ingredients have nutrition data
        for (const key of NUTRITION_KEYS) {
          const expected = result.total[key] * (100 / result.total_weight_grams);
          const err = relativeError(result.per_100g[key], expected);
          expect(err).toBeLessThanOrEqual(1e-9);
        }
      }),
      { numRuns: 200 },
    );
  });

  it('Property 4d: total_weight_grams equals sum of quantity_grams for ingredients with nutrition data', () => {
    fc.assert(
      fc.property(arbIngredientsWithNutrition, arbServings, (ingredients, servings) => {
        const result = calculateNutrition(ingredients, servings);
        const expectedWeight = ingredients.reduce((sum, ing) => {
          return ing.nutrition_per_100g != null ? sum + ing.quantity_grams : sum;
        }, 0);

        const err = relativeError(result.total_weight_grams, expectedWeight);
        expect(err).toBeLessThanOrEqual(1e-9);
      }),
      { numRuns: 200 },
    );
  });

  it('Property 4e: ingredients without nutrition data are skipped and counted', () => {
    fc.assert(
      fc.property(
        arbIngredientsWithNutrition,
        fc.array(arbIngredientWithoutNutrition, { minLength: 1, maxLength: 10 }),
        arbServings,
        (withNutr, withoutNutr, servings) => {
          const mixed = [...withNutr, ...withoutNutr];
          const result = calculateNutrition(mixed, servings);

          // Skipped count should equal the number of null-nutrition ingredients
          expect(result.skipped_count).toBe(withoutNutr.length);

          // Totals should match calculation using only ingredients with data
          const expected = manualTotal(withNutr);
          for (const key of NUTRITION_KEYS) {
            const err = relativeError(result.total[key], expected[key]);
            expect(err).toBeLessThanOrEqual(1e-9);
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it('Property 4f: all nutrition values are non-negative', () => {
    fc.assert(
      fc.property(arbIngredientsWithNutrition, arbServings, (ingredients, servings) => {
        const result = calculateNutrition(ingredients, servings);

        for (const key of NUTRITION_KEYS) {
          expect(result.total[key]).toBeGreaterThanOrEqual(0);
          expect(result.per_100g[key]).toBeGreaterThanOrEqual(0);
          expect(result.per_serving[key]).toBeGreaterThanOrEqual(0);
        }
      }),
      { numRuns: 200 },
    );
  });

  it('Property 4g: scaling all quantities by a factor scales totals by the same factor', () => {
    const arbFactor = fc.double({ min: 0.1, max: 10, noNaN: true });

    fc.assert(
      fc.property(
        arbIngredientsWithNutrition,
        arbServings,
        arbFactor,
        (ingredients, servings, factor) => {
          const original = calculateNutrition(ingredients, servings);

          const scaled = ingredients.map((ing) => ({
            ...ing,
            quantity_grams: ing.quantity_grams * factor,
          }));
          const scaledResult = calculateNutrition(scaled, servings);

          for (const key of NUTRITION_KEYS) {
            const expected = original.total[key] * factor;
            const err = relativeError(scaledResult.total[key], expected);
            expect(err).toBeLessThanOrEqual(1e-6);
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});
