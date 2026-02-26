/**
 * Unit tests for the Hydration Calculator
 *
 * Validates: Requirements 16.5, 48.4
 */
import { describe, it, expect } from 'vitest';
import {
  calculateHydrationPercentage,
  NoIngredientsError,
  type HydrationIngredient,
} from '../../src/hydrationCalculator';

// ── Helpers ──────────────────────────────────────────────────────────────────

function ing(
  id: string,
  name: string,
  grams: number,
  category: string,
): HydrationIngredient {
  return { id, display_name: name, quantity_grams: grams, category };
}

// ── Various flour and liquid combinations ────────────────────────────────────

describe('Hydration Calculator – flour and liquid combinations', () => {
  it('calculates hydration for a simple bread dough (flour + water)', () => {
    const result = calculateHydrationPercentage([
      ing('1', 'bread flour', 500, 'flour'),
      ing('2', 'water', 325, 'liquid'),
    ]);

    expect(result.hydration_percentage).toBeCloseTo(65, 5);
    expect(result.total_flour_grams).toBe(500);
    expect(result.total_liquid_grams).toBe(325);
  });

  it('calculates 100% hydration (equal flour and liquid)', () => {
    const result = calculateHydrationPercentage([
      ing('1', 'flour', 300, 'flour'),
      ing('2', 'water', 300, 'liquid'),
    ]);

    expect(result.hydration_percentage).toBeCloseTo(100, 5);
  });

  it('calculates high hydration dough (>80%)', () => {
    const result = calculateHydrationPercentage([
      ing('1', 'flour', 400, 'flour'),
      ing('2', 'water', 360, 'liquid'),
    ]);

    expect(result.hydration_percentage).toBeCloseTo(90, 5);
  });

  it('ignores non-flour, non-liquid ingredients', () => {
    const result = calculateHydrationPercentage([
      ing('1', 'flour', 500, 'flour'),
      ing('2', 'water', 300, 'liquid'),
      ing('3', 'sugar', 50, 'sugar'),
      ing('4', 'butter', 100, 'fat'),
      ing('5', 'salt', 10, 'spice'),
    ]);

    expect(result.hydration_percentage).toBeCloseTo(60, 5);
    expect(result.total_flour_grams).toBe(500);
    expect(result.total_liquid_grams).toBe(300);
  });
});

// ── Zero flour (should return null) ──────────────────────────────────────────

describe('Hydration Calculator – zero flour', () => {
  it('returns null hydration when no flour-category ingredients exist', () => {
    const result = calculateHydrationPercentage([
      ing('1', 'water', 200, 'liquid'),
      ing('2', 'sugar', 100, 'sugar'),
    ]);

    expect(result.hydration_percentage).toBeNull();
    expect(result.total_flour_grams).toBe(0);
    expect(result.total_liquid_grams).toBe(200);
  });

  it('returns null hydration when only non-flour/non-liquid ingredients', () => {
    const result = calculateHydrationPercentage([
      ing('1', 'sugar', 200, 'sugar'),
      ing('2', 'butter', 100, 'fat'),
    ]);

    expect(result.hydration_percentage).toBeNull();
    expect(result.total_flour_grams).toBe(0);
    expect(result.total_liquid_grams).toBe(0);
  });
});

// ── Zero liquid (should return 0%) ───────────────────────────────────────────

describe('Hydration Calculator – zero liquid', () => {
  it('returns 0% hydration when flour exists but no liquid', () => {
    const result = calculateHydrationPercentage([
      ing('1', 'flour', 500, 'flour'),
      ing('2', 'sugar', 100, 'sugar'),
    ]);

    expect(result.hydration_percentage).toBe(0);
    expect(result.total_flour_grams).toBe(500);
    expect(result.total_liquid_grams).toBe(0);
  });
});

// ── Multiple flour types ─────────────────────────────────────────────────────

describe('Hydration Calculator – multiple flour types', () => {
  it('sums all flour-category ingredients', () => {
    const result = calculateHydrationPercentage([
      ing('1', 'bread flour', 300, 'flour'),
      ing('2', 'whole wheat flour', 100, 'flour'),
      ing('3', 'rye flour', 100, 'flour'),
      ing('4', 'water', 375, 'liquid'),
    ]);

    // total flour = 500, hydration = 375/500 * 100 = 75%
    expect(result.total_flour_grams).toBe(500);
    expect(result.hydration_percentage).toBeCloseTo(75, 5);
  });

  it('handles two flour types with precise ratio', () => {
    const result = calculateHydrationPercentage([
      ing('1', 'all-purpose flour', 250, 'flour'),
      ing('2', 'almond flour', 50, 'flour'),
      ing('3', 'water', 180, 'liquid'),
    ]);

    // total flour = 300, hydration = 180/300 * 100 = 60%
    expect(result.total_flour_grams).toBe(300);
    expect(result.hydration_percentage).toBeCloseTo(60, 5);
  });
});

// ── Dairy counted as liquid ──────────────────────────────────────────────────

describe('Hydration Calculator – dairy as liquid', () => {
  it('counts dairy-category ingredients as liquid', () => {
    const result = calculateHydrationPercentage([
      ing('1', 'flour', 500, 'flour'),
      ing('2', 'milk', 250, 'dairy'),
    ]);

    expect(result.hydration_percentage).toBeCloseTo(50, 5);
    expect(result.total_liquid_grams).toBe(250);
  });

  it('sums both liquid and dairy categories together', () => {
    const result = calculateHydrationPercentage([
      ing('1', 'flour', 400, 'flour'),
      ing('2', 'water', 200, 'liquid'),
      ing('3', 'milk', 100, 'dairy'),
    ]);

    // total liquid = 200 + 100 = 300, hydration = 300/400 * 100 = 75%
    expect(result.total_liquid_grams).toBe(300);
    expect(result.hydration_percentage).toBeCloseTo(75, 5);
  });

  it('handles recipe with only dairy as liquid source', () => {
    const result = calculateHydrationPercentage([
      ing('1', 'flour', 300, 'flour'),
      ing('2', 'buttermilk', 240, 'dairy'),
      ing('3', 'sugar', 50, 'sugar'),
    ]);

    expect(result.hydration_percentage).toBeCloseTo(80, 5);
    expect(result.total_liquid_grams).toBe(240);
  });
});

// ── Category case insensitivity ──────────────────────────────────────────────

describe('Hydration Calculator – category case insensitivity', () => {
  it('handles uppercase category names', () => {
    const result = calculateHydrationPercentage([
      ing('1', 'flour', 500, 'FLOUR'),
      ing('2', 'water', 350, 'LIQUID'),
    ]);

    expect(result.hydration_percentage).toBeCloseTo(70, 5);
  });

  it('handles mixed-case category names', () => {
    const result = calculateHydrationPercentage([
      ing('1', 'flour', 500, 'Flour'),
      ing('2', 'milk', 250, 'Dairy'),
    ]);

    expect(result.hydration_percentage).toBeCloseTo(50, 5);
  });
});

// ── Error handling ───────────────────────────────────────────────────────────

describe('Hydration Calculator – error handling', () => {
  it('throws NoIngredientsError for empty array', () => {
    expect(() => calculateHydrationPercentage([])).toThrow(NoIngredientsError);
  });

  it('throws NoIngredientsError for null/undefined input', () => {
    expect(() =>
      calculateHydrationPercentage(null as unknown as HydrationIngredient[]),
    ).toThrow(NoIngredientsError);
  });
});
