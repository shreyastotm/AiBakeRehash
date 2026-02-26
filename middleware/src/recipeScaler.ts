/**
 * Recipe Scaling System for AiBake
 *
 * Scales recipe ingredient quantities proportionally by target yield (grams)
 * or target servings. All ingredient ratios are preserved during scaling.
 *
 * Warnings are generated when the scaling factor exceeds safe limits
 * (>3× or <0.25×) or when individual ingredient quantities become
 * impractically small.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Minimal ingredient representation needed for scaling */
export interface ScalableIngredient {
  id: string;
  display_name: string;
  quantity_original: number;
  unit_original: string;
  quantity_grams: number;
  position: number;
  /** Optional category used for small-quantity warnings */
  category?: string;
}

/** Minimal recipe representation needed for scaling */
export interface ScalableRecipe {
  id: string;
  title: string;
  servings: number;
  yield_weight_grams: number;
  ingredients: ScalableIngredient[];
}

/** A scaled ingredient with the applied factor */
export interface ScaledIngredient extends ScalableIngredient {
  scaling_factor: number;
}

/** Result of a scaling operation */
export interface ScaledRecipeResult {
  recipe: {
    id: string;
    title: string;
    servings: number;
    yield_weight_grams: number;
    original_yield_grams: number;
    original_servings: number;
    scaling_factor: number;
    ingredients: ScaledIngredient[];
  };
  scaling_factor: number;
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class InvalidScalingTargetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidScalingTargetError';
  }
}

export class InvalidRecipeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidRecipeError';
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Scaling factor above which a warning is emitted */
const HIGH_SCALE_THRESHOLD = 3.0;

/** Scaling factor below which a warning is emitted */
const LOW_SCALE_THRESHOLD = 0.25;

/** Minimum practical ingredient weight in grams (except spices) */
const MIN_PRACTICAL_GRAMS = 1.0;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function validateRecipe(recipe: ScalableRecipe): void {
  if (!recipe.ingredients || recipe.ingredients.length === 0) {
    throw new InvalidRecipeError('Recipe must have at least one ingredient.');
  }
  if (recipe.yield_weight_grams <= 0) {
    throw new InvalidRecipeError('Recipe yield_weight_grams must be positive.');
  }
  if (recipe.servings <= 0) {
    throw new InvalidRecipeError('Recipe servings must be positive.');
  }
}

function collectWarnings(
  scalingFactor: number,
  scaledIngredients: ScaledIngredient[],
): string[] {
  const warnings: string[] = [];

  if (scalingFactor > HIGH_SCALE_THRESHOLD) {
    warnings.push(
      `Scaling factor ${scalingFactor.toFixed(2)}× exceeds ${HIGH_SCALE_THRESHOLD}×. Baking time and temperature may need adjustment.`,
    );
  }

  if (scalingFactor < LOW_SCALE_THRESHOLD) {
    warnings.push(
      `Scaling factor ${scalingFactor.toFixed(2)}× is below ${LOW_SCALE_THRESHOLD}×. Small quantities may be impractical to measure.`,
    );
  }

  for (const ing of scaledIngredients) {
    if (ing.quantity_grams < MIN_PRACTICAL_GRAMS && ing.category !== 'spice') {
      warnings.push(
        `"${ing.display_name}" quantity is very small (${ing.quantity_grams.toFixed(2)}g). Consider measuring by volume or adjusting the recipe.`,
      );
    }
  }

  return warnings;
}

function scaleIngredients(
  ingredients: ScalableIngredient[],
  factor: number,
): ScaledIngredient[] {
  return ingredients.map((ing) => ({
    ...ing,
    quantity_grams: ing.quantity_grams * factor,
    quantity_original: ing.quantity_original * factor,
    scaling_factor: factor,
  }));
}

function buildResult(
  recipe: ScalableRecipe,
  factor: number,
  targetYieldGrams: number,
  targetServings: number,
  scaledIngredients: ScaledIngredient[],
): ScaledRecipeResult {
  const warnings = collectWarnings(factor, scaledIngredients);

  return {
    recipe: {
      id: recipe.id,
      title: recipe.title,
      servings: targetServings,
      yield_weight_grams: targetYieldGrams,
      original_yield_grams: recipe.yield_weight_grams,
      original_servings: recipe.servings,
      scaling_factor: factor,
      ingredients: scaledIngredients,
    },
    scaling_factor: factor,
    warnings,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Scale a recipe to a target yield in grams.
 *
 * scaling_factor = targetYieldGrams / recipe.yield_weight_grams
 *
 * @throws {InvalidRecipeError}         if recipe data is invalid
 * @throws {InvalidScalingTargetError}  if targetYieldGrams is not positive
 */
export function scaleByYield(
  recipe: ScalableRecipe,
  targetYieldGrams: number,
): ScaledRecipeResult {
  validateRecipe(recipe);

  if (targetYieldGrams <= 0) {
    throw new InvalidScalingTargetError('Target yield must be a positive number of grams.');
  }

  const factor = targetYieldGrams / recipe.yield_weight_grams;
  const targetServings = recipe.servings * factor;
  const scaledIngredients = scaleIngredients(recipe.ingredients, factor);

  return buildResult(recipe, factor, targetYieldGrams, targetServings, scaledIngredients);
}

/**
 * Scale a recipe to a target number of servings.
 *
 * scaling_factor = targetServings / recipe.servings
 *
 * @throws {InvalidRecipeError}         if recipe data is invalid
 * @throws {InvalidScalingTargetError}  if targetServings is not positive
 */
export function scaleByServings(
  recipe: ScalableRecipe,
  targetServings: number,
): ScaledRecipeResult {
  validateRecipe(recipe);

  if (targetServings <= 0) {
    throw new InvalidScalingTargetError('Target servings must be a positive number.');
  }

  const factor = targetServings / recipe.servings;
  const targetYieldGrams = recipe.yield_weight_grams * factor;
  const scaledIngredients = scaleIngredients(recipe.ingredients, factor);

  return buildResult(recipe, factor, targetYieldGrams, targetServings, scaledIngredients);
}

/**
 * Scale a recipe by an explicit scaling factor.
 *
 * Convenience function when the caller already knows the desired factor.
 *
 * @throws {InvalidRecipeError}         if recipe data is invalid
 * @throws {InvalidScalingTargetError}  if scalingFactor is not positive
 */
export function scaleByFactor(
  recipe: ScalableRecipe,
  scalingFactor: number,
): ScaledRecipeResult {
  validateRecipe(recipe);

  if (scalingFactor <= 0) {
    throw new InvalidScalingTargetError('Scaling factor must be a positive number.');
  }

  const targetYieldGrams = recipe.yield_weight_grams * scalingFactor;
  const targetServings = recipe.servings * scalingFactor;
  const scaledIngredients = scaleIngredients(recipe.ingredients, scalingFactor);

  return buildResult(recipe, scalingFactor, targetYieldGrams, targetServings, scaledIngredients);
}
