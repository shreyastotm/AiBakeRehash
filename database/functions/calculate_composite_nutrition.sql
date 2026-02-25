-- Function: calculate_composite_nutrition
-- Purpose: Calculate weighted average nutrition for composite ingredients
-- Returns: Nutrition data (energy_kcal, protein_g, fat_g, carbs_g, fiber_g) per 100g
-- Requirements: 48.3, 18.5

CREATE OR REPLACE FUNCTION calculate_composite_nutrition(composite_ingredient_id UUID)
RETURNS TABLE (
  energy_kcal NUMERIC,
  protein_g NUMERIC,
  fat_g NUMERIC,
  carbs_g NUMERIC,
  fiber_g NUMERIC
) AS $$
DECLARE
  v_total_percentage NUMERIC;
BEGIN
  -- Validate that component percentages sum to 100
  SELECT COALESCE(SUM(percentage), 0) INTO v_total_percentage
  FROM composite_ingredient_components
  WHERE composite_ingredient_id = composite_ingredient_id;
  
  IF v_total_percentage != 100 THEN
    RAISE EXCEPTION 'Composite ingredient components must sum to 100%%, current total: %%', v_total_percentage;
  END IF;
  
  RETURN QUERY
  SELECT 
    ROUND(
      SUM(
        COALESCE((im.nutrition_per_100g->>'energy_kcal')::NUMERIC, 0) * (cic.percentage / 100)
      )::NUMERIC, 
      2
    ) as energy_kcal,
    ROUND(
      SUM(
        COALESCE((im.nutrition_per_100g->>'protein_g')::NUMERIC, 0) * (cic.percentage / 100)
      )::NUMERIC, 
      2
    ) as protein_g,
    ROUND(
      SUM(
        COALESCE((im.nutrition_per_100g->>'fat_g')::NUMERIC, 0) * (cic.percentage / 100)
      )::NUMERIC, 
      2
    ) as fat_g,
    ROUND(
      SUM(
        COALESCE((im.nutrition_per_100g->>'carbs_g')::NUMERIC, 0) * (cic.percentage / 100)
      )::NUMERIC, 
      2
    ) as carbs_g,
    ROUND(
      SUM(
        COALESCE((im.nutrition_per_100g->>'fiber_g')::NUMERIC, 0) * (cic.percentage / 100)
      )::NUMERIC, 
      2
    ) as fiber_g
  FROM composite_ingredient_components cic
  JOIN ingredient_master im ON cic.component_ingredient_id = im.id
  WHERE cic.composite_ingredient_id = composite_ingredient_id;
END;
$$ LANGUAGE plpgsql STABLE;
