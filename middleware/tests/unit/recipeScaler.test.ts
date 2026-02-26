/**
 * Unit tests for the Recipe Scaling System
 *
 * Covers:
 * - Scaling up (2x, 3x, 10x)
 * - Scaling down (0.5x, 0.25x, 0.1x)
 * - Scaling factor warnings (>3x, <0.25x)
 * - Edge cases (single ingredient, many ingredients)
 * - Error handling for invalid inputs
 *
 * Requirements: 20.1, 20.2, 20.3
 */
import { describe, it, expect } from 'vitest';
import {
  scaleByYield,
  scaleByServings,
  scaleByFactor,
  InvalidScalingTargetError,
  InvalidRecipeError,
  type ScalableIngredient,
  type ScalableRecipe,
} from '../../src/recipeScaler';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeIngredient(
  index: number,
  grams: number,
  category = 'flour',
): ScalableIngredient {
  return {
    id: `ing-${index}`,
    display_name: `Ingredient ${index}`,
    quantity_original: grams,
    unit_original: 'grams',
    quantity_grams: grams,
    position: index,
    category,
  };
}

function makeRecipe(
  ingredients: ScalableIngredient[],
  servings = 12,
  yieldGrams = 1000,
): ScalableRecipe {
  return {
    id: 'recipe-1',
    title: 'Test Recipe',
    servings,
    yield_weight_grams: yieldGrams,
    ingredients,
  };
}

/** Simple cookie recipe: flour 250g, butter 113g, sugar 150g */
const cookieIngredients: ScalableIngredient[] = [
  makeIngredient(1, 250, 'flour'),
  makeIngredient(2, 113, 'fat'),
  makeIngredient(3, 150, 'sugar'),
];

const cookieRecipe = makeRecipe(cookieIngredients, 24, 600);

// ── Scaling Up (Req 20.1, 20.2) ─────────────────────────────────────────────

describe('scaleByFactor – scaling up', () => {
  it('scales all ingredients by 2x', () => {
    const result = scaleByFactor(cookieRecipe, 2);
    expect(result.scaling_factor).toBe(2);
    expect(result.recipe.ingredients[0].quantity_grams).toBeCloseTo(500, 5);
    expect(result.recipe.ingredients[1].quantity_grams).toBeCloseTo(226, 5);
    expect(result.recipe.ingredients[2].quantity_grams).toBeCloseTo(300, 5);
    expect(result.recipe.yield_weight_grams).toBeCloseTo(1200, 5);
    expect(result.recipe.servings).toBeCloseTo(48, 5);
  });

  it('scales all ingredients by 3x', () => {
    const result = scaleByFactor(cookieRecipe, 3);
    expect(result.scaling_factor).toBe(3);
    expect(result.recipe.ingredients[0].quantity_grams).toBeCloseTo(750, 5);
    expect(result.recipe.ingredients[1].quantity_grams).toBeCloseTo(339, 5);
    expect(result.recipe.ingredients[2].quantity_grams).toBeCloseTo(450, 5);
    expect(result.recipe.yield_weight_grams).toBeCloseTo(1800, 5);
  });

  it('scales all ingredients by 10x', () => {
    const result = scaleByFactor(cookieRecipe, 10);
    expect(result.scaling_factor).toBe(10);
    expect(result.recipe.ingredients[0].quantity_grams).toBeCloseTo(2500, 5);
    expect(result.recipe.ingredients[1].quantity_grams).toBeCloseTo(1130, 5);
    expect(result.recipe.ingredients[2].quantity_grams).toBeCloseTo(1500, 5);
    expect(result.recipe.yield_weight_grams).toBeCloseTo(6000, 5);
  });
});

// ── Scaling Down (Req 20.1, 20.2) ────────────────────────────────────────────

describe('scaleByFactor – scaling down', () => {
  it('scales all ingredients by 0.5x', () => {
    const result = scaleByFactor(cookieRecipe, 0.5);
    expect(result.scaling_factor).toBe(0.5);
    expect(result.recipe.ingredients[0].quantity_grams).toBeCloseTo(125, 5);
    expect(result.recipe.ingredients[1].quantity_grams).toBeCloseTo(56.5, 1);
    expect(result.recipe.ingredients[2].quantity_grams).toBeCloseTo(75, 5);
    expect(result.recipe.yield_weight_grams).toBeCloseTo(300, 5);
    expect(result.recipe.servings).toBeCloseTo(12, 5);
  });

  it('scales all ingredients by 0.25x', () => {
    const result = scaleByFactor(cookieRecipe, 0.25);
    expect(result.scaling_factor).toBe(0.25);
    expect(result.recipe.ingredients[0].quantity_grams).toBeCloseTo(62.5, 5);
    expect(result.recipe.ingredients[1].quantity_grams).toBeCloseTo(28.25, 2);
    expect(result.recipe.ingredients[2].quantity_grams).toBeCloseTo(37.5, 5);
  });

  it('scales all ingredients by 0.1x', () => {
    const result = scaleByFactor(cookieRecipe, 0.1);
    expect(result.scaling_factor).toBeCloseTo(0.1, 10);
    expect(result.recipe.ingredients[0].quantity_grams).toBeCloseTo(25, 5);
    expect(result.recipe.ingredients[1].quantity_grams).toBeCloseTo(11.3, 1);
    expect(result.recipe.ingredients[2].quantity_grams).toBeCloseTo(15, 5);
    expect(result.recipe.yield_weight_grams).toBeCloseTo(60, 5);
  });
});

// ── Scaling Factor Warnings ──────────────────────────────────────────────────

describe('Scaling factor warnings', () => {
  it('emits warning when scaling factor > 3x', () => {
    const result = scaleByFactor(cookieRecipe, 3.5);
    expect(result.warnings.some((w) => w.includes('3'))).toBe(true);
    expect(result.warnings.some((w) => w.includes('exceeds'))).toBe(true);
  });

  it('emits warning when scaling factor > 3x via scaleByYield', () => {
    // 600g yield × 4 = 2400g target → factor 4
    const result = scaleByYield(cookieRecipe, 2400);
    expect(result.warnings.some((w) => w.includes('exceeds'))).toBe(true);
  });

  it('emits warning when scaling factor < 0.25x', () => {
    const result = scaleByFactor(cookieRecipe, 0.1);
    expect(result.warnings.some((w) => w.includes('below'))).toBe(true);
  });

  it('emits warning when scaling factor < 0.25x via scaleByServings', () => {
    // 24 servings → 2 servings = factor ~0.083
    const result = scaleByServings(cookieRecipe, 2);
    expect(result.warnings.some((w) => w.includes('below'))).toBe(true);
  });

  it('no warnings at exactly 3x', () => {
    const result = scaleByFactor(cookieRecipe, 3);
    expect(result.warnings.some((w) => w.includes('exceeds'))).toBe(false);
  });

  it('no warnings at exactly 0.25x', () => {
    const result = scaleByFactor(cookieRecipe, 0.25);
    expect(result.warnings.some((w) => w.includes('below'))).toBe(false);
  });

  it('no warnings at 1x', () => {
    const result = scaleByFactor(cookieRecipe, 1);
    expect(result.warnings).toHaveLength(0);
  });

  it('warns about very small non-spice ingredient quantities', () => {
    const tinyRecipe = makeRecipe([makeIngredient(1, 5, 'flour')], 12, 100);
    const result = scaleByFactor(tinyRecipe, 0.1);
    // 5g × 0.1 = 0.5g → below 1g threshold for non-spice
    expect(result.warnings.some((w) => w.includes('very small'))).toBe(true);
  });

  it('does NOT warn about small spice quantities', () => {
    const spiceRecipe = makeRecipe([makeIngredient(1, 5, 'spice')], 12, 100);
    const result = scaleByFactor(spiceRecipe, 0.1);
    // 5g × 0.1 = 0.5g but category is spice → no small-quantity warning
    expect(result.warnings.some((w) => w.includes('very small'))).toBe(false);
  });
});

// ── scaleByYield ─────────────────────────────────────────────────────────────

describe('scaleByYield', () => {
  it('calculates correct scaling factor from yield', () => {
    const result = scaleByYield(cookieRecipe, 1200);
    expect(result.scaling_factor).toBeCloseTo(2, 10);
  });

  it('updates yield_weight_grams to target', () => {
    const result = scaleByYield(cookieRecipe, 900);
    expect(result.recipe.yield_weight_grams).toBe(900);
  });

  it('scales servings proportionally', () => {
    const result = scaleByYield(cookieRecipe, 1200);
    expect(result.recipe.servings).toBeCloseTo(48, 5);
  });

  it('preserves original values in result', () => {
    const result = scaleByYield(cookieRecipe, 1200);
    expect(result.recipe.original_yield_grams).toBe(600);
    expect(result.recipe.original_servings).toBe(24);
  });
});

// ── scaleByServings ──────────────────────────────────────────────────────────

describe('scaleByServings', () => {
  it('calculates correct scaling factor from servings', () => {
    const result = scaleByServings(cookieRecipe, 48);
    expect(result.scaling_factor).toBeCloseTo(2, 10);
  });

  it('updates servings to target', () => {
    const result = scaleByServings(cookieRecipe, 6);
    expect(result.recipe.servings).toBe(6);
  });

  it('scales yield proportionally', () => {
    const result = scaleByServings(cookieRecipe, 48);
    expect(result.recipe.yield_weight_grams).toBeCloseTo(1200, 5);
  });

  it('preserves original values in result', () => {
    const result = scaleByServings(cookieRecipe, 48);
    expect(result.recipe.original_yield_grams).toBe(600);
    expect(result.recipe.original_servings).toBe(24);
  });
});

// ── Ingredient ratio preservation (Req 20.3) ────────────────────────────────

describe('Ingredient ratio preservation', () => {
  it('preserves flour:butter ratio after scaling', () => {
    const originalRatio = 250 / 113;
    const result = scaleByFactor(cookieRecipe, 2.5);
    const scaledRatio =
      result.recipe.ingredients[0].quantity_grams /
      result.recipe.ingredients[1].quantity_grams;
    expect(scaledRatio).toBeCloseTo(originalRatio, 10);
  });

  it('preserves all pairwise ratios after scaling', () => {
    const result = scaleByFactor(cookieRecipe, 7.3);
    const orig = cookieRecipe.ingredients;
    const scaled = result.recipe.ingredients;

    for (let i = 0; i < orig.length; i++) {
      for (let j = i + 1; j < orig.length; j++) {
        const rBefore = orig[i].quantity_grams / orig[j].quantity_grams;
        const rAfter = scaled[i].quantity_grams / scaled[j].quantity_grams;
        expect(rAfter).toBeCloseTo(rBefore, 10);
      }
    }
  });

  it('each ingredient has scaling_factor set', () => {
    const result = scaleByFactor(cookieRecipe, 2);
    for (const ing of result.recipe.ingredients) {
      expect(ing.scaling_factor).toBe(2);
    }
  });

  it('quantity_original is also scaled', () => {
    const result = scaleByFactor(cookieRecipe, 3);
    expect(result.recipe.ingredients[0].quantity_original).toBeCloseTo(750, 5);
  });
});

// ── Edge cases ───────────────────────────────────────────────────────────────

describe('Edge cases', () => {
  it('handles single ingredient recipe', () => {
    const recipe = makeRecipe([makeIngredient(1, 500)], 1, 500);
    const result = scaleByFactor(recipe, 2);
    expect(result.recipe.ingredients).toHaveLength(1);
    expect(result.recipe.ingredients[0].quantity_grams).toBeCloseTo(1000, 5);
  });

  it('handles recipe with 100 ingredients', () => {
    const ingredients = Array.from({ length: 100 }, (_, i) =>
      makeIngredient(i + 1, (i + 1) * 10),
    );
    const recipe = makeRecipe(ingredients, 10, 5000);
    const result = scaleByFactor(recipe, 2);

    expect(result.recipe.ingredients).toHaveLength(100);
    for (let i = 0; i < 100; i++) {
      expect(result.recipe.ingredients[i].quantity_grams).toBeCloseTo(
        (i + 1) * 10 * 2,
        5,
      );
    }
  });

  it('scaling by factor 1 returns identical quantities', () => {
    const result = scaleByFactor(cookieRecipe, 1);
    for (let i = 0; i < cookieRecipe.ingredients.length; i++) {
      expect(result.recipe.ingredients[i].quantity_grams).toBe(
        cookieRecipe.ingredients[i].quantity_grams,
      );
    }
  });

  it('preserves ingredient metadata (id, display_name, position, category)', () => {
    const result = scaleByFactor(cookieRecipe, 2);
    for (let i = 0; i < cookieRecipe.ingredients.length; i++) {
      expect(result.recipe.ingredients[i].id).toBe(cookieRecipe.ingredients[i].id);
      expect(result.recipe.ingredients[i].display_name).toBe(
        cookieRecipe.ingredients[i].display_name,
      );
      expect(result.recipe.ingredients[i].position).toBe(
        cookieRecipe.ingredients[i].position,
      );
      expect(result.recipe.ingredients[i].category).toBe(
        cookieRecipe.ingredients[i].category,
      );
    }
  });
});

// ── Error handling ───────────────────────────────────────────────────────────

describe('Error handling', () => {
  it('throws InvalidRecipeError for empty ingredients', () => {
    const recipe = makeRecipe([], 12, 1000);
    expect(() => scaleByFactor(recipe, 2)).toThrow(InvalidRecipeError);
  });

  it('throws InvalidRecipeError for zero yield', () => {
    const recipe: ScalableRecipe = {
      ...cookieRecipe,
      yield_weight_grams: 0,
    };
    expect(() => scaleByFactor(recipe, 2)).toThrow(InvalidRecipeError);
  });

  it('throws InvalidRecipeError for negative yield', () => {
    const recipe: ScalableRecipe = {
      ...cookieRecipe,
      yield_weight_grams: -100,
    };
    expect(() => scaleByFactor(recipe, 2)).toThrow(InvalidRecipeError);
  });

  it('throws InvalidRecipeError for zero servings', () => {
    const recipe: ScalableRecipe = {
      ...cookieRecipe,
      servings: 0,
    };
    expect(() => scaleByFactor(recipe, 2)).toThrow(InvalidRecipeError);
  });

  it('throws InvalidScalingTargetError for zero factor', () => {
    expect(() => scaleByFactor(cookieRecipe, 0)).toThrow(InvalidScalingTargetError);
  });

  it('throws InvalidScalingTargetError for negative factor', () => {
    expect(() => scaleByFactor(cookieRecipe, -1)).toThrow(InvalidScalingTargetError);
  });

  it('throws InvalidScalingTargetError for zero target yield', () => {
    expect(() => scaleByYield(cookieRecipe, 0)).toThrow(InvalidScalingTargetError);
  });

  it('throws InvalidScalingTargetError for negative target yield', () => {
    expect(() => scaleByYield(cookieRecipe, -500)).toThrow(InvalidScalingTargetError);
  });

  it('throws InvalidScalingTargetError for zero target servings', () => {
    expect(() => scaleByServings(cookieRecipe, 0)).toThrow(InvalidScalingTargetError);
  });

  it('throws InvalidScalingTargetError for negative target servings', () => {
    expect(() => scaleByServings(cookieRecipe, -5)).toThrow(InvalidScalingTargetError);
  });
});
