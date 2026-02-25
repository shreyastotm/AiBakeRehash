-- AiBake Database Functions
-- This file contains all custom PostgreSQL functions for the AiBake system
-- Execute this file to create all functions in the database

-- ============================================================================
-- Function 1: search_ingredient
-- Purpose: Fuzzy search for ingredients by name or alias using trigram matching
-- Returns: Ranked results with similarity scores
-- Requirements: 48.1, 48.2
-- ============================================================================

CREATE OR REPLACE FUNCTION search_ingredient(query TEXT)
RETURNS TABLE (
  ingredient_id UUID,
  ingredient_name TEXT,
  match_type TEXT,
  similarity_score REAL,
  category TEXT,
  density_g_per_ml NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  -- Search canonical ingredient names
  SELECT 
    im.id,
    im.name,
    'canonical'::TEXT as match_type,
    similarity(im.name, query) as similarity_score,
    im.category::TEXT,
    im.default_density_g_per_ml
  FROM ingredient_master im
  WHERE im.name % query  -- trigram operator for fuzzy match
  
  UNION ALL
  
  -- Search ingredient aliases
  SELECT 
    im.id,
    im.name,
    'alias'::TEXT as match_type,
    similarity(ia.alias_name, query) as similarity_score,
    im.category::TEXT,
    im.default_density_g_per_ml
  FROM ingredient_aliases ia
  JOIN ingredient_master im ON ia.ingredient_master_id = im.id
  WHERE ia.alias_name % query  -- trigram operator for fuzzy match
  
  ORDER BY similarity_score DESC, ingredient_name ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create trigram indexes for performance
CREATE INDEX IF NOT EXISTS idx_ingredient_master_name_trgm 
  ON ingredient_master USING gin(name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_ingredient_aliases_name_trgm 
  ON ingredient_aliases USING gin(alias_name gin_trgm_ops);


-- ============================================================================
-- Function 2: get_recipe_ingredients_expanded
-- Purpose: Return recipe ingredients with composite ingredient breakdowns
-- Returns: Flattened ingredient list showing component breakdown
-- Requirements: 48.2, 18.4
-- ============================================================================

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


-- ============================================================================
-- Function 3: calculate_composite_nutrition
-- Purpose: Calculate weighted average nutrition for composite ingredients
-- Returns: Nutrition data (energy_kcal, protein_g, fat_g, carbs_g, fiber_g)
-- Requirements: 48.3, 18.5
-- ============================================================================

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


-- ============================================================================
-- Function 4: calculate_hydration_percentage
-- Purpose: Calculate baker's percentage (water-to-flour ratio) for dough recipes
-- Returns: Hydration percentage or NULL for non-dough recipes
-- Formula: (total_liquid_weight / total_flour_weight) * 100
-- Requirements: 48.4, 16.5
-- ============================================================================

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


-- ============================================================================
-- Function 5: get_recipe_with_details
-- Purpose: Return complete recipe with ingredients, sections, and steps
-- Returns: JSON object with full recipe structure
-- Requirements: 48.6, 23.8
-- ============================================================================

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
