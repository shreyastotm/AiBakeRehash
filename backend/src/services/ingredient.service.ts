import { db } from '../config/database';
import { NotFoundError } from '../middleware/errorHandler';
import {
  IngredientMaster,
  IngredientAlias,
  CreateIngredientInput,
  IngredientListQuery,
} from '../models/ingredient.model';
import {
  searchIngredient,
  SearchResult,
  SearchableIngredient,
  SearchableAlias,
} from '../../../middleware/src/searchEngine';
import { logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// List ingredients with pagination
// ---------------------------------------------------------------------------

export async function listIngredients(
  query: IngredientListQuery,
): Promise<{ ingredients: IngredientMaster[]; total: number; page: number; limit: number }> {
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(100, Math.max(1, query.limit || 20));
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (query.category) {
    conditions.push(`category = $${paramIdx++}`);
    params.push(query.category);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await db.query(
    `SELECT COUNT(*) FROM ingredient_master ${where}`,
    params,
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const dataResult = await db.query<IngredientMaster>(
    `SELECT * FROM ingredient_master ${where} ORDER BY name ASC LIMIT $${paramIdx++} OFFSET $${paramIdx}`,
    [...params, limit, offset],
  );

  return { ingredients: dataResult.rows, total, page, limit };
}

// ---------------------------------------------------------------------------
// Get single ingredient with aliases
// ---------------------------------------------------------------------------

export async function getIngredient(
  ingredientId: string,
): Promise<IngredientMaster & { aliases: IngredientAlias[] }> {
  const result = await db.query<IngredientMaster>(
    'SELECT * FROM ingredient_master WHERE id = $1',
    [ingredientId],
  );

  if (!result.rows[0]) {
    throw new NotFoundError('Ingredient');
  }

  const aliasResult = await db.query<IngredientAlias>(
    'SELECT * FROM ingredient_aliases WHERE ingredient_master_id = $1 ORDER BY alias_name',
    [ingredientId],
  );

  return { ...result.rows[0], aliases: aliasResult.rows };
}

// ---------------------------------------------------------------------------
// Create custom ingredient
// ---------------------------------------------------------------------------

export async function createIngredient(
  input: CreateIngredientInput,
): Promise<IngredientMaster> {
  const result = await db.query<IngredientMaster>(
    `INSERT INTO ingredient_master (name, category, default_density_g_per_ml, nutrition_per_100g, allergen_flags, is_composite)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      input.name.toLowerCase().trim(),
      input.category,
      input.default_density_g_per_ml ?? null,
      input.nutrition_per_100g ? JSON.stringify(input.nutrition_per_100g) : null,
      input.allergen_flags ? JSON.stringify(input.allergen_flags) : null,
      input.is_composite ?? false,
    ],
  );

  return result.rows[0];
}

// ---------------------------------------------------------------------------
// Search ingredients (fuzzy)
// ---------------------------------------------------------------------------

export async function searchIngredients(
  queryStr: string,
  limit: number = 20,
): Promise<SearchResult[]> {
  if (!queryStr || queryStr.trim().length === 0) return [];

  // Fetch all ingredients and aliases for in-memory search
  const [ingredientsResult, aliasesResult] = await Promise.all([
    db.query<SearchableIngredient>(
      'SELECT id, name, category, default_density_g_per_ml FROM ingredient_master ORDER BY name',
    ),
    db.query<SearchableAlias>(
      'SELECT ingredient_master_id, alias_name FROM ingredient_aliases',
    ),
  ]);

  const results = searchIngredient(
    queryStr,
    ingredientsResult.rows,
    aliasesResult.rows,
  );

  return results.slice(0, Math.min(limit, 50));
}
