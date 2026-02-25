-- ============================================================================
-- AiBake Schema Enhancements - Advanced Baking Features
-- Version: 2.1
-- Run this AFTER 01_schema_init.sql
-- ============================================================================

-- ============================================================================
-- ENHANCEMENT 1: Water Activity & Food Safety
-- ============================================================================

-- Add water activity tracking to recipes
ALTER TABLE recipes 
ADD COLUMN target_water_activity NUMERIC(3,2),  -- 0.00 to 1.00
ADD COLUMN min_safe_water_activity NUMERIC(3,2), -- Minimum safe aw for this recipe type
ADD COLUMN estimated_shelf_life_days INTEGER;

COMMENT ON COLUMN recipes.target_water_activity IS 'Target aw value (0.00-1.00). Bread ~0.95, Cookies ~0.60, Crackers ~0.30';
COMMENT ON COLUMN recipes.min_safe_water_activity IS 'Minimum safe aw to prevent bacterial growth. Usually 0.85 for bacteria, 0.80 for yeast';
COMMENT ON COLUMN recipes.estimated_shelf_life_days IS 'Estimated shelf life at target aw and room temperature';

-- Add actual measured water activity to journal entries
ALTER TABLE recipe_journal_entries
ADD COLUMN measured_water_activity NUMERIC(3,2),
ADD COLUMN storage_days_achieved INTEGER;

COMMENT ON COLUMN recipe_journal_entries.measured_water_activity IS 'Actual measured aw after baking (requires aw meter)';
COMMENT ON COLUMN recipe_journal_entries.storage_days_achieved IS 'How many days product stayed fresh';

-- Create water activity reference table
CREATE TABLE water_activity_reference (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_category VARCHAR(100) NOT NULL,
  typical_aw_min NUMERIC(3,2) NOT NULL,
  typical_aw_max NUMERIC(3,2) NOT NULL,
  shelf_life_days INTEGER,
  safety_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Seed with common values
INSERT INTO water_activity_reference (product_category, typical_aw_min, typical_aw_max, shelf_life_days, safety_notes) VALUES
('Crackers/Biscuits', 0.10, 0.30, 365, 'Very stable. Store in airtight container to prevent moisture absorption.'),
('Cookies', 0.40, 0.70, 90, 'Stable if kept dry. Moisture migration from fillings can raise aw.'),
('Cakes (unfrosted)', 0.75, 0.85, 7, 'Refrigerate if aw > 0.85. Watch for mold after 5-7 days.'),
('Bread (crusty)', 0.92, 0.96, 3, 'High aw = short shelf life. Stale within 2-3 days. Freeze for longer storage.'),
('Bread (soft)', 0.94, 0.97, 7, 'Use preservatives or refrigerate. Mold risk after 5-7 days.'),
('Cream-filled pastries', 0.85, 0.95, 2, 'High risk. Refrigerate immediately. Consume within 48 hours.');

-- ============================================================================
-- ENHANCEMENT 2: Hydration Loss Tracking
-- ============================================================================

-- Add pre-bake and post-bake weight tracking
ALTER TABLE recipe_journal_entries
ADD COLUMN pre_bake_weight_grams NUMERIC(12,4),
ADD COLUMN baking_loss_grams NUMERIC(12,4),
ADD COLUMN baking_loss_percentage NUMERIC(5,2);

COMMENT ON COLUMN recipe_journal_entries.pre_bake_weight_grams IS 'Total weight of dough/batter before baking';
COMMENT ON COLUMN recipe_journal_entries.baking_loss_grams IS 'Weight lost during baking (water evaporation)';
COMMENT ON COLUMN recipe_journal_entries.baking_loss_percentage IS 'Percentage of weight lost (auto-calculated)';

-- Create trigger to auto-calculate baking loss
CREATE OR REPLACE FUNCTION calculate_baking_loss()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.pre_bake_weight_grams IS NOT NULL AND NEW.outcome_weight_grams IS NOT NULL THEN
    NEW.baking_loss_grams := NEW.pre_bake_weight_grams - NEW.outcome_weight_grams;
    NEW.baking_loss_percentage := ROUND(
      (NEW.baking_loss_grams / NEW.pre_bake_weight_grams * 100)::numeric, 
      2
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_baking_loss
  BEFORE INSERT OR UPDATE ON recipe_journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION calculate_baking_loss();

-- Add hydration percentage calculator for dough recipes
ALTER TABLE recipes
ADD COLUMN total_hydration_percentage NUMERIC(5,2);

COMMENT ON COLUMN recipes.total_hydration_percentage IS 'Baker''s percentage: (total liquids / total flour) × 100';

-- Create function to calculate hydration percentage
CREATE OR REPLACE FUNCTION calculate_hydration_percentage(recipe_uuid UUID)
RETURNS NUMERIC AS $$
DECLARE
  total_flour_grams NUMERIC;
  total_liquid_grams NUMERIC;
  hydration_pct NUMERIC;
BEGIN
  -- Sum all flour ingredients
  SELECT COALESCE(SUM(ri.quantity_grams), 0)
  INTO total_flour_grams
  FROM recipe_ingredients ri
  JOIN ingredient_master im ON im.id = ri.ingredient_master_id
  WHERE ri.recipe_id = recipe_uuid
    AND im.category = 'flour';
  
  -- Sum all liquid ingredients
  SELECT COALESCE(SUM(ri.quantity_grams), 0)
  INTO total_liquid_grams
  FROM recipe_ingredients ri
  JOIN ingredient_master im ON im.id = ri.ingredient_master_id
  WHERE ri.recipe_id = recipe_uuid
    AND im.category IN ('liquid', 'dairy');
  
  -- Calculate percentage
  IF total_flour_grams > 0 THEN
    hydration_pct := ROUND((total_liquid_grams / total_flour_grams * 100)::numeric, 2);
  ELSE
    hydration_pct := NULL;
  END IF;
  
  -- Update recipe
  UPDATE recipes 
  SET total_hydration_percentage = hydration_pct 
  WHERE id = recipe_uuid;
  
  RETURN hydration_pct;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ENHANCEMENT 3: Ingredient Aliases & Smart Search
-- ============================================================================

-- Create ingredient aliases table
CREATE TABLE ingredient_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_master_id UUID NOT NULL REFERENCES ingredient_master(id) ON DELETE CASCADE,
  alias_name TEXT NOT NULL,
  alias_type VARCHAR(50), -- 'abbreviation', 'regional', 'brand', 'common'
  locale VARCHAR(10), -- 'en-US', 'en-GB', 'fr-FR', etc.
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (alias_name)
);

CREATE INDEX idx_ingredient_aliases_name ON ingredient_aliases(alias_name);
CREATE INDEX idx_ingredient_aliases_master ON ingredient_aliases(ingredient_master_id);
CREATE INDEX idx_ingredient_aliases_name_trgm ON ingredient_aliases USING GIN (alias_name gin_trgm_ops);

COMMENT ON TABLE ingredient_aliases IS 'Alternative names, abbreviations, and regional variations for ingredients';
COMMENT ON COLUMN ingredient_aliases.alias_type IS 'Type: abbreviation, regional, brand, common';
COMMENT ON COLUMN ingredient_aliases.locale IS 'Language/region code for regional variations';

-- Seed with common aliases
INSERT INTO ingredient_aliases (ingredient_master_id, alias_name, alias_type, locale)
SELECT 
  im.id,
  alias_data.alias,
  alias_data.type,
  alias_data.locale
FROM ingredient_master im
CROSS JOIN LATERAL (
  VALUES 
    -- All-Purpose Flour
    ('ap flour', 'abbreviation', 'en-US'),
    ('apf', 'abbreviation', 'en-US'),
    ('plain flour', 'regional', 'en-GB'),
    ('white flour', 'common', NULL),
    
    -- Confectioners Sugar
    ('icing sugar', 'regional', 'en-GB'),
    ('10x sugar', 'common', 'en-US'),
    ('powdered', 'abbreviation', NULL)
) AS alias_data(alias, type, locale)
WHERE im.name IN ('all-purpose flour', 'confectioners sugar');

-- Create smart ingredient search function
CREATE OR REPLACE FUNCTION search_ingredient(search_term TEXT)
RETURNS TABLE (
  ingredient_id UUID,
  canonical_name TEXT,
  matched_via TEXT,
  similarity_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  -- First, search canonical names
  SELECT 
    im.id,
    im.name,
    'canonical'::TEXT,
    similarity(im.name, search_term)
  FROM ingredient_master im
  WHERE im.name % search_term
  
  UNION ALL
  
  -- Then search aliases
  SELECT 
    ia.ingredient_master_id,
    im.name,
    'alias: ' || ia.alias_name,
    similarity(ia.alias_name, search_term)
  FROM ingredient_aliases ia
  JOIN ingredient_master im ON im.id = ia.ingredient_master_id
  WHERE ia.alias_name % search_term
  
  ORDER BY similarity_score DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ENHANCEMENT 4: Composite/Complex Ingredients
-- ============================================================================

-- Create composite ingredients table (ingredients that are themselves recipes)
CREATE TABLE composite_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_master_id UUID NOT NULL REFERENCES ingredient_master(id) ON DELETE CASCADE,
  is_user_defined BOOLEAN DEFAULT TRUE,
  recipe_id UUID REFERENCES recipes(id), -- Optional: Link to actual recipe if it exists
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (ingredient_master_id)
);

COMMENT ON TABLE composite_ingredients IS 'Ingredients that are composed of other ingredients (e.g., GF flour blends)';
COMMENT ON COLUMN composite_ingredients.is_user_defined IS 'True if user created this blend, false if standard/commercial';

-- Create composite ingredient components table
CREATE TABLE composite_ingredient_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  composite_ingredient_id UUID NOT NULL REFERENCES composite_ingredients(id) ON DELETE CASCADE,
  component_ingredient_id UUID NOT NULL REFERENCES ingredient_master(id),
  percentage NUMERIC(5,2) NOT NULL, -- Percentage of total (should sum to 100)
  weight_grams_per_100g NUMERIC(8,4) NOT NULL, -- Grams per 100g of composite
  position INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT check_percentage_valid CHECK (percentage > 0 AND percentage <= 100)
);

CREATE INDEX idx_composite_components_composite ON composite_ingredient_components(composite_ingredient_id);
CREATE INDEX idx_composite_components_component ON composite_ingredient_components(component_ingredient_id);

COMMENT ON TABLE composite_ingredient_components IS 'Individual ingredients that make up a composite ingredient';
COMMENT ON COLUMN composite_ingredient_components.percentage IS 'Percentage of total weight (should sum to 100 per composite)';

-- Function to calculate composite nutrition
CREATE OR REPLACE FUNCTION calculate_composite_nutrition(composite_ing_id UUID)
RETURNS JSONB AS $$
DECLARE
  total_nutrition JSONB;
BEGIN
  SELECT jsonb_build_object(
    'energy_kcal', ROUND(SUM((im.nutrition_per_100g->>'energy_kcal')::numeric * cic.percentage / 100), 2),
    'protein_g', ROUND(SUM((im.nutrition_per_100g->>'protein_g')::numeric * cic.percentage / 100), 2),
    'fat_g', ROUND(SUM((im.nutrition_per_100g->>'fat_g')::numeric * cic.percentage / 100), 2),
    'carbs_g', ROUND(SUM((im.nutrition_per_100g->>'carbs_g')::numeric * cic.percentage / 100), 2),
    'fiber_g', ROUND(SUM((im.nutrition_per_100g->>'fiber_g')::numeric * cic.percentage / 100), 2)
  )
  INTO total_nutrition
  FROM composite_ingredient_components cic
  JOIN ingredient_master im ON im.id = cic.component_ingredient_id
  WHERE cic.composite_ingredient_id = composite_ing_id;
  
  RETURN total_nutrition;
END;
$$ LANGUAGE plpgsql;

-- Function to get expanded ingredient list (resolves composites)
CREATE OR REPLACE FUNCTION get_recipe_ingredients_expanded(recipe_uuid UUID)
RETURNS TABLE (
  ingredient_name TEXT,
  quantity_grams NUMERIC,
  is_composite BOOLEAN,
  composite_breakdown JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    im.name,
    ri.quantity_grams,
    EXISTS(SELECT 1 FROM composite_ingredients ci WHERE ci.ingredient_master_id = im.id),
    CASE 
      WHEN EXISTS(SELECT 1 FROM composite_ingredients ci WHERE ci.ingredient_master_id = im.id)
      THEN (
        SELECT jsonb_agg(
          jsonb_build_object(
            'component', cim.name,
            'quantity_grams', ROUND((ri.quantity_grams * cic.percentage / 100)::numeric, 2)
          )
          ORDER BY cic.position
        )
        FROM composite_ingredients ci
        JOIN composite_ingredient_components cic ON cic.composite_ingredient_id = ci.id
        JOIN ingredient_master cim ON cim.id = cic.component_ingredient_id
        WHERE ci.ingredient_master_id = im.id
      )
      ELSE NULL
    END
  FROM recipe_ingredients ri
  JOIN ingredient_master im ON im.id = ri.ingredient_master_id
  WHERE ri.recipe_id = recipe_uuid
  ORDER BY ri.position;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SEED DATA: Example Composite Ingredient (GF Flour Blend)
-- ============================================================================

-- Create GF flour blend in ingredient_master
INSERT INTO ingredient_master (id, name, category, default_density_g_per_ml)
VALUES 
(
  'e0000000-0000-0000-0000-000000000001',
  'gluten-free flour blend',
  'flour',
  0.48
);

-- Mark it as composite
INSERT INTO composite_ingredients (ingredient_master_id, is_user_defined)
VALUES ('e0000000-0000-0000-0000-000000000001', FALSE);

-- Add components
INSERT INTO composite_ingredient_components (
  composite_ingredient_id,
  component_ingredient_id,
  percentage,
  weight_grams_per_100g,
  position,
  notes
)
SELECT 
  (SELECT id FROM composite_ingredients WHERE ingredient_master_id = 'e0000000-0000-0000-0000-000000000001'),
  component_data.ing_id,
  component_data.pct,
  component_data.pct, -- Same as percentage for per-100g basis
  component_data.pos,
  component_data.note
FROM (
  VALUES 
    ((SELECT id FROM ingredient_master WHERE name = 'whole wheat flour'), 40.00, 1, 'Base flour - provides structure'),
    ((SELECT id FROM ingredient_master WHERE name = 'almond flour'), 30.00, 2, 'Adds moisture and protein'),
    ((SELECT id FROM ingredient_master WHERE name = 'coconut flour'), 15.00, 3, 'Absorbs excess moisture'),
    ((SELECT id FROM ingredient_master WHERE name = 'baking powder'), 10.00, 4, 'Extra rise for GF baking'),
    ((SELECT id FROM ingredient_master WHERE name = 'salt'), 5.00, 5, 'Flavor enhancer')
) AS component_data(ing_id, pct, pos, note);

-- Update composite nutrition
UPDATE ingredient_master
SET nutrition_per_100g = calculate_composite_nutrition(
  (SELECT id FROM composite_ingredients WHERE ingredient_master_id = 'e0000000-0000-0000-0000-000000000001')
)
WHERE id = 'e0000000-0000-0000-0000-000000000001';

-- ============================================================================
-- VERIFICATION & USAGE EXAMPLES
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Schema enhancements completed!';
  RAISE NOTICE '';
  RAISE NOTICE 'New Features Added:';
  RAISE NOTICE '1. Water Activity Tracking';
  RAISE NOTICE '   - recipes.target_water_activity';
  RAISE NOTICE '   - recipe_journal_entries.measured_water_activity';
  RAISE NOTICE '   - water_activity_reference table';
  RAISE NOTICE '';
  RAISE NOTICE '2. Hydration Loss Tracking';
  RAISE NOTICE '   - recipe_journal_entries.pre_bake_weight_grams';
  RAISE NOTICE '   - recipe_journal_entries.baking_loss_percentage (auto-calculated)';
  RAISE NOTICE '   - calculate_hydration_percentage() function';
  RAISE NOTICE '';
  RAISE NOTICE '3. Ingredient Aliases';
  RAISE NOTICE '   - ingredient_aliases table';
  RAISE NOTICE '   - search_ingredient() function';
  RAISE NOTICE '';
  RAISE NOTICE '4. Composite Ingredients';
  RAISE NOTICE '   - composite_ingredients table';
  RAISE NOTICE '   - composite_ingredient_components table';
  RAISE NOTICE '   - get_recipe_ingredients_expanded() function';
  RAISE NOTICE '';
  RAISE NOTICE 'Try these queries:';
  RAISE NOTICE '  SELECT * FROM water_activity_reference;';
  RAISE NOTICE '  SELECT * FROM search_ingredient(''ap'');';
  RAISE NOTICE '  SELECT * FROM get_recipe_ingredients_expanded(''your-recipe-id'');';
END $$;

-- ============================================================================
-- EXAMPLE QUERIES
-- ============================================================================

-- Query 1: Search for ingredients with fuzzy matching and aliases
-- SELECT * FROM search_ingredient('flor');  -- Finds "flour" and variants
-- SELECT * FROM search_ingredient('ap');    -- Finds "all-purpose flour" via alias

-- Query 2: View composite ingredient breakdown
-- SELECT 
--   im.name as composite_name,
--   cim.name as component_name,
--   cic.percentage || '%' as percentage,
--   cic.notes
-- FROM composite_ingredients ci
-- JOIN ingredient_master im ON im.id = ci.ingredient_master_id
-- JOIN composite_ingredient_components cic ON cic.composite_ingredient_id = ci.id
-- JOIN ingredient_master cim ON cim.id = cic.component_ingredient_id
-- WHERE im.name = 'gluten-free flour blend'
-- ORDER BY cic.position;

-- Query 3: Calculate hydration percentage for a recipe
-- SELECT calculate_hydration_percentage('your-recipe-id');

-- Query 4: Track baking loss over time
-- SELECT 
--   r.title,
--   rje.bake_date,
--   rje.pre_bake_weight_grams || 'g' as pre_bake,
--   rje.outcome_weight_grams || 'g' as post_bake,
--   rje.baking_loss_percentage || '%' as loss
-- FROM recipe_journal_entries rje
-- JOIN recipes r ON r.id = rje.recipe_id
-- WHERE rje.pre_bake_weight_grams IS NOT NULL
-- ORDER BY rje.bake_date DESC;

-- Query 5: Water activity and shelf life reference
-- SELECT 
--   product_category,
--   typical_aw_min || ' - ' || typical_aw_max as aw_range,
--   shelf_life_days || ' days' as shelf_life,
--   safety_notes
-- FROM water_activity_reference
-- ORDER BY typical_aw_max DESC;
