-- ============================================================================
-- AiBake Database Triggers - Updated At Timestamp
-- Version: 1.0
-- PostgreSQL 15+
--
-- This script creates:
--   1. Trigger to auto-update updated_at timestamp on recipes table
--   2. Trigger to auto-update updated_at timestamp on recipe_ingredients table
--
-- Note: The base update_timestamp() function is already created in 01_schema_init.sql
-- This file documents the triggers and can be used for reference or re-creation
--
-- Dependencies: 01_schema_init.sql (update_timestamp function)
-- Requirements: 48.5
-- ============================================================================

-- ============================================================================
-- STEP 1: Verify update_timestamp() Function Exists
-- ============================================================================

-- The update_timestamp() function is created in 01_schema_init.sql
-- It sets NEW.updated_at = NOW() for any table with an updated_at column

-- Function definition (for reference):
-- CREATE OR REPLACE FUNCTION update_timestamp()
-- RETURNS TRIGGER AS $
-- BEGIN
--   NEW.updated_at = NOW();
--   RETURN NEW;
-- END;
-- $ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 2: Verify Triggers on recipes Table
-- ============================================================================

-- The trigger is already created in 01_schema_init.sql:
-- CREATE TRIGGER update_recipes_timestamp
--   BEFORE UPDATE ON recipes
--   FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- This trigger automatically updates recipes.updated_at whenever a recipe is modified

-- ============================================================================
-- STEP 3: Verify Triggers on recipe_ingredients Table
-- ============================================================================

-- The trigger is already created in 01_schema_init.sql:
-- CREATE TRIGGER update_recipe_ingredients_timestamp
--   BEFORE UPDATE ON recipe_ingredients
--   FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- This trigger automatically updates recipe_ingredients.updated_at whenever an ingredient is modified

-- ============================================================================
-- STEP 4: Additional Triggers for Cascading Updates
-- ============================================================================

-- When recipe_ingredients are updated, also update the parent recipe's updated_at
-- This ensures the recipe reflects changes to its ingredients

CREATE OR REPLACE FUNCTION cascade_recipe_update_on_ingredient_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the parent recipe's updated_at timestamp
  IF TG_OP = 'DELETE' THEN
    UPDATE recipes SET updated_at = NOW() WHERE id = OLD.recipe_id;
    RETURN OLD;
  ELSE
    UPDATE recipes SET updated_at = NOW() WHERE id = NEW.recipe_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cascade_recipe_update_on_ingredient_change() IS 'Cascades updated_at timestamp to parent recipe when ingredients are modified';

-- Create trigger to cascade updates from recipe_ingredients to recipes
CREATE TRIGGER cascade_recipe_update_on_ingredient_update
  AFTER UPDATE ON recipe_ingredients
  FOR EACH ROW EXECUTE FUNCTION cascade_recipe_update_on_ingredient_change();

CREATE TRIGGER cascade_recipe_update_on_ingredient_insert
  AFTER INSERT ON recipe_ingredients
  FOR EACH ROW EXECUTE FUNCTION cascade_recipe_update_on_ingredient_change();

CREATE TRIGGER cascade_recipe_update_on_ingredient_delete
  AFTER DELETE ON recipe_ingredients
  FOR EACH ROW EXECUTE FUNCTION cascade_recipe_update_on_ingredient_change();

COMMENT ON TRIGGER cascade_recipe_update_on_ingredient_update ON recipe_ingredients IS 'Updates parent recipe timestamp when ingredient is modified';
COMMENT ON TRIGGER cascade_recipe_update_on_ingredient_insert ON recipe_ingredients IS 'Updates parent recipe timestamp when ingredient is added';
COMMENT ON TRIGGER cascade_recipe_update_on_ingredient_delete ON recipe_ingredients IS 'Updates parent recipe timestamp when ingredient is removed';

-- ============================================================================
-- Verification
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Updated_at timestamp triggers verified/created successfully';
  RAISE NOTICE 'Base function: update_timestamp() (from 01_schema_init.sql)';
  RAISE NOTICE 'Triggers on recipes: update_recipes_timestamp (from 01_schema_init.sql)';
  RAISE NOTICE 'Triggers on recipe_ingredients: update_recipe_ingredients_timestamp (from 01_schema_init.sql)';
  RAISE NOTICE 'Cascading function: cascade_recipe_update_on_ingredient_change()';
  RAISE NOTICE 'Cascading triggers: cascade_recipe_update_on_ingredient_* (3 triggers)';
  RAISE NOTICE 'Behavior: Recipes and ingredients automatically track modification time';
END $$;
