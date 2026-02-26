/**
 * Property-based tests for the Pricing Calculator
 *
 * Property 25: Pricing Formula Correctness
 * Validates: Requirements 105.2
 *
 * Verifies that:
 *   price = cost / (1 − margin/100)
 *   actual_margin = ((price − cost) / price) × 100
 *
 * Because the implementation rounds the price up to the nearest rupee (Math.ceil),
 * the raw formula is tested against the pre-rounding value, and the actual margin
 * is tested against the post-rounding value.
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  calculatePricing,
  InvalidMarginError,
  InvalidCostError,
} from '../../src/pricingCalculator';

// ── Arbitraries ──────────────────────────────────────────────────────────────

/** Random cost in ₹10–₹10,000 */
const arbCost = fc.double({ min: 10, max: 10_000, noNaN: true, noDefaultInfinity: true });

/** Random margin in 1–99% */
const arbMargin = fc.double({ min: 1, max: 99, noNaN: true, noDefaultInfinity: true });

// ── Helpers ──────────────────────────────────────────────────────────────────

function relativeError(a: number, b: number): number {
  if (a === 0 && b === 0) return 0;
  return Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b), 1e-12);
}

// ── Property Tests ───────────────────────────────────────────────────────────

describe('Pricing Calculator – Property-Based Tests', () => {
  it('Property 25a: suggested_selling_price >= cost / (1 - margin/100) (ceil rounding)', () => {
    fc.assert(
      fc.property(arbCost, arbMargin, (cost, margin) => {
        const result = calculatePricing(cost, margin);
        const rawPrice = cost / (1 - margin / 100);

        // Ceiling rounds up, so suggested price must be >= raw price
        expect(result.suggested_selling_price).toBeGreaterThanOrEqual(rawPrice - 1e-9);
        // And at most 1 rupee above the raw price (ceiling behaviour)
        expect(result.suggested_selling_price - rawPrice).toBeLessThan(1 + 1e-9);
      }),
      { numRuns: 200 },
    );
  });

  it('Property 25b: actual_profit_margin = ((price - cost) / price) × 100', () => {
    fc.assert(
      fc.property(arbCost, arbMargin, (cost, margin) => {
        const result = calculatePricing(cost, margin);
        const expectedMargin =
          ((result.suggested_selling_price - cost) / result.suggested_selling_price) * 100;

        const err = relativeError(result.actual_profit_margin, expectedMargin);
        expect(err).toBeLessThanOrEqual(1e-4); // 0.01% tolerance
      }),
      { numRuns: 200 },
    );
  });

  it('Property 25c: profit_amount = suggested_selling_price - total_cost', () => {
    fc.assert(
      fc.property(arbCost, arbMargin, (cost, margin) => {
        const result = calculatePricing(cost, margin);
        const expectedProfit = result.suggested_selling_price - cost;

        const err = relativeError(result.profit_amount, expectedProfit);
        expect(err).toBeLessThanOrEqual(1e-9);
      }),
      { numRuns: 200 },
    );
  });

  it('Property 25d: actual margin >= target margin (ceiling only increases price)', () => {
    fc.assert(
      fc.property(arbCost, arbMargin, (cost, margin) => {
        const result = calculatePricing(cost, margin);
        // Rounding up the price can only increase the margin
        expect(result.actual_profit_margin).toBeGreaterThanOrEqual(margin - 1e-9);
      }),
      { numRuns: 200 },
    );
  });

  it('Property 25e: suggested_selling_price is an integer (rounded to nearest rupee)', () => {
    fc.assert(
      fc.property(arbCost, arbMargin, (cost, margin) => {
        const result = calculatePricing(cost, margin);
        expect(Number.isInteger(result.suggested_selling_price)).toBe(true);
      }),
      { numRuns: 200 },
    );
  });

  it('Property 25f: total_cost and target_profit_margin are echoed back unchanged', () => {
    fc.assert(
      fc.property(arbCost, arbMargin, (cost, margin) => {
        const result = calculatePricing(cost, margin);
        expect(result.total_cost).toBe(cost);
        expect(result.target_profit_margin).toBe(margin);
      }),
      { numRuns: 200 },
    );
  });

  it('Property 25g: all monetary values are positive', () => {
    fc.assert(
      fc.property(arbCost, arbMargin, (cost, margin) => {
        const result = calculatePricing(cost, margin);
        expect(result.suggested_selling_price).toBeGreaterThan(0);
        expect(result.profit_amount).toBeGreaterThan(0);
        expect(result.actual_profit_margin).toBeGreaterThan(0);
      }),
      { numRuns: 200 },
    );
  });

  it('Property 25h: margin >= 100 throws InvalidMarginError', () => {
    fc.assert(
      fc.property(
        arbCost,
        fc.double({ min: 100, max: 1000, noNaN: true, noDefaultInfinity: true }),
        (cost, badMargin) => {
          expect(() => calculatePricing(cost, badMargin)).toThrow(InvalidMarginError);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 25i: non-positive cost throws InvalidCostError', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -10_000, max: 0, noNaN: true, noDefaultInfinity: true }),
        arbMargin,
        (badCost, margin) => {
          expect(() => calculatePricing(badCost, margin)).toThrow(InvalidCostError);
        },
      ),
      { numRuns: 100 },
    );
  });
});
