import { PoolClient } from 'pg';

import { convertToGrams, normalizeUnit, isVolumeUnit } from '../../../middleware/src/unitConverter';
import { db } from '../config/database';
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from '../middleware/errorHandler';
import {
  Recipe,
  RecipeIngredient,
  RecipeSection,
  RecipeStep,
  RecipeWithDetails,
  RecipeVersion,
  RecipeVersionSnapshot,
  CreateRecipeInput,
  UpdateRecipeInput,
  RecipeListQuery,
  RecipeSearchQuery,
  LabelData,
} from '../models/recipe.model';
import { logger } from '../utils/logger';

import { AIService } from './ai.service';

// ---------------------------------------------------------------------------
// Fallback density table for when ingredient_master has no density
// Values in g/ml — covers the most common baking ingredients
// ---------------------------------------------------------------------------
const FALLBACK_DENSITY: Record<string, number> = {
  flour: 0.65,    // all-purpose / plain / self-raising
  sugar: 0.85,    // white / caster / granulated
  'brown sugar': 0.80,
  'icing sugar': 0.56,
  'cocoa powder': 0.53,
  'baking powder': 0.92,
  'baking soda': 1.07,
  butter: 0.91,
  oil: 0.92,
  honey: 1.42,
  milk: 1.03,
  cream: 1.00,
  water: 1.00,
  salt: 1.22,
  oats: 0.36,
  cornstarch: 0.61,
  'bread crumbs': 0.37,
  yeast: 0.72,
  vanilla: 0.88,
  cinnamon: 0.56,
  nutmeg: 0.48,
};

function getFallbackDensity(name: string): number {
  const lower = name.toLowerCase();
  for (const [key, density] of Object.entries(FALLBACK_DENSITY)) {
    if (lower.includes(key)) return density;
  }
  // Generic fallback: 1 g/ml (water-like) for unknowns
  return 1.0;
}

/**
 * Converts ingredient quantity from original unit to grams.
 * Preserves quantity_original and unit_original for display.
 */
async function resolveQuantityGrams(
  ingredientMasterId: string | null | undefined,
  displayName: string,
  quantityOriginal: number,
  unitOriginal: string,
  densityMap: Map<string, number | null>,
): Promise<number> {
  const norm = normalizeUnit(unitOriginal);
  
  // Already in grams or a weight unit — convert directly
  if (!isVolumeUnit(norm)) {
    try {
      return convertToGrams(
        { id: ingredientMasterId || '', name: displayName, default_density_g_per_ml: null },
        quantityOriginal,
        norm,
      );
    } catch {
      return quantityOriginal; // fallback if unit is unrecognised (e.g. 'piece')
    }
  }

  // Volume unit — need density
  const storedDensity = ingredientMasterId ? densityMap.get(ingredientMasterId) ?? null : null;
  const density = storedDensity ?? getFallbackDensity(displayName);
  return convertToGrams(
    { id: ingredientMasterId || '', name: displayName, default_density_g_per_ml: density },
    quantityOriginal,
    norm,
  );
}


// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns null if the value is an empty string, whitespace, or undefined/null.
 * Prevents Postgres from trying to cast "" to UUID.
 */
function toUuidOrNull(val: string | undefined | null): string | null {
  if (!val || (typeof val === 'string' && val.trim() === '')) return null;
  return val;
}

async function assertRecipeOwnership(
  recipeId: string,
  userId: string,
  client?: PoolClient,
): Promise<Recipe> {
  const queryFn = client
    ? (text: string, params: unknown[]) => client.query(text, params)
    : db.query.bind(db);

  const result = await queryFn(
    'SELECT * FROM recipes WHERE id = $1',
    [recipeId],
  );

  if (!result.rows[0]) {
    throw new NotFoundError('Recipe');
  }

  const recipe = result.rows[0] as Recipe;
  if (recipe.user_id !== userId) {
    throw new ForbiddenError('You do not own this recipe');
  }

  return recipe;
}

async function fetchRecipeDetails(
  recipeId: string,
  client?: PoolClient,
): Promise<RecipeWithDetails> {
  const queryFn = client
    ? (text: string, params: unknown[]) => client.query(text, params)
    : db.query.bind(db);

  const recipeResult = await queryFn('SELECT * FROM recipes WHERE id = $1', [recipeId]);
  if (!recipeResult.rows[0]) {
    throw new NotFoundError('Recipe');
  }

  const recipe = recipeResult.rows[0] as Recipe;

  const [ingredientsResult, sectionsResult, stepsResult] = await Promise.all([
    queryFn(
      `SELECT ri.*, ii.brand_name, ii.moisture_content 
       FROM recipe_ingredients ri 
       LEFT JOIN inventory_items ii ON ii.id = ri.inventory_item_id 
       WHERE ri.recipe_id = $1 
       ORDER BY ri.position`,
      [recipeId]
    ),
    queryFn('SELECT * FROM recipe_sections WHERE recipe_id = $1 ORDER BY position', [recipeId]),
    queryFn('SELECT * FROM recipe_steps WHERE recipe_id = $1 ORDER BY position', [recipeId]),
  ]);

  const ingredients = ingredientsResult.rows as RecipeIngredient[];
  const sections = sectionsResult.rows as RecipeSection[];
  const steps = stepsResult.rows as RecipeStep[];

  const sectionsWithSteps = sections.map((section) => ({
    ...section,
    steps: steps.filter((step) => step.section_id === section.id),
  }));

  return { ...recipe, ingredients, sections: sectionsWithSteps };
}

async function createSnapshot(
  client: PoolClient,
  versionId: string,
  recipeId: string,
): Promise<void> {
  const details = await fetchRecipeDetails(recipeId, client);
  await client.query(
    'INSERT INTO recipe_version_snapshots (recipe_version_id, snapshot_data) VALUES ($1, $2)',
    [versionId, JSON.stringify(details)],
  );
}

// ---------------------------------------------------------------------------
// List recipes
// ---------------------------------------------------------------------------

export async function listRecipes(
  userId: string,
  query: RecipeListQuery,
): Promise<{ recipes: Recipe[]; total: number; page: number; limit: number }> {
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(100, Math.max(1, query.limit || 20));
  const offset = (page - 1) * limit;

  const conditions: string[] = ['user_id = $1'];
  const params: unknown[] = [userId];
  let paramIdx = 2;

  if (query.status) {
    conditions.push(`status = $${paramIdx++}`);
    params.push(query.status);
  }
  if (query.source_type) {
    conditions.push(`source_type = $${paramIdx++}`);
    params.push(query.source_type);
  }
  if (query.tags && query.tags.length > 0) {
    conditions.push(`tags @> $${paramIdx++}`);
    params.push(query.tags);
  }

  const where = conditions.join(' AND ');
  const sortCol = query.sort_by || 'created_at';
  const sortDir = query.sort_order === 'asc' ? 'ASC' : 'DESC';
  const allowedSortCols = ['created_at', 'updated_at', 'title'];
  const safeSortCol = allowedSortCols.includes(sortCol) ? sortCol : 'created_at';

  const countResult = await db.query(
    `SELECT COUNT(*) FROM recipes WHERE ${where}`,
    params,
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const dataResult = await db.query<Recipe>(
    `SELECT * FROM recipes WHERE ${where} ORDER BY ${safeSortCol} ${sortDir} LIMIT $${paramIdx++} OFFSET $${paramIdx}`,
    [...params, limit, offset],
  );

  return { recipes: dataResult.rows, total, page, limit };
}

// ---------------------------------------------------------------------------
// Get single recipe
// ---------------------------------------------------------------------------

export async function getRecipeIngredientsExpanded(
  recipeId: string,
  userId: string,
): Promise<any[]> {
  await assertRecipeOwnership(recipeId, userId);
  const result = await db.query(
    'SELECT * FROM get_recipe_ingredients_expanded($1)',
    [recipeId],
  );
  return result.rows;
}

export async function getRecipe(
  recipeId: string,
  userId: string,
): Promise<RecipeWithDetails> {
  await assertRecipeOwnership(recipeId, userId);
  return fetchRecipeDetails(recipeId);
}

export async function getRecipeNutrition(
  recipeId: string,
  userId: string,
): Promise<unknown | null> {
  await assertRecipeOwnership(recipeId, userId);
  const result = await db.query(
    'SELECT nutrition_per_100g as per_100g, nutrition_per_serving as per_serving, calculated_at FROM recipe_nutrition_cache WHERE recipe_id = $1',
    [recipeId]
  );
  return result.rows[0] || null;
}

export async function calculateRecipeNutrition(
  recipeId: string,
  userId: string,
): Promise<unknown> {
  const recipe = await fetchRecipeDetails(recipeId); // Avoid getRecipe which calls ownership again inside this file logic

  if (recipe.user_id !== userId) {
    throw new ForbiddenError('You do not own this recipe');
  }

  const nutritionCalc: {
    calculateNutrition: (ingredients: any[], servings: number, yieldWeightGrams?: number | null) => any;
    // @ts-ignore TS6059 - cross-package import
  } = await import('../../../middleware/src/nutritionCalculator');

  // Fetch ingredient master data
  const ingredientIds = recipe.ingredients.map((i) => i.ingredient_master_id);
  const nutritionIngredients: any[] = [];

  if (ingredientIds.length > 0) {
    const placeholders = ingredientIds.map((_, i) => `$${i + 1}`).join(',');
    const nutritionResult = await db.query(
      `SELECT id, name, nutrition_per_100g FROM ingredient_master WHERE id IN (${placeholders})`,
      ingredientIds,
    );

    const nutritionMap = new Map<string, unknown>();
    for (const row of nutritionResult.rows) {
      // Normalize all known field name variants coming from DB JSONB
      const nutr = row.nutrition_per_100g as any;
      if (nutr) {
          nutritionMap.set(row.id, {
              energy_kcal: Number(nutr.energy_kcal ?? nutr.calories) || 0,
              fat_g: Number(nutr.fat_g ?? nutr.fats_grams ?? nutr.fat_grams) || 0,
              carbs_g: Number(nutr.carbs_g ?? nutr.carbs_grams ?? nutr.carbohydrates_g) || 0,
              protein_g: Number(nutr.protein_g ?? nutr.proteins_grams ?? nutr.protein_grams) || 0,
              // Accept ALL known naming styles from DB
              sugar_g: Number(nutr.sugar_g ?? nutr.sugars_g ?? nutr.sugars_grams ?? nutr.sugar_grams) || 0,
              added_sugar_g: Number(nutr.added_sugar_g ?? nutr.added_sugars_g ?? nutr.added_sugars_grams ?? nutr.added_sugar_grams) || 0,
              fiber_g: Number(nutr.fiber_g ?? nutr.fiber_grams ?? nutr.dietary_fiber_g) || 0,
          });
      }
    }

    const inventoryItemIds = recipe.ingredients
      .map((i) => i.inventory_item_id)
      .filter(Boolean) as string[];

    const inventoryMap = new Map<string, any>();
    if (inventoryItemIds.length > 0) {
      const invPlaceholders = inventoryItemIds.map((_, i) => `$${i + 1}`).join(',');
      const inventoryResult = await db.query(
        `SELECT id, nutrition_overrides FROM inventory_items WHERE id IN (${invPlaceholders})`,
        inventoryItemIds,
      );
      for (const row of inventoryResult.rows) {
        inventoryMap.set(row.id, row.nutrition_overrides);
      }
    }

    for (const ing of recipe.ingredients) {
      let nutritionData: any = nutritionMap.get(ing.ingredient_master_id);
      const overrides = ing.inventory_item_id ? inventoryMap.get(ing.inventory_item_id) : null;

      if (overrides && Object.keys(overrides).length > 0) {
        nutritionData = { ...nutritionData, ...overrides };
      }

      if (!nutritionData && !overrides) {
        try {
          const estimate = await AIService.estimateNutrition(ing.display_name);
          nutritionData = {
            energy_kcal: estimate.calories,
            fat_g: estimate.fats_grams,
            carbs_g: estimate.carbs_grams,
            protein_g: estimate.proteins_grams,
            sugar_g: estimate.sugar_g,
            added_sugar_g: estimate.added_sugar_g,
            fiber_g: estimate.fiber_g || 0,
          };
        } catch (err) {
          logger.warn({ ing: ing.display_name }, 'AI nutrition estimation failed');
        }
      }

      nutritionIngredients.push({
        id: ing.id,
        display_name: ing.display_name,
        quantity_grams: ing.quantity_grams,
        nutrition_per_100g: nutritionData || null,
      });
    }

    const nutrition = nutritionCalc.calculateNutrition(
      nutritionIngredients,
      recipe.servings,
      recipe.yield_weight_grams,
    );

    const result = {
      ...nutrition,
      servings: recipe.servings,
      calculated_at: new Date().toISOString(),
    };

    // Cache it
    await db.query(
      `INSERT INTO recipe_nutrition_cache (recipe_id, nutrition_per_100g, nutrition_per_serving, calculated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (recipe_id) DO UPDATE SET
       nutrition_per_100g = EXCLUDED.nutrition_per_100g,
       nutrition_per_serving = EXCLUDED.nutrition_per_serving,
       calculated_at = NOW()`,
      [recipeId, JSON.stringify(result.per_100g), JSON.stringify(result.per_serving)],
    );

    return result;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Create recipe (transactional)
// ---------------------------------------------------------------------------

export async function createRecipe(
  userId: string,
  input: CreateRecipeInput,
): Promise<RecipeWithDetails> {
  return db.withTransaction(async (client) => {
    // Basic validation to prevent 500s from DB check constraints
    if (input.servings <= 0) {
      throw new ValidationError('Servings must be greater than 0');
    }
    if (input.yield_weight_grams !== undefined && input.yield_weight_grams !== null && input.yield_weight_grams <= 0) {
      throw new ValidationError('Yield weight must be greater than 0');
    }

    const recipeResult = await client.query<Recipe>(
      `INSERT INTO recipes (user_id, title, description, source_type, source_url, original_author, original_author_url, servings, yield_weight_grams, preferred_unit_system, status, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        userId,
        input.title,
        input.description || null,
        input.source_type || 'manual',
        input.source_url || null,
        input.original_author || null,
        input.original_author_url || null,
        input.servings,
        input.yield_weight_grams || null,
        input.preferred_unit_system || 'metric',
        input.status || 'active',
        input.tags || [],
      ],
    );
    const recipe = recipeResult.rows[0];

    // Create initial version immediately so it exists before related records
    const versionResult = await client.query<RecipeVersion>(
      "INSERT INTO recipe_versions (recipe_id, version_number, change_summary) VALUES ($1, 1, 'Initial version') RETURNING *",
      [recipe.id],
    );
    const versionId = versionResult.rows[0].id;

    if (input.ingredients && input.ingredients.length > 0) {
      // Bulk-fetch ingredient densities so we can convert volumetric units → grams
      const ingIds = input.ingredients
        .map(i => toUuidOrNull(i.ingredient_master_id))
        .filter(Boolean) as string[];
      const densityMap = new Map<string, number | null>();
      if (ingIds.length > 0) {
        const placeholders = ingIds.map((_, i) => `$${i + 1}`).join(',');
        const densityRes = await client.query(
          `SELECT id, default_density_g_per_ml FROM ingredient_master WHERE id IN (${placeholders})`,
          ingIds,
        );
        for (const row of densityRes.rows) {
          densityMap.set(row.id, row.default_density_g_per_ml);
        }
      }

      for (const ing of input.ingredients) {
        if (ing.quantity_original <= 0) {
          throw new ValidationError(`Ingredient "${ing.display_name}" must have a quantity greater than 0`);
        }

        // Convert from the user's preferred unit to canonical grams
        const quantityGrams = await resolveQuantityGrams(
          toUuidOrNull(ing.ingredient_master_id),
          ing.display_name,
          ing.quantity_original,
          ing.unit_original,
          densityMap,
        );

        if (quantityGrams <= 0) {
          throw new ValidationError(`Ingredient "${ing.display_name}" resolved to 0g — check quantity and unit`);
        }

        await client.query(
          `INSERT INTO recipe_ingredients (recipe_id, ingredient_master_id, display_name, quantity_original, unit_original, quantity_grams, position, is_flour, is_liquid, inventory_item_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            recipe.id,
            toUuidOrNull(ing.ingredient_master_id),
            ing.display_name,
            ing.quantity_original,
            ing.unit_original,
            quantityGrams,
            ing.position,
            ing.is_flour || false,
            ing.is_liquid || false,
            toUuidOrNull(ing.inventory_item_id)
          ],
        );
      }
    }

    if (input.sections && input.sections.length > 0) {
      for (const sec of input.sections) {
        const sectionResult = await client.query<RecipeSection>(
          'INSERT INTO recipe_sections (recipe_id, type, title, position) VALUES ($1, $2, $3, $4) RETURNING *',
          [recipe.id, sec.type, sec.title || null, sec.position],
        );
        const section = sectionResult.rows[0];

        if (sec.steps && sec.steps.length > 0) {
          for (const step of sec.steps) {
            await client.query(
              'INSERT INTO recipe_steps (recipe_id, section_id, instruction, duration_seconds, temperature_celsius, position, dependency_step_id) VALUES ($1, $2, $3, $4, $5, $6, $7)',
              [
                recipe.id,
                section.id,
                step.instruction,
                step.duration_seconds ?? null,
                step.temperature_celsius ?? null,
                step.position,
                toUuidOrNull(step.dependency_step_id)
              ],
            );
          }
        }
      }
    }

    // Now take the snapshot after all data is inserted
    await createSnapshot(client, versionId, recipe.id);

    return fetchRecipeDetails(recipe.id, client);

  });
}

// ---------------------------------------------------------------------------
// Update recipe (transactional, creates new version)
// ---------------------------------------------------------------------------

export async function updateRecipe(
  recipeId: string,
  userId: string,
  input: UpdateRecipeInput,
): Promise<RecipeWithDetails> {
  return db.withTransaction(async (client) => {
    await assertRecipeOwnership(recipeId, userId, client);

    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIdx = 1;

    const fields: Array<[string, unknown]> = [
      ['title', input.title],
      ['description', input.description],
      ['source_type', input.source_type],
      ['source_url', input.source_url],
      ['original_author', input.original_author],
      ['original_author_url', input.original_author_url],
      ['servings', input.servings],
      ['yield_weight_grams', input.yield_weight_grams],
      ['preferred_unit_system', input.preferred_unit_system],
      ['status', input.status],
      ['tags', input.tags],
    ];

    for (const [field, value] of fields) {
      if (value !== undefined) {
        setClauses.push(`${field} = $${paramIdx++}`);
        values.push(value);
      }
    }

    if (setClauses.length > 0) {
      setClauses.push('updated_at = NOW()');
      values.push(recipeId);
      await client.query(
        `UPDATE recipes SET ${setClauses.join(', ')} WHERE id = $${paramIdx}`,
        values,
      );
    }

    // Create new version immediately
    const maxVersionResult = await client.query(
      'SELECT COALESCE(MAX(version_number), 0) as max_version FROM recipe_versions WHERE recipe_id = $1',
      [recipeId],
    );
    const nextVersion = parseInt(maxVersionResult.rows[0].max_version, 10) + 1;

    const versionResult = await client.query<RecipeVersion>(
      'INSERT INTO recipe_versions (recipe_id, version_number, change_summary) VALUES ($1, $2, $3) RETURNING *',
      [recipeId, nextVersion, input.change_summary || `Version ${nextVersion}`],
    );
    const versionId = versionResult.rows[0].id;

    if (input.ingredients) {
      await client.query('DELETE FROM recipe_ingredients WHERE recipe_id = $1', [recipeId]);

      // Bulk-fetch ingredient densities for unit conversion
      const ingIds = input.ingredients
        .map(i => toUuidOrNull(i.ingredient_master_id))
        .filter(Boolean) as string[];
      const densityMap = new Map<string, number | null>();
      if (ingIds.length > 0) {
        const placeholders = ingIds.map((_, i) => `$${i + 1}`).join(',');
        const densityRes = await client.query(
          `SELECT id, default_density_g_per_ml FROM ingredient_master WHERE id IN (${placeholders})`,
          ingIds,
        );
        for (const row of densityRes.rows) {
          densityMap.set(row.id, row.default_density_g_per_ml);
        }
      }

      for (const ing of input.ingredients) {
        const quantityGrams = await resolveQuantityGrams(
          toUuidOrNull(ing.ingredient_master_id),
          ing.display_name,
          ing.quantity_original,
          ing.unit_original,
          densityMap,
        );

        if (quantityGrams <= 0) {
          throw new ValidationError(`Ingredient "${ing.display_name}" resolved to 0g — check quantity and unit`);
        }

        await client.query(
          `INSERT INTO recipe_ingredients (recipe_id, ingredient_master_id, display_name, quantity_original, unit_original, quantity_grams, position, is_flour, is_liquid, inventory_item_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            recipeId,
            toUuidOrNull(ing.ingredient_master_id),
            ing.display_name,
            ing.quantity_original,
            ing.unit_original,
            quantityGrams,
            ing.position,
            ing.is_flour || false,
            ing.is_liquid || false,
            toUuidOrNull(ing.inventory_item_id)
          ],
        );
      }
    }

    if (input.sections) {
      await client.query('DELETE FROM recipe_steps WHERE recipe_id = $1', [recipeId]);
      await client.query('DELETE FROM recipe_sections WHERE recipe_id = $1', [recipeId]);
      for (const sec of input.sections) {
        const sectionResult = await client.query<RecipeSection>(
          'INSERT INTO recipe_sections (recipe_id, type, title, position) VALUES ($1, $2, $3, $4) RETURNING *',
          [recipeId, sec.type, sec.title || null, sec.position],
        );
        const section = sectionResult.rows[0];

        if (sec.steps && sec.steps.length > 0) {
          for (const step of sec.steps) {
            await client.query(
              'INSERT INTO recipe_steps (recipe_id, section_id, instruction, duration_seconds, temperature_celsius, position, dependency_step_id) VALUES ($1, $2, $3, $4, $5, $6, $7)',
              [
                recipeId,
                section.id,
                step.instruction,
                step.duration_seconds ?? null,
                step.temperature_celsius ?? null,
                step.position,
                toUuidOrNull(step.dependency_step_id)
              ],
            );
          }
        }
      }
    }

    // Now take the snapshot after all data is updated
    await createSnapshot(client, versionId, recipeId);


    return fetchRecipeDetails(recipeId, client);
  });
}

// ---------------------------------------------------------------------------
// Delete recipe
// ---------------------------------------------------------------------------

export async function deleteRecipe(
  recipeId: string,
  userId: string,
): Promise<void> {
  await assertRecipeOwnership(recipeId, userId);
  await db.query('DELETE FROM recipes WHERE id = $1', [recipeId]);
}

// ---------------------------------------------------------------------------
// Tag suggestions
// ---------------------------------------------------------------------------

export async function getUserTags(userId: string): Promise<string[]> {
  const result = await db.query(
    `SELECT DISTINCT unnest(tags) as tag 
     FROM recipes 
     WHERE user_id = $1 
     ORDER BY tag ASC`,
    [userId]
  );
  return result.rows.map(row => row.tag);
}

// ---------------------------------------------------------------------------
// Scale recipe
// ---------------------------------------------------------------------------

export async function scaleRecipe(
  recipeId: string,
  userId: string,
  params: { targetYieldGrams?: number; targetServings?: number },
): Promise<unknown> {
  const recipe = await getRecipe(recipeId, userId);

  const recipeScaler: {
    scaleByYield: (recipe: any, target: number) => any;
    scaleByServings: (recipe: any, target: number) => any;
    // @ts-ignore TS6059 - cross-package import
  } = await import('../../../middleware/src/recipeScaler');
  const nutritionCalc: {
    calculateNutrition: (ingredients: any[], servings: number, yieldWeightGrams?: number | null) => any;
    // @ts-ignore TS6059 - cross-package import
  } = await import('../../../middleware/src/nutritionCalculator');

  const scalableRecipe = {
    id: recipe.id,
    title: recipe.title,
    servings: recipe.servings,
    yield_weight_grams: recipe.yield_weight_grams,
    ingredients: recipe.ingredients.map((ing) => ({
      id: ing.id,
      display_name: ing.display_name,
      quantity_original: ing.quantity_original,
      unit_original: ing.unit_original,
      quantity_grams: ing.quantity_grams,
      position: ing.position,
      category: ing.is_flour ? 'flour' : ing.is_liquid ? 'liquid' : undefined,
    })),
  };

  let scaledResult: any;
  if (params.targetYieldGrams) {
    scaledResult = recipeScaler.scaleByYield(scalableRecipe, params.targetYieldGrams);
  } else if (params.targetServings) {
    scaledResult = recipeScaler.scaleByServings(scalableRecipe, params.targetServings);
  } else {
    throw new ValidationError('Either targetYieldGrams or targetServings is required');
  }

  // Recalculate nutrition for scaled recipe
  try {
    const ingredientIds = recipe.ingredients.map((i) => i.ingredient_master_id);
    if (ingredientIds.length > 0) {
      const placeholders = ingredientIds.map((_, i) => `$${i + 1}`).join(',');
      const nutritionResult = await db.query(
        `SELECT id, nutrition_per_100g FROM ingredient_master WHERE id IN (${placeholders})`,
        ingredientIds,
      );

      const nutritionMap = new Map<string, unknown>();
      for (const row of nutritionResult.rows) {
        nutritionMap.set(row.id, row.nutrition_per_100g);
      }

      const nutritionIngredients = await Promise.all(
        scaledResult.recipe.ingredients.map(async (ing: any) => {
          const origIng = recipe.ingredients.find((i) => i.id === ing.id);
          let nutritionData = origIng ? nutritionMap.get(origIng.ingredient_master_id) : null;

          if (!nutritionData) {
            try {
              const estimate = await AIService.estimateNutrition(ing.display_name);
              nutritionData = {
                energy_kcal: estimate.calories,
                fat_g: estimate.fats_grams,
                carbs_g: estimate.carbs_grams,
                protein_g: estimate.proteins_grams,
                sugar_g: estimate.sugar_g,
                added_sugar_g: estimate.added_sugar_g,
              };
            } catch (err) {
              logger.warn({ dr: ing.display_name }, 'AI nutrition estimation failed');
            }
          }

          return {
            id: ing.id,
            display_name: ing.display_name,
            quantity_grams: ing.quantity_grams,
            nutrition_per_100g: nutritionData || null,
          };
        }),
      );

      const nutrition = nutritionCalc.calculateNutrition(
        nutritionIngredients as any,
        scaledResult.recipe.servings,
        scaledResult.recipe.yield_weight_grams,
      );

      return { ...scaledResult, nutrition };
    }
  } catch (err) {
    logger.warn({ err }, 'Failed to calculate nutrition for scaled recipe');
  }

  return scaledResult;
}

// ---------------------------------------------------------------------------
// Versioning
// ---------------------------------------------------------------------------

export async function listVersions(
  recipeId: string,
  userId: string,
): Promise<RecipeVersion[]> {
  await assertRecipeOwnership(recipeId, userId);
  const result = await db.query<RecipeVersion>(
    'SELECT * FROM recipe_versions WHERE recipe_id = $1 ORDER BY version_number DESC',
    [recipeId],
  );
  return result.rows;
}

export async function createVersion(
  recipeId: string,
  userId: string,
  changeSummary?: string,
): Promise<RecipeVersion & { snapshot: RecipeVersionSnapshot }> {
  return db.withTransaction(async (client) => {
    await assertRecipeOwnership(recipeId, userId, client);

    const maxVersionResult = await client.query(
      'SELECT COALESCE(MAX(version_number), 0) as max_version FROM recipe_versions WHERE recipe_id = $1',
      [recipeId],
    );
    const nextVersion = parseInt(maxVersionResult.rows[0].max_version, 10) + 1;

    const versionResult = await client.query<RecipeVersion>(
      'INSERT INTO recipe_versions (recipe_id, version_number, change_summary) VALUES ($1, $2, $3) RETURNING *',
      [recipeId, nextVersion, changeSummary || `Version ${nextVersion}`],
    );
    const version = versionResult.rows[0];

    await createSnapshot(client, version.id, recipeId);

    const snapshotResult = await client.query<RecipeVersionSnapshot>(
      'SELECT * FROM recipe_version_snapshots WHERE recipe_version_id = $1',
      [version.id],
    );

    return { ...version, snapshot: snapshotResult.rows[0] };
  });
}

export async function compareVersions(
  recipeId: string,
  userId: string,
  versionA: number,
  versionB: number,
): Promise<{ versionA: RecipeVersionSnapshot; versionB: RecipeVersionSnapshot }> {
  await assertRecipeOwnership(recipeId, userId);

  const result = await db.query<RecipeVersion & { snapshot_data: Record<string, unknown> }>(
    `SELECT rv.*, rvs.snapshot_data
     FROM recipe_versions rv
     JOIN recipe_version_snapshots rvs ON rvs.recipe_version_id = rv.id
     WHERE rv.recipe_id = $1 AND rv.version_number IN ($2, $3)
     ORDER BY rv.version_number`,
    [recipeId, versionA, versionB],
  );

  if (result.rows.length < 2) {
    throw new NotFoundError('One or both versions');
  }

  return {
    versionA: { id: result.rows[0].id, version_id: result.rows[0].id, snapshot_data: result.rows[0].snapshot_data },
    versionB: { id: result.rows[1].id, version_id: result.rows[1].id, snapshot_data: result.rows[1].snapshot_data },
  };
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

export async function searchRecipes(
  userId: string,
  query: RecipeSearchQuery,
): Promise<{ recipes: Recipe[]; total: number; page: number; limit: number }> {
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(100, Math.max(1, query.limit || 20));
  const offset = (page - 1) * limit;

  const conditions: string[] = ['r.user_id = $1'];
  const params: unknown[] = [userId];
  let paramIdx = 2;

  if (query.q) {
    conditions.push(`(r.title ILIKE $${paramIdx} OR r.description ILIKE $${paramIdx})`);
    params.push(`%${query.q}%`);
    paramIdx++;
  }

  if (query.status) {
    conditions.push(`r.status = $${paramIdx++}`);
    params.push(query.status);
  }

  if (query.source_type) {
    conditions.push(`r.source_type = $${paramIdx++}`);
    params.push(query.source_type);
  }

  if (query.ingredient) {
    conditions.push(
      `EXISTS (SELECT 1 FROM recipe_ingredients ri WHERE ri.recipe_id = r.id AND ri.display_name ILIKE $${paramIdx})`,
    );
    params.push(`%${query.ingredient}%`);
    paramIdx++;
  }

  const where = conditions.join(' AND ');
  const sortCol = query.sort_by || 'created_at';
  const sortDir = query.sort_order === 'asc' ? 'ASC' : 'DESC';
  const allowedSortCols = ['created_at', 'updated_at', 'title', 'rating'];
  const safeSortCol = allowedSortCols.includes(sortCol) ? sortCol : 'created_at';
  // rating doesn't exist as a column on recipes; fall back to created_at
  const actualSortCol = safeSortCol === 'rating' ? 'created_at' : safeSortCol;

  const countResult = await db.query(
    `SELECT COUNT(*) FROM recipes r WHERE ${where}`,
    params,
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const dataResult = await db.query<Recipe>(
    `SELECT r.* FROM recipes r WHERE ${where} ORDER BY r.${actualSortCol} ${sortDir} LIMIT $${paramIdx++} OFFSET $${paramIdx}`,
    [...params, limit, offset],
  );

  return { recipes: dataResult.rows, total, page, limit };
}

export async function saveAIEstimates(
  recipeId: string,
  userId: string,
  estimates: {
    estimated_aw: number;
    estimated_shelf_life_days: number;
    explanation: string
  }
): Promise<void> {
  await assertRecipeOwnership(recipeId, userId);
  await db.query(
    `UPDATE recipes 
     SET target_water_activity = $1, 
         estimated_shelf_life_days = $2, 
         estimated_aw_explanation = $3,
         updated_at = NOW()
     WHERE id = $4`,
    [estimates.estimated_aw, estimates.estimated_shelf_life_days, estimates.explanation, recipeId]
  );
}
export async function getLabelData(
  recipeId: string,
  userId: string,
): Promise<LabelData> {
  const recipe = await fetchRecipeDetails(recipeId);
  if (recipe.user_id !== userId) {
    throw new ForbiddenError('You do not own this recipe');
  }

  // Sort ingredients by weight descending
  const sortedIngredients = [...recipe.ingredients].sort(
    (a, b) => (b.quantity_grams || 0) - (a.quantity_grams || 0),
  );

  // Aggregate allergens
  const ingredientIds = recipe.ingredients.map((i) => i.ingredient_master_id);
  const allergensSet = new Set<string>();

  if (ingredientIds.length > 0) {
    const placeholders = ingredientIds.map((_, i) => `$${i + 1}`).join(',');
    const allergenResult = await db.query(
      `SELECT allergen_flags FROM ingredient_master WHERE id IN (${placeholders})`,
      ingredientIds,
    );

    const knownAllergens = ['gluten', 'dairy', 'nuts', 'eggs', 'soy', 'peanuts', 'shellfish', 'fish'];
    for (const row of allergenResult.rows) {
      const flags = (row.allergen_flags || {}) as Record<string, boolean>;
      for (const [allergen, isPresent] of Object.entries(flags)) {
        if (isPresent && knownAllergens.includes(allergen.toLowerCase())) {
          // Capitalize first letter for better display
          const formattedAllergen = allergen.charAt(0).toUpperCase() + allergen.slice(1);
          allergensSet.add(formattedAllergen);
        }
      }
    }
  }

  // Get nutrition cache
  const nutrition = await getRecipeNutrition(recipeId, userId);

  // Fetch user business details
  const userResult = await db.query(
    'SELECT business_brand_name, business_manufacturer_name, business_manufacturer_address, business_fssai_license FROM users WHERE id = $1',
    [userId]
  );
  const user = userResult.rows[0];

  return {
    recipe_id: recipe.id,
    title: recipe.title,
    ingredients_sorted: sortedIngredients.map((i) => ({
      display_name: i.display_name,
      quantity_grams: i.quantity_grams,
    })),
    allergens: Array.from(allergensSet),
    yield_weight_grams: recipe.yield_weight_grams,
    servings: recipe.servings,
    nutrition: nutrition ? (nutrition as any).per_100g : null,
    business_brand_name: user?.business_brand_name,
    business_manufacturer_name: user?.business_manufacturer_name,
    business_manufacturer_address: user?.business_manufacturer_address,
    business_fssai_license: user?.business_fssai_license,
  };
}
