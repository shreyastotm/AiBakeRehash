import { db } from '../config/database';
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from '../middleware/errorHandler';
import {
  RecipeCost,
  CostCalculationResult,
  CalculateCostInput,
  PricingResult,
  ProfitMarginReportItem,
  CostTrendItem,
  CostTrendQuery,
} from '../models/cost.model';

// @ts-ignore TS6059 - cross-package import
import { calculateRecipeCost, type CostIngredient, type InventoryItem as MwInventoryItem, MissingInventoryDataError } from '../../../middleware/src/costCalculator';
// @ts-ignore TS6059 - cross-package import
import { calculatePricing as mwCalculatePricing } from '../../../middleware/src/pricingCalculator';
// @ts-ignore TS6059 - cross-package import
import { type IngredientDensity } from '../../../middleware/src/unitConverter';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function assertRecipeOwnership(
  recipeId: string,
  userId: string,
  queryFn: (text: string, params: unknown[]) => Promise<{ rows: any[] }>,
): Promise<{ id: string; user_id: string; title: string; servings: number; yield_weight_grams: number }> {
  const result = await queryFn(
    'SELECT id, user_id, title, servings, yield_weight_grams FROM recipes WHERE id = $1',
    [recipeId],
  );

  if (!result.rows[0]) {
    throw new NotFoundError('Recipe');
  }
  if (result.rows[0].user_id !== userId) {
    throw new ForbiddenError('You do not own this recipe');
  }

  return result.rows[0];
}

// ---------------------------------------------------------------------------
// Calculate cost
// ---------------------------------------------------------------------------

export async function calculateCost(
  userId: string,
  recipeId: string,
  input: CalculateCostInput,
): Promise<CostCalculationResult> {
  return db.withTransaction(async (client) => {
    const queryFn = (text: string, params: unknown[]) => client.query(text, params);

    const recipe = await assertRecipeOwnership(recipeId, userId, queryFn);

    // Get recipe ingredients
    const ingredientsResult = await client.query(
      `SELECT id, display_name, ingredient_master_id, quantity_grams
       FROM recipe_ingredients WHERE recipe_id = $1 ORDER BY position`,
      [recipeId],
    );

    if (ingredientsResult.rows.length === 0) {
      throw new ValidationError('Recipe has no ingredients');
    }

    const ingredients: CostIngredient[] = ingredientsResult.rows.map((row: any) => ({
      id: row.id,
      display_name: row.display_name,
      ingredient_master_id: row.ingredient_master_id,
      quantity_grams: Number(row.quantity_grams),
    }));

    // Build inventory lookup
    const inventoryResult = await client.query(
      `SELECT ingredient_master_id, cost_per_unit, unit, currency
       FROM inventory_items WHERE user_id = $1`,
      [userId],
    );

    const inventoryLookup = new Map<string, MwInventoryItem>();
    for (const row of inventoryResult.rows) {
      if (row.cost_per_unit != null) {
        inventoryLookup.set(row.ingredient_master_id, {
          ingredient_master_id: row.ingredient_master_id,
          cost_per_unit: Number(row.cost_per_unit),
          unit: row.unit,
          currency: row.currency,
        });
      }
    }

    // Build density lookup
    const densityResult = await client.query(
      'SELECT id, name, default_density_g_per_ml FROM ingredient_master',
    );

    const densityLookup = new Map<string, IngredientDensity>();
    for (const row of densityResult.rows) {
      densityLookup.set(row.id, {
        id: row.id,
        name: row.name,
        default_density_g_per_ml: row.default_density_g_per_ml != null
          ? Number(row.default_density_g_per_ml)
          : null,
      });
    }

    const overheadCost = input.overhead_cost ?? 0;
    const packagingCost = input.packaging_cost ?? 0;
    const laborCost = input.labor_cost ?? 0;
    const currency = input.currency || 'INR';

    // Call middleware calculator
    let costResult;
    try {
      costResult = calculateRecipeCost(
        ingredients,
        Number(recipe.servings),
        Number(recipe.yield_weight_grams),
        inventoryLookup,
        densityLookup,
        overheadCost,
        packagingCost,
        laborCost,
        currency,
      );
    } catch (err) {
      if (err instanceof MissingInventoryDataError) {
        throw new ValidationError(err.message);
      }
      throw err;
    }

    // Store in recipe_costs table
    const insertResult = await client.query(
      `INSERT INTO recipe_costs
        (recipe_id, ingredient_cost, overhead_cost, packaging_cost, labor_cost, total_cost, currency)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        recipeId,
        costResult.ingredient_cost,
        costResult.overhead_cost,
        costResult.packaging_cost,
        costResult.labor_cost,
        costResult.total_cost,
        currency,
      ],
    );

    const stored = insertResult.rows[0];

    return {
      id: stored.id,
      recipe_id: stored.recipe_id,
      user_id: userId,
      ingredient_cost: Number(stored.ingredient_cost),
      overhead_cost: Number(stored.overhead_cost),
      packaging_cost: Number(stored.packaging_cost),
      labor_cost: Number(stored.labor_cost),
      total_cost: Number(stored.total_cost),
      currency: stored.currency,
      calculated_at: stored.calculated_at,
      cost_per_serving: costResult.cost_per_serving,
      cost_per_100g: costResult.cost_per_100g,
      breakdown: costResult.breakdown,
    };
  });
}

// ---------------------------------------------------------------------------
// Get current cost
// ---------------------------------------------------------------------------

export async function getCurrentCost(
  userId: string,
  recipeId: string,
): Promise<RecipeCost> {
  const queryFn = (text: string, params: unknown[]) => db.query(text, params);
  await assertRecipeOwnership(recipeId, userId, queryFn);

  const result = await db.query(
    `SELECT * FROM recipe_costs
     WHERE recipe_id = $1
     ORDER BY calculated_at DESC
     LIMIT 1`,
    [recipeId],
  );

  if (!result.rows[0]) {
    throw new NotFoundError('Cost record for this recipe');
  }

  const row = result.rows[0];
  return {
    id: row.id,
    recipe_id: row.recipe_id,
    user_id: userId,
    ingredient_cost: Number(row.ingredient_cost),
    overhead_cost: Number(row.overhead_cost),
    packaging_cost: Number(row.packaging_cost),
    labor_cost: Number(row.labor_cost),
    total_cost: Number(row.total_cost),
    currency: row.currency,
    calculated_at: row.calculated_at,
  };
}

// ---------------------------------------------------------------------------
// Get cost history
// ---------------------------------------------------------------------------

export async function getCostHistory(
  userId: string,
  recipeId: string,
): Promise<RecipeCost[]> {
  const queryFn = (text: string, params: unknown[]) => db.query(text, params);
  await assertRecipeOwnership(recipeId, userId, queryFn);

  const result = await db.query(
    `SELECT * FROM recipe_costs
     WHERE recipe_id = $1
     ORDER BY calculated_at DESC`,
    [recipeId],
  );

  return result.rows.map((row: any) => ({
    id: row.id,
    recipe_id: row.recipe_id,
    user_id: userId,
    ingredient_cost: Number(row.ingredient_cost),
    overhead_cost: Number(row.overhead_cost),
    packaging_cost: Number(row.packaging_cost),
    labor_cost: Number(row.labor_cost),
    total_cost: Number(row.total_cost),
    currency: row.currency,
    calculated_at: row.calculated_at,
  }));
}

// ---------------------------------------------------------------------------
// Calculate pricing
// ---------------------------------------------------------------------------

export async function calculatePricingForRecipe(
  userId: string,
  recipeId: string,
  targetMarginPercent: number,
  customSellingPrice?: number,
): Promise<PricingResult> {
  const currentCost = await getCurrentCost(userId, recipeId);

  if (customSellingPrice != null && customSellingPrice > 0) {
    // Calculate actual margin from custom price
    const profitAmount = customSellingPrice - currentCost.total_cost;
    const actualMargin = (profitAmount / customSellingPrice) * 100;

    return {
      recipe_id: recipeId,
      total_cost: currentCost.total_cost,
      suggested_selling_price: customSellingPrice,
      profit_amount: profitAmount,
      target_profit_margin: targetMarginPercent,
      actual_profit_margin: actualMargin,
      currency: currentCost.currency,
    };
  }

  const pricingResult = mwCalculatePricing(currentCost.total_cost, targetMarginPercent);

  return {
    recipe_id: recipeId,
    total_cost: pricingResult.total_cost,
    suggested_selling_price: pricingResult.suggested_selling_price,
    profit_amount: pricingResult.profit_amount,
    target_profit_margin: pricingResult.target_profit_margin,
    actual_profit_margin: pricingResult.actual_profit_margin,
    currency: currentCost.currency,
  };
}

// ---------------------------------------------------------------------------
// Profit margin report
// ---------------------------------------------------------------------------

export async function getProfitMarginReport(
  userId: string,
): Promise<ProfitMarginReportItem[]> {
  const result = await db.query(
    `SELECT DISTINCT ON (rc.recipe_id)
       rc.recipe_id, r.title AS recipe_title,
       rc.total_cost, rc.currency, rc.calculated_at
     FROM recipe_costs rc
     JOIN recipes r ON r.id = rc.recipe_id
     WHERE r.user_id = $1
     ORDER BY rc.recipe_id, rc.calculated_at DESC`,
    [userId],
  );

  return result.rows.map((row: any) => ({
    recipe_id: row.recipe_id,
    recipe_title: row.recipe_title,
    total_cost: Number(row.total_cost),
    currency: row.currency,
    calculated_at: row.calculated_at,
  }));
}

// ---------------------------------------------------------------------------
// Cost trend report
// ---------------------------------------------------------------------------

export async function getCostTrendReport(
  userId: string,
  query: CostTrendQuery,
): Promise<CostTrendItem[]> {
  const conditions: string[] = ['r.user_id = $1'];
  const params: unknown[] = [userId];
  let paramIdx = 2;

  if (query.from_date) {
    conditions.push('rc.calculated_at >= $' + paramIdx++);
    params.push(query.from_date);
  }
  if (query.to_date) {
    conditions.push('rc.calculated_at <= $' + paramIdx++);
    params.push(query.to_date);
  }

  const where = conditions.join(' AND ');

  const result = await db.query(
    `SELECT rc.recipe_id, r.title AS recipe_title,
       rc.ingredient_cost, rc.overhead_cost, rc.packaging_cost,
       rc.labor_cost, rc.total_cost, rc.currency, rc.calculated_at
     FROM recipe_costs rc
     JOIN recipes r ON r.id = rc.recipe_id
     WHERE ${where}
     ORDER BY rc.calculated_at ASC`,
    params,
  );

  return result.rows.map((row: any) => ({
    recipe_id: row.recipe_id,
    recipe_title: row.recipe_title,
    ingredient_cost: Number(row.ingredient_cost),
    overhead_cost: Number(row.overhead_cost),
    packaging_cost: Number(row.packaging_cost),
    labor_cost: Number(row.labor_cost),
    total_cost: Number(row.total_cost),
    currency: row.currency,
    calculated_at: row.calculated_at,
  }));
}

