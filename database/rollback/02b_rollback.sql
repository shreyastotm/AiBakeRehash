-- ============================================================================
-- Rollback Script for Migration 02b: seed_ingredient_aliases
-- This script removes the seeded ingredient aliases
-- ============================================================================

-- Delete all seeded aliases
DELETE FROM ingredient_aliases 
WHERE alias_type IN ('abbreviation', 'regional', 'brand', 'common');

-- ============================================================================
-- Rollback complete
-- ============================================================================
