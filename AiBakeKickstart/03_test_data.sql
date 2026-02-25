-- ============================================================================
-- AiBake Test Data - Sample Users and Recipes
-- Version: 2.0
-- Run this after 01_schema_init.sql and 02_seed_data.sql
-- ============================================================================

-- ============================================================================
-- CREATE TEST USERS
-- ============================================================================

-- Note: In production, use proper password hashing (bcrypt, Argon2)
-- These are example hashes for testing only

INSERT INTO users (id, email, password_hash, display_name, unit_preferences) VALUES
(
  'a0000000-0000-0000-0000-000000000001',
  'test@aibake.com',
  '$2b$10$example_hash_here', -- Replace with real hash in production
  'Test Baker',
  '{"sugar": "cups", "flour": "grams", "butter": "grams", "temperature": "celsius"}'::jsonb
),
(
  'a0000000-0000-0000-0000-000000000002',
  'pro@aibake.com',
  '$2b$10$example_hash_here',
  'Professional Baker',
  '{"temperature": "celsius"}'::jsonb
);

-- ============================================================================
-- CREATE TEST RECIPE 1: Simple Sourdough Bread
-- ============================================================================

-- Insert Recipe
INSERT INTO recipes (
  id, 
  user_id, 
  title, 
  description, 
  source_type, 
  source_url,
  original_author,
  original_author_url,
  servings, 
  yield_weight_grams, 
  preferred_unit_system, 
  status
) VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'Simple Sourdough Country Loaf',
  'A classic sourdough bread with crispy crust and open crumb. Perfect for beginners.',
  'url',
  'https://example.com/sourdough-recipe',
  'Artisan Bread Co',
  'https://example.com/sourdough-recipe',
  1,
  850,
  'metric',
  'active'
);

-- Insert Ingredients
INSERT INTO recipe_ingredients (
  recipe_id, 
  ingredient_master_id, 
  display_name, 
  quantity_original, 
  unit_original, 
  quantity_grams, 
  position
) VALUES
(
  'b0000000-0000-0000-0000-000000000001',
  (SELECT id FROM ingredient_master WHERE name = 'bread flour'),
  'Bread flour',
  500,
  'g',
  500,
  1
),
(
  'b0000000-0000-0000-0000-000000000001',
  (SELECT id FROM ingredient_master WHERE name = 'water'),
  'Water (room temp)',
  350,
  'g',
  350,
  2
),
(
  'b0000000-0000-0000-0000-000000000001',
  (SELECT id FROM ingredient_master WHERE name = 'salt'),
  'Sea salt',
  10,
  'g',
  10,
  3
),
(
  'b0000000-0000-0000-0000-000000000001',
  (SELECT id FROM ingredient_master WHERE name = 'active dry yeast'),
  'Active dry yeast',
  5,
  'g',
  5,
  4
);

-- Insert Sections and Steps
-- Section 1: Prep
INSERT INTO recipe_sections (id, recipe_id, type, title, position) VALUES
('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'prep', 'Mix Dough', 1);

INSERT INTO recipe_steps (section_id, instruction, duration_seconds, temperature_celsius, position) VALUES
(
  'c0000000-0000-0000-0000-000000000001',
  'In a large bowl, combine flour and water. Mix until no dry flour remains. Cover and let rest (autolyse) for 30 minutes.',
  1800,
  NULL,
  1
),
(
  'c0000000-0000-0000-0000-000000000001',
  'Add salt and yeast to the dough. Knead for 10 minutes until smooth and elastic.',
  600,
  NULL,
  2
);

-- Section 2: Bulk Fermentation
INSERT INTO recipe_sections (id, recipe_id, type, title, position) VALUES
('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'rest', 'Bulk Fermentation', 2);

INSERT INTO recipe_steps (section_id, instruction, duration_seconds, temperature_celsius, position) VALUES
(
  'c0000000-0000-0000-0000-000000000002',
  'Place dough in lightly oiled bowl. Cover with plastic wrap. Let rise at room temperature (70-75°F / 21-24°C) for 4 hours or until doubled in size.',
  14400,
  22,
  1
);

-- Section 3: Shape
INSERT INTO recipe_sections (id, recipe_id, type, title, position) VALUES
('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'prep', 'Shape Loaf', 3);

INSERT INTO recipe_steps (section_id, instruction, duration_seconds, temperature_celsius, position) VALUES
(
  'c0000000-0000-0000-0000-000000000003',
  'Turn dough out onto lightly floured surface. Shape into a round loaf by folding edges to center. Place seam-side down in floured banneton or bowl.',
  300,
  NULL,
  1
);

-- Section 4: Final Proof
INSERT INTO recipe_sections (id, recipe_id, type, title, position) VALUES
('c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'rest', 'Final Proof', 4);

INSERT INTO recipe_steps (section_id, instruction, duration_seconds, temperature_celsius, position) VALUES
(
  'c0000000-0000-0000-0000-000000000004',
  'Cover and refrigerate for 12-18 hours for cold fermentation (develops flavor).',
  43200,
  4,
  1
);

-- Section 5: Bake
INSERT INTO recipe_sections (id, recipe_id, type, title, position) VALUES
('c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001', 'bake', 'Bake', 5);

INSERT INTO recipe_steps (section_id, instruction, duration_seconds, temperature_celsius, position) VALUES
(
  'c0000000-0000-0000-0000-000000000005',
  'Preheat oven with Dutch oven inside to 450°F (232°C) for 30 minutes.',
  1800,
  232,
  1
),
(
  'c0000000-0000-0000-0000-000000000005',
  'Turn dough out onto parchment paper. Score top with sharp knife or lame. Carefully transfer to hot Dutch oven.',
  120,
  232,
  2
),
(
  'c0000000-0000-0000-0000-000000000005',
  'Bake covered for 30 minutes. Remove lid and bake 15-20 more minutes until deep golden brown.',
  3000,
  232,
  3
),
(
  'c0000000-0000-0000-0000-000000000005',
  'Remove from oven and cool on wire rack for at least 1 hour before slicing.',
  3600,
  NULL,
  4
);

-- ============================================================================
-- CREATE TEST RECIPE 2: Chocolate Chip Cookies
-- ============================================================================

INSERT INTO recipes (
  id, 
  user_id, 
  title, 
  description, 
  source_type, 
  servings, 
  yield_weight_grams, 
  preferred_unit_system, 
  status
) VALUES (
  'b0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'Classic Chocolate Chip Cookies',
  'Chewy centers with crispy edges. The perfect cookie.',
  'manual',
  48,
  1200,
  'hybrid',
  'active'
);

-- Insert Ingredients
INSERT INTO recipe_ingredients (
  recipe_id, 
  ingredient_master_id, 
  display_name, 
  quantity_original, 
  unit_original, 
  quantity_grams, 
  position
) VALUES
(
  'b0000000-0000-0000-0000-000000000002',
  (SELECT id FROM ingredient_master WHERE name = 'all-purpose flour'),
  'All-purpose flour',
  280,
  'g',
  280,
  1
),
(
  'b0000000-0000-0000-0000-000000000002',
  (SELECT id FROM ingredient_master WHERE name = 'unsalted butter'),
  'Unsalted butter (softened)',
  226,
  'g',
  226,
  2
),
(
  'b0000000-0000-0000-0000-000000000002',
  (SELECT id FROM ingredient_master WHERE name = 'brown sugar'),
  'Brown sugar (packed)',
  200,
  'g',
  200,
  3
),
(
  'b0000000-0000-0000-0000-000000000002',
  (SELECT id FROM ingredient_master WHERE name = 'granulated sugar'),
  'Granulated sugar',
  100,
  'g',
  100,
  4
),
(
  'b0000000-0000-0000-0000-000000000002',
  (SELECT id FROM ingredient_master WHERE name = 'egg'),
  'Large eggs',
  100,
  'g',
  100,
  5
),
(
  'b0000000-0000-0000-0000-000000000002',
  (SELECT id FROM ingredient_master WHERE name = 'vanilla extract'),
  'Vanilla extract',
  10,
  'g',
  10,
  6
),
(
  'b0000000-0000-0000-0000-000000000002',
  (SELECT id FROM ingredient_master WHERE name = 'baking soda'),
  'Baking soda',
  5,
  'g',
  5,
  7
),
(
  'b0000000-0000-0000-0000-000000000002',
  (SELECT id FROM ingredient_master WHERE name = 'salt'),
  'Salt',
  3,
  'g',
  3,
  8
),
(
  'b0000000-0000-0000-0000-000000000002',
  (SELECT id FROM ingredient_master WHERE name = 'chocolate chips'),
  'Semi-sweet chocolate chips',
  340,
  'g',
  340,
  9
);

-- Insert Sections and Steps
INSERT INTO recipe_sections (id, recipe_id, type, title, position) VALUES
('c0000000-0000-0000-0000-000000000011', 'b0000000-0000-0000-0000-000000000002', 'prep', 'Mix Dough', 1);

INSERT INTO recipe_steps (section_id, instruction, duration_seconds, temperature_celsius, position) VALUES
(
  'c0000000-0000-0000-0000-000000000011',
  'Preheat oven to 375°F (190°C). Line baking sheets with parchment paper.',
  120,
  190,
  1
),
(
  'c0000000-0000-0000-0000-000000000011',
  'In a medium bowl, whisk together flour, baking soda, and salt. Set aside.',
  60,
  NULL,
  2
),
(
  'c0000000-0000-0000-0000-000000000011',
  'In large bowl, beat butter, brown sugar, and granulated sugar with mixer on medium speed until light and fluffy (about 3 minutes).',
  180,
  NULL,
  3
),
(
  'c0000000-0000-0000-0000-000000000011',
  'Beat in eggs one at a time, then vanilla extract, until well combined.',
  60,
  NULL,
  4
),
(
  'c0000000-0000-0000-0000-000000000011',
  'Gradually mix in flour mixture on low speed until just combined. Do not overmix.',
  60,
  NULL,
  5
),
(
  'c0000000-0000-0000-0000-000000000011',
  'Fold in chocolate chips with a spatula.',
  30,
  NULL,
  6
);

INSERT INTO recipe_sections (id, recipe_id, type, title, position) VALUES
('c0000000-0000-0000-0000-000000000012', 'b0000000-0000-0000-0000-000000000002', 'bake', 'Bake Cookies', 2);

INSERT INTO recipe_steps (section_id, instruction, duration_seconds, temperature_celsius, position) VALUES
(
  'c0000000-0000-0000-0000-000000000012',
  'Scoop dough into 1.5 tablespoon portions (about 25g each). Place 2 inches apart on prepared baking sheets.',
  300,
  NULL,
  1
),
(
  'c0000000-0000-0000-0000-000000000012',
  'Bake for 10-12 minutes until edges are golden but centers still look slightly underdone.',
  660,
  190,
  2
),
(
  'c0000000-0000-0000-0000-000000000012',
  'Remove from oven and let cool on baking sheet for 5 minutes (cookies will continue to cook and set).',
  300,
  NULL,
  3
),
(
  'c0000000-0000-0000-0000-000000000012',
  'Transfer to wire rack to cool completely.',
  600,
  NULL,
  4
);

-- ============================================================================
-- CREATE VERSION HISTORY
-- ============================================================================

-- Version 1 for Sourdough
INSERT INTO recipe_versions (recipe_id, version_number, change_summary) VALUES
('b0000000-0000-0000-0000-000000000001', 1, 'Initial recipe creation');

-- Create snapshot
INSERT INTO recipe_version_snapshots (recipe_version_id, snapshot_data)
SELECT 
  rv.id,
  jsonb_build_object(
    'recipe_id', r.id,
    'title', r.title,
    'created_at', r.created_at,
    'yield_weight_grams', r.yield_weight_grams
  )
FROM recipe_versions rv
JOIN recipes r ON r.id = rv.recipe_id
WHERE rv.recipe_id = 'b0000000-0000-0000-0000-000000000001';

-- ============================================================================
-- CREATE JOURNAL ENTRIES
-- ============================================================================

INSERT INTO recipe_journal_entries (
  recipe_id,
  version_id,
  bake_date,
  notes,
  private_notes,
  rating,
  outcome_weight_grams,
  image_urls
) VALUES
(
  'b0000000-0000-0000-0000-000000000001',
  (SELECT id FROM recipe_versions WHERE recipe_id = 'b0000000-0000-0000-0000-000000000001'),
  '2026-02-10',
  'Perfect spring! Nice open crumb structure. Crust was beautifully crispy.',
  'Next time: Try 5% more hydration for even more open crumb',
  5,
  820,
  '["https://example.com/images/sourdough1.jpg", "https://example.com/images/sourdough2.jpg"]'::jsonb
),
(
  'b0000000-0000-0000-0000-000000000002',
  NULL,
  '2026-02-14',
  'Cookies were a hit at the party! Perfect texture.',
  'Used dark chocolate chips - even better. Bake for 11 minutes exactly.',
  5,
  1180,
  '["https://example.com/images/cookies1.jpg"]'::jsonb
);

-- ============================================================================
-- CREATE CALCULATED NUTRITION CACHE
-- ============================================================================

-- Calculate and cache nutrition for Sourdough
INSERT INTO recipe_nutrition_cache (recipe_id, nutrition_per_100g, nutrition_per_serving)
SELECT 
  r.id as recipe_id,
  jsonb_build_object(
    'energy_kcal', ROUND(SUM((im.nutrition_per_100g->>'energy_kcal')::numeric * ri.quantity_grams / 100), 2),
    'protein_g', ROUND(SUM((im.nutrition_per_100g->>'protein_g')::numeric * ri.quantity_grams / 100), 2),
    'fat_g', ROUND(SUM((im.nutrition_per_100g->>'fat_g')::numeric * ri.quantity_grams / 100), 2),
    'carbs_g', ROUND(SUM((im.nutrition_per_100g->>'carbs_g')::numeric * ri.quantity_grams / 100), 2),
    'fiber_g', ROUND(SUM((im.nutrition_per_100g->>'fiber_g')::numeric * ri.quantity_grams / 100), 2)
  ) as nutrition_per_100g,
  jsonb_build_object(
    'energy_kcal', ROUND(SUM((im.nutrition_per_100g->>'energy_kcal')::numeric * ri.quantity_grams / 100) / r.servings, 2),
    'protein_g', ROUND(SUM((im.nutrition_per_100g->>'protein_g')::numeric * ri.quantity_grams / 100) / r.servings, 2),
    'fat_g', ROUND(SUM((im.nutrition_per_100g->>'fat_g')::numeric * ri.quantity_grams / 100) / r.servings, 2),
    'carbs_g', ROUND(SUM((im.nutrition_per_100g->>'carbs_g')::numeric * ri.quantity_grams / 100) / r.servings, 2),
    'fiber_g', ROUND(SUM((im.nutrition_per_100g->>'fiber_g')::numeric * ri.quantity_grams / 100) / r.servings, 2)
  ) as nutrition_per_serving
FROM recipes r
JOIN recipe_ingredients ri ON ri.recipe_id = r.id
JOIN ingredient_master im ON im.id = ri.ingredient_master_id
WHERE r.id = 'b0000000-0000-0000-0000-000000000001'
GROUP BY r.id, r.servings;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

DO $$
DECLARE
  user_count INTEGER;
  recipe_count INTEGER;
  ingredient_count INTEGER;
  step_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count FROM users;
  SELECT COUNT(*) INTO recipe_count FROM recipes;
  SELECT COUNT(*) INTO ingredient_count FROM recipe_ingredients;
  SELECT COUNT(*) INTO step_count FROM recipe_steps;
  
  RAISE NOTICE '✅ Test data loaded successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '👤 Users created: %', user_count;
  RAISE NOTICE '📖 Recipes created: %', recipe_count;
  RAISE NOTICE '🥘 Total recipe ingredients: %', ingredient_count;
  RAISE NOTICE '📝 Total recipe steps: %', step_count;
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Database is ready for testing!';
  RAISE NOTICE '';
  RAISE NOTICE 'Try these queries:';
  RAISE NOTICE '  SELECT * FROM recipes;';
  RAISE NOTICE '  SELECT * FROM recipe_journal_entries;';
  RAISE NOTICE '  SELECT * FROM recipe_nutrition_cache;';
END $$;

-- ============================================================================
-- SAMPLE QUERIES FOR TESTING
-- ============================================================================

-- Query 1: View all recipes with ingredient counts
-- SELECT 
--   r.title,
--   r.servings,
--   r.yield_weight_grams,
--   COUNT(ri.id) as ingredient_count,
--   r.status
-- FROM recipes r
-- LEFT JOIN recipe_ingredients ri ON ri.recipe_id = r.id
-- GROUP BY r.id, r.title, r.servings, r.yield_weight_grams, r.status;

-- Query 2: View recipe with all ingredients (join to see canonical names)
-- SELECT 
--   r.title,
--   ri.position,
--   ri.display_name,
--   ri.quantity_grams || 'g' as amount,
--   im.name as canonical_ingredient_name,
--   im.category
-- FROM recipes r
-- JOIN recipe_ingredients ri ON ri.recipe_id = r.id
-- JOIN ingredient_master im ON im.id = ri.ingredient_master_id
-- WHERE r.title = 'Classic Chocolate Chip Cookies'
-- ORDER BY ri.position;

-- Query 3: View all steps for a recipe in order
-- SELECT 
--   r.title,
--   rs.type as section_type,
--   rs.title as section_title,
--   rst.position as step_number,
--   rst.instruction,
--   rst.duration_seconds / 60 as duration_minutes,
--   rst.temperature_celsius
-- FROM recipes r
-- JOIN recipe_sections rs ON rs.recipe_id = r.id
-- JOIN recipe_steps rst ON rst.section_id = rs.id
-- WHERE r.title = 'Simple Sourdough Country Loaf'
-- ORDER BY rs.position, rst.position;

-- Query 4: Calculate recipe nutrition
-- SELECT 
--   r.title,
--   rnc.nutrition_per_serving->>'energy_kcal' as calories_per_serving,
--   rnc.nutrition_per_serving->>'protein_g' as protein_per_serving,
--   rnc.nutrition_per_serving->>'carbs_g' as carbs_per_serving,
--   rnc.nutrition_per_serving->>'fat_g' as fat_per_serving
-- FROM recipes r
-- JOIN recipe_nutrition_cache rnc ON rnc.recipe_id = r.id;

-- Query 5: View journal entries with ratings
-- SELECT 
--   r.title,
--   rje.bake_date,
--   rje.rating,
--   rje.notes,
--   rje.outcome_weight_grams,
--   jsonb_array_length(rje.image_urls) as photo_count
-- FROM recipe_journal_entries rje
-- JOIN recipes r ON r.id = rje.recipe_id
-- ORDER BY rje.bake_date DESC;
