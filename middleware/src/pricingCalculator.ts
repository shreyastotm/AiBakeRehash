/**
 * Pricing Calculator for AiBake
 *
 * Determines suggested selling price based on total recipe cost and a target
 * profit margin. Uses the standard margin formula:
 *
 *   price = cost / (1 − margin/100)
 *
 * Prices are rounded up to the nearest rupee for INR currency. The actual
 * profit margin is recalculated after rounding so callers always know the
 * real margin they will achieve.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Result returned by {@link calculatePricing}. */
export interface PricingResult {
  /** The total cost that was passed in. */
  total_cost: number;
  /** Selling price rounded up to the nearest rupee. */
  suggested_selling_price: number;
  /** Profit amount after rounding (price − cost). */
  profit_amount: number;
  /** The margin percentage the caller requested. */
  target_profit_margin: number;
  /** The margin percentage actually achieved after rounding. */
  actual_profit_margin: number;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class InvalidMarginError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidMarginError';
  }
}

export class InvalidCostError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidCostError';
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Calculate a suggested selling price for a recipe.
 *
 * @param totalCost                 - Total recipe cost (must be > 0)
 * @param targetProfitMarginPercent - Desired profit margin as a percentage
 *                                    (e.g. 30 for 30%). Must be ≥ 0 and < 100.
 * @returns A {@link PricingResult} with the suggested price and margins.
 *
 * @throws {InvalidCostError}   if totalCost is not a positive number
 * @throws {InvalidMarginError} if margin is negative or ≥ 100
 */
export function calculatePricing(
  totalCost: number,
  targetProfitMarginPercent: number,
): PricingResult {
  // --- Validate inputs ---
  if (totalCost <= 0 || !Number.isFinite(totalCost)) {
    throw new InvalidCostError('Total cost must be a positive number.');
  }

  if (!Number.isFinite(targetProfitMarginPercent) || targetProfitMarginPercent < 0) {
    throw new InvalidMarginError('Profit margin must be a non-negative number.');
  }

  if (targetProfitMarginPercent >= 100) {
    throw new InvalidMarginError('Profit margin must be less than 100%.');
  }

  // --- Core formula: price = cost / (1 − margin/100) ---
  const marginDecimal = targetProfitMarginPercent / 100;
  const rawPrice = totalCost / (1 - marginDecimal);

  // Round up to nearest rupee for INR
  const suggestedPrice = Math.ceil(rawPrice);

  // Recalculate profit and actual margin after rounding
  const profitAmount = suggestedPrice - totalCost;
  const actualMargin = (profitAmount / suggestedPrice) * 100;

  return {
    total_cost: totalCost,
    suggested_selling_price: suggestedPrice,
    profit_amount: profitAmount,
    target_profit_margin: targetProfitMarginPercent,
    actual_profit_margin: actualMargin,
  };
}
