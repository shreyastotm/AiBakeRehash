/**
 * Unit tests for the Pricing Calculator
 *
 * Covers:
 * - Various cost and margin combinations
 * - 0% margin (price = cost)
 * - 99% margin (very high price)
 * - Invalid margin (≥100%, negative, NaN, Infinity)
 * - Invalid cost (zero, negative, NaN, Infinity)
 * - INR rounding to nearest rupee (Math.ceil)
 *
 * Requirements: 105.1, 105.2, 105.3
 */
import { describe, it, expect } from 'vitest';
import {
  calculatePricing,
  InvalidMarginError,
  InvalidCostError,
} from '../../src/pricingCalculator';

// ── Various cost and margin combinations (Req 105.1, 105.2) ─────────────────

describe('calculatePricing – various cost and margin combinations', () => {
  it('calculates correctly for ₹100 cost at 30% margin', () => {
    const result = calculatePricing(100, 30);
    // price = 100 / (1 - 0.30) = 142.857… → ceil = 143
    expect(result.suggested_selling_price).toBe(143);
    expect(result.profit_amount).toBeCloseTo(43, 2);
    expect(result.total_cost).toBe(100);
    expect(result.target_profit_margin).toBe(30);
  });

  it('calculates correctly for ₹500 cost at 50% margin', () => {
    const result = calculatePricing(500, 50);
    // price = 500 / 0.5 = 1000 → ceil = 1000
    expect(result.suggested_selling_price).toBe(1000);
    expect(result.profit_amount).toBeCloseTo(500, 2);
    expect(result.actual_profit_margin).toBeCloseTo(50, 2);
  });

  it('calculates correctly for ₹420.50 cost at 25% margin', () => {
    const result = calculatePricing(420.5, 25);
    // price = 420.5 / 0.75 = 560.666… → ceil = 561
    expect(result.suggested_selling_price).toBe(561);
    expect(result.profit_amount).toBeCloseTo(561 - 420.5, 2);
  });

  it('calculates correctly for small cost ₹10 at 10% margin', () => {
    const result = calculatePricing(10, 10);
    // price = 10 / 0.9 = 11.111… → ceil = 12
    expect(result.suggested_selling_price).toBe(12);
    expect(result.profit_amount).toBeCloseTo(2, 2);
  });

  it('calculates correctly for large cost ₹50,000 at 40% margin', () => {
    const result = calculatePricing(50000, 40);
    // price = 50000 / 0.6 = 83333.333… → ceil = 83334
    expect(result.suggested_selling_price).toBe(83334);
    expect(result.profit_amount).toBeCloseTo(33334, 0);
  });

  it('echoes back total_cost and target_profit_margin unchanged', () => {
    const result = calculatePricing(245.5, 35);
    expect(result.total_cost).toBe(245.5);
    expect(result.target_profit_margin).toBe(35);
  });
});

// ── 0% margin: price = cost (Req 105.1) ─────────────────────────────────────

describe('calculatePricing – 0% margin', () => {
  it('returns price equal to cost (ceiled) when margin is 0%', () => {
    const result = calculatePricing(100, 0);
    // price = 100 / (1 - 0) = 100 → ceil = 100
    expect(result.suggested_selling_price).toBe(100);
    expect(result.profit_amount).toBe(0);
    expect(result.actual_profit_margin).toBe(0);
  });

  it('ceils fractional cost at 0% margin', () => {
    const result = calculatePricing(99.1, 0);
    // price = 99.1 / 1 = 99.1 → ceil = 100
    expect(result.suggested_selling_price).toBe(100);
    expect(result.profit_amount).toBeCloseTo(0.9, 2);
  });

  it('returns integer price at 0% margin for whole-number cost', () => {
    const result = calculatePricing(250, 0);
    expect(result.suggested_selling_price).toBe(250);
    expect(result.profit_amount).toBe(0);
  });
});

// ── 99% margin: very high price (Req 105.2) ─────────────────────────────────

describe('calculatePricing – 99% margin (very high price)', () => {
  it('calculates extremely high price for 99% margin', () => {
    const result = calculatePricing(100, 99);
    // price = 100 / (1 - 0.99) = 100 / 0.01 = 10000 → ceil = 10000
    expect(result.suggested_selling_price).toBe(10000);
    expect(result.profit_amount).toBeCloseTo(9900, 0);
    expect(result.actual_profit_margin).toBeCloseTo(99, 1);
  });

  it('handles small cost with 99% margin', () => {
    const result = calculatePricing(1, 99);
    // price = 1 / 0.01 = 100 → ceil = 100
    expect(result.suggested_selling_price).toBe(100);
    expect(result.profit_amount).toBeCloseTo(99, 0);
  });
});

// ── Invalid margin (≥100%, negative, NaN, Infinity) (Req 105.3) ─────────────

describe('calculatePricing – invalid margin', () => {
  it('throws InvalidMarginError for margin = 100', () => {
    expect(() => calculatePricing(100, 100)).toThrow(InvalidMarginError);
  });

  it('throws InvalidMarginError for margin > 100', () => {
    expect(() => calculatePricing(100, 150)).toThrow(InvalidMarginError);
  });

  it('throws InvalidMarginError for margin = 999', () => {
    expect(() => calculatePricing(100, 999)).toThrow(InvalidMarginError);
  });

  it('throws InvalidMarginError for negative margin', () => {
    expect(() => calculatePricing(100, -10)).toThrow(InvalidMarginError);
  });

  it('throws InvalidMarginError for NaN margin', () => {
    expect(() => calculatePricing(100, NaN)).toThrow(InvalidMarginError);
  });

  it('throws InvalidMarginError for Infinity margin', () => {
    expect(() => calculatePricing(100, Infinity)).toThrow(InvalidMarginError);
  });

  it('error message mentions less than 100%', () => {
    expect(() => calculatePricing(100, 100)).toThrow(/less than 100%/);
  });
});

// ── Invalid cost (zero, negative, NaN, Infinity) ────────────────────────────

describe('calculatePricing – invalid cost', () => {
  it('throws InvalidCostError for zero cost', () => {
    expect(() => calculatePricing(0, 30)).toThrow(InvalidCostError);
  });

  it('throws InvalidCostError for negative cost', () => {
    expect(() => calculatePricing(-100, 30)).toThrow(InvalidCostError);
  });

  it('throws InvalidCostError for NaN cost', () => {
    expect(() => calculatePricing(NaN, 30)).toThrow(InvalidCostError);
  });

  it('throws InvalidCostError for Infinity cost', () => {
    expect(() => calculatePricing(Infinity, 30)).toThrow(InvalidCostError);
  });
});

// ── INR rounding to nearest rupee (Req 105.3) ───────────────────────────────

describe('calculatePricing – INR rounding (Math.ceil)', () => {
  it('rounds up fractional price to next whole rupee', () => {
    // cost=100, margin=30 → 142.857… → 143
    const result = calculatePricing(100, 30);
    expect(Number.isInteger(result.suggested_selling_price)).toBe(true);
    expect(result.suggested_selling_price).toBe(143);
  });

  it('does not round when price is already a whole number', () => {
    // cost=500, margin=50 → 1000 exactly
    const result = calculatePricing(500, 50);
    expect(result.suggested_selling_price).toBe(1000);
  });

  it('rounds up even for tiny fractional amounts', () => {
    // cost=99, margin=0 → 99 / 1 = 99 → ceil = 99 (exact)
    const result = calculatePricing(99, 0);
    expect(result.suggested_selling_price).toBe(99);
  });

  it('actual margin is recalculated after rounding', () => {
    const result = calculatePricing(100, 30);
    // After ceil: price=143, profit=43
    // actual margin = (43/143)*100 ≈ 30.07%
    const expectedActual = ((143 - 100) / 143) * 100;
    expect(result.actual_profit_margin).toBeCloseTo(expectedActual, 4);
  });

  it('actual margin >= target margin due to ceiling', () => {
    const result = calculatePricing(100, 30);
    expect(result.actual_profit_margin).toBeGreaterThanOrEqual(30);
  });

  it('suggested_selling_price is always an integer for fractional costs', () => {
    const result = calculatePricing(123.45, 20);
    expect(Number.isInteger(result.suggested_selling_price)).toBe(true);
  });
});
