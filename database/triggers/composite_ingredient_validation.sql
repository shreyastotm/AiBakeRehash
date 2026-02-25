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
  IF TG_OP = 'DELETE' THEN
    composite_id := OLD.composite_ingredient_id;
  ELSE
    composite_id := NEW.composite_ingredient_id;
  END IF;
  
  SELECT COALESCE(SUM(percentage), 0)
  INTO total_percentage
  FROM composite_ingredient_components
  WHERE composite_ingredient_id = composite_id;
  
  IF total_percentage != 100 THEN
    RAISE EXCEPTION 'Composite ingredient components must sum to 100%%. Current total: %', total_percentage;
  END IF;
  
  RETURN CASE 
    WHEN TG_OP = 'DELETE' THEN OLD
    ELSE NEW
  END;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist (from schema_init), then recreate
DROP TRIGGER IF EXISTS validate_composite_percentages_on_insert ON composite_ingredient_components;
DROP TRIGGER IF EXISTS validate_composite_percentages_on_update ON composite_ingredient_components;
DROP TRIGGER IF EXISTS validate_composite_percentages_on_delete ON composite_ingredient_components;

CREATE TRIGGER validate_composite_percentages_on_insert
  AFTER INSERT ON composite_ingredient_components
  FOR EACH ROW EXECUTE FUNCTION validate_composite_ingredient_percentages();

CREATE TRIGGER validate_composite_percentages_on_update
  AFTER UPDATE ON composite_ingredient_components
  FOR EACH ROW EXECUTE FUNCTION validate_composite_ingredient_percentages();

CREATE TRIGGER validate_composite_percentages_on_delete
  AFTER DELETE ON composite_ingredient_components
  FOR EACH ROW EXECUTE FUNCTION validate_composite_ingredient_percentages();


-- ============================================================================
-- Helper Functions
-- ============================================================================

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
  SELECT COALESCE(SUM(cic.percentage), 0), COUNT(*)
  INTO v_total_percentage, v_component_count
  FROM composite_ingredient_components cic
  WHERE cic.composite_ingredient_id = p_composite_id;
  
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
  SELECT ccv.* 
  FROM composite_ingredients ci,
  LATERAL check_composite_ingredient_validity(ci.id) ccv;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  RAISE NOTICE 'Composite ingredient validation triggers created successfully';
END $$;
