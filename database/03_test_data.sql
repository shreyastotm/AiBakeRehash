-- ============================================================================
-- AiBake Test Data Script
-- Version: 1.1 (fixed enum casts and dollar quoting)
-- ============================================================================

-- Clean up any partial test data
DELETE FROM recipe_nutrition_cache WHERE recipe_id IN (SELECT id FROM recipes WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@example.com'));
DELETE FROM timer_instances WHERE recipe_id IN (SELECT id FROM recipes WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@example.com'));
DELETE FROM recipe_audio_notes WHERE recipe_id IN (SELECT id FROM recipes WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@example.com'));
DELETE FROM recipe_version_snapshots WHERE recipe_version_id IN (SELECT rv.id FROM recipe_versions rv JOIN recipes r ON rv.recipe_id = r.id JOIN users u ON r.user_id = u.id WHERE u.email LIKE '%@example.com');
DELETE FROM recipe_versions WHERE recipe_id IN (SELECT id FROM recipes WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@example.com'));
DELETE FROM recipe_journal_entries WHERE recipe_id IN (SELECT id FROM recipes WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@example.com'));
DELETE FROM recipe_steps WHERE section_id IN (SELECT rs.id FROM recipe_sections rs JOIN recipes r ON rs.recipe_id = r.id JOIN users u ON r.user_id = u.id WHERE u.email LIKE '%@example.com');
DELETE FROM recipe_sections WHERE recipe_id IN (SELECT id FROM recipes WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@example.com'));
DELETE FROM recipe_ingredients WHERE recipe_id IN (SELECT id FROM recipes WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@example.com'));
DELETE FROM inventory_purchases WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@example.com');
DELETE FROM inventory_items WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@example.com');
DELETE FROM suppliers WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@example.com');
DELETE FROM recipes WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@example.com');
DELETE FROM users WHERE email LIKE '%@example.com';

-- ============================================================================
-- STEP 1: Test Users
-- ============================================================================
INSERT INTO users (email, password_hash, display_name, unit_preferences, default_currency, language) VALUES
('priya@example.com', '$2b$12$LJ3m4ys3Lz0QqV8wKzXnXeJZJ5J5J5J5J5J5J5J5J5J5J5J5J5J5', 'Priya Sharma',
 '{"flour": "grams", "sugar": "grams", "butter": "grams"}'::jsonb, 'INR', 'hi'),
('raj@example.com', '$2b$12$LJ3m4ys3Lz0QqV8wKzXnXeJZJ5J5J5J5J5J5J5J5J5J5J5J5J5J5', 'Raj Patel',
 '{"flour": "cups", "sugar": "cups", "butter": "grams"}'::jsonb, 'INR', 'en'),
('meera@example.com', '$2b$12$LJ3m4ys3Lz0QqV8wKzXnXeJZJ5J5J5J5J5J5J5J5J5J5J5J5J5J5', 'Meera Gupta',
 '{"flour": "cups", "sugar": "cups", "butter": "tbsp"}'::jsonb, 'INR', 'en');

-- ============================================================================
-- STEP 2: Recipes (9 total - 3 bread, 3 cookies, 3 cakes)
-- ============================================================================

-- Bread recipes
INSERT INTO recipes (user_id, title, description, source_type, servings, yield_weight_grams, preferred_unit_system, status)
VALUES (
  (SELECT id FROM users WHERE email = 'priya@example.com'),
  'Classic Whole Wheat Bread',
  'Soft and fluffy whole wheat bread perfect for daily consumption',
  'manual'::recipe_source_type, 8, 800.00, 'metric'::unit_system, 'active'::recipe_status
);

INSERT INTO recipes (user_id, title, description, source_type, servings, yield_weight_grams, preferred_unit_system, status)
VALUES (
  (SELECT id FROM users WHERE email = 'raj@example.com'),
  'Crusty Sourdough',
  'Artisan sourdough with crispy crust and tangy flavor',
  'manual'::recipe_source_type, 6, 900.00, 'metric'::unit_system, 'active'::recipe_status
);

INSERT INTO recipes (user_id, title, description, source_type, servings, yield_weight_grams, preferred_unit_system, status)
VALUES (
  (SELECT id FROM users WHERE email = 'meera@example.com'),
  'Soft Dinner Rolls',
  'Buttery dinner rolls perfect for any meal',
  'manual'::recipe_source_type, 12, 600.00, 'metric'::unit_system, 'active'::recipe_status
);

-- Cookie recipes
INSERT INTO recipes (user_id, title, description, source_type, servings, yield_weight_grams, preferred_unit_system, status)
VALUES (
  (SELECT id FROM users WHERE email = 'priya@example.com'),
  'Chocolate Chip Cookies',
  'Classic soft and chewy chocolate chip cookies',
  'manual'::recipe_source_type, 24, 600.00, 'metric'::unit_system, 'active'::recipe_status
);

INSERT INTO recipes (user_id, title, description, source_type, servings, yield_weight_grams, preferred_unit_system, status)
VALUES (
  (SELECT id FROM users WHERE email = 'raj@example.com'),
  'Eggless Butter Cookies',
  'Crispy butter cookies without eggs',
  'manual'::recipe_source_type, 20, 400.00, 'metric'::unit_system, 'active'::recipe_status
);

INSERT INTO recipes (user_id, title, description, source_type, servings, yield_weight_grams, preferred_unit_system, status)
VALUES (
  (SELECT id FROM users WHERE email = 'meera@example.com'),
  'Cardamom Shortbread',
  'Fragrant Indian-style shortbread with cardamom',
  'manual'::recipe_source_type, 16, 350.00, 'metric'::unit_system, 'draft'::recipe_status
);

-- Cake recipes
INSERT INTO recipes (user_id, title, description, source_type, servings, yield_weight_grams, preferred_unit_system, status)
VALUES (
  (SELECT id FROM users WHERE email = 'priya@example.com'),
  'Vanilla Sponge Cake',
  'Light and fluffy vanilla sponge cake',
  'manual'::recipe_source_type, 8, 500.00, 'metric'::unit_system, 'active'::recipe_status
);

INSERT INTO recipes (user_id, title, description, source_type, servings, yield_weight_grams, preferred_unit_system, status)
VALUES (
  (SELECT id FROM users WHERE email = 'raj@example.com'),
  'Chocolate Mud Cake',
  'Rich and decadent chocolate mud cake',
  'manual'::recipe_source_type, 10, 700.00, 'metric'::unit_system, 'active'::recipe_status
);

INSERT INTO recipes (user_id, title, description, source_type, servings, yield_weight_grams, preferred_unit_system, status)
VALUES (
  (SELECT id FROM users WHERE email = 'meera@example.com'),
  'Carrot Cake',
  'Moist carrot cake with cream cheese frosting',
  'manual'::recipe_source_type, 12, 800.00, 'metric'::unit_system, 'draft'::recipe_status
);

-- ============================================================================
-- STEP 3: Recipe Ingredients
-- ============================================================================

-- Whole Wheat Bread ingredients
INSERT INTO recipe_ingredients (recipe_id, ingredient_master_id, display_name, quantity_original, unit_original, quantity_grams, position)
VALUES (
  (SELECT id FROM recipes WHERE title = 'Classic Whole Wheat Bread'),
  (SELECT id FROM ingredient_master WHERE name = 'whole wheat flour'),
  'Whole wheat flour', 500, 'grams', 500.00, 1
);
INSERT INTO recipe_ingredients (recipe_id, ingredient_master_id, display_name, quantity_original, unit_original, quantity_grams, position)
VALUES (
  (SELECT id FROM recipes WHERE title = 'Classic Whole Wheat Bread'),
  (SELECT id FROM ingredient_master WHERE name = 'water'),
  'Warm water', 300, 'ml', 300.00, 2
);
INSERT INTO recipe_ingredients (recipe_id, ingredient_master_id, display_name, quantity_original, unit_original, quantity_grams, position)
VALUES (
  (SELECT id FROM recipes WHERE title = 'Classic Whole Wheat Bread'),
  (SELECT id FROM ingredient_master WHERE name = 'salt'),
  'Salt', 10, 'grams', 10.00, 3
);
INSERT INTO recipe_ingredients (recipe_id, ingredient_master_id, display_name, quantity_original, unit_original, quantity_grams, position)
VALUES (
  (SELECT id FROM recipes WHERE title = 'Classic Whole Wheat Bread'),
  (SELECT id FROM ingredient_master WHERE name = 'instant yeast'),
  'Instant yeast', 7, 'grams', 7.00, 4
);

-- Chocolate Chip Cookies ingredients
INSERT INTO recipe_ingredients (recipe_id, ingredient_master_id, display_name, quantity_original, unit_original, quantity_grams, position)
VALUES (
  (SELECT id FROM recipes WHERE title = 'Chocolate Chip Cookies'),
  (SELECT id FROM ingredient_master WHERE name = 'all-purpose flour'),
  'All-purpose flour', 250, 'grams', 250.00, 1
);
INSERT INTO recipe_ingredients (recipe_id, ingredient_master_id, display_name, quantity_original, unit_original, quantity_grams, position)
VALUES (
  (SELECT id FROM recipes WHERE title = 'Chocolate Chip Cookies'),
  (SELECT id FROM ingredient_master WHERE name = 'butter'),
  'Butter (softened)', 113, 'grams', 113.00, 2
);
INSERT INTO recipe_ingredients (recipe_id, ingredient_master_id, display_name, quantity_original, unit_original, quantity_grams, position)
VALUES (
  (SELECT id FROM recipes WHERE title = 'Chocolate Chip Cookies'),
  (SELECT id FROM ingredient_master WHERE name = 'granulated sugar'),
  'Granulated sugar', 100, 'grams', 100.00, 3
);
INSERT INTO recipe_ingredients (recipe_id, ingredient_master_id, display_name, quantity_original, unit_original, quantity_grams, position)
VALUES (
  (SELECT id FROM recipes WHERE title = 'Chocolate Chip Cookies'),
  (SELECT id FROM ingredient_master WHERE name = 'brown sugar'),
  'Brown sugar', 100, 'grams', 100.00, 4
);
INSERT INTO recipe_ingredients (recipe_id, ingredient_master_id, display_name, quantity_original, unit_original, quantity_grams, position)
VALUES (
  (SELECT id FROM recipes WHERE title = 'Chocolate Chip Cookies'),
  (SELECT id FROM ingredient_master WHERE name = 'egg'),
  'Egg', 50, 'grams', 50.00, 5
);
INSERT INTO recipe_ingredients (recipe_id, ingredient_master_id, display_name, quantity_original, unit_original, quantity_grams, position)
VALUES (
  (SELECT id FROM recipes WHERE title = 'Chocolate Chip Cookies'),
  (SELECT id FROM ingredient_master WHERE name = 'vanilla extract'),
  'Vanilla extract', 5, 'ml', 5.00, 6
);
INSERT INTO recipe_ingredients (recipe_id, ingredient_master_id, display_name, quantity_original, unit_original, quantity_grams, position)
VALUES (
  (SELECT id FROM recipes WHERE title = 'Chocolate Chip Cookies'),
  (SELECT id FROM ingredient_master WHERE name = 'baking soda'),
  'Baking soda', 5, 'grams', 5.00, 7
);
INSERT INTO recipe_ingredients (recipe_id, ingredient_master_id, display_name, quantity_original, unit_original, quantity_grams, position)
VALUES (
  (SELECT id FROM recipes WHERE title = 'Chocolate Chip Cookies'),
  (SELECT id FROM ingredient_master WHERE name = 'salt'),
  'Salt', 3, 'grams', 3.00, 8
);
INSERT INTO recipe_ingredients (recipe_id, ingredient_master_id, display_name, quantity_original, unit_original, quantity_grams, position)
VALUES (
  (SELECT id FROM recipes WHERE title = 'Chocolate Chip Cookies'),
  (SELECT id FROM ingredient_master WHERE name = 'baking chocolate'),
  'Chocolate chips', 170, 'grams', 170.00, 9
);

-- Vanilla Sponge Cake ingredients
INSERT INTO recipe_ingredients (recipe_id, ingredient_master_id, display_name, quantity_original, unit_original, quantity_grams, position)
VALUES (
  (SELECT id FROM recipes WHERE title = 'Vanilla Sponge Cake'),
  (SELECT id FROM ingredient_master WHERE name = 'all-purpose flour'),
  'All-purpose flour', 200, 'grams', 200.00, 1
);
INSERT INTO recipe_ingredients (recipe_id, ingredient_master_id, display_name, quantity_original, unit_original, quantity_grams, position)
VALUES (
  (SELECT id FROM recipes WHERE title = 'Vanilla Sponge Cake'),
  (SELECT id FROM ingredient_master WHERE name = 'granulated sugar'),
  'Sugar', 150, 'grams', 150.00, 2
);
INSERT INTO recipe_ingredients (recipe_id, ingredient_master_id, display_name, quantity_original, unit_original, quantity_grams, position)
VALUES (
  (SELECT id FROM recipes WHERE title = 'Vanilla Sponge Cake'),
  (SELECT id FROM ingredient_master WHERE name = 'butter'),
  'Butter', 100, 'grams', 100.00, 3
);
INSERT INTO recipe_ingredients (recipe_id, ingredient_master_id, display_name, quantity_original, unit_original, quantity_grams, position)
VALUES (
  (SELECT id FROM recipes WHERE title = 'Vanilla Sponge Cake'),
  (SELECT id FROM ingredient_master WHERE name = 'egg'),
  'Eggs', 100, 'grams', 100.00, 4
);
INSERT INTO recipe_ingredients (recipe_id, ingredient_master_id, display_name, quantity_original, unit_original, quantity_grams, position)
VALUES (
  (SELECT id FROM recipes WHERE title = 'Vanilla Sponge Cake'),
  (SELECT id FROM ingredient_master WHERE name = 'vanilla extract'),
  'Vanilla extract', 5, 'ml', 5.00, 5
);
INSERT INTO recipe_ingredients (recipe_id, ingredient_master_id, display_name, quantity_original, unit_original, quantity_grams, position)
VALUES (
  (SELECT id FROM recipes WHERE title = 'Vanilla Sponge Cake'),
  (SELECT id FROM ingredient_master WHERE name = 'baking powder'),
  'Baking powder', 8, 'grams', 8.00, 6
);

-- ============================================================================
-- STEP 4: Recipe Sections and Steps (for Chocolate Chip Cookies)
-- ============================================================================

INSERT INTO recipe_sections (recipe_id, type, title, position)
VALUES (
  (SELECT id FROM recipes WHERE title = 'Chocolate Chip Cookies'),
  'prep'::section_type, 'Prepare Dough', 1
);
INSERT INTO recipe_sections (recipe_id, type, title, position)
VALUES (
  (SELECT id FROM recipes WHERE title = 'Chocolate Chip Cookies'),
  'bake'::section_type, 'Bake Cookies', 2
);
INSERT INTO recipe_sections (recipe_id, type, title, position)
VALUES (
  (SELECT id FROM recipes WHERE title = 'Chocolate Chip Cookies'),
  'rest'::section_type, 'Cool', 3
);

-- Steps for prep section
INSERT INTO recipe_steps (section_id, instruction, duration_seconds, position)
VALUES (
  (SELECT rs.id FROM recipe_sections rs JOIN recipes r ON rs.recipe_id = r.id WHERE r.title = 'Chocolate Chip Cookies' AND rs.type = 'prep'::section_type),
  'Cream butter and sugars until light and fluffy', 180, 1
);
INSERT INTO recipe_steps (section_id, instruction, duration_seconds, position)
VALUES (
  (SELECT rs.id FROM recipe_sections rs JOIN recipes r ON rs.recipe_id = r.id WHERE r.title = 'Chocolate Chip Cookies' AND rs.type = 'prep'::section_type),
  'Beat in egg and vanilla extract', 60, 2
);
INSERT INTO recipe_steps (section_id, instruction, duration_seconds, position)
VALUES (
  (SELECT rs.id FROM recipe_sections rs JOIN recipes r ON rs.recipe_id = r.id WHERE r.title = 'Chocolate Chip Cookies' AND rs.type = 'prep'::section_type),
  'Mix flour, baking soda, and salt in separate bowl', 30, 3
);
INSERT INTO recipe_steps (section_id, instruction, duration_seconds, position)
VALUES (
  (SELECT rs.id FROM recipe_sections rs JOIN recipes r ON rs.recipe_id = r.id WHERE r.title = 'Chocolate Chip Cookies' AND rs.type = 'prep'::section_type),
  'Combine wet and dry ingredients', 60, 4
);
INSERT INTO recipe_steps (section_id, instruction, duration_seconds, position)
VALUES (
  (SELECT rs.id FROM recipe_sections rs JOIN recipes r ON rs.recipe_id = r.id WHERE r.title = 'Chocolate Chip Cookies' AND rs.type = 'prep'::section_type),
  'Fold in chocolate chips', 30, 5
);

-- Steps for bake section
INSERT INTO recipe_steps (section_id, instruction, duration_seconds, temperature_celsius, position)
VALUES (
  (SELECT rs.id FROM recipe_sections rs JOIN recipes r ON rs.recipe_id = r.id WHERE r.title = 'Chocolate Chip Cookies' AND rs.type = 'bake'::section_type),
  'Preheat oven to 190C', 300, 190, 1
);
INSERT INTO recipe_steps (section_id, instruction, duration_seconds, temperature_celsius, position)
VALUES (
  (SELECT rs.id FROM recipe_sections rs JOIN recipes r ON rs.recipe_id = r.id WHERE r.title = 'Chocolate Chip Cookies' AND rs.type = 'bake'::section_type),
  'Drop spoonfuls of dough onto baking sheet', 120, NULL, 2
);
INSERT INTO recipe_steps (section_id, instruction, duration_seconds, temperature_celsius, position)
VALUES (
  (SELECT rs.id FROM recipe_sections rs JOIN recipes r ON rs.recipe_id = r.id WHERE r.title = 'Chocolate Chip Cookies' AND rs.type = 'bake'::section_type),
  'Bake until golden brown', 600, 190, 3
);

-- ============================================================================
-- STEP 5: Recipe Versions
-- ============================================================================

INSERT INTO recipe_versions (recipe_id, version_number, change_summary)
VALUES (
  (SELECT id FROM recipes WHERE title = 'Chocolate Chip Cookies'),
  1, 'Initial version'
);
INSERT INTO recipe_versions (recipe_id, version_number, change_summary)
VALUES (
  (SELECT id FROM recipes WHERE title = 'Chocolate Chip Cookies'),
  2, 'Adjusted sugar ratio for less sweetness'
);
INSERT INTO recipe_versions (recipe_id, version_number, change_summary)
VALUES (
  (SELECT id FROM recipes WHERE title = 'Vanilla Sponge Cake'),
  1, 'Initial version'
);
INSERT INTO recipe_versions (recipe_id, version_number, change_summary)
VALUES (
  (SELECT id FROM recipes WHERE title = 'Vanilla Sponge Cake'),
  2, 'Added vanilla extract for more flavor'
);

-- ============================================================================
-- STEP 6: Journal Entries with Photos and Ratings
-- ============================================================================

INSERT INTO recipe_journal_entries (recipe_id, version_id, bake_date, notes, private_notes, rating, outcome_weight_grams, image_urls)
VALUES (
  (SELECT id FROM recipes WHERE title = 'Chocolate Chip Cookies'),
  (SELECT id FROM recipe_versions WHERE recipe_id = (SELECT id FROM recipes WHERE title = 'Chocolate Chip Cookies') AND version_number = 1),
  '2024-01-15'::date,
  'Turned out great! Cookies were perfectly chewy with crispy edges.',
  'Used room temperature butter which helped with creaming.',
  5, 580.00,
  '["https://cdn.example.com/cookies1.jpg", "https://cdn.example.com/cookies2.jpg"]'::jsonb
);

INSERT INTO recipe_journal_entries (recipe_id, version_id, bake_date, notes, private_notes, rating, outcome_weight_grams, image_urls)
VALUES (
  (SELECT id FROM recipes WHERE title = 'Chocolate Chip Cookies'),
  (SELECT id FROM recipe_versions WHERE recipe_id = (SELECT id FROM recipes WHERE title = 'Chocolate Chip Cookies') AND version_number = 2),
  '2024-01-22'::date,
  'Second batch with less sugar - still delicious and less cloying.',
  'Baked for 10 minutes instead of 12 for chewier texture.',
  4, 575.00,
  '["https://cdn.example.com/cookies3.jpg"]'::jsonb
);

INSERT INTO recipe_journal_entries (recipe_id, version_id, bake_date, notes, private_notes, rating, outcome_weight_grams, image_urls)
VALUES (
  (SELECT id FROM recipes WHERE title = 'Vanilla Sponge Cake'),
  (SELECT id FROM recipe_versions WHERE recipe_id = (SELECT id FROM recipes WHERE title = 'Vanilla Sponge Cake') AND version_number = 1),
  '2024-01-20'::date,
  'Cake rose beautifully and had great crumb structure.',
  'Oven temperature was accurate - no hot spots.',
  5, 495.00,
  '["https://cdn.example.com/cake1.jpg", "https://cdn.example.com/cake2.jpg"]'::jsonb
);

INSERT INTO recipe_journal_entries (recipe_id, version_id, bake_date, notes, private_notes, rating, outcome_weight_grams, image_urls)
VALUES (
  (SELECT id FROM recipes WHERE title = 'Vanilla Sponge Cake'),
  (SELECT id FROM recipe_versions WHERE recipe_id = (SELECT id FROM recipes WHERE title = 'Vanilla Sponge Cake') AND version_number = 2),
  '2024-01-27'::date,
  'Added more vanilla - flavor is more pronounced now.',
  'Slightly denser than first batch but still moist.',
  4, 510.00,
  '["https://cdn.example.com/cake4.jpg"]'::jsonb
);

INSERT INTO recipe_journal_entries (recipe_id, bake_date, notes, private_notes, rating, outcome_weight_grams, image_urls)
VALUES (
  (SELECT id FROM recipes WHERE title = 'Crusty Sourdough'),
  '2024-02-01'::date,
  'First attempt at sourdough - crust is crispy and crumb is open.',
  'Fermentation took longer than expected due to cool kitchen.',
  4, 880.00,
  '["https://cdn.example.com/bread1.jpg", "https://cdn.example.com/bread2.jpg"]'::jsonb
);

-- ============================================================================
-- STEP 7: Inventory Items
-- ============================================================================

INSERT INTO inventory_items (user_id, ingredient_master_id, quantity_on_hand, unit, cost_per_unit, currency, purchase_date, expiration_date, min_stock_level, reorder_quantity, notes)
VALUES (
  (SELECT id FROM users WHERE email = 'priya@example.com'),
  (SELECT id FROM ingredient_master WHERE name = 'all-purpose flour'),
  5000, 'grams', 0.40, 'INR', '2024-01-01'::date, '2024-06-01'::date, 1000, 5000, 'High quality brand'
);
INSERT INTO inventory_items (user_id, ingredient_master_id, quantity_on_hand, unit, cost_per_unit, currency, purchase_date, expiration_date, min_stock_level, reorder_quantity, notes)
VALUES (
  (SELECT id FROM users WHERE email = 'priya@example.com'),
  (SELECT id FROM ingredient_master WHERE name = 'butter'),
  500, 'grams', 45.00, 'INR', '2024-01-10'::date, '2024-02-10'::date, 200, 500, 'Salted butter'
);
INSERT INTO inventory_items (user_id, ingredient_master_id, quantity_on_hand, unit, cost_per_unit, currency, purchase_date, expiration_date, min_stock_level, reorder_quantity, notes)
VALUES (
  (SELECT id FROM users WHERE email = 'priya@example.com'),
  (SELECT id FROM ingredient_master WHERE name = 'granulated sugar'),
  2000, 'grams', 0.50, 'INR', '2024-01-05'::date, NULL, 500, 2000, 'Granulated sugar'
);
INSERT INTO inventory_items (user_id, ingredient_master_id, quantity_on_hand, unit, cost_per_unit, currency, purchase_date, expiration_date, min_stock_level, reorder_quantity, notes)
VALUES (
  (SELECT id FROM users WHERE email = 'priya@example.com'),
  (SELECT id FROM ingredient_master WHERE name = 'instant yeast'),
  50, 'grams', 5.00, 'INR', '2024-01-15'::date, '2024-04-15'::date, 10, 50, 'Instant dry yeast'
);
INSERT INTO inventory_items (user_id, ingredient_master_id, quantity_on_hand, unit, cost_per_unit, currency, purchase_date, expiration_date, min_stock_level, reorder_quantity, notes)
VALUES (
  (SELECT id FROM users WHERE email = 'raj@example.com'),
  (SELECT id FROM ingredient_master WHERE name = 'bread flour'),
  3000, 'grams', 0.45, 'INR', '2024-01-08'::date, '2024-06-08'::date, 500, 3000, 'Premium bread flour'
);
INSERT INTO inventory_items (user_id, ingredient_master_id, quantity_on_hand, unit, cost_per_unit, currency, purchase_date, expiration_date, min_stock_level, reorder_quantity, notes)
VALUES (
  (SELECT id FROM users WHERE email = 'raj@example.com'),
  (SELECT id FROM ingredient_master WHERE name = 'baking powder'),
  200, 'grams', 2.00, 'INR', '2024-01-12'::date, '2024-12-12'::date, 50, 200, 'Double acting'
);
INSERT INTO inventory_items (user_id, ingredient_master_id, quantity_on_hand, unit, cost_per_unit, currency, purchase_date, expiration_date, min_stock_level, reorder_quantity, notes)
VALUES (
  (SELECT id FROM users WHERE email = 'raj@example.com'),
  (SELECT id FROM ingredient_master WHERE name = 'vanilla extract'),
  100, 'ml', 15.00, 'INR', '2024-01-01'::date, '2025-01-01'::date, 20, 100, 'Pure vanilla extract'
);
INSERT INTO inventory_items (user_id, ingredient_master_id, quantity_on_hand, unit, cost_per_unit, currency, purchase_date, expiration_date, min_stock_level, reorder_quantity, notes)
VALUES (
  (SELECT id FROM users WHERE email = 'meera@example.com'),
  (SELECT id FROM ingredient_master WHERE name = 'baking chocolate'),
  300, 'grams', 8.00, 'INR', '2024-01-20'::date, '2024-12-20'::date, 100, 300, 'Dark chocolate chips'
);
INSERT INTO inventory_items (user_id, ingredient_master_id, quantity_on_hand, unit, cost_per_unit, currency, purchase_date, expiration_date, min_stock_level, reorder_quantity, notes)
VALUES (
  (SELECT id FROM users WHERE email = 'meera@example.com'),
  (SELECT id FROM ingredient_master WHERE name = 'salt'),
  500, 'grams', 0.20, 'INR', '2024-01-01'::date, NULL, 100, 500, 'Sea salt'
);
INSERT INTO inventory_items (user_id, ingredient_master_id, quantity_on_hand, unit, cost_per_unit, currency, purchase_date, expiration_date, min_stock_level, reorder_quantity, notes)
VALUES (
  (SELECT id FROM users WHERE email = 'meera@example.com'),
  (SELECT id FROM ingredient_master WHERE name = 'all-purpose flour'),
  2000, 'grams', 0.40, 'INR', '2024-01-18'::date, '2024-07-18'::date, 500, 2000, 'Standard all-purpose'
);

-- ============================================================================
-- STEP 8: Suppliers
-- ============================================================================

INSERT INTO suppliers (user_id, name, contact_person, phone, email, address, notes)
VALUES (
  (SELECT id FROM users WHERE email = 'priya@example.com'),
  'Local Flour Mill', 'Ramesh Kumar', '+91-9876543210', 'ramesh@flourmill.com',
  '123 Mill Street, Delhi', 'Reliable supplier with good quality'
);
INSERT INTO suppliers (user_id, name, contact_person, phone, email, address, notes)
VALUES (
  (SELECT id FROM users WHERE email = 'priya@example.com'),
  'Dairy Direct', 'Sunita Sharma', '+91-9876543211', 'sunita@dairydirect.com',
  '456 Dairy Lane, Delhi', 'Fresh butter and dairy products'
);
INSERT INTO suppliers (user_id, name, contact_person, phone, email, address, notes)
VALUES (
  (SELECT id FROM users WHERE email = 'raj@example.com'),
  'Wholesale Bakery Supplies', 'Vikram Singh', '+91-9876543212', 'vikram@bakesupply.com',
  '789 Supply Road, Mumbai', 'Bulk ingredients and baking supplies'
);
INSERT INTO suppliers (user_id, name, contact_person, phone, email, address, notes)
VALUES (
  (SELECT id FROM users WHERE email = 'meera@example.com'),
  'Premium Ingredients Co', 'Anjali Patel', '+91-9876543213', 'anjali@premiumingredients.com',
  '321 Premium Street, Bangalore', 'High quality specialty ingredients'
);

-- ============================================================================
-- STEP 9: Purchase History
-- ============================================================================

INSERT INTO inventory_purchases (user_id, ingredient_master_id, quantity, unit, cost, currency, purchase_date, notes)
VALUES (
  (SELECT id FROM users WHERE email = 'priya@example.com'),
  (SELECT id FROM ingredient_master WHERE name = 'all-purpose flour'),
  5000, 'grams', 2000.00, 'INR', '2024-01-01'::date, 'Bulk purchase'
);
INSERT INTO inventory_purchases (user_id, ingredient_master_id, quantity, unit, cost, currency, purchase_date, notes)
VALUES (
  (SELECT id FROM users WHERE email = 'priya@example.com'),
  (SELECT id FROM ingredient_master WHERE name = 'butter'),
  500, 'grams', 22500.00, 'INR', '2024-01-10'::date, 'Premium brand'
);
INSERT INTO inventory_purchases (user_id, ingredient_master_id, quantity, unit, cost, currency, purchase_date, notes)
VALUES (
  (SELECT id FROM users WHERE email = 'raj@example.com'),
  (SELECT id FROM ingredient_master WHERE name = 'bread flour'),
  3000, 'grams', 1350.00, 'INR', '2024-01-08'::date, 'Wholesale purchase'
);
INSERT INTO inventory_purchases (user_id, ingredient_master_id, quantity, unit, cost, currency, purchase_date, notes)
VALUES (
  (SELECT id FROM users WHERE email = 'meera@example.com'),
  (SELECT id FROM ingredient_master WHERE name = 'granulated sugar'),
  2000, 'grams', 1000.00, 'INR', '2024-01-15'::date, 'Monthly stock'
);

-- ============================================================================
-- STEP 10: Audio Notes
-- ============================================================================

INSERT INTO recipe_audio_notes (recipe_id, audio_url, duration_seconds, transcription_text, recorded_at_stage)
VALUES (
  (SELECT id FROM recipes WHERE title = 'Chocolate Chip Cookies'),
  'https://cdn.example.com/audio/note1.mp3', 45,
  'Remember to use room temperature butter for better creaming.',
  'prep'
);
INSERT INTO recipe_audio_notes (recipe_id, audio_url, duration_seconds, transcription_text, recorded_at_stage)
VALUES (
  (SELECT id FROM recipes WHERE title = 'Chocolate Chip Cookies'),
  'https://cdn.example.com/audio/note2.mp3', 30,
  'Bake for exactly 10 minutes for chewy cookies. Do not overbake!',
  'bake'
);

-- ============================================================================
-- STEP 11: Timer Instances
-- ============================================================================

INSERT INTO timer_instances (recipe_id, step_id, duration_seconds, status, started_at)
VALUES (
  (SELECT id FROM recipes WHERE title = 'Chocolate Chip Cookies'),
  (SELECT rs.id FROM recipe_steps rs JOIN recipe_sections rsec ON rs.section_id = rsec.id JOIN recipes r ON rsec.recipe_id = r.id WHERE r.title = 'Chocolate Chip Cookies' AND rs.instruction LIKE '%Cream%' LIMIT 1),
  180, 'completed'::timer_status, NOW() - INTERVAL '2 days'
);
INSERT INTO timer_instances (recipe_id, step_id, duration_seconds, status, started_at)
VALUES (
  (SELECT id FROM recipes WHERE title = 'Chocolate Chip Cookies'),
  (SELECT rs.id FROM recipe_steps rs JOIN recipe_sections rsec ON rs.section_id = rsec.id JOIN recipes r ON rsec.recipe_id = r.id WHERE r.title = 'Chocolate Chip Cookies' AND rs.instruction LIKE '%Bake%' LIMIT 1),
  600, 'completed'::timer_status, NOW() - INTERVAL '1 day'
);

-- ============================================================================
-- STEP 12: Nutrition Cache
-- ============================================================================

INSERT INTO recipe_nutrition_cache (recipe_id, nutrition_per_100g, nutrition_per_serving, calculated_at)
VALUES (
  (SELECT id FROM recipes WHERE title = 'Chocolate Chip Cookies'),
  '{"energy_kcal": 450, "protein_g": 5.2, "fat_g": 22.5, "carbs_g": 58.3, "fiber_g": 1.2}'::jsonb,
  '{"energy_kcal": 112, "protein_g": 1.3, "fat_g": 5.6, "carbs_g": 14.6, "fiber_g": 0.3}'::jsonb,
  NOW()
);
INSERT INTO recipe_nutrition_cache (recipe_id, nutrition_per_100g, nutrition_per_serving, calculated_at)
VALUES (
  (SELECT id FROM recipes WHERE title = 'Vanilla Sponge Cake'),
  '{"energy_kcal": 320, "protein_g": 4.8, "fat_g": 12.0, "carbs_g": 48.5, "fiber_g": 0.5}'::jsonb,
  '{"energy_kcal": 160, "protein_g": 2.4, "fat_g": 6.0, "carbs_g": 24.3, "fiber_g": 0.25}'::jsonb,
  NOW()
);

-- ============================================================================
-- Verification
-- ============================================================================
SELECT 'users' as entity, COUNT(*) as total FROM users
UNION ALL SELECT 'recipes', COUNT(*) FROM recipes
UNION ALL SELECT 'recipe_ingredients', COUNT(*) FROM recipe_ingredients
UNION ALL SELECT 'recipe_sections', COUNT(*) FROM recipe_sections
UNION ALL SELECT 'recipe_steps', COUNT(*) FROM recipe_steps
UNION ALL SELECT 'recipe_versions', COUNT(*) FROM recipe_versions
UNION ALL SELECT 'journal_entries', COUNT(*) FROM recipe_journal_entries
UNION ALL SELECT 'inventory_items', COUNT(*) FROM inventory_items
UNION ALL SELECT 'suppliers', COUNT(*) FROM suppliers
UNION ALL SELECT 'purchases', COUNT(*) FROM inventory_purchases
UNION ALL SELECT 'audio_notes', COUNT(*) FROM recipe_audio_notes
UNION ALL SELECT 'timer_instances', COUNT(*) FROM timer_instances
UNION ALL SELECT 'nutrition_cache', COUNT(*) FROM recipe_nutrition_cache
ORDER BY entity;
