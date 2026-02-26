/**
 * Property-based tests for the Unit Conversion System
 *
 * Property 1: Unit Conversion Round-Trip
 * Validates: Requirements 6.5, 19.4
 *
 * Converting volume → weight (grams) → volume should produce the original
 * value within 0.1% tolerance for any ingredient with a known density.
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  convertToGrams,
  convertFromGrams,
  type VolumeUnit,
  type WeightUnit,
  type IngredientDensity,
} from '../../src/unitConverter';

// ── Arbitraries ──────────────────────────────────────────────────────────────

const volumeUnits: VolumeUnit[] = ['ml', 'l', 'cup', 'tbsp', 'tsp'];
const weightUnits: WeightUnit[] = ['g', 'kg', 'oz', 'lb'];

/** Arbitrary positive density in a realistic range (0.3 – 2.5 g/ml) */
const arbDensity = fc.double({ min: 0.3, max: 2.5, noNaN: true });

/** Arbitrary positive quantity in the range specified by the task (0.1 – 10000) */
const arbQuantity = fc.double({ min: 0.1, max: 10_000, noNaN: true });

const arbVolumeUnit = fc.constantFrom<VolumeUnit>(...volumeUnits);
const arbWeightUnit = fc.constantFrom<WeightUnit>(...weightUnits);

/** Build a synthetic ingredient with a known density */
function makeIngredient(density: number): IngredientDensity {
  return {
    id: 'test-ingredient',
    name: 'test ingredient',
    default_density_g_per_ml: density,
  };
}

/** Relative error between two numbers */
function relativeError(a: number, b: number): number {
  if (a === 0 && b === 0) return 0;
  return Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b));
}

// ── Property Tests ───────────────────────────────────────────────────────────

describe('Unit Converter – Property-Based Tests', () => {
  it('Property 1: volume → grams → volume round-trip preserves value within 0.1%', () => {
    fc.assert(
      fc.property(arbQuantity, arbDensity, arbVolumeUnit, (quantity, density, unit) => {
        const ingredient = makeIngredient(density);

        const grams = convertToGrams(ingredient, quantity, unit);
        const roundTripped = convertFromGrams(ingredient, grams, unit);

        const error = relativeError(quantity, roundTripped);
        expect(error).toBeLessThanOrEqual(0.001); // 0.1% tolerance
      }),
      { numRuns: 200 }, // well above the 100 minimum
    );
  });

  it('Property 2: weight → grams → weight round-trip is exact', () => {
    fc.assert(
      fc.property(arbQuantity, arbWeightUnit, (quantity, unit) => {
        const ingredient = makeIngredient(1.0); // density irrelevant for weight-to-weight

        const grams = convertToGrams(ingredient, quantity, unit);
        const roundTripped = convertFromGrams(ingredient, grams, unit);

        const error = relativeError(quantity, roundTripped);
        expect(error).toBeLessThanOrEqual(1e-10); // essentially exact
      }),
      { numRuns: 200 },
    );
  });

  it('Property 3: volume → grams is always positive for positive inputs', () => {
    fc.assert(
      fc.property(arbQuantity, arbDensity, arbVolumeUnit, (quantity, density, unit) => {
        const ingredient = makeIngredient(density);
        const grams = convertToGrams(ingredient, quantity, unit);
        expect(grams).toBeGreaterThan(0);
      }),
      { numRuns: 200 },
    );
  });

  it('Property 4: scaling quantity scales grams proportionally', () => {
    const arbFactor = fc.double({ min: 0.1, max: 100, noNaN: true });

    fc.assert(
      fc.property(
        arbQuantity,
        arbDensity,
        arbVolumeUnit,
        arbFactor,
        (quantity, density, unit, factor) => {
          const ingredient = makeIngredient(density);

          const gramsOriginal = convertToGrams(ingredient, quantity, unit);
          const gramsScaled = convertToGrams(ingredient, quantity * factor, unit);

          const error = relativeError(gramsScaled, gramsOriginal * factor);
          expect(error).toBeLessThanOrEqual(1e-10);
        },
      ),
      { numRuns: 200 },
    );
  });
});
