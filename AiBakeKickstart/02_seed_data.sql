-- ============================================================================
-- AiBake Seed Data - Ingredient Master & Common Issues
-- Version: 2.0
-- Run this after 01_schema_init.sql
-- ============================================================================

-- ============================================================================
-- INGREDIENT MASTER - Core Baking Ingredients
-- ============================================================================

-- Note: Densities are in grams per milliliter (g/ml)
-- Nutrition values are per 100g
-- All ingredient names are lowercase and normalized

-- FLOURS
INSERT INTO ingredient_master (name, category, default_density_g_per_ml, allergen_flags, nutrition_per_100g) VALUES
('all-purpose flour', 'flour', 0.53, '{"gluten": true}', '{"energy_kcal": 364, "protein_g": 10.3, "fat_g": 1.0, "carbs_g": 76.3, "sugar_g": 0.3, "fiber_g": 2.7}'),
('bread flour', 'flour', 0.54, '{"gluten": true}', '{"energy_kcal": 361, "protein_g": 12.6, "fat_g": 1.7, "carbs_g": 72.5, "sugar_g": 0.4, "fiber_g": 2.4}'),
('cake flour', 'flour', 0.44, '{"gluten": true}', '{"energy_kcal": 362, "protein_g": 8.2, "fat_g": 0.9, "carbs_g": 79.4, "sugar_g": 0.3, "fiber_g": 2.3}'),
('whole wheat flour', 'flour', 0.51, '{"gluten": true}', '{"energy_kcal": 340, "protein_g": 13.2, "fat_g": 2.5, "carbs_g": 72.0, "sugar_g": 0.4, "fiber_g": 10.7}'),
('rye flour', 'flour', 0.45, '{"gluten": true}', '{"energy_kcal": 338, "protein_g": 10.3, "fat_g": 1.6, "carbs_g": 75.9, "sugar_g": 0.9, "fiber_g": 15.1}'),
('almond flour', 'flour', 0.40, '{"nuts": true}', '{"energy_kcal": 571, "protein_g": 21.4, "fat_g": 50.0, "carbs_g": 21.4, "sugar_g": 3.6, "fiber_g": 10.7}'),
('coconut flour', 'flour', 0.30, '{}', '{"energy_kcal": 400, "protein_g": 20.0, "fat_g": 13.3, "carbs_g": 60.0, "sugar_g": 20.0, "fiber_g": 40.0}');

-- FATS
INSERT INTO ingredient_master (name, category, default_density_g_per_ml, allergen_flags, nutrition_per_100g) VALUES
('butter', 'fat', 0.96, '{"dairy": true}', '{"energy_kcal": 717, "protein_g": 0.9, "fat_g": 81.1, "carbs_g": 0.1, "sugar_g": 0.1, "fiber_g": 0.0}'),
('unsalted butter', 'fat', 0.96, '{"dairy": true}', '{"energy_kcal": 717, "protein_g": 0.9, "fat_g": 81.1, "carbs_g": 0.1, "sugar_g": 0.1, "fiber_g": 0.0}'),
('vegetable oil', 'fat', 0.92, '{}', '{"energy_kcal": 884, "protein_g": 0.0, "fat_g": 100.0, "carbs_g": 0.0, "sugar_g": 0.0, "fiber_g": 0.0}'),
('olive oil', 'fat', 0.92, '{}', '{"energy_kcal": 884, "protein_g": 0.0, "fat_g": 100.0, "carbs_g": 0.0, "sugar_g": 0.0, "fiber_g": 0.0}'),
('coconut oil', 'fat', 0.92, '{}', '{"energy_kcal": 862, "protein_g": 0.0, "fat_g": 100.0, "carbs_g": 0.0, "sugar_g": 0.0, "fiber_g": 0.0}'),
('shortening', 'fat', 0.89, '{}', '{"energy_kcal": 884, "protein_g": 0.0, "fat_g": 100.0, "carbs_g": 0.0, "sugar_g": 0.0, "fiber_g": 0.0}'),
('lard', 'fat', 0.91, '{}', '{"energy_kcal": 902, "protein_g": 0.0, "fat_g": 100.0, "carbs_g": 0.0, "sugar_g": 0.0, "fiber_g": 0.0}');

-- SUGARS
INSERT INTO ingredient_master (name, category, default_density_g_per_ml, allergen_flags, nutrition_per_100g) VALUES
('granulated sugar', 'sugar', 0.85, '{}', '{"energy_kcal": 387, "protein_g": 0.0, "fat_g": 0.0, "carbs_g": 99.8, "sugar_g": 99.8, "fiber_g": 0.0}'),
('white sugar', 'sugar', 0.85, '{}', '{"energy_kcal": 387, "protein_g": 0.0, "fat_g": 0.0, "carbs_g": 99.8, "sugar_g": 99.8, "fiber_g": 0.0}'),
('brown sugar', 'sugar', 0.91, '{}', '{"energy_kcal": 380, "protein_g": 0.1, "fat_g": 0.0, "carbs_g": 98.1, "sugar_g": 97.0, "fiber_g": 0.0}'),
('powdered sugar', 'sugar', 0.56, '{}', '{"energy_kcal": 389, "protein_g": 0.0, "fat_g": 0.0, "carbs_g": 99.8, "sugar_g": 99.8, "fiber_g": 0.0}'),
('confectioners sugar', 'sugar', 0.56, '{}', '{"energy_kcal": 389, "protein_g": 0.0, "fat_g": 0.0, "carbs_g": 99.8, "sugar_g": 99.8, "fiber_g": 0.0}'),
('honey', 'sugar', 1.42, '{}', '{"energy_kcal": 304, "protein_g": 0.3, "fat_g": 0.0, "carbs_g": 82.4, "sugar_g": 82.1, "fiber_g": 0.2}'),
('maple syrup', 'sugar', 1.37, '{}', '{"energy_kcal": 260, "protein_g": 0.0, "fat_g": 0.2, "carbs_g": 67.0, "sugar_g": 60.5, "fiber_g": 0.0}'),
('corn syrup', 'sugar', 1.40, '{}', '{"energy_kcal": 281, "protein_g": 0.0, "fat_g": 0.0, "carbs_g": 76.0, "sugar_g": 33.0, "fiber_g": 0.0}'),
('molasses', 'sugar', 1.40, '{}', '{"energy_kcal": 290, "protein_g": 0.0, "fat_g": 0.1, "carbs_g": 74.7, "sugar_g": 74.7, "fiber_g": 0.0}');

-- LEAVENING AGENTS
INSERT INTO ingredient_master (name, category, default_density_g_per_ml, allergen_flags, nutrition_per_100g) VALUES
('baking powder', 'leavening', 0.90, '{}', '{"energy_kcal": 53, "protein_g": 0.0, "fat_g": 0.0, "carbs_g": 27.7, "sugar_g": 0.0, "fiber_g": 0.2}'),
('baking soda', 'leavening', 1.10, '{}', '{"energy_kcal": 0, "protein_g": 0.0, "fat_g": 0.0, "carbs_g": 0.0, "sugar_g": 0.0, "fiber_g": 0.0}'),
('yeast', 'leavening', 0.80, '{}', '{"energy_kcal": 325, "protein_g": 40.4, "fat_g": 7.6, "carbs_g": 41.2, "sugar_g": 0.0, "fiber_g": 26.9}'),
('active dry yeast', 'leavening', 0.80, '{}', '{"energy_kcal": 325, "protein_g": 40.4, "fat_g": 7.6, "carbs_g": 41.2, "sugar_g": 0.0, "fiber_g": 26.9}'),
('instant yeast', 'leavening', 0.80, '{}', '{"energy_kcal": 325, "protein_g": 40.4, "fat_g": 7.6, "carbs_g": 41.2, "sugar_g": 0.0, "fiber_g": 26.9}');

-- DAIRY
INSERT INTO ingredient_master (name, category, default_density_g_per_ml, allergen_flags, nutrition_per_100g) VALUES
('milk', 'dairy', 1.03, '{"dairy": true}', '{"energy_kcal": 61, "protein_g": 3.2, "fat_g": 3.3, "carbs_g": 4.8, "sugar_g": 5.1, "fiber_g": 0.0}'),
('whole milk', 'dairy', 1.03, '{"dairy": true}', '{"energy_kcal": 61, "protein_g": 3.2, "fat_g": 3.3, "carbs_g": 4.8, "sugar_g": 5.1, "fiber_g": 0.0}'),
('heavy cream', 'dairy', 1.01, '{"dairy": true}', '{"energy_kcal": 340, "protein_g": 2.1, "fat_g": 36.1, "carbs_g": 2.8, "sugar_g": 2.8, "fiber_g": 0.0}'),
('sour cream', 'dairy', 1.02, '{"dairy": true}', '{"energy_kcal": 193, "protein_g": 2.4, "fat_g": 19.3, "carbs_g": 4.6, "sugar_g": 3.9, "fiber_g": 0.0}'),
('cream cheese', 'dairy', 1.04, '{"dairy": true}', '{"energy_kcal": 342, "protein_g": 5.9, "fat_g": 34.2, "carbs_g": 5.5, "sugar_g": 3.2, "fiber_g": 0.0}'),
('yogurt', 'dairy', 1.04, '{"dairy": true}', '{"energy_kcal": 59, "protein_g": 3.5, "fat_g": 0.4, "carbs_g": 4.7, "sugar_g": 4.7, "fiber_g": 0.0}'),
('greek yogurt', 'dairy', 1.04, '{"dairy": true}', '{"energy_kcal": 97, "protein_g": 9.0, "fat_g": 5.0, "carbs_g": 3.9, "sugar_g": 3.6, "fiber_g": 0.0}'),
('buttermilk', 'dairy', 1.03, '{"dairy": true}', '{"energy_kcal": 40, "protein_g": 3.3, "fat_g": 0.9, "carbs_g": 4.8, "sugar_g": 4.8, "fiber_g": 0.0}');

-- LIQUIDS
INSERT INTO ingredient_master (name, category, default_density_g_per_ml, allergen_flags, nutrition_per_100g) VALUES
('water', 'liquid', 1.00, '{}', '{"energy_kcal": 0, "protein_g": 0.0, "fat_g": 0.0, "carbs_g": 0.0, "sugar_g": 0.0, "fiber_g": 0.0}'),
('coffee', 'liquid', 1.00, '{}', '{"energy_kcal": 2, "protein_g": 0.1, "fat_g": 0.0, "carbs_g": 0.0, "sugar_g": 0.0, "fiber_g": 0.0}'),
('vanilla extract', 'liquid', 0.88, '{}', '{"energy_kcal": 288, "protein_g": 0.1, "fat_g": 0.1, "carbs_g": 12.7, "sugar_g": 12.7, "fiber_g": 0.0}'),
('almond extract', 'liquid', 0.88, '{}', '{"energy_kcal": 288, "protein_g": 0.1, "fat_g": 0.1, "carbs_g": 12.7, "sugar_g": 12.7, "fiber_g": 0.0}');

-- EGGS
INSERT INTO ingredient_master (name, category, default_density_g_per_ml, allergen_flags, nutrition_per_100g) VALUES
('egg', 'other', 1.03, '{"eggs": true}', '{"energy_kcal": 143, "protein_g": 12.6, "fat_g": 9.5, "carbs_g": 0.7, "sugar_g": 0.4, "fiber_g": 0.0}'),
('egg white', 'other', 1.03, '{"eggs": true}', '{"energy_kcal": 52, "protein_g": 10.9, "fat_g": 0.2, "carbs_g": 0.7, "sugar_g": 0.7, "fiber_g": 0.0}'),
('egg yolk', 'other', 1.03, '{"eggs": true}', '{"energy_kcal": 322, "protein_g": 15.9, "fat_g": 26.5, "carbs_g": 3.6, "sugar_g": 0.6, "fiber_g": 0.0}');

-- CHOCOLATE & COCOA
INSERT INTO ingredient_master (name, category, default_density_g_per_ml, allergen_flags, nutrition_per_100g) VALUES
('cocoa powder', 'other', 0.42, '{}', '{"energy_kcal": 228, "protein_g": 19.6, "fat_g": 13.7, "carbs_g": 57.9, "sugar_g": 1.8, "fiber_g": 33.2}'),
('dark chocolate', 'other', 0.60, '{"dairy": true}', '{"energy_kcal": 598, "protein_g": 7.8, "fat_g": 42.6, "carbs_g": 45.8, "sugar_g": 24.0, "fiber_g": 10.9}'),
('milk chocolate', 'other', 0.60, '{"dairy": true}', '{"energy_kcal": 535, "protein_g": 7.7, "fat_g": 29.7, "carbs_g": 59.4, "sugar_g": 51.5, "fiber_g": 3.4}'),
('chocolate chips', 'other', 0.64, '{"dairy": true}', '{"energy_kcal": 479, "protein_g": 4.2, "fat_g": 27.8, "carbs_g": 63.0, "sugar_g": 51.9, "fiber_g": 5.6}');

-- NUTS & SEEDS
INSERT INTO ingredient_master (name, category, default_density_g_per_ml, allergen_flags, nutrition_per_100g) VALUES
('almond', 'nut', 0.56, '{"nuts": true}', '{"energy_kcal": 579, "protein_g": 21.2, "fat_g": 49.9, "carbs_g": 21.6, "sugar_g": 4.4, "fiber_g": 12.5}'),
('walnut', 'nut', 0.50, '{"nuts": true}', '{"energy_kcal": 654, "protein_g": 15.2, "fat_g": 65.2, "carbs_g": 13.7, "sugar_g": 2.6, "fiber_g": 6.7}'),
('pecan', 'nut', 0.44, '{"nuts": true}', '{"energy_kcal": 691, "protein_g": 9.2, "fat_g": 72.0, "carbs_g": 13.9, "sugar_g": 4.0, "fiber_g": 9.6}'),
('peanut butter', 'nut', 0.95, '{"nuts": true}', '{"energy_kcal": 588, "protein_g": 25.8, "fat_g": 50.0, "carbs_g": 20.0, "sugar_g": 9.2, "fiber_g": 6.0}');

-- SPICES & FLAVORING
INSERT INTO ingredient_master (name, category, default_density_g_per_ml, allergen_flags, nutrition_per_100g) VALUES
('salt', 'spice', 1.21, '{}', '{"energy_kcal": 0, "protein_g": 0.0, "fat_g": 0.0, "carbs_g": 0.0, "sugar_g": 0.0, "fiber_g": 0.0}'),
('cinnamon', 'spice', 0.50, '{}', '{"energy_kcal": 247, "protein_g": 3.9, "fat_g": 1.2, "carbs_g": 80.6, "sugar_g": 2.2, "fiber_g": 53.1}'),
('vanilla bean', 'spice', 0.45, '{}', '{"energy_kcal": 288, "protein_g": 0.1, "fat_g": 0.1, "carbs_g": 12.7, "sugar_g": 12.7, "fiber_g": 0.0}'),
('nutmeg', 'spice', 0.50, '{}', '{"energy_kcal": 525, "protein_g": 5.8, "fat_g": 36.3, "carbs_g": 49.3, "sugar_g": 28.5, "fiber_g": 20.8}'),
('ginger', 'spice', 0.45, '{}', '{"energy_kcal": 335, "protein_g": 9.1, "fat_g": 4.2, "carbs_g": 71.6, "sugar_g": 3.4, "fiber_g": 14.1}');

-- FRUITS (Common in baking)
INSERT INTO ingredient_master (name, category, default_density_g_per_ml, allergen_flags, nutrition_per_100g) VALUES
('banana', 'fruit', 0.95, '{}', '{"energy_kcal": 89, "protein_g": 1.1, "fat_g": 0.3, "carbs_g": 22.8, "sugar_g": 12.2, "fiber_g": 2.6}'),
('apple', 'fruit', 0.72, '{}', '{"energy_kcal": 52, "protein_g": 0.3, "fat_g": 0.2, "carbs_g": 13.8, "sugar_g": 10.4, "fiber_g": 2.4}'),
('blueberry', 'fruit', 0.66, '{}', '{"energy_kcal": 57, "protein_g": 0.7, "fat_g": 0.3, "carbs_g": 14.5, "sugar_g": 10.0, "fiber_g": 2.4}'),
('strawberry', 'fruit', 0.55, '{}', '{"energy_kcal": 32, "protein_g": 0.7, "fat_g": 0.3, "carbs_g": 7.7, "sugar_g": 4.9, "fiber_g": 2.0}'),
('lemon juice', 'fruit', 1.03, '{}', '{"energy_kcal": 22, "protein_g": 0.4, "fat_g": 0.2, "carbs_g": 6.9, "sugar_g": 2.5, "fiber_g": 0.3}');

-- ============================================================================
-- INGREDIENT SUBSTITUTIONS - Common Baking Substitutions
-- ============================================================================

-- Get IDs for common ingredients (helper variables)
DO $$
DECLARE
  butter_id UUID;
  egg_id UUID;
  milk_id UUID;
  ap_flour_id UUID;
  baking_powder_id UUID;
BEGIN
  -- Get ingredient IDs
  SELECT id INTO butter_id FROM ingredient_master WHERE name = 'butter';
  SELECT id INTO egg_id FROM ingredient_master WHERE name = 'egg';
  SELECT id INTO milk_id FROM ingredient_master WHERE name = 'milk';
  SELECT id INTO ap_flour_id FROM ingredient_master WHERE name = 'all-purpose flour';
  SELECT id INTO baking_powder_id FROM ingredient_master WHERE name = 'baking powder';

  -- Butter substitutions
  INSERT INTO ingredient_substitutions (
    original_ingredient_id, 
    substitute_ingredient_id, 
    ratio_multiplier, 
    moisture_impact, 
    structural_impact,
    flavor_impact,
    preparation_method
  ) VALUES
  (
    butter_id,
    (SELECT id FROM ingredient_master WHERE name = 'coconut oil'),
    1.0,
    'neutral',
    'neutral',
    'Slight coconut flavor may be present',
    'Use solid coconut oil at same temperature as butter would be'
  ),
  (
    butter_id,
    (SELECT id FROM ingredient_master WHERE name = 'greek yogurt'),
    0.5,
    'increase',
    'weaker',
    'Tangier flavor, denser texture',
    'Use full-fat Greek yogurt. Reduce other liquids by 10-15%'
  );

  -- Egg substitutions
  INSERT INTO ingredient_substitutions (
    original_ingredient_id,
    substitute_ingredient_id,
    ratio_multiplier,
    moisture_impact,
    structural_impact,
    flavor_impact,
    preparation_method
  ) VALUES
  (
    egg_id,
    (SELECT id FROM ingredient_master WHERE name = 'banana'),
    0.5,
    'increase',
    'weaker',
    'Banana flavor will be present',
    'Use 60g mashed ripe banana per egg. Best for muffins and quick breads'
  );

  -- Milk substitutions
  INSERT INTO ingredient_substitutions (
    original_ingredient_id,
    substitute_ingredient_id,
    ratio_multiplier,
    moisture_impact,
    structural_impact,
    flavor_impact,
    preparation_method
  ) VALUES
  (
    milk_id,
    (SELECT id FROM ingredient_master WHERE name = 'water'),
    1.0,
    'decrease',
    'neutral',
    'Less rich flavor',
    'Add 1 tablespoon melted butter per cup of water for richness'
  );

END $$;

-- ============================================================================
-- COMMON BAKING ISSUES - Emergency Help Database
-- ============================================================================

INSERT INTO common_issues (issue_type, symptoms, solution, prevention_tip) VALUES
('dough_too_sticky', 
 'Dough sticks to hands and work surface, cannot be shaped',
 'Add flour 1 tablespoon (8g) at a time while kneading. Do NOT add more than 10% of original flour amount or texture will change. If still sticky after 10%, dough may be over-hydrated.',
 'Always measure flour by weight (grams), not volume. Spoon flour into measuring cup, do not scoop directly. Humidity affects flour absorption.'),

('dough_too_dry',
 'Dough is crumbly, won''t come together, cracks when rolled',
 'Add water 1 teaspoon (5g) at a time, kneading between additions. Add up to 5% more liquid maximum.',
 'Ensure butter/eggs are at room temperature. Cold ingredients can make dough appear dry.'),

('bread_not_rising',
 'Dough has not doubled in size after expected time',
 'Check yeast expiration date. Move to warmer location (75-80°F ideal). If yeast is dead, cannot fix - must start over with fresh yeast.',
 'Proof yeast before using: dissolve in warm water (110°F) with pinch of sugar. Should foam within 10 minutes.'),

('cake_sunken_center',
 'Cake rose but center collapsed after baking',
 'Cannot fix baked cake. Cake is still edible. Level the top and frost to hide depression.',
 'Do NOT open oven door in first 25 minutes of baking. Verify oven temperature with oven thermometer. May be underbaked - test with toothpick.'),

('cookies_spread_flat',
 'Cookies spread too thin during baking, merged together',
 'Cannot fix baked cookies. For next batch: chill dough for 30 minutes before baking. Reduce butter by 10% or add 2 tablespoons more flour.',
 'Use room temperature butter, not melted. Ensure baking powder/soda is fresh. Use parchment paper, not greased pan.'),

('butter_sauce_split',
 'Butter sauce appears curdled or separated, not smooth',
 'Remove from heat immediately. Whisk in 1 teaspoon cold water at a time until emulsified. If still broken, blend with immersion blender for 30 seconds.',
 'Never overheat butter sauces. Keep below 180°F. Add liquid slowly while whisking constantly.'),

('egg_sauce_curdled',
 'Sauce with eggs appears grainy or curdled',
 'Immediately strain through fine-mesh sieve. Whisk in 1 tablespoon cold butter to re-emulsify. If severely curdled, cannot fix.',
 'Temper eggs before adding to hot liquid: slowly whisk 1/4 cup hot liquid into eggs first. Cook over low heat, never boiling.'),

('whipped_cream_grainy',
 'Whipped cream has butter granules, looks curdled',
 'Over-whipped. Cannot fix - you have made butter. Start over with fresh cream.',
 'Stop whipping at soft peaks for folding, stiff peaks for piping. Use very cold cream and cold bowl. Watch carefully - goes from perfect to butter in seconds.'),

('chocolate_seized',
 'Melted chocolate became grainy and stiff',
 'Chocolate seized from water contact. Whisk in 1 teaspoon vegetable oil per ounce of chocolate to smooth out. Will have slightly different texture.',
 'Never let water touch melting chocolate. Melt gently over double boiler or in microwave at 50% power in 30-second intervals.'),

('bread_gummy_inside',
 'Bread exterior is done but interior is gummy and underbaked',
 'Return to oven. Cover top with foil to prevent over-browning. Bake until internal temperature reaches 190-200°F.',
 'Use oven thermometer to verify temperature. Check internal temperature with instant-read thermometer. Larger loaves need lower temperature, longer baking time.');

-- ============================================================================
-- SUCCESS MESSAGES
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Seed data loaded successfully!';
  RAISE NOTICE '📦 Ingredient Master: % ingredients loaded', 
    (SELECT COUNT(*) FROM ingredient_master);
  RAISE NOTICE '🔄 Substitutions: % rules loaded', 
    (SELECT COUNT(*) FROM ingredient_substitutions);
  RAISE NOTICE '🆘 Common Issues: % solutions loaded', 
    (SELECT COUNT(*) FROM common_issues);
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Database is ready for use!';
  RAISE NOTICE 'Next step: Create a test user and recipe';
END $$;
