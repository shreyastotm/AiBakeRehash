/**
 * Unit tests for the Unit Conversion System
 *
 * Covers:
 * - Volume-to-weight conversions with known densities
 * - Weight-to-weight conversions
 * - Missing density error handling
 * - Invalid unit error handling
 * - Edge cases (zero quantity, very large quantities)
 *
 * Requirements: 19.1, 19.2, 19.3
 */
import { describe, it, expect } from 'vitest';
import {
  convertToGrams,
  convertFromGrams,
  convertUnit,
  getSupportedUnits,
  isVolumeUnit,
  isWeightUnit,
  isSupportedUnit,
  MissingDensityError,
  InvalidUnitError,
  type IngredientDensity,
} from '../../src/unitConverter';

// ── Helpers ──────────────────────────────────────────────────────────────────

function ingredient(density: number | null, name = 'test ingredient'): IngredientDensity {
  return { id: 'test-id', name, default_density_g_per_ml: density };
}

/** Water: density 1.0 g/ml */
const water = ingredient(1.0, 'water');

/** All-purpose flour: density ~0.53 g/ml */
const flour = ingredient(0.53, 'all-purpose flour');

/** Honey: density ~1.42 g/ml */
const honey = ingredient(1.42, 'honey');

/** Ingredient with no density data */
const noDensity = ingredient(null, 'mystery powder');

// ── Volume-to-weight conversions (Req 19.1, 19.4) ───────────────────────────

describe('convertToGrams – volume to weight', () => {
  it('converts ml to grams using density', () => {
    // 100 ml water at 1.0 g/ml = 100 g
    expect(convertToGrams(water, 100, 'ml')).toBeCloseTo(100, 5);
  });

  it('converts liters to grams', () => {
    // 1 l = 1000 ml; 1000 ml × 1.0 = 1000 g
    expect(convertToGrams(water, 1, 'l')).toBeCloseTo(1000, 5);
  });

  it('converts cups to grams (Indian standard cup = 240 ml)', () => {
    // 1 cup flour = 240 ml × 0.53 g/ml = 127.2 g
    expect(convertToGrams(flour, 1, 'cup')).toBeCloseTo(127.2, 1);
  });

  it('converts tablespoons to grams (1 tbsp = 15 ml)', () => {
    // 2 tbsp honey = 30 ml × 1.42 = 42.6 g
    expect(convertToGrams(honey, 2, 'tbsp')).toBeCloseTo(42.6, 1);
  });

  it('converts teaspoons to grams (1 tsp = 5 ml)', () => {
    // 3 tsp water = 15 ml × 1.0 = 15 g
    expect(convertToGrams(water, 3, 'tsp')).toBeCloseTo(15, 5);
  });

  it('handles fractional quantities', () => {
    // 0.5 cup water = 120 ml × 1.0 = 120 g
    expect(convertToGrams(water, 0.5, 'cup')).toBeCloseTo(120, 5);
  });
});


// ── Weight-to-weight conversions (Req 19.3) ──────────────────────────────────

describe('convertToGrams – weight to weight', () => {
  it('grams to grams is identity', () => {
    expect(convertToGrams(water, 250, 'g')).toBe(250);
  });

  it('converts kilograms to grams', () => {
    expect(convertToGrams(water, 2.5, 'kg')).toBeCloseTo(2500, 5);
  });

  it('converts ounces to grams (1 oz = 28.3495 g)', () => {
    expect(convertToGrams(water, 1, 'oz')).toBeCloseTo(28.3495, 3);
  });

  it('converts pounds to grams (1 lb = 453.592 g)', () => {
    expect(convertToGrams(water, 1, 'lb')).toBeCloseTo(453.592, 2);
  });

  it('does not require density for weight-to-weight', () => {
    // Should work even with null density
    expect(convertToGrams(noDensity, 500, 'g')).toBe(500);
    expect(convertToGrams(noDensity, 1, 'kg')).toBeCloseTo(1000, 5);
  });
});

describe('convertFromGrams – weight output', () => {
  it('grams to grams is identity', () => {
    expect(convertFromGrams(water, 250, 'g')).toBe(250);
  });

  it('converts grams to kilograms', () => {
    expect(convertFromGrams(water, 1500, 'kg')).toBeCloseTo(1.5, 5);
  });

  it('converts grams to ounces', () => {
    expect(convertFromGrams(water, 28.3495, 'oz')).toBeCloseTo(1, 3);
  });

  it('converts grams to pounds', () => {
    expect(convertFromGrams(water, 453.592, 'lb')).toBeCloseTo(1, 3);
  });

  it('does not require density for grams-to-weight', () => {
    expect(convertFromGrams(noDensity, 1000, 'kg')).toBeCloseTo(1, 5);
  });
});

describe('convertFromGrams – volume output', () => {
  it('converts grams to ml using density', () => {
    // 100 g water / 1.0 g/ml = 100 ml
    expect(convertFromGrams(water, 100, 'ml')).toBeCloseTo(100, 5);
  });

  it('converts grams to cups', () => {
    // 127.2 g flour / 0.53 g/ml = 240 ml = 1 cup
    expect(convertFromGrams(flour, 127.2, 'cup')).toBeCloseTo(1, 1);
  });

  it('converts grams to tablespoons', () => {
    // 15 g water / 1.0 g/ml = 15 ml = 1 tbsp
    expect(convertFromGrams(water, 15, 'tbsp')).toBeCloseTo(1, 5);
  });

  it('converts grams to teaspoons', () => {
    // 5 g water / 1.0 g/ml = 5 ml = 1 tsp
    expect(convertFromGrams(water, 5, 'tsp')).toBeCloseTo(1, 5);
  });

  it('converts grams to liters', () => {
    // 1000 g water / 1.0 g/ml = 1000 ml = 1 l
    expect(convertFromGrams(water, 1000, 'l')).toBeCloseTo(1, 5);
  });
});

// ── General convertUnit function ─────────────────────────────────────────────

describe('convertUnit – general conversion', () => {
  it('weight-to-weight uses direct method', () => {
    const result = convertUnit(water, 1000, 'g', 'kg');
    expect(result.converted_quantity).toBeCloseTo(1, 5);
    expect(result.conversion_method).toBe('direct');
    expect(result.density_used).toBeNull();
  });

  it('volume-to-weight uses via_density method', () => {
    const result = convertUnit(water, 1, 'cup', 'g');
    expect(result.converted_quantity).toBeCloseTo(240, 1);
    expect(result.conversion_method).toBe('via_density');
    expect(result.density_used).toBe(1.0);
  });

  it('weight-to-volume uses via_density method', () => {
    const result = convertUnit(water, 240, 'g', 'cup');
    expect(result.converted_quantity).toBeCloseTo(1, 1);
    expect(result.conversion_method).toBe('via_density');
  });

  it('volume-to-volume uses via_density method', () => {
    const result = convertUnit(water, 1, 'cup', 'tbsp');
    // 1 cup = 240 ml = 16 tbsp
    expect(result.converted_quantity).toBeCloseTo(16, 1);
    expect(result.conversion_method).toBe('via_density');
  });

  it('preserves original quantity and unit in result', () => {
    const result = convertUnit(flour, 2, 'cup', 'g');
    expect(result.original_quantity).toBe(2);
    expect(result.original_unit).toBe('cup');
    expect(result.converted_unit).toBe('g');
  });
});


// ── Missing density error handling ───────────────────────────────────────────

describe('MissingDensityError', () => {
  it('throws when converting volume to grams without density', () => {
    expect(() => convertToGrams(noDensity, 1, 'cup')).toThrow(MissingDensityError);
  });

  it('throws when converting grams to volume without density', () => {
    expect(() => convertFromGrams(noDensity, 100, 'ml')).toThrow(MissingDensityError);
  });

  it('throws for all volume units when density is null', () => {
    for (const unit of ['ml', 'l', 'cup', 'tbsp', 'tsp']) {
      expect(() => convertToGrams(noDensity, 1, unit)).toThrow(MissingDensityError);
      expect(() => convertFromGrams(noDensity, 1, unit)).toThrow(MissingDensityError);
    }
  });

  it('includes ingredient name in error message', () => {
    try {
      convertToGrams(noDensity, 1, 'cup');
    } catch (e) {
      expect((e as Error).message).toContain('mystery powder');
    }
  });

  it('throws via convertUnit for volume-involving conversions', () => {
    expect(() => convertUnit(noDensity, 1, 'cup', 'g')).toThrow(MissingDensityError);
    expect(() => convertUnit(noDensity, 100, 'g', 'ml')).toThrow(MissingDensityError);
    expect(() => convertUnit(noDensity, 1, 'cup', 'tbsp')).toThrow(MissingDensityError);
  });

  it('does NOT throw for weight-to-weight via convertUnit', () => {
    expect(() => convertUnit(noDensity, 1000, 'g', 'kg')).not.toThrow();
  });
});

// ── Invalid unit error handling ──────────────────────────────────────────────

describe('InvalidUnitError', () => {
  it('throws for unrecognized fromUnit in convertToGrams', () => {
    expect(() => convertToGrams(water, 1, 'gallon')).toThrow(InvalidUnitError);
  });

  it('throws for unrecognized toUnit in convertFromGrams', () => {
    expect(() => convertFromGrams(water, 100, 'pint')).toThrow(InvalidUnitError);
  });

  it('throws for empty string unit', () => {
    expect(() => convertToGrams(water, 1, '')).toThrow(InvalidUnitError);
  });

  it('throws for numeric string unit', () => {
    expect(() => convertToGrams(water, 1, '123')).toThrow(InvalidUnitError);
  });

  it('throws for case-sensitive mismatch', () => {
    // Units are lowercase only
    expect(() => convertToGrams(water, 1, 'ML')).toThrow(InvalidUnitError);
    expect(() => convertToGrams(water, 1, 'Cup')).toThrow(InvalidUnitError);
  });

  it('throws via convertUnit for invalid units', () => {
    expect(() => convertUnit(water, 1, 'bushel', 'g')).toThrow(InvalidUnitError);
    expect(() => convertUnit(water, 1, 'g', 'bushel')).toThrow(InvalidUnitError);
  });

  it('includes the invalid unit in error message', () => {
    try {
      convertToGrams(water, 1, 'gallon');
    } catch (e) {
      expect((e as Error).message).toContain('gallon');
    }
  });
});

// ── Edge cases ───────────────────────────────────────────────────────────────

describe('Edge cases', () => {
  it('handles zero quantity', () => {
    expect(convertToGrams(water, 0, 'cup')).toBe(0);
    expect(convertToGrams(water, 0, 'g')).toBe(0);
    expect(convertFromGrams(water, 0, 'ml')).toBe(0);
  });

  it('handles very large quantities', () => {
    const grams = convertToGrams(water, 1_000_000, 'ml');
    expect(grams).toBeCloseTo(1_000_000, 0);
  });

  it('handles very small quantities', () => {
    const grams = convertToGrams(water, 0.001, 'tsp');
    // 0.001 tsp = 0.005 ml × 1.0 = 0.005 g
    expect(grams).toBeCloseTo(0.005, 6);
  });

  it('handles high-density ingredients', () => {
    const mercury = ingredient(13.6, 'mercury');
    // 1 ml mercury = 13.6 g
    expect(convertToGrams(mercury, 1, 'ml')).toBeCloseTo(13.6, 1);
  });

  it('handles low-density ingredients', () => {
    const puffedRice = ingredient(0.08, 'puffed rice');
    // 1 cup = 240 ml × 0.08 = 19.2 g
    expect(convertToGrams(puffedRice, 1, 'cup')).toBeCloseTo(19.2, 1);
  });
});

// ── Utility functions ────────────────────────────────────────────────────────

describe('Utility functions', () => {
  it('isVolumeUnit identifies volume units', () => {
    expect(isVolumeUnit('ml')).toBe(true);
    expect(isVolumeUnit('l')).toBe(true);
    expect(isVolumeUnit('cup')).toBe(true);
    expect(isVolumeUnit('tbsp')).toBe(true);
    expect(isVolumeUnit('tsp')).toBe(true);
    expect(isVolumeUnit('g')).toBe(false);
    expect(isVolumeUnit('kg')).toBe(false);
  });

  it('isWeightUnit identifies weight units', () => {
    expect(isWeightUnit('g')).toBe(true);
    expect(isWeightUnit('kg')).toBe(true);
    expect(isWeightUnit('oz')).toBe(true);
    expect(isWeightUnit('lb')).toBe(true);
    expect(isWeightUnit('ml')).toBe(false);
    expect(isWeightUnit('cup')).toBe(false);
  });

  it('isSupportedUnit accepts all valid units', () => {
    for (const u of ['ml', 'l', 'cup', 'tbsp', 'tsp', 'g', 'kg', 'oz', 'lb']) {
      expect(isSupportedUnit(u)).toBe(true);
    }
    expect(isSupportedUnit('gallon')).toBe(false);
    expect(isSupportedUnit('')).toBe(false);
  });

  it('getSupportedUnits returns all units', () => {
    const units = getSupportedUnits();
    expect(units.volume).toEqual(['ml', 'l', 'cup', 'tbsp', 'tsp']);
    expect(units.weight).toEqual(['g', 'kg', 'oz', 'lb']);
  });
});
