/**
 * Hydration Calculator for AiBake
 *
 * Computes baker's hydration percentage for dough-based recipes:
 *   hydration% = (total_liquid_grams / total_flour_grams) × 100
 *
 * Flour ingredients are those with category 'flour'.
 * Liquid ingredients are those with category 'liquid' or 'dairy'.
 *
 * Returns null for non-dough recipes (zero flour weight).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Ingredient categories that count as flour */
const FLOUR_CATEGORIES: ReadonlySet<string> = new Set(['flour']);

/** Ingredient categories that count as liquid */
const LIQUID_CATEGORIES: ReadonlySet<string> = new Set(['liquid', 'dairy']);

/** Minimal ingredient representation needed for hydration calculation */
export interface HydrationIngredient {
  id: string;
  display_name: string;
  /** Weight in grams (canonical) */
  quantity_grams: number;
  /** Ingredient category used to classify flour vs liquid */
  category: string;
}

/** Result of a hydration percentage calculation */
export interface HydrationResult {
  /** Hydration percentage, or null if no flour is present */
  hydration_percentage: number | null;
  /** Total weight of flour-category ingredients in grams */
  total_flour_grams: number;
  /** Total weight of liquid-category ingredients in grams */
  total_liquid_grams: number;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class NoIngredientsError extends Error {
  constructor() {
    super('At least one ingredient is required for hydration calculation.');
    this.name = 'NoIngredientsError';
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Calculate the baker's hydration percentage for a recipe.
 *
 * hydration% = (total_liquid_grams / total_flour_grams) × 100
 *
 * - Flour: ingredients with category 'flour'
 * - Liquid: ingredients with category 'liquid' or 'dairy'
 *
 * Returns `hydration_percentage: null` when total flour is zero
 * (non-dough recipe).
 *
 * @param ingredients - Array of ingredients with category and weight
 * @returns Hydration result with percentage and weight breakdowns
 *
 * @throws {NoIngredientsError} if the ingredients array is empty
 */
export function calculateHydrationPercentage(
  ingredients: HydrationIngredient[],
): HydrationResult {
  if (!ingredients || ingredients.length === 0) {
    throw new NoIngredientsError();
  }

  let totalFlourGrams = 0;
  let totalLiquidGrams = 0;

  for (const ing of ingredients) {
    const cat = ing.category.toLowerCase();

    if (FLOUR_CATEGORIES.has(cat)) {
      totalFlourGrams += ing.quantity_grams;
    } else if (LIQUID_CATEGORIES.has(cat)) {
      totalLiquidGrams += ing.quantity_grams;
    }
  }

  const hydrationPercentage =
    totalFlourGrams > 0
      ? (totalLiquidGrams / totalFlourGrams) * 100
      : null;

  return {
    hydration_percentage: hydrationPercentage,
    total_flour_grams: totalFlourGrams,
    total_liquid_grams: totalLiquidGrams,
  };
}
