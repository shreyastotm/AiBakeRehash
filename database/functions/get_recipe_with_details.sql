-- Function: get_recipe_with_details
-- Purpose: Return complete recipe with ingredients, sections, and steps
-- Returns: JSON object with full recipe structure
-- Requirements: 48.6, 23.8

CREATE OR REPLACE FUNCTION get_recipe_with_details(recipe_id UUID)
RETURNS JSON AS $$
DECLARE
  v_recipe JSON;
  v_ingredients JSON;
  v_sections JSON;
BEGIN
  -- Get base recipe data
  SELECT json_build_object(
    'id', r.id,
    'user_id', r.user_id,
    'title', r.title,
    'description', r.description,
    'source_type', r.source_type,
    'source_url', r.source_url,
    'original_author', r.original_author,
    'original_author_url', r.original_author_url,
    'servings', r.servings,
    'yield_weight_grams', r.yield_weight_grams,
    'preferred_unit_system', r.preferred_unit_system,
    'status', r.status,
    'target_water_activity', r.target_water_activity,
    'min_safe_water_activity', r.min_safe_water_activity,
    'estimated_shelf_life_days', r.estimated_shelf_life_days,
    'total_hydration_percentage', calculate_hydration_percentage(r.id),
    'created_at', r.created_at,
    'updated_at', r.updated_at
  ) INTO v_recipe
  FROM recipes r
  WHERE r.id = recipe_id;
  
  -- Get ingredients with master data
  SELECT json_agg(
    json_build_object(
      'id', ri.id,
      'ingredient_master_id', ri.ingredient_master_id,
      'display_name', ri.display_name,
      'quantity_original', ri.quantity_original,
      'unit_original', ri.unit_original,
      'quantity_grams', ri.quantity_grams,
      'position', ri.position,
      'ingredient_master', json_build_object(
        'id', im.id,
        'name', im.name,
        'category', im.category,
        'default_density_g_per_ml', im.default_density_g_per_ml,
        'nutrition_per_100g', im.nutrition_per_100g
      )
    )
    ORDER BY ri.position ASC
  ) INTO v_ingredients
  FROM recipe_ingredients ri
  JOIN ingredient_master im ON ri.ingredient_master_id = im.id
  WHERE ri.recipe_id = recipe_id;
  
  -- Get sections with steps
  SELECT json_agg(
    json_build_object(
      'id', rs.id,
      'type', rs.type,
      'title', rs.title,
      'position', rs.position,
      'steps', (
        SELECT json_agg(
          json_build_object(
            'id', rsp.id,
            'instruction', rsp.instruction,
            'duration_seconds', rsp.duration_seconds,
            'temperature_celsius', rsp.temperature_celsius,
            'position', rsp.position,
            'dependency_step_id', rsp.dependency_step_id
          )
          ORDER BY rsp.position ASC
        )
        FROM recipe_steps rsp
        WHERE rsp.recipe_section_id = rs.id
      )
    )
    ORDER BY rs.position ASC
  ) INTO v_sections
  FROM recipe_sections rs
  WHERE rs.recipe_id = recipe_id;
  
  -- Combine all data
  RETURN v_recipe || json_build_object(
    'ingredients', COALESCE(v_ingredients, '[]'::json),
    'sections', COALESCE(v_sections, '[]'::json)
  );
END;
$$ LANGUAGE plpgsql STABLE;
