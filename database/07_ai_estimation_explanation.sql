-- ============================================================================
-- AiBake Database Migration - AI Estimation Explanation
-- Version: 1.1
-- PostgreSQL 15+
--
-- This script adds:
--   1. estimated_aw_explanation column to recipes table
-- ============================================================================

ALTER TABLE recipes
  ADD COLUMN estimated_aw_explanation TEXT;

COMMENT ON COLUMN recipes.estimated_aw_explanation IS 'Detailed explanation from AI regarding water activity and shelf life estimations';

DO $$
BEGIN
  RAISE NOTICE 'AiBake AI explanation field migration complete';
  RAISE NOTICE 'Recipes table: +1 column (estimated_aw_explanation)';
END $$;
