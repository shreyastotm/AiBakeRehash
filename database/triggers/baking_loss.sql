-- ============================================================================
-- AiBake Database Triggers - Baking Loss Calculation
-- Version: 1.0
-- PostgreSQL 15+
--
-- This script creates:
--   1. Trigger to auto-calculate baking_loss_grams and baking_loss_percentage
--      when pre_bake_weight_grams and outcome_weight_grams are set
--
-- Dependencies: 06_mvp_advanced_recipe_fields.sql (recipe_journal_entries table)
-- Requirements: 16.2
-- ============================================================================

-- ============================================================================
-- STEP 1: Create Baking Loss Calculation Trigger Function
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_baking_loss()
RETURNS TRIGGER AS $$
BEGIN
  -- Only calculate if both pre_bake_weight_grams and outcome_weight_grams are provided
  IF NEW.pre_bake_weight_grams IS NOT NULL AND NEW.outcome_weight_grams IS NOT NULL THEN
    -- Calculate baking loss in grams
    NEW.baking_loss_grams := NEW.pre_bake_weight_grams - NEW.outcome_weight_grams;
    
    -- Calculate baking loss percentage: (loss / pre_bake) × 100
    -- Only calculate if pre_bake_weight_grams > 0 to avoid division by zero
    IF NEW.pre_bake_weight_grams > 0 THEN
      NEW.baking_loss_percentage := (NEW.baking_loss_grams / NEW.pre_bake_weight_grams) * 100;
    ELSE
      NEW.baking_loss_percentage := NULL;
    END IF;
  ELSE
    -- If either weight is NULL, clear the calculated fields
    NEW.baking_loss_grams := NULL;
    NEW.baking_loss_percentage := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_baking_loss() IS 'Automatically calculates baking_loss_grams and baking_loss_percentage when pre_bake_weight_grams and outcome_weight_grams are set';

-- ============================================================================
-- STEP 2: Create Trigger on recipe_journal_entries
-- ============================================================================

CREATE TRIGGER calculate_baking_loss_on_insert
  BEFORE INSERT ON recipe_journal_entries
  FOR EACH ROW EXECUTE FUNCTION calculate_baking_loss();

CREATE TRIGGER calculate_baking_loss_on_update
  BEFORE UPDATE ON recipe_journal_entries
  FOR EACH ROW EXECUTE FUNCTION calculate_baking_loss();

COMMENT ON TRIGGER calculate_baking_loss_on_insert ON recipe_journal_entries IS 'Calculates baking loss on journal entry creation';
COMMENT ON TRIGGER calculate_baking_loss_on_update ON recipe_journal_entries IS 'Recalculates baking loss when journal entry is updated';

-- ============================================================================
-- Verification
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Baking loss calculation triggers created successfully';
  RAISE NOTICE 'Function: calculate_baking_loss()';
  RAISE NOTICE 'Triggers: calculate_baking_loss_on_insert, calculate_baking_loss_on_update';
  RAISE NOTICE 'Behavior: Automatically calculates baking_loss_grams and baking_loss_percentage';
END $$;
