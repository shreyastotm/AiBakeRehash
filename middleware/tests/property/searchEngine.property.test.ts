/**
 * Property-based tests for the Fuzzy Search Engine
 *
 * Property 6: Fuzzy Ingredient Search Ranking
 * Validates: Requirements 4.7, 17.6, 48.1
 *
 * Verifies that search results are ranked by similarity score in descending
 * order, that all results carry valid similarity scores, and that ranking
 * behaviour is consistent across randomly generated queries and ingredient sets.
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  searchIngredient,
  trigramSimilarity,
  type SearchableIngredient,
  type SearchableAlias,
  DEFAULT_SIMILARITY_THRESHOLD,
} from '../../src/searchEngine';

// ── Arbitraries ──────────────────────────────────────────────────────────────

const CATEGORIES = [
  'flour', 'fat', 'sugar', 'leavening', 'dairy',
  'liquid', 'fruit', 'nut', 'spice', 'other',
] as const;

const arbCategory = fc.constantFrom(...CATEGORIES);

/** Generate a non-empty alphabetic string suitable as an ingredient name */
const arbName = fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz '.split('')), {
  minLength: 3,
  maxLength: 25,
}).map((s) => s.trim() || 'flour');

const arbIngredient: fc.Arbitrary<SearchableIngredient> = fc.record({
  id: fc.uuid(),
  name: arbName,
  category: arbCategory,
  default_density_g_per_ml: fc.oneof(
    fc.constant(null),
    fc.double({ min: 0.3, max: 2.5, noNaN: true }),
  ),
});

const arbAlias = (ingredientIds: string[]): fc.Arbitrary<SearchableAlias> =>
  fc.record({
    ingredient_master_id: fc.constantFrom(...ingredientIds),
    alias_name: arbName,
  });

/** Build a consistent set of ingredients + aliases */
function arbIngredientsWithAliases() {
  return fc
    .array(arbIngredient, { minLength: 2, maxLength: 20 })
    .chain((ingredients) => {
      const ids = ingredients.map((i) => i.id);
      return fc
        .array(arbAlias(ids), { minLength: 0, maxLength: 15 })
        .map((aliases) => ({ ingredients, aliases }));
    });
}

/** Generate a search query string */
const arbQuery = fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz '.split('')), {
  minLength: 2,
  maxLength: 20,
}).map((s) => s.trim() || 'sugar');

// ── Property Tests ───────────────────────────────────────────────────────────

describe('Search Engine – Property-Based Tests', () => {
  it('Property 6a: results are ranked by similarity score in descending order', () => {
    fc.assert(
      fc.property(
        arbIngredientsWithAliases(),
        arbQuery,
        ({ ingredients, aliases }, query) => {
          const results = searchIngredient(query, ingredients, aliases);

          for (let i = 1; i < results.length; i++) {
            expect(results[i].similarity_score).toBeLessThanOrEqual(
              results[i - 1].similarity_score,
            );
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it('Property 6b: all results have similarity scores between 0 and 1 (inclusive)', () => {
    fc.assert(
      fc.property(
        arbIngredientsWithAliases(),
        arbQuery,
        ({ ingredients, aliases }, query) => {
          const results = searchIngredient(query, ingredients, aliases);

          for (const result of results) {
            expect(result.similarity_score).toBeGreaterThanOrEqual(0);
            expect(result.similarity_score).toBeLessThanOrEqual(1);
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it('Property 6c: all results meet the default similarity threshold', () => {
    fc.assert(
      fc.property(
        arbIngredientsWithAliases(),
        arbQuery,
        ({ ingredients, aliases }, query) => {
          const results = searchIngredient(query, ingredients, aliases);

          for (const result of results) {
            expect(result.similarity_score).toBeGreaterThanOrEqual(
              DEFAULT_SIMILARITY_THRESHOLD,
            );
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it('Property 6d: every result has required fields populated', () => {
    fc.assert(
      fc.property(
        arbIngredientsWithAliases(),
        arbQuery,
        ({ ingredients, aliases }, query) => {
          const results = searchIngredient(query, ingredients, aliases);

          for (const result of results) {
            expect(result.ingredient_id).toBeTruthy();
            expect(result.ingredient_name).toBeTruthy();
            expect(result.category).toBeTruthy();
            expect(['canonical', 'alias']).toContain(result.match_type);
            expect(typeof result.similarity_score).toBe('number');

            if (result.match_type === 'alias') {
              expect(result.matched_alias).toBeTruthy();
            }
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it('Property 6e: exact match always produces the highest possible score for that ingredient', () => {
    fc.assert(
      fc.property(
        arbIngredientsWithAliases(),
        ({ ingredients, aliases }) => {
          // Pick the first ingredient's name as the query (exact match)
          const query = ingredients[0].name;
          const results = searchIngredient(query, ingredients, aliases);

          if (results.length === 0) return; // skip if threshold not met

          // The exact-match ingredient should appear with score = trigramSimilarity(name, name)
          const exactScore = trigramSimilarity(query, query);
          const match = results.find(
            (r) =>
              r.ingredient_id === ingredients[0].id &&
              r.match_type === 'canonical',
          );

          if (match) {
            expect(match.similarity_score).toBeCloseTo(exactScore, 10);
            // It should be the top result or tied for top
            expect(match.similarity_score).toBe(results[0].similarity_score);
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it('Property 6f: empty or whitespace-only query returns no results', () => {
    fc.assert(
      fc.property(
        arbIngredientsWithAliases(),
        fc.constantFrom('', '   ', '\t', '\n'),
        ({ ingredients, aliases }, query) => {
          const results = searchIngredient(query, ingredients, aliases);
          expect(results).toHaveLength(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Property 6g: trigramSimilarity is symmetric – sim(a,b) === sim(b,a)', () => {
    fc.assert(
      fc.property(arbName, arbName, (a, b) => {
        expect(trigramSimilarity(a, b)).toBe(trigramSimilarity(b, a));
      }),
      { numRuns: 200 },
    );
  });

  it('Property 6h: lowering the threshold never reduces the result count', () => {
    fc.assert(
      fc.property(
        arbIngredientsWithAliases(),
        arbQuery,
        ({ ingredients, aliases }, query) => {
          const strictResults = searchIngredient(
            query, ingredients, aliases, DEFAULT_SIMILARITY_THRESHOLD,
          );
          const lenientResults = searchIngredient(
            query, ingredients, aliases, 0.1,
          );

          expect(lenientResults.length).toBeGreaterThanOrEqual(strictResults.length);
        },
      ),
      { numRuns: 200 },
    );
  });
});
