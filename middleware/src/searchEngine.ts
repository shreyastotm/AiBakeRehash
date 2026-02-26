/**
 * Fuzzy Search Engine for AiBake
 *
 * Provides ingredient search using trigram-based fuzzy matching against both
 * canonical ingredient names and aliases. Results are ranked by similarity
 * score (highest first) and indicate whether the match came from a canonical
 * name or an alias.
 *
 * The search engine is designed to work in two modes:
 *   1. **In-memory mode** – operates on arrays of ingredients/aliases passed
 *      directly (useful for unit tests and scenarios where data is pre-loaded).
 *   2. **Database mode** – accepts a `DatabaseSearchFn` callback that delegates
 *      to the PostgreSQL `search_ingredient()` function for production use.
 *
 * Requirements: 17.6, 17.7, 48.1
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Source of a search match */
export type MatchType = 'canonical' | 'alias';

/** A single search result */
export interface SearchResult {
  /** Ingredient master ID */
  ingredient_id: string;
  /** Canonical ingredient name */
  ingredient_name: string;
  /** Whether the match came from the canonical name or an alias */
  match_type: MatchType;
  /** Similarity score between 0 and 1 (1 = exact match) */
  similarity_score: number;
  /** Ingredient category (flour, fat, sugar, etc.) */
  category: string;
  /** Density in g/ml – null when unavailable */
  density_g_per_ml: number | null;
  /** The alias that matched (only set when match_type is 'alias') */
  matched_alias?: string;
}

/** Minimal ingredient record for in-memory search */
export interface SearchableIngredient {
  id: string;
  name: string;
  category: string;
  default_density_g_per_ml: number | null;
}

/** Alias record for in-memory search */
export interface SearchableAlias {
  ingredient_master_id: string;
  alias_name: string;
}

/**
 * Callback signature for database-backed search.
 * Implementations should call the PostgreSQL `search_ingredient(query)` function
 * and return the rows mapped to `SearchResult[]`.
 */
export type DatabaseSearchFn = (query: string) => Promise<SearchResult[]>;

// ---------------------------------------------------------------------------
// Trigram similarity (in-memory implementation)
// ---------------------------------------------------------------------------

/**
 * Extract the set of trigrams from a string.
 *
 * Mirrors PostgreSQL's `pg_trgm` behaviour: the input is lowercased, padded
 * with two leading spaces and one trailing space, then split into all
 * consecutive 3-character substrings.
 */
export function extractTrigrams(text: string): Set<string> {
  const padded = `  ${text.toLowerCase()} `;
  const trigrams = new Set<string>();
  for (let i = 0; i <= padded.length - 3; i++) {
    trigrams.add(padded.substring(i, i + 3));
  }
  return trigrams;
}

/**
 * Calculate trigram similarity between two strings.
 *
 * Returns a value between 0 and 1 where 1 means the trigram sets are
 * identical. This mirrors PostgreSQL's `similarity()` function.
 */
export function trigramSimilarity(a: string, b: string): number {
  const trigramsA = extractTrigrams(a);
  const trigramsB = extractTrigrams(b);

  if (trigramsA.size === 0 && trigramsB.size === 0) return 1;
  if (trigramsA.size === 0 || trigramsB.size === 0) return 0;

  let intersection = 0;
  for (const t of trigramsA) {
    if (trigramsB.has(t)) intersection++;
  }

  // Jaccard-style: |A ∩ B| / |A ∪ B|
  const union = trigramsA.size + trigramsB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// ---------------------------------------------------------------------------
// Default similarity threshold
// ---------------------------------------------------------------------------

/**
 * Minimum similarity score for a result to be included.
 * Mirrors PostgreSQL's default `pg_trgm.similarity_threshold` of 0.3.
 */
export const DEFAULT_SIMILARITY_THRESHOLD = 0.3;

// ---------------------------------------------------------------------------
// In-memory search
// ---------------------------------------------------------------------------

/**
 * Search ingredients in-memory using trigram fuzzy matching.
 *
 * Searches both canonical ingredient names and aliases, returning results
 * ranked by similarity score (highest first). When an ingredient matches
 * via both its canonical name and an alias, both matches are included so
 * the caller can see all match sources.
 *
 * @param query        - The user's search text
 * @param ingredients  - Array of searchable ingredients (canonical names)
 * @param aliases      - Array of searchable aliases
 * @param threshold    - Minimum similarity score (default 0.3)
 * @returns Ranked search results
 */
export function searchIngredient(
  query: string,
  ingredients: SearchableIngredient[],
  aliases: SearchableAlias[],
  threshold: number = DEFAULT_SIMILARITY_THRESHOLD,
): SearchResult[] {
  if (!query || query.trim().length === 0) return [];

  const normalizedQuery = query.trim().toLowerCase();
  const results: SearchResult[] = [];

  // Build a lookup map for ingredients by id
  const ingredientMap = new Map<string, SearchableIngredient>();
  for (const ing of ingredients) {
    ingredientMap.set(ing.id, ing);
  }

  // Search canonical names
  for (const ing of ingredients) {
    const score = trigramSimilarity(normalizedQuery, ing.name.toLowerCase());
    if (score >= threshold) {
      results.push({
        ingredient_id: ing.id,
        ingredient_name: ing.name,
        match_type: 'canonical',
        similarity_score: score,
        category: ing.category,
        density_g_per_ml: ing.default_density_g_per_ml,
      });
    }
  }

  // Search aliases
  for (const alias of aliases) {
    const score = trigramSimilarity(normalizedQuery, alias.alias_name.toLowerCase());
    if (score >= threshold) {
      const ing = ingredientMap.get(alias.ingredient_master_id);
      if (ing) {
        results.push({
          ingredient_id: ing.id,
          ingredient_name: ing.name,
          match_type: 'alias',
          similarity_score: score,
          category: ing.category,
          density_g_per_ml: ing.default_density_g_per_ml,
          matched_alias: alias.alias_name,
        });
      }
    }
  }

  // Sort by similarity score descending, then by name ascending for stability
  results.sort((a, b) => {
    if (b.similarity_score !== a.similarity_score) {
      return b.similarity_score - a.similarity_score;
    }
    return a.ingredient_name.localeCompare(b.ingredient_name);
  });

  return results;
}

// ---------------------------------------------------------------------------
// Database-backed search
// ---------------------------------------------------------------------------

/**
 * Search ingredients via the database `search_ingredient()` function.
 *
 * This is a thin wrapper that delegates to the provided `dbSearchFn` callback,
 * which should execute the PostgreSQL function and map rows to `SearchResult[]`.
 * The wrapper validates the query and ensures results are properly sorted.
 *
 * @param query      - The user's search text
 * @param dbSearchFn - Callback executing the database search
 * @returns Ranked search results from the database
 */
export async function searchIngredientFromDb(
  query: string,
  dbSearchFn: DatabaseSearchFn,
): Promise<SearchResult[]> {
  if (!query || query.trim().length === 0) return [];

  const results = await dbSearchFn(query.trim());

  // Ensure results are sorted by similarity descending (DB should do this,
  // but we enforce it for safety)
  results.sort((a, b) => {
    if (b.similarity_score !== a.similarity_score) {
      return b.similarity_score - a.similarity_score;
    }
    return a.ingredient_name.localeCompare(b.ingredient_name);
  });

  return results;
}
