/**
 * Property-based tests for the Hydration Calculator
 *
 * Property 9: Hydration Percentage Calculation
 * Validates: Requirements 16.5, 48.4
 *
 * Verifies that hydration% = (total_liquid_grams / total_flour_grams) × 100
 * for randomly generated dough recipes with flour and liquid ingredients.
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  calculateHydrationPercentage,
  type HydrationIngredient,
  NoIngredientsError,
} from '../../src/hydrationCalculator';

// ── Arbitraries ──────────────────────────────────────────────────────────────

/** Flour ingredient (category = 'flour') */
const arbFlourIngredient: fc.Arbitrary<HydrationIngredient> = fc.record({
  id: fc.uuid(),
  display_name: fc.string({ minLength: 1, maxLength: 30 }),
  quantity_grams: fc.double({ min: 0.1, max: 10_000, noNaN: true }),
  category: fc.constant('flour'),
});

/** Liquid ingredient (category = 'liquid') */
const arbLiquidIngredient: fc.Arbitrary<HydrationIngredient> = fc.record({
  id: fc.uuid(),
  display_name: fc.string({ minLength: 1, maxLength: 30 }),
  quantity_grams: fc.double({ min: 0.1, max: 10_000, noNaN: true }),
  category: fc.constant('liquid'),
});

/** Dairy ingredient (category = 'dairy', also counts as liquid) */
const arbDairyIngredient: fc.Arbitrary<HydrationIngredient> = fc.record({
  id: fc.uuid(),
  display_name: fc.string({ minLength: 1, maxLength: 30 }),
  quantity_grams: fc.double({ min: 0.1, max: 10_000, noNaN: true }),
  category: fc.constant('dairy'),
});

/** Non-flour, non-liquid ingredient (e.g. sugar, fat, spice) */
const arbOtherIngredient: fc.Arbitrary<HydrationIngredient> = fc.record({
  id: fc.uuid(),
  display_name: fc.string({ minLength: 1, maxLength: 30 }),
  quantity_grams: fc.double({ min: 0.1, max: 10_000, noNaN: true }),
  category: fc.constantFrom('sugar', 'fat', 'leavening', 'spice', 'nut', 'fruit', 'other'),
});

/** A dough recipe: at least 1 flour + at least 1 liquid/dairy, optionally other ingredients */
const arbDoughRecipe = fc.tuple(
  fc.array(arbFlourIngredient, { minLength: 1, maxLength: 5 }),
  fc.array(arbLiquidIngredient, { minLength: 0, maxLength: 5 }),
  fc.array(arbDairyIngredient, { minLength: 0, maxLength: 3 }),
  fc.array(arbOtherIngredient, { minLength: 0, maxLength: 5 }),
).filter(([_f, liquids, dairy]) => liquids.length + dairy.length >= 1)
  .map(([flours, liquids, dairy, others]) => [...flours, ...liquids, ...dairy, ...others]);

// ── Helpers ──────────────────────────────────────────────────────────────────

function relativeError(a: number, b: number): number {
  if (a === 0 && b === 0) return 0;
  return Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b), 1e-12);
}

function sumByCategory(ingredients: HydrationIngredient[], categories: Set<string>): number {
  return ingredients.reduce((sum, ing) => {
    return categories.has(ing.category.toLowerCase()) ? sum + ing.quantity_grams : sum;
  }, 0);
}

// ── Property Tests ───────────────────────────────────────────────────────────

describe('Hydration Calculator – Property-Based Tests', () => {
  it('Property 9a: hydration% = (total_liquid / total_flour) × 100 within 0.01% tolerance', () => {
    fc.assert(
      fc.property(arbDoughRecipe, (ingredients) => {
        const result = calculateHydrationPercentage(ingredients);

        const expectedFlour = sumByCategory(ingredients, new Set(['flour']));
        const expectedLiquid = sumByCategory(ingredients, new Set(['liquid', 'dairy']));
        const expectedHydration = expectedFlour > 0
          ? (expectedLiquid / expectedFlour) * 100
          : null;

        expect(result.total_flour_grams).toBeCloseTo(expectedFlour, 9);
        expect(result.total_liquid_grams).toBeCloseTo(expectedLiquid, 9);

        if (expectedHydration === null) {
          expect(result.hydration_percentage).toBeNull();
        } else {
          expect(result.hydration_percentage).not.toBeNull();
          const err = relativeError(result.hydration_percentage!, expectedHydration);
          expect(err).toBeLessThanOrEqual(1e-4); // 0.01% tolerance
        }
      }),
      { numRuns: 200 },
    );
  });

  it('Property 9b: non-flour/non-liquid ingredients do not affect hydration percentage', () => {
    fc.assert(
      fc.property(
        arbDoughRecipe,
        fc.array(arbOtherIngredient, { minLength: 1, maxLength: 10 }),
        (baseIngredients, extraOthers) => {
          const resultBase = calculateHydrationPercentage(baseIngredients);
          const resultWithExtras = calculateHydrationPercentage([...baseIngredients, ...extraOthers]);

          // Flour and liquid totals should be identical
          expect(resultWithExtras.total_flour_grams).toBeCloseTo(resultBase.total_flour_grams, 9);
          expect(resultWithExtras.total_liquid_grams).toBeCloseTo(resultBase.total_liquid_grams, 9);

          // Hydration percentage should be identical
          if (resultBase.hydration_percentage === null) {
            expect(resultWithExtras.hydration_percentage).toBeNull();
          } else {
            const err = relativeError(
              resultWithExtras.hydration_percentage!,
              resultBase.hydration_percentage,
            );
            expect(err).toBeLessThanOrEqual(1e-9);
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it('Property 9c: scaling all ingredients by a factor preserves hydration percentage', () => {
    const arbFactor = fc.double({ min: 0.1, max: 10, noNaN: true });

    fc.assert(
      fc.property(arbDoughRecipe, arbFactor, (ingredients, factor) => {
        const original = calculateHydrationPercentage(ingredients);
        const scaled = ingredients.map((ing) => ({
          ...ing,
          quantity_grams: ing.quantity_grams * factor,
        }));
        const scaledResult = calculateHydrationPercentage(scaled);

        // Hydration percentage should remain the same after uniform scaling
        if (original.hydration_percentage === null) {
          expect(scaledResult.hydration_percentage).toBeNull();
        } else {
          const err = relativeError(
            scaledResult.hydration_percentage!,
            original.hydration_percentage,
          );
          expect(err).toBeLessThanOrEqual(1e-6);
        }

        // Flour and liquid totals should scale by the factor
        const flourErr = relativeError(
          scaledResult.total_flour_grams,
          original.total_flour_grams * factor,
        );
        const liquidErr = relativeError(
          scaledResult.total_liquid_grams,
          original.total_liquid_grams * factor,
        );
        expect(flourErr).toBeLessThanOrEqual(1e-6);
        expect(liquidErr).toBeLessThanOrEqual(1e-6);
      }),
      { numRuns: 200 },
    );
  });

  it('Property 9d: hydration percentage is non-negative when flour is present', () => {
    fc.assert(
      fc.property(arbDoughRecipe, (ingredients) => {
        const result = calculateHydrationPercentage(ingredients);

        if (result.hydration_percentage !== null) {
          expect(result.hydration_percentage).toBeGreaterThanOrEqual(0);
        }
        expect(result.total_flour_grams).toBeGreaterThanOrEqual(0);
        expect(result.total_liquid_grams).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 200 },
    );
  });

  it('Property 9e: zero flour yields null hydration percentage', () => {
    const arbNoFlourRecipe = fc.tuple(
      fc.array(arbLiquidIngredient, { minLength: 1, maxLength: 5 }),
      fc.array(arbOtherIngredient, { minLength: 0, maxLength: 5 }),
    ).map(([liquids, others]) => [...liquids, ...others]);

    fc.assert(
      fc.property(arbNoFlourRecipe, (ingredients) => {
        const result = calculateHydrationPercentage(ingredients);

        expect(result.hydration_percentage).toBeNull();
        expect(result.total_flour_grams).toBe(0);
      }),
      { numRuns: 100 },
    );
  });

  it('Property 9f: dairy ingredients contribute to liquid total', () => {
    fc.assert(
      fc.property(
        fc.array(arbFlourIngredient, { minLength: 1, maxLength: 3 }),
        fc.array(arbDairyIngredient, { minLength: 1, maxLength: 5 }),
        (flours, dairy) => {
          const ingredients = [...flours, ...dairy];
          const result = calculateHydrationPercentage(ingredients);

          const expectedDairyTotal = dairy.reduce((s, d) => s + d.quantity_grams, 0);
          expect(result.total_liquid_grams).toBeCloseTo(expectedDairyTotal, 9);
          expect(result.hydration_percentage).not.toBeNull();
          expect(result.hydration_percentage!).toBeGreaterThan(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});
