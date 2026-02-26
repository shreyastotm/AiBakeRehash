/**
 * Nutrition Calculator for AiBake
 *
 * Aggregates ingredient nutrition data weighted by quantity to produce
 * total, per-100g, and per-serving nutrition breakdowns.
 *
 * Ingredients without nutrition data are gracefully skipped.
 * All calculations use canonical grams (quantity_grams).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Nutrition values per 100g of an ingredient */
export interface NutritionPer100g {
  energy_kcal: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  fiber_g?: number;
}

/** Ingredient with nutrition data needed for calculation */
export interface NutritionIngredient {
  id: string;
  display_name: string;
  /** Weight in grams (canonical) */
  quantity_grams: number;
  /** Nutrition per 100g — null/undefined when data is unavailable */
  nutrition_per_100g: NutritionPer100g | null | undefined;
}

/** Absolute nutrition totals for the entire recipe */
export interface NutritionTotals {
  energy_kcal: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  fiber_g: number;
}

/** Full nutrition calculation result */
export interface NutritionResult {
  /** Absolute totals across all ingredients */
  total: NutritionTotals;
  /** Nutrition normalised to 100g of total recipe weight */
  per_100g: NutritionTotals;
  /** Nutrition per single serving */
  per_serving: NutritionTotals;
  /** Total weight of ingredients that had nutrition data */
  total_weight_grams: number;
  /** Number of ingredients skipped due to missing data */
  skipped_count: number;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class NoIngredientsError extends Error {
  constructor() {
    super('At least one ingredient is required for nutrition calculation.');
    this.name = 'NoIngredientsError';
  }
}

export class InvalidServingsError extends Error {
  constructor() {
    super('Servings must be a positive number.');
    this.name = 'InvalidServingsError';
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function emptyTotals(): NutritionTotals {
  return { energy_kcal: 0, protein_g: 0, fat_g: 0, carbs_g: 0, fiber_g: 0 };
}

function scaleTotals(totals: NutritionTotals, factor: number): NutritionTotals {
  return {
    energy_kcal: totals.energy_kcal * factor,
    protein_g: totals.protein_g * factor,
    fat_g: totals.fat_g * factor,
    carbs_g: totals.carbs_g * factor,
    fiber_g: totals.fiber_g * factor,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Calculate total, per-100g, and per-serving nutrition for a list of
 * ingredients.
 *
 * Each ingredient's contribution is weighted by its `quantity_grams`:
 *   contribution = (nutrition_per_100g value) × (quantity_grams / 100)
 *
 * Ingredients whose `nutrition_per_100g` is null/undefined are silently
 * skipped — their weight is excluded from the per-100g denominator so
 * the normalised values remain accurate for the ingredients that *do*
 * have data.
 *
 * @param ingredients - Array of ingredients with optional nutrition data
 * @param servings    - Number of servings (must be > 0)
 * @returns Full nutrition breakdown
 *
 * @throws {NoIngredientsError}   if the ingredients array is empty
 * @throws {InvalidServingsError} if servings is not positive
 */
export function calculateNutrition(
  ingredients: NutritionIngredient[],
  servings: number,
): NutritionResult {
  if (!ingredients || ingredients.length === 0) {
    throw new NoIngredientsError();
  }
  if (servings <= 0) {
    throw new InvalidServingsError();
  }

  const total = emptyTotals();
  let totalWeightGrams = 0;
  let skippedCount = 0;

  for (const ing of ingredients) {
    const nutr = ing.nutrition_per_100g;

    if (nutr == null) {
      skippedCount++;
      continue;
    }

    const weightFactor = ing.quantity_grams / 100;

    total.energy_kcal += nutr.energy_kcal * weightFactor;
    total.protein_g += nutr.protein_g * weightFactor;
    total.fat_g += nutr.fat_g * weightFactor;
    total.carbs_g += nutr.carbs_g * weightFactor;
    total.fiber_g += (nutr.fiber_g ?? 0) * weightFactor;

    totalWeightGrams += ing.quantity_grams;
  }

  // Per-100g: normalise to 100g of total weight (only ingredients with data)
  const per100g =
    totalWeightGrams > 0
      ? scaleTotals(total, 100 / totalWeightGrams)
      : emptyTotals();

  // Per-serving
  const perServing = scaleTotals(total, 1 / servings);

  return {
    total,
    per_100g: per100g,
    per_serving: perServing,
    total_weight_grams: totalWeightGrams,
    skipped_count: skippedCount,
  };
}
