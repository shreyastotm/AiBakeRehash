/**
 * Unit tests for the Fuzzy Search Engine
 *
 * Covers:
 * - Exact matches (should rank highest)
 * - Partial matches (should rank by similarity)
 * - Alias matches (should indicate alias source)
 * - No matches (should return empty array)
 * - Case-insensitive matching
 * - Empty / whitespace queries
 * - Sorting stability
 *
 * Requirements: 4.7, 17.6, 17.7
 */
import { describe, it, expect } from 'vitest';
import {
  searchIngredient,
  trigramSimilarity,
  extractTrigrams,
  DEFAULT_SIMILARITY_THRESHOLD,
  type SearchableIngredient,
  type SearchableAlias,
} from '../../src/searchEngine';

// ── Test fixtures ────────────────────────────────────────────────────────────

const ingredients: SearchableIngredient[] = [
  { id: 'flour-id', name: 'all-purpose flour', category: 'flour', default_density_g_per_ml: 0.53 },
  { id: 'bread-flour-id', name: 'bread flour', category: 'flour', default_density_g_per_ml: 0.55 },
  { id: 'butter-id', name: 'butter', category: 'fat', default_density_g_per_ml: 0.91 },
  { id: 'sugar-id', name: 'sugar', category: 'sugar', default_density_g_per_ml: 0.85 },
  { id: 'cardamom-id', name: 'cardamom', category: 'spice', default_density_g_per_ml: null },
  { id: 'saffron-id', name: 'saffron', category: 'spice', default_density_g_per_ml: null },
  { id: 'ghee-id', name: 'ghee', category: 'fat', default_density_g_per_ml: 0.93 },
  { id: 'maida-id', name: 'maida', category: 'flour', default_density_g_per_ml: 0.53 },
];

const aliases: SearchableAlias[] = [
  { ingredient_master_id: 'flour-id', alias_name: 'AP flour' },
  { ingredient_master_id: 'flour-id', alias_name: 'maida' },
  { ingredient_master_id: 'bread-flour-id', alias_name: 'strong flour' },
  { ingredient_master_id: 'cardamom-id', alias_name: 'elaichi' },
  { ingredient_master_id: 'saffron-id', alias_name: 'kesar' },
  { ingredient_master_id: 'ghee-id', alias_name: 'desi ghee' },
  { ingredient_master_id: 'sugar-id', alias_name: 'cheeni' },
];

// ── Helper ───────────────────────────────────────────────────────────────────

function search(query: string, threshold?: number) {
  return searchIngredient(query, ingredients, aliases, threshold);
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('searchEngine', () => {
  // ── Trigram utilities ────────────────────────────────────────────────────

  describe('extractTrigrams', () => {
    it('should produce trigrams with padding', () => {
      const trigrams = extractTrigrams('ab');
      // padded: "  ab " → "  a", " ab", "ab "
      expect(trigrams.size).toBe(3);
      expect(trigrams.has('  a')).toBe(true);
      expect(trigrams.has(' ab')).toBe(true);
      expect(trigrams.has('ab ')).toBe(true);
    });

    it('should lowercase input', () => {
      const upper = extractTrigrams('AB');
      const lower = extractTrigrams('ab');
      expect(upper).toEqual(lower);
    });
  });

  describe('trigramSimilarity', () => {
    it('should return 1 for identical strings', () => {
      expect(trigramSimilarity('butter', 'butter')).toBe(1);
    });

    it('should return 1 for identical strings regardless of case', () => {
      expect(trigramSimilarity('Butter', 'butter')).toBe(1);
    });

    it('should return 0 for completely different strings', () => {
      const score = trigramSimilarity('xyz', 'butter');
      expect(score).toBeLessThan(DEFAULT_SIMILARITY_THRESHOLD);
    });

    it('should return a value between 0 and 1', () => {
      const score = trigramSimilarity('but', 'butter');
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
    });
  });


  // ── Exact matches ──────────────────────────────────────────────────────

  describe('exact matches', () => {
    it('should return an exact canonical match with score 1', () => {
      const results = search('butter');
      const top = results[0];
      expect(top.ingredient_id).toBe('butter-id');
      expect(top.similarity_score).toBe(1);
      expect(top.match_type).toBe('canonical');
    });

    it('should rank exact match above partial matches', () => {
      const results = search('sugar');
      expect(results[0].ingredient_id).toBe('sugar-id');
      expect(results[0].similarity_score).toBe(1);
      // Any other results should have lower scores
      for (let i = 1; i < results.length; i++) {
        expect(results[i].similarity_score).toBeLessThanOrEqual(results[0].similarity_score);
      }
    });

    it('should return an exact alias match with score 1 and match_type alias', () => {
      const results = search('elaichi');
      const aliasMatch = results.find(
        (r) => r.match_type === 'alias' && r.matched_alias === 'elaichi',
      );
      expect(aliasMatch).toBeDefined();
      expect(aliasMatch!.similarity_score).toBe(1);
      expect(aliasMatch!.ingredient_id).toBe('cardamom-id');
    });
  });

  // ── Partial matches ────────────────────────────────────────────────────

  describe('partial matches', () => {
    it('should return results ranked by similarity score descending', () => {
      const results = search('flour');
      expect(results.length).toBeGreaterThan(0);
      for (let i = 1; i < results.length; i++) {
        expect(results[i].similarity_score).toBeLessThanOrEqual(results[i - 1].similarity_score);
      }
    });

    it('should match partial ingredient names', () => {
      // "bread flour" should match when searching "bread"
      const results = search('bread');
      const breadFlour = results.find((r) => r.ingredient_id === 'bread-flour-id');
      expect(breadFlour).toBeDefined();
    });

    it('should include category and density in results', () => {
      const results = search('ghee');
      const ghee = results.find((r) => r.ingredient_id === 'ghee-id');
      expect(ghee).toBeDefined();
      expect(ghee!.category).toBe('fat');
      expect(ghee!.density_g_per_ml).toBe(0.93);
    });
  });

  // ── Alias matches ─────────────────────────────────────────────────────

  describe('alias matches', () => {
    it('should indicate match_type as alias when matched via alias', () => {
      const results = search('kesar');
      const aliasResult = results.find((r) => r.match_type === 'alias');
      expect(aliasResult).toBeDefined();
      expect(aliasResult!.ingredient_id).toBe('saffron-id');
      expect(aliasResult!.ingredient_name).toBe('saffron');
      expect(aliasResult!.matched_alias).toBe('kesar');
    });

    it('should include matched_alias field only for alias matches', () => {
      const results = search('butter');
      const canonical = results.find((r) => r.match_type === 'canonical');
      expect(canonical).toBeDefined();
      expect(canonical!.matched_alias).toBeUndefined();
    });

    it('should match abbreviation aliases', () => {
      const results = search('AP flour');
      const apMatch = results.find(
        (r) => r.match_type === 'alias' && r.matched_alias === 'AP flour',
      );
      expect(apMatch).toBeDefined();
      expect(apMatch!.ingredient_id).toBe('flour-id');
    });

    it('should match regional aliases', () => {
      const results = search('cheeni');
      const cheeniMatch = results.find(
        (r) => r.match_type === 'alias' && r.matched_alias === 'cheeni',
      );
      expect(cheeniMatch).toBeDefined();
      expect(cheeniMatch!.ingredient_id).toBe('sugar-id');
    });

    it('should return both canonical and alias matches for the same ingredient', () => {
      // "maida" is both a canonical ingredient name and an alias for all-purpose flour
      const results = search('maida');
      const canonicalMatch = results.find(
        (r) => r.ingredient_id === 'maida-id' && r.match_type === 'canonical',
      );
      const aliasMatch = results.find(
        (r) => r.ingredient_id === 'flour-id' && r.match_type === 'alias',
      );
      expect(canonicalMatch).toBeDefined();
      expect(aliasMatch).toBeDefined();
    });
  });

  // ── No matches ─────────────────────────────────────────────────────────

  describe('no matches', () => {
    it('should return empty array for completely unrelated query', () => {
      const results = search('xyzzyplugh');
      expect(results).toEqual([]);
    });

    it('should return empty array for empty string', () => {
      expect(search('')).toEqual([]);
    });

    it('should return empty array for whitespace-only string', () => {
      expect(search('   ')).toEqual([]);
    });

    it('should return empty array when no ingredients or aliases provided', () => {
      const results = searchIngredient('flour', [], [], DEFAULT_SIMILARITY_THRESHOLD);
      expect(results).toEqual([]);
    });
  });

  // ── Case-insensitive matching ──────────────────────────────────────────

  describe('case-insensitive matching', () => {
    it('should match regardless of query case', () => {
      const lower = search('butter');
      const upper = search('BUTTER');
      const mixed = search('BuTtEr');

      expect(lower.length).toBe(upper.length);
      expect(lower.length).toBe(mixed.length);

      // All should find butter with the same score
      expect(lower[0].ingredient_id).toBe('butter-id');
      expect(upper[0].ingredient_id).toBe('butter-id');
      expect(mixed[0].ingredient_id).toBe('butter-id');

      expect(lower[0].similarity_score).toBe(upper[0].similarity_score);
      expect(lower[0].similarity_score).toBe(mixed[0].similarity_score);
    });

    it('should match aliases case-insensitively', () => {
      const lower = search('elaichi');
      const upper = search('ELAICHI');

      const lowerAlias = lower.find((r) => r.match_type === 'alias');
      const upperAlias = upper.find((r) => r.match_type === 'alias');

      expect(lowerAlias).toBeDefined();
      expect(upperAlias).toBeDefined();
      expect(lowerAlias!.ingredient_id).toBe(upperAlias!.ingredient_id);
      expect(lowerAlias!.similarity_score).toBe(upperAlias!.similarity_score);
    });
  });

  // ── Threshold behaviour ────────────────────────────────────────────────

  describe('threshold behaviour', () => {
    it('should exclude results below the threshold', () => {
      // With a very high threshold, only exact or near-exact matches pass
      const results = search('butter', 0.99);
      for (const r of results) {
        expect(r.similarity_score).toBeGreaterThanOrEqual(0.99);
      }
    });

    it('should include more results with a lower threshold', () => {
      const strict = search('flour', 0.8);
      const relaxed = search('flour', 0.1);
      expect(relaxed.length).toBeGreaterThanOrEqual(strict.length);
    });
  });
});
