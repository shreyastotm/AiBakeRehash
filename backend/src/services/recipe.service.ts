import { PoolClient } from 'pg';
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
} from '../models/recipe.model';
import { logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
    queryFn('SELECT * FROM recipe_ingredients WHERE recipe_id = $1 ORDER BY position', [recipeId]),
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
    'INSERT INTO recipe_version_snapshots (version_id, snapshot_data) VALUES ($1, $2)',
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

export async function getRecipe(
  recipeId: string,
  userId: string,
): Promise<RecipeWithDetails> {
  await assertRecipeOwnership(recipeId, userId);
  return fetchRecipeDetails(recipeId);
}

// ---------------------------------------------------------------------------
// Create recipe (transactional)
// ---------------------------------------------------------------------------

export async function createRecipe(
  userId: string,
  input: CreateRecipeInput,
): Promise<RecipeWithDetails> {
  return db.withTransaction(async (client) => {
    const recipeResult = await client.query<Recipe>(
      `INSERT INTO recipes (user_id, title, description, source_type, source_url, original_author, servings, yield_weight_grams, preferred_unit_system, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        userId,
        input.title,
        input.description || null,
        input.source_type || 'manual',
        input.source_url || null,
        input.original_author || null,
        input.servings,
        input.yield_weight_grams,
        input.preferred_unit_system || 'metric',
        input.status || 'active',
      ],
    );
    const recipe = recipeResult.rows[0];

    if (input.ingredients && input.ingredients.length > 0) {
      for (const ing of input.ingredients) {
        await client.query(
          `INSERT INTO recipe_ingredients (recipe_id, ingredient_master_id, display_name, quantity_original, unit_original, quantity_grams, position, is_flour, is_liquid)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [recipe.id, ing.ingredient_master_id, ing.display_name, ing.quantity_original, ing.unit_original, ing.quantity_grams, ing.position, ing.is_flour || false, ing.is_liquid || false],
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
              [recipe.id, section.id, step.instruction, step.duration_seconds ?? null, step.temperature_celsius ?? null, step.position, step.dependency_step_id ?? null],
            );
          }
        }
      }
    }

    // Create initial version
    const versionResult = await client.query<RecipeVersion>(
      "INSERT INTO recipe_versions (recipe_id, version_number, change_summary) VALUES ($1, 1, 'Initial version') RETURNING *",
      [recipe.id],
    );
    await createSnapshot(client, versionResult.rows[0].id, recipe.id);

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
      ['servings', input.servings],
      ['yield_weight_grams', input.yield_weight_grams],
      ['preferred_unit_system', input.preferred_unit_system],
      ['status', input.status],
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

    if (input.ingredients) {
      await client.query('DELETE FROM recipe_ingredients WHERE recipe_id = $1', [recipeId]);
      for (const ing of input.ingredients) {
        await client.query(
          `INSERT INTO recipe_ingredients (recipe_id, ingredient_master_id, display_name, quantity_original, unit_original, quantity_grams, position, is_flour, is_liquid)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [recipeId, ing.ingredient_master_id, ing.display_name, ing.quantity_original, ing.unit_original, ing.quantity_grams, ing.position, ing.is_flour || false, ing.is_liquid || false],
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
              [recipeId, section.id, step.instruction, step.duration_seconds ?? null, step.temperature_celsius ?? null, step.position, step.dependency_step_id ?? null],
            );
          }
        }
      }
    }

    // Create new version
    const maxVersionResult = await client.query(
      'SELECT COALESCE(MAX(version_number), 0) as max_version FROM recipe_versions WHERE recipe_id = $1',
      [recipeId],
    );
    const nextVersion = parseInt(maxVersionResult.rows[0].max_version, 10) + 1;

    const versionResult = await client.query<RecipeVersion>(
      'INSERT INTO recipe_versions (recipe_id, version_number, change_summary) VALUES ($1, $2, $3) RETURNING *',
      [recipeId, nextVersion, input.change_summary || `Version ${nextVersion}`],
    );
    await createSnapshot(client, versionResult.rows[0].id, recipeId);

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
  } = await import('../../../middleware/src/recipeScaler');
  const nutritionCalc: {
    calculateNutrition: (ingredients: any[], servings: number) => any;
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

      const nutritionIngredients = scaledResult.recipe.ingredients.map((ing: any) => {
        const origIng = recipe.ingredients.find((i) => i.id === ing.id);
        return {
          id: ing.id,
          display_name: ing.display_name,
          quantity_grams: ing.quantity_grams,
          nutrition_per_100g: origIng
            ? nutritionMap.get(origIng.ingredient_master_id) || null
            : null,
        };
      });

      const nutrition = nutritionCalc.calculateNutrition(
        nutritionIngredients as any,
        scaledResult.recipe.servings,
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
      'SELECT * FROM recipe_version_snapshots WHERE version_id = $1',
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
     JOIN recipe_version_snapshots rvs ON rvs.version_id = rv.id
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
