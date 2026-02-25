-- ============================================================================
-- Rollback Script for Migration 06: mvp_advanced_recipe_fields
-- This script removes advanced recipe fields
-- ============================================================================

-- Remove advanced recipe fields
ALTER TABLE recipes DROP COLUMN IF EXISTS target_water_activity;
ALTER TABLE recipes DROP COLUMN IF EXISTS min_safe_water_activity;
ALTER TABLE recipes DROP COLUMN IF EXISTS estimated_shelf_life_days;
ALTER TABLE recipes DROP COLUMN IF EXISTS total_hydration_percentage;

-- Remove advanced journal fields
ALTER TABLE recipe_journal_entries DROP COLUMN IF EXISTS measured_water_activity;
ALTER TABLE recipe_journal_entries DROP COLUMN IF EXISTS storage_days_achieved;
ALTER TABLE recipe_journal_entries DROP COLUMN IF EXISTS pre_bake_weight_grams;
ALTER TABLE recipe_journal_entries DROP COLUMN IF EXISTS baking_loss_grams;
ALTER TABLE recipe_journal_entries DROP COLUMN IF EXISTS baking_loss_percentage;

-- ============================================================================
-- Rollback complete
-- ============================================================================
