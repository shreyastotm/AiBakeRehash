-- Function: calculate_hydration_percentage
-- Purpose: Calculate baker's percentage (water-to-flour ratio) for dough recipes
-- Returns: Hydration percentage or NULL for non-dough recipes
-- Formula: (total_liquid_weight / total_flour_weight) * 100
-- Requirements: 48.4, 16.5

CREATE OR REPLACE FUNCTION calculate_hydration_percentage(recipe_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_flour_weight NUMERIC;
  v_liquid_weight NUMERIC;
  v_hydration NUMERIC;
BEGIN
  -- Sum all flour category ingredients
  SELECT COALESCE(SUM(ri.quantity_grams), 0) INTO v_flour_weight
  FROM recipe_ingredients ri
  JOIN ingredient_master im ON ri.ingredient_master_id = im.id
  WHERE ri.recipe_id = recipe_id
    AND im.category = 'flour';
  
  -- Sum all liquid and dairy category ingredients
  SELECT COALESCE(SUM(ri.quantity_grams), 0) INTO v_liquid_weight
  FROM recipe_ingredients ri
  JOIN ingredient_master im ON ri.ingredient_master_id = im.id
  WHERE ri.recipe_id = recipe_id
    AND im.category IN ('liquid', 'dairy');
  
  -- Return NULL for non-dough recipes (zero flour)
  IF v_flour_weight = 0 THEN
    RETURN NULL;
  END IF;
  
  -- Calculate hydration percentage
  v_hydration := (v_liquid_weight / v_flour_weight) * 100;
  
  RETURN ROUND(v_hydration::NUMERIC, 2);
END;
$$ LANGUAGE plpgsql STABLE;
