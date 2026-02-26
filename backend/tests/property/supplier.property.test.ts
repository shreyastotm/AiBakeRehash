import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  calculateDeliveryCharge,
  calculateBulkPrice,
  type BulkPricingTier,
} from '../../src/services/supplier.service';

// ---------------------------------------------------------------------------
// Property 26: Delivery Charge Calculation
// **Validates: Requirements 116.4**
//
// For any order value and delivery zone, the delivery charge should be
// calculated according to the zone's pricing rules (base charge, per-km
// charge, free delivery threshold), with charges waived if order value
// exceeds the free delivery threshold.
// ---------------------------------------------------------------------------

describe('Property 26: Delivery Charge Calculation', () => {
  it('delivery charge is zero when order value >= free delivery threshold', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.01, max: 10000, noNaN: true }),   // base_charge
        fc.double({ min: 0, max: 100, noNaN: true }),         // per_km_charge
        fc.double({ min: 1, max: 10000, noNaN: true }),       // free_delivery_threshold
        fc.double({ min: 0, max: 100, noNaN: true }),         // distance_km
        (baseCharge, perKmCharge, threshold, distanceKm) => {
          // Order value at or above threshold
          const orderValue = threshold + Math.random() * 1000;

          const charge = calculateDeliveryCharge(orderValue, distanceKm, {
            base_charge: baseCharge,
            per_km_charge: perKmCharge,
            free_delivery_threshold: threshold,
          });

          expect(charge).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('delivery charge = base_charge + per_km_charge * distance when below threshold', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.01, max: 1000, noNaN: true }),    // base_charge
        fc.double({ min: 0.01, max: 100, noNaN: true }),     // per_km_charge
        fc.double({ min: 100, max: 50000, noNaN: true }),    // free_delivery_threshold
        fc.double({ min: 0.1, max: 100, noNaN: true }),      // distance_km
        (baseCharge, perKmCharge, threshold, distanceKm) => {
          // Order value below threshold
          const orderValue = threshold * 0.5;

          const charge = calculateDeliveryCharge(orderValue, distanceKm, {
            base_charge: baseCharge,
            per_km_charge: perKmCharge,
            free_delivery_threshold: threshold,
          });

          const expected = Math.round((baseCharge + perKmCharge * distanceKm) * 100) / 100;
          expect(charge).toBeCloseTo(expected, 2);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('delivery charge = base_charge when per_km_charge is null', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.01, max: 1000, noNaN: true }),    // base_charge
        fc.double({ min: 0.01, max: 500, noNaN: true }),     // order_value
        fc.double({ min: 0, max: 100, noNaN: true }),        // distance_km
        (baseCharge, orderValue, distanceKm) => {
          const charge = calculateDeliveryCharge(orderValue, distanceKm, {
            base_charge: baseCharge,
            per_km_charge: null,
            free_delivery_threshold: null,
          });

          expect(charge).toBeCloseTo(baseCharge, 2);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('delivery charge is always non-negative', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 10000, noNaN: true }),      // order_value
        fc.double({ min: 0, max: 100, noNaN: true }),        // distance_km
        fc.double({ min: 0, max: 1000, noNaN: true }),       // base_charge
        fc.double({ min: 0, max: 100, noNaN: true }),        // per_km_charge
        fc.option(fc.double({ min: 0, max: 50000, noNaN: true }), { nil: null }), // threshold
        (orderValue, distanceKm, baseCharge, perKmCharge, threshold) => {
          const charge = calculateDeliveryCharge(orderValue, distanceKm, {
            base_charge: baseCharge,
            per_km_charge: perKmCharge,
            free_delivery_threshold: threshold ?? null,
          });

          expect(charge).toBeGreaterThanOrEqual(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 27: Bulk Pricing Discount
// **Validates: Requirements 117.2**
//
// For any product with bulk pricing tiers and order quantity, the price
// should be calculated using the appropriate tier (highest quantity tier
// that doesn't exceed the order quantity), and the discount should be
// correctly applied.
// ---------------------------------------------------------------------------

describe('Property 27: Bulk Pricing Discount', () => {
  // Generator for sorted, non-overlapping pricing tiers
  const tiersArb = fc
    .array(
      fc.record({
        min_quantity: fc.integer({ min: 1, max: 1000 }),
        price_per_unit: fc.double({ min: 1, max: 1000, noNaN: true }),
      }),
      { minLength: 2, maxLength: 5 },
    )
    .map((tiers) => {
      // Deduplicate min_quantity and sort ascending
      const seen = new Set<number>();
      const unique = tiers.filter((t) => {
        if (seen.has(t.min_quantity)) return false;
        seen.add(t.min_quantity);
        return true;
      });
      unique.sort((a, b) => a.min_quantity - b.min_quantity);

      // Ensure prices decrease as quantity increases (bulk discount)
      let maxPrice = 1000;
      for (const tier of unique) {
        tier.price_per_unit = Math.min(tier.price_per_unit, maxPrice);
        maxPrice = tier.price_per_unit;
      }

      return unique;
    })
    .filter((tiers) => tiers.length >= 2);

  it('correct tier is applied based on order quantity', () => {
    fc.assert(
      fc.property(
        tiersArb,
        fc.integer({ min: 1, max: 2000 }),
        (tiers, quantity) => {
          const result = calculateBulkPrice(quantity, tiers);

          // Find the expected tier: highest min_quantity <= quantity
          const sorted = [...tiers].sort((a, b) => b.min_quantity - a.min_quantity);
          const expectedTier = sorted.find((t) => quantity >= t.min_quantity);

          if (expectedTier) {
            expect(result.price_per_unit).toBe(expectedTier.price_per_unit);
            expect(result.tier_applied.min_quantity).toBe(expectedTier.min_quantity);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('total_price = price_per_unit * quantity', () => {
    fc.assert(
      fc.property(
        tiersArb,
        fc.integer({ min: 1, max: 2000 }),
        (tiers, quantity) => {
          const result = calculateBulkPrice(quantity, tiers);
          const expected = Math.round(result.price_per_unit * quantity * 100) / 100;
          expect(result.total_price).toBeCloseTo(expected, 2);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('higher quantity gets equal or lower price per unit (bulk discount)', () => {
    fc.assert(
      fc.property(
        tiersArb,
        fc.integer({ min: 1, max: 1000 }),
        fc.integer({ min: 1, max: 1000 }),
        (tiers, qty1, qty2) => {
          const smallQty = Math.min(qty1, qty2);
          const largeQty = Math.max(qty1, qty2);

          const resultSmall = calculateBulkPrice(smallQty, tiers);
          const resultLarge = calculateBulkPrice(largeQty, tiers);

          // Larger quantity should get equal or lower price per unit
          expect(resultLarge.price_per_unit).toBeLessThanOrEqual(
            resultSmall.price_per_unit + 0.01,
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it('price per unit is always positive', () => {
    fc.assert(
      fc.property(
        tiersArb,
        fc.integer({ min: 1, max: 2000 }),
        (tiers, quantity) => {
          const result = calculateBulkPrice(quantity, tiers);
          expect(result.price_per_unit).toBeGreaterThan(0);
          expect(result.total_price).toBeGreaterThan(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});
