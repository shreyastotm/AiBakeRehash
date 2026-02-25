-- ============================================================================
-- AiBake Database Migration - Advanced Recipe Fields
-- Version: 1.0
-- PostgreSQL 15+
--
-- This script adds:
--   1. Water activity and shelf life columns to recipes table
--   2. Hydration percentage column to recipes table
--   3. Baking loss and water activity columns to recipe_journal_entries table
--   4. Check constraints for data integrity
--
-- Dependencies: 01_schema_init.sql (recipes, recipe_journal_entries tables)
-- Requirements: 15.1, 16.1
-- ============================================================================

-- ============================================================================
-- STEP 1: Add Advanced Columns to Recipes Table
-- ============================================================================

-- Water activity tracking fields
ALTER TABLE recipes
  ADD COLUMN target_water_activity NUMERIC(4,3),
  ADD COLUMN min_safe_water_activity NUMERIC(4,3),
  ADD COLUMN estimated_shelf_life_days INTEGER,
  ADD COLUMN total_hydration_percentage NUMERIC(7,3);

-- Check constraints for water activity (0.00 to 1.00)
ALTER TABLE recipes
  ADD CONSTRAINT chk_recipes_target_aw_range
    CHECK (target_water_activity IS NULL OR (target_water_activity >= 0.00 AND target_water_activity <= 1.00)),
  ADD CONSTRAINT chk_recipes_min_safe_aw_range
    CHECK (min_safe_water_activity IS NULL OR (min_safe_water_activity >= 0.00 AND min_safe_water_activity <= 1.00)),
  ADD CONSTRAINT chk_recipes_shelf_life_positive
    CHECK (estimated_shelf_life_days IS NULL OR estimated_shelf_life_days > 0),
  ADD CONSTRAINT chk_recipes_hydration_non_negative
    CHECK (total_hydration_percentage IS NULL OR total_hydration_percentage >= 0);

COMMENT ON COLUMN recipes.target_water_activity IS 'Target water activity (aw) for the finished product (0.00-1.00)';
COMMENT ON COLUMN recipes.min_safe_water_activity IS 'Minimum safe water activity threshold for food safety (0.00-1.00)';
COMMENT ON COLUMN recipes.estimated_shelf_life_days IS 'Estimated shelf life in days based on water activity';
COMMENT ON COLUMN recipes.total_hydration_percentage IS 'Baker''s percentage: (total liquid / total flour) × 100';

-- ============================================================================
-- STEP 2: Add Advanced Columns to Recipe Journal Entries Table
-- ============================================================================

ALTER TABLE recipe_journal_entries
  ADD COLUMN measured_water_activity NUMERIC(4,3),
  ADD COLUMN storage_days_achieved INTEGER,
  ADD COLUMN pre_bake_weight_grams NUMERIC(12,4),
  ADD COLUMN baking_loss_grams NUMERIC(12,4),
  ADD COLUMN baking_loss_percentage NUMERIC(6,3);

-- Check constraints for journal entry fields
ALTER TABLE recipe_journal_entries
  ADD CONSTRAINT chk_journal_measured_aw_range
    CHECK (measured_water_activity IS NULL OR (measured_water_activity >= 0.00 AND measured_water_activity <= 1.00)),
  ADD CONSTRAINT chk_journal_storage_days_positive
    CHECK (storage_days_achieved IS NULL OR storage_days_achieved >= 0),
  ADD CONSTRAINT chk_journal_pre_bake_weight_positive
    CHECK (pre_bake_weight_grams IS NULL OR pre_bake_weight_grams > 0),
  ADD CONSTRAINT chk_journal_baking_loss_grams_non_negative
    CHECK (baking_loss_grams IS NULL OR baking_loss_grams >= 0),
  ADD CONSTRAINT chk_journal_baking_loss_pct_range
    CHECK (baking_loss_percentage IS NULL OR (baking_loss_percentage >= 0 AND baking_loss_percentage <= 100));

COMMENT ON COLUMN recipe_journal_entries.measured_water_activity IS 'Actual measured water activity of the finished product (0.00-1.00)';
COMMENT ON COLUMN recipe_journal_entries.storage_days_achieved IS 'Actual number of days the product remained fresh';
COMMENT ON COLUMN recipe_journal_entries.pre_bake_weight_grams IS 'Weight of dough/batter before baking in grams';
COMMENT ON COLUMN recipe_journal_entries.baking_loss_grams IS 'Weight lost during baking (pre_bake - outcome) in grams';
COMMENT ON COLUMN recipe_journal_entries.baking_loss_percentage IS 'Percentage of weight lost during baking: (loss / pre_bake) × 100';

-- ============================================================================
-- Verification
-- ============================================================================

DO $
BEGIN
  RAISE NOTICE 'AiBake advanced recipe fields migration complete';
  RAISE NOTICE 'Recipes table: +4 columns (target_water_activity, min_safe_water_activity, estimated_shelf_life_days, total_hydration_percentage)';
  RAISE NOTICE 'Journal entries table: +5 columns (measured_water_activity, storage_days_achieved, pre_bake_weight_grams, baking_loss_grams, baking_loss_percentage)';
  RAISE NOTICE 'Constraints: 9 check constraints added for data integrity';
END $;
