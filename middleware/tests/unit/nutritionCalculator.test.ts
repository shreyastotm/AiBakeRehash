/**
 * Unit tests for the Nutrition Calculator
 *
 * Validates: Requirements 13.1, 67.1, 67.2, 67.3
 */
import { describe, it, expect } from 'vitest';
import {
  calculateNutrition,
  NoIngredientsError,
  InvalidServingsError,
  type NutritionIngredient,
} from '../../src/nutritionCalculator';

// ── Helpers ──────────────────────────────────────────────────────────────────

function ing(
  overrides: Partial<NutritionIngredient> & { quantity_grams: number },
): NutritionIngredient {
  return {
    id: overrides.id ?? 'ing-1',
    display_name: overrides.display_name ?? 'test ingredient',
    quantity_grams: overrides.quantity_grams,
    nutrition_per_100g:
      'nutrition_per_100g' in overrides
        ? overrides.nutrition_per_100g!
        : { energy_kcal: 100, protein_g: 10, fat_g: 5, carbs_g: 20, fiber_g: 2 },
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('Nutrition Calculator – Unit Tests', () => {
  // ---------- Complete nutrition data ----------

  describe('with complete nutrition data', () => {
    it('calculates totals for a single ingredient at exactly 100g', () => {
      const result = calculateNutrition(
        [ing({ quantity_grams: 100 })],
        1,
      );

      expect(result.total.energy_kcal).toBeCloseTo(100);
      expect(result.total.protein_g).toBeCloseTo(10);
      expect(result.total.fat_g).toBeCloseTo(5);
      expect(result.total.carbs_g).toBeCloseTo(20);
      expect(result.total.fiber_g).toBeCloseTo(2);
      expect(result.skipped_count).toBe(0);
      expect(result.total_weight_grams).toBeCloseTo(100);
    });

    it('scales nutrition proportionally for 250g of an ingredient', () => {
      const result = calculateNutrition(
        [ing({ quantity_grams: 250 })],
        1,
      );

      // 250g = 2.5× the per-100g values
      expect(result.total.energy_kcal).toBeCloseTo(250);
      expect(result.total.protein_g).toBeCloseTo(25);
      expect(result.total.fat_g).toBeCloseTo(12.5);
      expect(result.total.carbs_g).toBeCloseTo(50);
      expect(result.total.fiber_g).toBeCloseTo(5);
    });

    it('sums nutrition across multiple ingredients', () => {
      const flour = ing({
        id: 'flour',
        display_name: 'flour',
        quantity_grams: 200,
        nutrition_per_100g: {
          energy_kcal: 364,
          protein_g: 10,
          fat_g: 1,
          carbs_g: 76,
          fiber_g: 2.7,
        },
      });
      const butter = ing({
        id: 'butter',
        display_name: 'butter',
        quantity_grams: 100,
        nutrition_per_100g: {
          energy_kcal: 717,
          protein_g: 0.85,
          fat_g: 81,
          carbs_g: 0.06,
          fiber_g: 0,
        },
      });

      const result = calculateNutrition([flour, butter], 4);

      // flour: 200/100 = 2× factor, butter: 100/100 = 1× factor
      expect(result.total.energy_kcal).toBeCloseTo(364 * 2 + 717);
      expect(result.total.protein_g).toBeCloseTo(10 * 2 + 0.85);
      expect(result.total.fat_g).toBeCloseTo(1 * 2 + 81);
      expect(result.total.carbs_g).toBeCloseTo(76 * 2 + 0.06);
      expect(result.total.fiber_g).toBeCloseTo(2.7 * 2 + 0);
      expect(result.total_weight_grams).toBeCloseTo(300);
      expect(result.skipped_count).toBe(0);
    });
  });

  // ---------- Missing nutrition data ----------

  describe('with missing nutrition data for some ingredients', () => {
    it('skips ingredients with null nutrition_per_100g', () => {
      const withData = ing({ id: 'a', quantity_grams: 100 });
      const withoutData = ing({
        id: 'b',
        quantity_grams: 200,
        nutrition_per_100g: null,
      });

      const result = calculateNutrition([withData, withoutData], 1);

      expect(result.total.energy_kcal).toBeCloseTo(100);
      expect(result.skipped_count).toBe(1);
      // Weight only includes the ingredient with data
      expect(result.total_weight_grams).toBeCloseTo(100);
    });

    it('skips ingredients with undefined nutrition_per_100g', () => {
      const withData = ing({ id: 'a', quantity_grams: 100 });
      const withoutData: NutritionIngredient = {
        id: 'b',
        display_name: 'mystery powder',
        quantity_grams: 50,
        nutrition_per_100g: undefined,
      };

      const result = calculateNutrition([withData, withoutData], 1);

      expect(result.skipped_count).toBe(1);
      expect(result.total_weight_grams).toBeCloseTo(100);
    });

    it('returns zero totals when all ingredients lack nutrition data', () => {
      const ingredients: NutritionIngredient[] = [
        { id: 'a', display_name: 'a', quantity_grams: 100, nutrition_per_100g: null },
        { id: 'b', display_name: 'b', quantity_grams: 200, nutrition_per_100g: null },
      ];

      const result = calculateNutrition(ingredients, 2);

      expect(result.total.energy_kcal).toBe(0);
      expect(result.total.protein_g).toBe(0);
      expect(result.total.fat_g).toBe(0);
      expect(result.total.carbs_g).toBe(0);
      expect(result.total.fiber_g).toBe(0);
      expect(result.per_100g.energy_kcal).toBe(0);
      expect(result.per_serving.energy_kcal).toBe(0);
      expect(result.skipped_count).toBe(2);
      expect(result.total_weight_grams).toBe(0);
    });
  });

  // ---------- Zero-quantity ingredients ----------

  describe('with zero-quantity ingredients', () => {
    it('contributes nothing to totals for a zero-gram ingredient', () => {
      const zeroIng = ing({ id: 'zero', quantity_grams: 0 });
      const normalIng = ing({ id: 'normal', quantity_grams: 100 });

      const result = calculateNutrition([zeroIng, normalIng], 1);

      expect(result.total.energy_kcal).toBeCloseTo(100);
      expect(result.total.protein_g).toBeCloseTo(10);
      expect(result.total_weight_grams).toBeCloseTo(100);
    });

    it('handles all ingredients at zero grams', () => {
      const result = calculateNutrition(
        [ing({ quantity_grams: 0 }), ing({ id: 'b', quantity_grams: 0 })],
        1,
      );

      expect(result.total.energy_kcal).toBe(0);
      expect(result.total_weight_grams).toBe(0);
      expect(result.per_100g.energy_kcal).toBe(0);
    });
  });

  // ---------- Per-serving calculation ----------

  describe('per-serving calculation', () => {
    it('divides totals evenly by servings', () => {
      const result = calculateNutrition(
        [ing({ quantity_grams: 200 })],
        4,
      );

      // total energy = 200, per serving = 200/4 = 50
      expect(result.per_serving.energy_kcal).toBeCloseTo(50);
      expect(result.per_serving.protein_g).toBeCloseTo(5);
      expect(result.per_serving.fat_g).toBeCloseTo(2.5);
      expect(result.per_serving.carbs_g).toBeCloseTo(10);
      expect(result.per_serving.fiber_g).toBeCloseTo(1);
    });

    it('handles fractional servings', () => {
      const result = calculateNutrition(
        [ing({ quantity_grams: 100 })],
        2.5,
      );

      expect(result.per_serving.energy_kcal).toBeCloseTo(100 / 2.5);
      expect(result.per_serving.protein_g).toBeCloseTo(10 / 2.5);
    });

    it('handles single serving', () => {
      const result = calculateNutrition(
        [ing({ quantity_grams: 100 })],
        1,
      );

      expect(result.per_serving.energy_kcal).toBeCloseTo(result.total.energy_kcal);
      expect(result.per_serving.protein_g).toBeCloseTo(result.total.protein_g);
    });
  });

  // ---------- Per-100g calculation ----------

  describe('per-100g calculation', () => {
    it('returns original nutrition when total weight is exactly 100g', () => {
      const result = calculateNutrition(
        [ing({ quantity_grams: 100 })],
        1,
      );

      expect(result.per_100g.energy_kcal).toBeCloseTo(100);
      expect(result.per_100g.protein_g).toBeCloseTo(10);
      expect(result.per_100g.fat_g).toBeCloseTo(5);
    });

    it('normalises correctly for total weight > 100g', () => {
      const result = calculateNutrition(
        [ing({ quantity_grams: 500 })],
        1,
      );

      // total energy = 500, per 100g = 500 × (100/500) = 100
      expect(result.per_100g.energy_kcal).toBeCloseTo(100);
      expect(result.per_100g.protein_g).toBeCloseTo(10);
    });

    it('normalises correctly for total weight < 100g', () => {
      const result = calculateNutrition(
        [ing({ quantity_grams: 50 })],
        1,
      );

      // total energy = 50, per 100g = 50 × (100/50) = 100
      expect(result.per_100g.energy_kcal).toBeCloseTo(100);
      expect(result.per_100g.protein_g).toBeCloseTo(10);
    });

    it('blends per-100g values for mixed ingredients', () => {
      const sugar = ing({
        id: 'sugar',
        display_name: 'sugar',
        quantity_grams: 100,
        nutrition_per_100g: {
          energy_kcal: 400,
          protein_g: 0,
          fat_g: 0,
          carbs_g: 100,
          fiber_g: 0,
        },
      });
      const water = ing({
        id: 'water',
        display_name: 'water',
        quantity_grams: 100,
        nutrition_per_100g: {
          energy_kcal: 0,
          protein_g: 0,
          fat_g: 0,
          carbs_g: 0,
          fiber_g: 0,
        },
      });

      const result = calculateNutrition([sugar, water], 1);

      // Total weight = 200g, total energy = 400
      // Per 100g = 400 × (100/200) = 200
      expect(result.per_100g.energy_kcal).toBeCloseTo(200);
      expect(result.per_100g.carbs_g).toBeCloseTo(50);
    });
  });

  // ---------- Optional fiber_g handling ----------

  describe('optional fiber_g field', () => {
    it('treats missing fiber_g as zero', () => {
      const noFiber = ing({
        quantity_grams: 100,
        nutrition_per_100g: {
          energy_kcal: 100,
          protein_g: 5,
          fat_g: 3,
          carbs_g: 15,
          // fiber_g intentionally omitted
        },
      });

      const result = calculateNutrition([noFiber], 1);

      expect(result.total.fiber_g).toBe(0);
    });
  });

  // ---------- Error handling ----------

  describe('error handling', () => {
    it('throws NoIngredientsError for empty array', () => {
      expect(() => calculateNutrition([], 1)).toThrow(NoIngredientsError);
    });

    it('throws InvalidServingsError for zero servings', () => {
      expect(() => calculateNutrition([ing({ quantity_grams: 100 })], 0)).toThrow(
        InvalidServingsError,
      );
    });

    it('throws InvalidServingsError for negative servings', () => {
      expect(() => calculateNutrition([ing({ quantity_grams: 100 })], -2)).toThrow(
        InvalidServingsError,
      );
    });
  });
});
