-- ============================================================================
-- AiBake Database Triggers - Composite Ingredient Validation
-- Version: 1.0
-- PostgreSQL 15+
--
-- This script creates:
--   1. Trigger to validate composite ingredient component percentages sum to 100
--
-- Dependencies: 01_schema_init.sql (composite_ingredients, composite_ingredient_components tables)
-- Requirements: 18.3
-- ============================================================================

-- ============================================================================
-- STEP 1: Create Composite Ingredient Validation Trigger Function
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_composite_ingredient_percentages()
RETURNS TRIGGER AS $$
DECLARE
  total_percentage NUMERIC(5,2);
  composite_id UUID;
BEGIN
  -- Determine which composite ingredient to validate
  IF TG_OP = 'DELETE' THEN
    composite_id := OLD.composite_ingredient_id;
  ELSE
    composite_id := NEW.composite_ingredient_id;
  END IF;
  
  -- Calculate total percentage for all components of this composite ingredient
  SELECT COALESCE(SUM(percentage), 0)
  INTO total_percentage
  FROM composite_ingredient_components
  WHERE composite_ingredient_id = composite_id;
  
  -- Validate that percentages sum to exactly 100
  IF total_percentage != 100 THEN
    RAISE EXCEPTION 'Composite ingredient components must sum to 100%%. Current total: %%.%%', 
      total_percentage;
  END IF;
  
  RETURN CASE 
    WHEN TG_OP = 'DELETE' THEN OLD
    ELSE NEW
  END;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_composite_ingredient_percentages() IS 'Validates that composite ingredient component percentages sum to exactly 100%';

-- ============================================================================
-- STEP 2: Create Triggers on composite_ingredient_components Table
-- ============================================================================

-- Trigger on INSERT to validate percentages when adding a new component
CREATE TRIGGER validate_composite_percentages_on_insert
  AFTER INSERT ON composite_ingredient_components
  FOR EACH ROW EXECUTE FUNCTION validate_composite_ingredient_percentages();

COMMENT ON TRIGGER validate_composite_percentages_on_insert ON composite_ingredient_components IS 'Validates component percentages sum to 100 when adding a new component';

-- Trigger on UPDATE to validate percentages when modifying a component
CREATE TRIGGER validate_composite_percentages_on_update
  AFTER UPDATE ON composite_ingredient_components
  FOR EACH ROW EXECUTE FUNCTION validate_composite_ingredient_percentages();

COMMENT ON TRIGGER validate_composite_percentages_on_update ON composite_ingredient_components IS 'Validates component percentages sum to 100 when modifying a component';

-- Trigger on DELETE to validate percentages when removing a component
CREATE TRIGGER validate_composite_percentages_on_delete
  AFTER DELETE ON composite_ingredient_components
  FOR EACH ROW EXECUTE FUNCTION validate_composite_ingredient_percentages();

COMMENT ON TRIGGER validate_composite_percentages_on_delete ON composite_ingredient_components IS 'Validates component percentages sum to 100 when removing a component';

-- ============================================================================
-- STEP 3: Create Helper Function for Bulk Operations
-- ============================================================================

-- Function to check if a composite ingredient is valid (for manual validation)
CREATE OR REPLACE FUNCTION check_composite_ingredient_validity(p_composite_id UUID)
RETURNS TABLE (
  composite_id UUID,
  total_percentage NUMERIC(5,2),
  is_valid BOOLEAN,
  component_count INTEGER,
  error_message TEXT
) AS $$
DECLARE
  v_total_percentage NUMERIC(5,2);
  v_component_count INTEGER;
BEGIN
  -- Get total percentage and component count
  SELECT 
    COALESCE(SUM(percentage), 0),
    COUNT(*)
  INTO v_total_percentage, v_component_count
  FROM composite_ingredient_components
  WHERE composite_ingredient_id = p_composite_id;
  
  -- Return validation result
  RETURN QUERY SELECT
    p_composite_id,
    v_total_percentage,
    (v_total_percentage = 100) AS is_valid,
    v_component_count,
    CASE 
      WHEN v_component_count = 0 THEN 'No components defined'
      WHEN v_total_percentage < 100 THEN 'Percentages sum to ' || v_total_percentage || '% (need 100%)'
      WHEN v_total_percentage > 100 THEN 'Percentages sum to ' || v_total_percentage || '% (exceeds 100%)'
      ELSE NULL
    END AS error_message;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_composite_ingredient_validity(UUID) IS 'Helper function to manually check if a composite ingredient has valid component percentages';

-- ============================================================================
-- STEP 4: Create Function to Validate All Composite Ingredients
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_all_composite_ingredients()
RETURNS TABLE (
  composite_id UUID,
  total_percentage NUMERIC(5,2),
  is_valid BOOLEAN,
  component_count INTEGER,
  error_message TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM check_composite_ingredient_validity(ci.id)
  FROM composite_ingredients ci;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_all_composite_ingredients() IS 'Validates all composite ingredients in the database';

-- ============================================================================
-- Verification
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Composite ingredient validation triggers created successfully';
  RAISE NOTICE 'Function: validate_composite_ingredient_percentages()';
  RAISE NOTICE 'Triggers: validate_composite_percentages_on_insert, validate_composite_percentages_on_update, validate_composite_percentages_on_delete';
  RAISE NOTICE 'Helper functions: check_composite_ingredient_validity(), validate_all_composite_ingredients()';
  RAISE NOTICE 'Behavior: Ensures component percentages always sum to exactly 100%%';
  RAISE NOTICE 'Usage: SELECT * FROM validate_all_composite_ingredients() to check all composites';
END $$;
