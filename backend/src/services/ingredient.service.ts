import {
  searchIngredient,
  SearchResult,
  SearchableIngredient,
  SearchableAlias,
  trigramSimilarity
} from '../../../middleware/src/searchEngine';
import { db } from '../config/database';
import { NotFoundError, ForbiddenError, ValidationError } from '../middleware/errorHandler';
import {
  IngredientMaster,
  IngredientAlias,
  CreateIngredientInput,
  IngredientListQuery,
} from '../models/ingredient.model';
import { logger } from '../utils/logger';

import { AIService } from './ai.service';

// ---------------------------------------------------------------------------
// List ingredients with pagination
// ---------------------------------------------------------------------------

export async function listIngredients(
  userId: string,
  query: IngredientListQuery,
): Promise<{ ingredients: IngredientMaster[]; total: number; page: number; limit: number }> {
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(100, Math.max(1, query.limit || 20));
  const offset = (page - 1) * limit;

  const conditions: string[] = ['(user_id IS NULL OR user_id = $1)'];
  const params: unknown[] = [userId];
  let paramIdx = 2;

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
  userId: string,
): Promise<IngredientMaster & { aliases: IngredientAlias[] }> {
  const result = await db.query<IngredientMaster>(
    'SELECT * FROM ingredient_master WHERE id = $1 AND (user_id IS NULL OR user_id = $2)',
    [ingredientId, userId],
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
  let {
    category,
    default_density_g_per_ml,
    nutrition_per_100g,
    allergen_flags,
    ai_estimated,
  } = input;

  // If ai_estimated is true and properties are missing, attempt AI estimation
  if (ai_estimated && (!category || !default_density_g_per_ml || !nutrition_per_100g)) {
    try {
      const estimate = await AIService.estimateNutrition(input.name);
      category = category || (estimate.category as any) || 'other';
      default_density_g_per_ml = default_density_g_per_ml ?? (estimate.density_g_per_ml || null);
      nutrition_per_100g = nutrition_per_100g || {
        energy_kcal: estimate.calories,
        fat_g: estimate.fats_grams,
        carbs_g: estimate.carbs_grams,
        protein_g: estimate.proteins_grams,
        sugars_g: estimate.sugar_g,
        added_sugars_g: estimate.added_sugar_g,
      };
      if (estimate.allergen_flags) {
        allergen_flags = allergen_flags || {
          gluten: estimate.allergen_flags.contains_gluten,
          dairy: estimate.allergen_flags.contains_dairy,
          nuts: estimate.allergen_flags.contains_nuts,
          eggs: estimate.allergen_flags.contains_eggs,
          soy: estimate.allergen_flags.contains_soy,
          is_vegan: estimate.allergen_flags.is_vegan,
          is_vegetarian: estimate.allergen_flags.is_vegetarian,
        };
      }
    } catch (err) {
      logger.warn({ name: input.name }, 'AI metadata estimation failed for ingredient');
    }
  }

  const result = await db.query<IngredientMaster>(
    `INSERT INTO ingredient_master (name, category, default_density_g_per_ml, nutrition_per_100g, allergen_flags, is_composite, ai_estimated, user_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      input.name.toLowerCase().trim(),
      category || 'other',
      default_density_g_per_ml ?? null,
      nutrition_per_100g ? JSON.stringify(nutrition_per_100g) : null,
      allergen_flags ? JSON.stringify(allergen_flags) : null,
      input.is_composite ?? false,
      ai_estimated ?? false,
      input.user_id ?? null,
    ],
  );

  return result.rows[0];
}

// ---------------------------------------------------------------------------
export async function searchIngredients(
  queryStr: string,
  userId: string,
  limit: number = 20,
): Promise<SearchResult[]> {
  if (!queryStr || queryStr.trim().length === 0) return [];

  // Fetch all ingredients and aliases (user-scoped + system) for in-memory search
  const [ingredientsResult, aliasesResult] = await Promise.all([
    db.query<SearchableIngredient>(
      'SELECT id, name, category, default_density_g_per_ml, ai_estimated FROM ingredient_master WHERE user_id IS NULL OR user_id = $1 ORDER BY name',
      [userId]
    ),
    db.query<SearchableAlias>(
      'SELECT ingredient_master_id, alias_name FROM ingredient_aliases WHERE user_id IS NULL OR user_id = $1',
      [userId]
    ),
  ]);

  const results = searchIngredient(
    queryStr,
    ingredientsResult.rows,
    aliasesResult.rows,
  );

  return results.slice(0, Math.min(limit, 50));
}

// ---------------------------------------------------------------------------
// Merge two ingredients (source -> target)
// ---------------------------------------------------------------------------

export async function mergeIngredients(
  sourceId: string,
  targetId: string,
  userId: string,
): Promise<void> {
  if (sourceId === targetId) {
    throw new ValidationError('Source and target ingredients must be different.');
  }

  await db.withTransaction(async (client) => {
    // 1. Verify ownership and existence
    const sourceRes = await client.query(
      'SELECT id, name, user_id FROM ingredient_master WHERE id = $1',
      [sourceId],
    );
    if (!sourceRes.rows[0]) throw new NotFoundError('Source ingredient');

    // Safety: only allow merging custom ingredients (user_id != null)
    if (sourceRes.rows[0].user_id === null) {
      throw new ForbiddenError('System ingredients cannot be merged. You can only merge your own custom ingredients.');
    }

    const sourceUserId = String(sourceRes.rows[0].user_id);
    const authUserId = String(userId);

    // Allow merge if user owns the source OR if it's a system merge request
    // (Internal system merges are permitted now as requested)
    if (sourceRes.rows[0].user_id !== null && sourceUserId !== authUserId) {
      throw new ForbiddenError(`Ownership mismatch. You can only merge ingredients you created. Found source user_id=${sourceUserId}, but auth userId=${authUserId}`);
    }

    const targetRes = await client.query(
      'SELECT id FROM ingredient_master WHERE id = $1 AND (user_id IS NULL OR user_id = $2)',
      [targetId, userId],
    );
    if (!targetRes.rows[0]) {
      throw new NotFoundError('Target ingredient');
    }

    const sourceName = sourceRes.rows[0].name;

    // 2. Re-point Recipe Ingredients
    await client.query(
      'UPDATE recipe_ingredients SET ingredient_master_id = $1 WHERE ingredient_master_id = $2',
      [targetId, sourceId],
    );

    // 3. Re-point Inventory Items
    await client.query(
      'UPDATE inventory_items SET ingredient_master_id = $1 WHERE ingredient_master_id = $2',
      [targetId, sourceId],
    );

    // 4. Re-point Existing Aliases
    await client.query(
      'UPDATE ingredient_aliases SET ingredient_master_id = $1 WHERE ingredient_master_id = $2',
      [targetId, sourceId],
    );

    // 5. Create a new alias for the source name
    await client.query(
      `INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, user_id) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (alias_name, COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::UUID)) DO NOTHING`,
      [targetId, sourceName, userId],
    );

    // 6. Delete the source ingredient
    await client.query(
      'DELETE FROM ingredient_master WHERE id = $1',
      [sourceId],
    );
  });
}

// ---------------------------------------------------------------------------
// GET Duplicate Suggestions
// ---------------------------------------------------------------------------

export interface DuplicateSuggestion {
  custom_id: string;
  custom_name: string;
  target_id: string;
  target_name: string;
  similarity: number;
  match_type: 'system' | 'custom';
}

export async function getDuplicateSuggestions(userId: string): Promise<DuplicateSuggestion[]> {
  // 1. Fetch used system items and all user's custom items
  const candidatesRes = await db.query(
    `SELECT id, name, user_id, category 
     FROM ingredient_master 
     WHERE user_id = $1`,
    [userId]
  );
  
  if (candidatesRes.rowCount === 0) return [];

  // 2. Fetch all potential targets
  const targetsRes = await db.query(
    'SELECT id, name, user_id FROM ingredient_master'
  );

  // 3. Fetch ignored suggestions (safe — if table hasn't been created yet, fall back to empty set)
  let ignoredSet = new Set<string>();
  try {
      const ignoredRes = await db.query(
          'SELECT source_id, target_id FROM ignored_ingredient_suggestions WHERE user_id = $1',
          [userId]
      );
      ignoredSet = new Set(ignoredRes.rows.map(r => `${r.source_id}:${r.target_id}`));
  } catch (_e) {
      logger.warn('ignored_ingredient_suggestions table not found — run migration 00Y');
  }

  const suggestions: DuplicateSuggestion[] = [];
  const candidates = candidatesRes.rows;
  const targets = targetsRes.rows;
  // Track pairs already added to avoid A→B and B→A both showing
  const seenPairs = new Set<string>();

  for (const cand of candidates) {
    for (const target of targets) {
      if (cand.id === target.id) continue;
      if (ignoredSet.has(`${cand.id}:${target.id}`)) continue;
      if (ignoredSet.has(`${target.id}:${cand.id}`)) continue;
      // Skip if reverse pair already exists in suggestions
      const pairKey = [cand.id, target.id].sort().join(':');
      if (seenPairs.has(pairKey)) continue;

      const name1 = cand.name.toLowerCase().trim();
      const name2 = target.name.toLowerCase().trim();

      const score = trigramSimilarity(name1, name2);
      
      // Check for plural variations (egg vs eggs, date vs dates, flour vs flours)
      const isPluralVariation = (name1 + 's' === name2) || (name2 + 's' === name1) || 
                               (name1 + 'es' === name2) || (name2 + 'es' === name1);
      // Also check if one is a prefix of the other with a modifier (e.g. "large egg" vs "egg")
      const isModifierVariation = name1.endsWith(' ' + name2) || name2.endsWith(' ' + name1);

      const threshold = (cand.user_id === null || target.user_id === null) ? 0.65 : 0.55;

      if (isPluralVariation || isModifierVariation || score >= threshold) {
        seenPairs.add(pairKey);
        suggestions.push({
          custom_id: cand.id,
          custom_name: cand.name,
          target_id: target.id,
          target_name: target.name,
          similarity: isPluralVariation || isModifierVariation ? 0.95 : score,
          match_type: target.user_id === null ? 'system' : 'custom'
        });
      }
    }
  }

  return suggestions.sort((a, b) => b.similarity - a.similarity).slice(0, 20);
}

/** Permanently ignore a suggestion */
export async function ignoreDuplicateSuggestion(userId: string, sourceId: string, targetId: string): Promise<void> {
    await db.query(
        `INSERT INTO ignored_ingredient_suggestions (user_id, source_id, target_id)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [userId, sourceId, targetId]
    );
}
