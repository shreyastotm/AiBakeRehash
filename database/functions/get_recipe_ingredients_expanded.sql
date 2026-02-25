-- Function: get_recipe_ingredients_expanded
-- Purpose: Return recipe ingredients with composite ingredient breakdowns
-- Returns: Flattened ingredient list showing component breakdown for composite ingredients
-- Requirements: 48.2, 18.4

CREATE OR REPLACE FUNCTION get_recipe_ingredients_expanded(recipe_id UUID)
RETURNS TABLE (
  ingredient_id UUID,
  ingredient_name TEXT,
  quantity_grams NUMERIC,
  quantity_original NUMERIC,
  unit_original TEXT,
  display_name TEXT,
  is_composite BOOLEAN,
  component_ingredient_id UUID,
  component_ingredient_name TEXT,
  component_quantity_grams NUMERIC,
  component_percentage NUMERIC,
  position INTEGER
) AS $$
BEGIN
  RETURN QUERY
  -- Non-composite ingredients
  SELECT 
    im.id,
    im.name,
    ri.quantity_grams,
    ri.quantity_original,
    ri.unit_original,
    ri.display_name,
    FALSE::BOOLEAN as is_composite,
    NULL::UUID as component_ingredient_id,
    NULL::TEXT as component_ingredient_name,
    NULL::NUMERIC as component_quantity_grams,
    NULL::NUMERIC as component_percentage,
    ri.position
  FROM recipe_ingredients ri
  JOIN ingredient_master im ON ri.ingredient_master_id = im.id
  WHERE ri.recipe_id = recipe_id
    AND NOT EXISTS (
      SELECT 1 FROM composite_ingredients ci 
      WHERE ci.ingredient_master_id = ri.ingredient_master_id
    )
  
  UNION ALL
  
  -- Composite ingredients with component breakdown
  SELECT 
    im.id,
    im.name,
    ri.quantity_grams,
    ri.quantity_original,
    ri.unit_original,
    ri.display_name,
    TRUE::BOOLEAN as is_composite,
    cim.id as component_ingredient_id,
    cim.name as component_ingredient_name,
    (ri.quantity_grams * cic.percentage / 100) as component_quantity_grams,
    cic.percentage,
    ri.position
  FROM recipe_ingredients ri
  JOIN ingredient_master im ON ri.ingredient_master_id = im.id
  JOIN composite_ingredients ci ON ci.ingredient_master_id = im.id
  JOIN composite_ingredient_components cic ON cic.composite_ingredient_id = ci.id
  JOIN ingredient_master cim ON cic.component_ingredient_id = cim.id
  WHERE ri.recipe_id = recipe_id
  
  ORDER BY position ASC, is_composite DESC, component_ingredient_name ASC;
END;
$$ LANGUAGE plpgsql STABLE;
