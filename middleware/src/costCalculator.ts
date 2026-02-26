/**
 * Cost Calculator for AiBake
 *
 * Calculates recipe costs by summing ingredient costs (quantity × cost_per_unit)
 * and adding overhead, packaging, and labor costs. Returns a full breakdown
 * with per-serving and per-100g cost figures.
 *
 * All ingredient quantities are expected in canonical grams. When the inventory
 * item uses a different unit, the unit converter is used to bridge the gap.
 */

import { convertFromGrams, isSupportedUnit, type IngredientDensity } from './unitConverter';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Ingredient data needed for cost calculation */
export interface CostIngredient {
  id: string;
  display_name: string;
  ingredient_master_id: string;
  /** Weight in grams (canonical) */
  quantity_grams: number;
}

/** Inventory record for an ingredient */
export interface InventoryItem {
  ingredient_master_id: string;
  /** Cost per `unit` of the ingredient */
  cost_per_unit: number;
  /** Unit the cost is expressed in (e.g. 'kg', 'g', 'lb') */
  unit: string;
  currency: string;
}

/** Per-ingredient cost detail in the result breakdown */
export interface IngredientCostBreakdown {
  ingredient_name: string;
  quantity_grams: number;
  cost_per_unit: number;
  unit: string;
  total_cost: number;
}

/** Full cost calculation result */
export interface CostResult {
  ingredient_cost: number;
  overhead_cost: number;
  packaging_cost: number;
  labor_cost: number;
  total_cost: number;
  cost_per_serving: number;
  cost_per_100g: number;
  currency: string;
  breakdown: IngredientCostBreakdown[];
}


// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class MissingInventoryDataError extends Error {
  constructor(ingredientName: string) {
    super(
      `Inventory data not found for "${ingredientName}". Please add this ingredient to your inventory with cost information.`,
    );
    this.name = 'MissingInventoryDataError';
  }
}

export class InvalidRecipeDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidRecipeDataError';
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Convert grams to the inventory item's unit so we can multiply by
 * cost_per_unit. Falls back to treating the unit as grams when it is
 * not a recognised convertible unit (e.g. "piece", "each").
 */
function gramsToInventoryUnit(
  quantityGrams: number,
  inventoryUnit: string,
  density: IngredientDensity,
): number {
  if (!isSupportedUnit(inventoryUnit)) {
    // Non-convertible unit (e.g. "piece") – assume 1:1 with grams as a
    // safe fallback; callers should ensure inventory uses convertible units.
    return quantityGrams;
  }
  return convertFromGrams(density, quantityGrams, inventoryUnit);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Calculate the full cost of a recipe.
 *
 * For each ingredient the function:
 *   1. Looks up the matching inventory item via `inventoryLookup`.
 *   2. Converts the ingredient's canonical grams to the inventory unit.
 *   3. Multiplies by cost_per_unit to get the ingredient's cost.
 *
 * Overhead, packaging, and labor costs are added on top.
 *
 * @param ingredients      - Recipe ingredients with quantities in grams
 * @param servings         - Number of servings the recipe yields
 * @param yieldWeightGrams - Total yield weight in grams
 * @param inventoryLookup  - Map from ingredient_master_id → InventoryItem
 * @param densityLookup    - Map from ingredient_master_id → IngredientDensity
 * @param overheadCost     - Fixed overhead cost (default 0)
 * @param packagingCost    - Packaging cost (default 0)
 * @param laborCost        - Labor cost (default 0)
 * @param currency         - Currency code (default 'INR')
 *
 * @throws {InvalidRecipeDataError}    if inputs are invalid
 * @throws {MissingInventoryDataError} if an ingredient has no inventory entry
 */
export function calculateRecipeCost(
  ingredients: CostIngredient[],
  servings: number,
  yieldWeightGrams: number,
  inventoryLookup: Map<string, InventoryItem>,
  densityLookup: Map<string, IngredientDensity>,
  overheadCost = 0,
  packagingCost = 0,
  laborCost = 0,
  currency = 'INR',
): CostResult {
  if (!ingredients || ingredients.length === 0) {
    throw new InvalidRecipeDataError('At least one ingredient is required for cost calculation.');
  }
  if (servings <= 0) {
    throw new InvalidRecipeDataError('Servings must be a positive number.');
  }
  if (yieldWeightGrams <= 0) {
    throw new InvalidRecipeDataError('Yield weight must be a positive number.');
  }

  let ingredientCost = 0;
  const breakdown: IngredientCostBreakdown[] = [];

  for (const ing of ingredients) {
    const inventory = inventoryLookup.get(ing.ingredient_master_id);
    if (!inventory) {
      throw new MissingInventoryDataError(ing.display_name);
    }

    // Build a minimal density object for unit conversion
    const density = densityLookup.get(ing.ingredient_master_id) ?? {
      id: ing.ingredient_master_id,
      name: ing.display_name,
      default_density_g_per_ml: null,
    };

    const quantityInUnit = gramsToInventoryUnit(
      ing.quantity_grams,
      inventory.unit,
      density,
    );

    const itemCost = quantityInUnit * inventory.cost_per_unit;
    ingredientCost += itemCost;

    breakdown.push({
      ingredient_name: ing.display_name,
      quantity_grams: ing.quantity_grams,
      cost_per_unit: inventory.cost_per_unit,
      unit: inventory.unit,
      total_cost: itemCost,
    });
  }

  const totalCost = ingredientCost + overheadCost + packagingCost + laborCost;
  const costPerServing = totalCost / servings;
  const costPer100g = (totalCost / yieldWeightGrams) * 100;

  return {
    ingredient_cost: ingredientCost,
    overhead_cost: overheadCost,
    packaging_cost: packagingCost,
    labor_cost: laborCost,
    total_cost: totalCost,
    cost_per_serving: costPerServing,
    cost_per_100g: costPer100g,
    currency,
    breakdown,
  };
}
