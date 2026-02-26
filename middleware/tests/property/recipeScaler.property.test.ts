/**
 * Property-based tests for the Recipe Scaling System
 *
 * Property 3: Recipe Scaling Proportionality
 * Validates: Requirements 20.2, 20.3, 31.4, 82.4
 *
 * All ingredient quantities must scale by the same factor, preserving
 * the ratio between any pair of ingredients.
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  scaleByYield,
  scaleByServings,
  scaleByFactor,
  type ScalableIngredient,
  type ScalableRecipe,
} from '../../src/recipeScaler';

// ── Arbitraries ──────────────────────────────────────────────────────────────

/** Arbitrary positive quantity in grams (1–5000) */
const arbGrams = fc.double({ min: 1, max: 5000, noNaN: true });

/** Arbitrary scaling factor in the range specified by the task (0.1–10) */
const arbScalingFactor = fc.double({ min: 0.1, max: 10, noNaN: true });

/** Arbitrary positive servings (1–100) */
const arbServings = fc.integer({ min: 1, max: 100 });

/** Arbitrary positive yield in grams (100–10000) */
const arbYield = fc.double({ min: 100, max: 10000, noNaN: true });

/** Build a single ingredient with a given quantity */
function makeIngredient(index: number, grams: number): ScalableIngredient {
  return {
    id: `ing-${index}`,
    display_name: `Ingredient ${index}`,
    quantity_original: grams,
    unit_original: 'grams',
    quantity_grams: grams,
    position: index,
    category: 'flour',
  };
}

/** Arbitrary array of 2–10 ingredients with random gram quantities */
const arbIngredients = fc
  .array(arbGrams, { minLength: 2, maxLength: 10 })
  .map((grams) => grams.map((g, i) => makeIngredient(i + 1, g)));

/** Build a recipe from arbitrary ingredients, servings, and yield */
function makeRecipe(
  ingredients: ScalableIngredient[],
  servings: number,
  yieldGrams: number,
): ScalableRecipe {
  return {
    id: 'recipe-test',
    title: 'Test Recipe',
    servings,
    yield_weight_grams: yieldGrams,
    ingredients,
  };
}

/** Relative error between two numbers */
function relativeError(a: number, b: number): number {
  if (a === 0 && b === 0) return 0;
  return Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b));
}

// ── Property Tests ───────────────────────────────────────────────────────────

describe('Recipe Scaler – Property-Based Tests', () => {
  it('Property 3a: scaleByFactor preserves ingredient ratios', () => {
    fc.assert(
      fc.property(arbIngredients, arbScalingFactor, (ingredients, factor) => {
        const recipe = makeRecipe(ingredients, 12, 1000);
        const result = scaleByFactor(recipe, factor);

        const original = recipe.ingredients;
        const scaled = result.recipe.ingredients;

        // For every pair (i, j), ratio before scaling should equal ratio after
        for (let i = 0; i < original.length; i++) {
          for (let j = i + 1; j < original.length; j++) {
            const ratioBefore = original[i].quantity_grams / original[j].quantity_grams;
            const ratioAfter = scaled[i].quantity_grams / scaled[j].quantity_grams;
            const error = relativeError(ratioBefore, ratioAfter);
            expect(error).toBeLessThanOrEqual(1e-10);
          }
        }
      }),
      { numRuns: 200 },
    );
  });

  it('Property 3b: scaleByYield preserves ingredient ratios', () => {
    fc.assert(
      fc.property(arbIngredients, arbYield, arbYield, (ingredients, origYield, targetYield) => {
        const recipe = makeRecipe(ingredients, 12, origYield);
        const result = scaleByYield(recipe, targetYield);

        const original = recipe.ingredients;
        const scaled = result.recipe.ingredients;

        for (let i = 0; i < original.length; i++) {
          for (let j = i + 1; j < original.length; j++) {
            const ratioBefore = original[i].quantity_grams / original[j].quantity_grams;
            const ratioAfter = scaled[i].quantity_grams / scaled[j].quantity_grams;
            const error = relativeError(ratioBefore, ratioAfter);
            expect(error).toBeLessThanOrEqual(1e-10);
          }
        }
      }),
      { numRuns: 200 },
    );
  });

  it('Property 3c: scaleByServings preserves ingredient ratios', () => {
    fc.assert(
      fc.property(arbIngredients, arbServings, arbServings, (ingredients, origServ, targetServ) => {
        const recipe = makeRecipe(ingredients, origServ, 1000);
        const result = scaleByServings(recipe, targetServ);

        const original = recipe.ingredients;
        const scaled = result.recipe.ingredients;

        for (let i = 0; i < original.length; i++) {
          for (let j = i + 1; j < original.length; j++) {
            const ratioBefore = original[i].quantity_grams / original[j].quantity_grams;
            const ratioAfter = scaled[i].quantity_grams / scaled[j].quantity_grams;
            const error = relativeError(ratioBefore, ratioAfter);
            expect(error).toBeLessThanOrEqual(1e-10);
          }
        }
      }),
      { numRuns: 200 },
    );
  });

  it('Property 3d: each ingredient quantity equals original × scaling_factor', () => {
    fc.assert(
      fc.property(arbIngredients, arbScalingFactor, (ingredients, factor) => {
        const recipe = makeRecipe(ingredients, 12, 1000);
        const result = scaleByFactor(recipe, factor);

        for (let i = 0; i < ingredients.length; i++) {
          const expected = ingredients[i].quantity_grams * factor;
          const actual = result.recipe.ingredients[i].quantity_grams;
          const error = relativeError(expected, actual);
          expect(error).toBeLessThanOrEqual(1e-10);
        }
      }),
      { numRuns: 200 },
    );
  });

  it('Property 3e: scaling_factor reported matches target / original yield', () => {
    fc.assert(
      fc.property(arbIngredients, arbYield, arbYield, (ingredients, origYield, targetYield) => {
        const recipe = makeRecipe(ingredients, 12, origYield);
        const result = scaleByYield(recipe, targetYield);

        const expectedFactor = targetYield / origYield;
        const error = relativeError(expectedFactor, result.scaling_factor);
        expect(error).toBeLessThanOrEqual(1e-10);
      }),
      { numRuns: 200 },
    );
  });

  it('Property 3f: scaling by factor 1.0 returns original quantities', () => {
    fc.assert(
      fc.property(arbIngredients, (ingredients) => {
        const recipe = makeRecipe(ingredients, 12, 1000);
        const result = scaleByFactor(recipe, 1.0);

        for (let i = 0; i < ingredients.length; i++) {
          expect(result.recipe.ingredients[i].quantity_grams).toBe(
            ingredients[i].quantity_grams,
          );
        }
      }),
      { numRuns: 100 },
    );
  });

  it('Property 3g: scaling up then down returns original quantities', () => {
    fc.assert(
      fc.property(arbIngredients, arbScalingFactor, (ingredients, factor) => {
        const recipe = makeRecipe(ingredients, 12, 1000);

        // Scale up
        const scaledUp = scaleByFactor(recipe, factor);

        // Build a new recipe from the scaled result and scale back down
        const scaledRecipe = makeRecipe(
          scaledUp.recipe.ingredients,
          scaledUp.recipe.servings,
          scaledUp.recipe.yield_weight_grams,
        );
        const scaledBack = scaleByFactor(scaledRecipe, 1 / factor);

        for (let i = 0; i < ingredients.length; i++) {
          const error = relativeError(
            ingredients[i].quantity_grams,
            scaledBack.recipe.ingredients[i].quantity_grams,
          );
          expect(error).toBeLessThanOrEqual(0.001); // 0.1% tolerance for round-trip
        }
      }),
      { numRuns: 200 },
    );
  });
});
