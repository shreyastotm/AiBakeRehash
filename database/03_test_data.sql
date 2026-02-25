-- ============================================================================
-- AiBake Test Data Script
-- Version: 1.0
-- PostgreSQL 15+
--
-- This script populates the database with sample data for development:
--   1. Test users with different preferences
--   2. Diverse recipe examples (bread, cookies, cakes, pastries)
--   3. Recipe versions and journal entries with photos and ratings
--   4. Inventory items with various stock levels
--   5. Sample timers and audio notes
-- ============================================================================

-- ============================================================================
-- STEP 1: Create Test Users
-- ============================================================================

INSERT INTO users (email, password_hash, display_name, unit_preferences, default_currency, language) VALUES
-- User 1: Priya (metric preference, Hindi language)
('priya@example.com', '$2b$12$abcdefghijklmnopqrstuvwxyz1234567890', 'Priya Sharma', 
 '{"flour": "grams", "sugar": "grams", "butter": "grams"}'::jsonb, 'INR', 'hi'),

-- User 2: Raj (hybrid preference, English language)
('raj@example.com', '$2b$12$abcdefghijklmnopqrstuvwxyz1234567890', 'Raj Patel',
 '{"flour": "cups", "sugar": "cups", "butter": "grams"}'::jsonb, 'INR', 'en'),

-- User 3: Meera (cups preference, English language)
('meera@example.com', '$2b$12$abcdefghijklmnopqrstuvwxyz1234567890', 'Meera Gupta',
 '{"flour": "cups", "sugar": "cups", "butter": "tbsp"}'::jsonb, 'INR', 'en');

-- ============================================================================
-- STEP 2: Create Test Recipes - Bread Category
-- ============================================================================

-- Get user IDs for reference (using subqueries)
WITH user_ids AS (
  SELECT id, email FROM users WHERE email IN ('priya@example.com', 'raj@example.com', 'meera@example.com')
),
ingredient_ids AS (
  SELECT id, name FROM ingredient_master 
  WHERE name IN ('all-purpose flour', 'bread flour', 'water', 'salt', 'instant yeast', 'butter', 'sugar')
)
INSERT INTO recipes (user_id, title, description, source_type, servings, yield_weight_grams, preferred_unit_system, status)
SELECT 
  (SELECT id FROM user_ids WHERE email = 'priya@example.com'),
  'Classic Whole Wheat Bread',
  'Soft and fluffy whole wheat bread perfect for daily consumption',
  'manual',
  8,
  800.00,
  'metric',
  'active'
UNION ALL
SELECT 
  (SELECT id FROM user_ids WHERE email = 'raj@example.com'),
  'Crusty Sourdough',
  'Artisan sourdough with crispy crust and tangy flavor',
  'manual',
  6,
  900.00,
  'metric',
  'active'
UNION ALL
SELECT 
  (SELECT id FROM user_ids WHERE email = 'meera@example.com'),
  'Soft Dinner Rolls',
  'Buttery dinner rolls perfect for any meal',
  'manual',
  12,
  600.00,
  'metric',
  'active';

-- ============================================================================
-- STEP 3: Add Ingredients to Bread Recipes
-- ============================================================================

WITH recipe_data AS (
  SELECT r.id as recipe_id, r.title, u.email
  FROM recipes r
  JOIN users u ON r.user_id = u.id
  WHERE r.title IN ('Classic Whole Wheat Bread', 'Crusty Sourdough', 'Soft Dinner Rolls')
),
ingredients_map AS (
  SELECT id, name FROM ingredient_master 
  WHERE name IN ('all-purpose flour', 'bread flour', 'whole wheat flour', 'water', 'salt', 'instant yeast', 'butter', 'sugar')
)
INSERT INTO recipe_ingredients (recipe_id, ingredient_master_id, display_name, quantity_original, unit_original, quantity_grams, position)
SELECT 
  (SELECT recipe_id FROM recipe_data WHERE title = 'Classic Whole Wheat Bread'),
  (SELECT id FROM ingredients_map WHERE name = 'whole wheat flour'),
  'Whole wheat flour',
  500, 'grams', 500.00, 1
UNION ALL
SELECT 
  (SELECT recipe_id FROM recipe_data WHERE title = 'Classic Whole Wheat Bread'),
  (SELECT id FROM ingredients_map WHERE name = 'water'),
  'Warm water',
  300, 'ml', 300.00, 2
UNION ALL
SELECT 
  (SELECT recipe_id FROM recipe_data WHERE title = 'Classic Whole Wheat Bread'),
  (SELECT id FROM ingredients_map WHERE name = 'salt'),
  'Salt',
  10, 'grams', 10.00, 3
UNION ALL
SELECT 
  (SELECT recipe_id FROM recipe_data WHERE title = 'Classic Whole Wheat Bread'),
  (SELECT id FROM ingredients_map WHERE name = 'instant yeast'),
  'Instant yeast',
  7, 'grams', 7.00, 4
UNION ALL
SELECT 
  (SELECT recipe_id FROM recipe_data WHERE title = 'Crusty Sourdough'),
  (SELECT id FROM ingredients_map WHERE name = 'bread flour'),
  'Bread flour',
  600, 'grams', 600.00, 1
UNION ALL
SELECT 
  (SELECT recipe_id FROM recipe_data WHERE title = 'Crusty Sourdough'),
  (SELECT id FROM ingredients_map WHERE name = 'water'),
  'Water',
  400, 'ml', 400.00, 2
UNION ALL
SELECT 
  (SELECT recipe_id FROM recipe_data WHERE title = 'Crusty Sourdough'),
  (SELECT id FROM ingredients_map WHERE name = 'salt'),
  'Sea salt',
  12, 'grams', 12.00, 3
UNION ALL
SELECT 
  (SELECT recipe_id FROM recipe_data WHERE title = 'Soft Dinner Rolls'),
  (SELECT id FROM ingredients_map WHERE name = 'all-purpose flour'),
  'All-purpose flour',
  400, 'grams', 400.00, 1
UNION ALL
SELECT 
  (SELECT recipe_id FROM recipe_data WHERE title = 'Soft Dinner Rolls'),
  (SELECT id FROM ingredients_map WHERE name = 'butter'),
  'Butter (softened)',
  50, 'grams', 50.00, 2
UNION ALL
SELECT 
  (SELECT recipe_id FROM recipe_data WHERE title = 'Soft Dinner Rolls'),
  (SELECT id FROM ingredients_map WHERE name = 'sugar'),
  'Sugar',
  30, 'grams', 30.00, 3
UNION ALL
SELECT 
  (SELECT recipe_id FROM recipe_data WHERE title = 'Soft Dinner Rolls'),
  (SELECT id FROM ingredients_map WHERE name = 'water'),
  'Warm milk',
  200, 'ml', 200.00, 4
UNION ALL
SELECT 
  (SELECT recipe_id FROM recipe_data WHERE title = 'Soft Dinner Rolls'),
  (SELECT id FROM ingredients_map WHERE name = 'instant yeast'),
  'Instant yeast',
  5, 'grams', 5.00, 5
UNION ALL
SELECT 
  (SELECT recipe_id FROM recipe_data WHERE title = 'Soft Dinner Rolls'),
  (SELECT id FROM ingredients_map WHERE name = 'salt'),
  'Salt',
  8, 'grams', 8.00, 6;

-- ============================================================================
-- STEP 4: Create Test Recipes - Cookies Category
-- ============================================================================

WITH user_ids AS (
  SELECT id, email FROM users WHERE email IN ('priya@example.com', 'raj@example.com', 'meera@example.com')
)
INSERT INTO recipes (user_id, title, description, source_type, servings, yield_weight_grams, preferred_unit_system, status)
SELECT 
  (SELECT id FROM user_ids WHERE email = 'priya@example.com'),
  'Chocolate Chip Cookies',
  'Classic soft and chewy chocolate chip cookies',
  'manual',
  24,
  600.00,
  'metric',
  'active'
UNION ALL
SELECT 
  (SELECT id FROM user_ids WHERE email = 'raj@example.com'),
  'Eggless Butter Cookies',
  'Crispy butter cookies without eggs',
  'manual',
  20,
  400.00,
  'metric',
  'active'
UNION ALL
SELECT 
  (SELECT id FROM user_ids WHERE email = 'meera@example.com'),
  'Cardamom Shortbread',
  'Fragrant Indian-style shortbread with cardamom',
  'manual',
  16,
  350.00,
  'metric',
  'draft';

-- ============================================================================
-- STEP 5: Add Ingredients to Cookie Recipes
-- ============================================================================

WITH recipe_data AS (
  SELECT r.id as recipe_id, r.title
  FROM recipes r
  WHERE r.title IN ('Chocolate Chip Cookies', 'Eggless Butter Cookies', 'Cardamom Shortbread')
),
ingredients_map AS (
  SELECT id, name FROM ingredient_master 
  WHERE name IN ('all-purpose flour', 'butter', 'sugar', 'brown sugar', 'egg', 'vanilla extract', 'baking soda', 'salt', 'baking chocolate', 'cardamom')
)
INSERT INTO recipe_ingredients (recipe_id, ingredient_master_id, display_name, quantity_original, unit_original, quantity_grams, position)
SELECT 
  (SELECT recipe_id FROM recipe_data WHERE title = 'Chocolate Chip Cookies'),
  (SELECT id FROM ingredients_map WHERE name = 'all-purpose flour'),
  'All-purpose flour',
  250, 'grams', 250.00, 1
UNION ALL
SELECT 
  (SELECT recipe_id FROM recipe_data WHERE title = 'Chocolate Chip Cookies'),
  (SELECT id FROM ingredients_map WHERE name = 'butter'),
  'Butter (softened)',
  113, 'grams', 113.00, 2
UNION ALL
SELECT 
  (SELECT recipe_id FROM recipe_data WHERE title = 'Chocolate Chip Cookies'),
  (SELECT id FROM ingredients_map WHERE name = 'sugar'),
  'Granulated sugar',
  100, 'grams', 100.00, 3
UNION ALL
SELECT 
  (SELECT recipe_id FROM recipe_data WHERE title = 'Chocolate Chip Cookies'),
  (SELECT id FROM ingredients_map WHERE name = 'brown sugar'),
  'Brown sugar',
  100, 'grams', 100.00, 4
UNION ALL
SELECT 
  (SELECT recipe_id FROM recipe_data WHERE title = 'Chocolate Chip Cookies'),
  (SELECT id FROM ingredients_map WHERE name = 'egg'),
  'Egg',
  50, 'grams', 50.00, 5
UNION ALL
SELECT 
  (SELECT recipe_id FROM recipe_data WHERE title = 'Chocolate Chip Cookies'),
  (SELECT id FROM ingredients_map WHERE name = 'vanilla extract'),
  'Vanilla extract',
  5, 'ml', 5.00, 6
UNION ALL
SELECT 
  (SELECT recipe_id FROM recipe_data WHERE title = 'Chocolate Chip Cookies'),
  (SELECT id FROM ingredients_map WHERE name = 'baking soda'),
  'Baking soda',
  5, 'grams', 5.00, 7
UNION ALL
SELECT 
  (SELECT recipe_id FROM recipe_data WHERE title = 'Chocolate Chip Cookies'),
  (SELECT id FROM ingredients_map WHERE name = 'salt'),
  'Salt',
  3, 'grams', 3.00, 8
UNION ALL
SELECT 
  (SELECT recipe_id FROM recipe_data WHERE title = 'Chocolate Chip Cookies'),
  (SELECT id FROM ingredients_map WHERE name = 'baking chocolate'),
  'Chocolate chips',
  170, 'grams', 170.00, 9
UNION ALL
SELECT 
  (SELECT recipe_id FROM recipe_data WHERE title = 'Eggless Butter Cookies'),
  (SELECT id FROM ingredients_map WHERE name = 'all-purpose flour'),
  'All-purpose flour',
  200, 'grams', 200.00, 1
UNION ALL
SELECT 
  (SELECT recipe_id FROM recipe_data WHERE title = 'Eggless Butter Cookies'),
  (SELECT id FROM ingredients_map WHERE name = 'butter'),
  'Butter (softened)',
  100, 'grams', 100.00, 2
UNION ALL
SELECT 
  (SELECT recipe_id FROM recipe_data WHERE title = 'Eggless Butter Cookies'),
  (SELECT id FROM ingredients_map WHERE name = 'sugar'),
  'Powdered sugar',
  80, 'grams', 80.00, 3
UNION ALL
SELECT 
  (SELECT recipe_id FROM recipe_data WHERE title = 'Eggless Butter Cookies'),
  (SELECT id FROM ingredients_map WHERE name = 'vanilla extract'),
  'Vanilla extract',
  3, 'ml', 3.00, 4
UNION ALL
SELECT 
  (SELECT recipe_id FROM recipe_data WHERE title = 'Eggless Butter Cookies'),
  (SELECT id FROM ingredients_map WHERE name = 'salt'),
  'Salt',
  2, 'grams', 2.00, 5
UNION ALL
SELECT 
  (SELECT recipe_id FROM recipe_data WHERE title = 'Cardamom Shortbread'),
  (SELECT id FROM ingredients_map WHERE name = 'all-purpose flour'),
  'All-purpose flour',
  200, 'grams', 200.00, 1
UNION ALL
SELECT 
  (SELECT recipe_id FROM recipe_data WHERE title = 'Cardamom Shortbread'),
  (SELECT id FROM ingredients_map WHERE name = 'butter'),
  'Ghee',
  100, 'grams', 100.00, 2
UNION ALL
SELECT 
  (SELECT recipe_id FROM recipe_data WHERE title = 'Cardamom Shortbread'),
  (SELECT id FROM ingredients_map WHERE name = 'sugar'),
  'Powdered sugar',
  60, 'grams', 60.00, 3
UNION ALL
SELECT 
  (SELECT recipe_id FROM recipe_data WHERE title = 'Cardamom Shortbread'),
  (SELECT id FROM ingredients_map WHERE name = 'cardamom'),
  'Cardamom powder',
  2, 'grams', 2.00, 4
UNION ALL
SELECT 
  (SELECT recipe_id FROM recipe_data WHERE title = 'Cardamom Shortbread'),
  (SELECT id FROM ingredients_map WHERE name = 'salt'),
  'Salt',
  1, 'grams', 1.00, 5;

-- ============================================================================
-- STEP 6: Create Test Recipes - Cakes Category
-- ============================================================================

WITH user_ids AS (
  SELECT id, email FROM users WHERE email IN ('priya@example.com', 'raj@example.com', 'meera@example.com')
)
INSERT INTO recipes (user_id, title, description, source_type, servings, yield_weight_grams, preferred_unit_system, status)
SELECT 
  (SELECT id FROM user_ids WHERE email = 'priya@example.com'),
  'Vanilla Sponge Cake',
  'Light and fluffy vanilla sponge cake',
  'manual',
  8,
  500.00,
  'metric',
  'active'
UNION ALL
SELECT 
  (SELECT id FROM user_ids WHERE email = 'raj@example.com'),
  'Chocolate Mud Cake',
  'Rich and decadent chocolate mud cake',
  'manual',
  10,
  700.00,
  'metric',
  'active'
UNION ALL
SELECT 
  (SELECT id FROM user_ids WHERE email = 'meera@example.com'),
  'Carrot Cake',
  'Moist carrot cake with cream cheese frosting',
  'manual',
  12,
  800.00,
  'metric',
  'draft';

-- ============================================================================
-- STEP 7: Create Recipe Sections and Steps
-- ============================================================================

WITH recipe_data AS (
  SELECT r.id as recipe_id, r.title
  FROM recipes r
  WHERE r.title = 'Chocolate Chip Cookies'
)
INSERT INTO recipe_sections (recipe_id, type, title, position)
SELECT recipe_id, 'prep', 'Prepare Dough', 1 FROM recipe_data
UNION ALL
SELECT recipe_id, 'bake', 'Bake Cookies', 2 FROM recipe_data
UNION ALL
SELECT recipe_id, 'rest', 'Cool', 3 FROM recipe_data;

-- Add steps to the prep section
WITH section_data AS (
  SELECT rs.id as section_id, r.id as recipe_id
  FROM recipe_sections rs
  JOIN recipes r ON rs.recipe_id = r.id
  WHERE r.title = 'Chocolate Chip Cookies' AND rs.type = 'prep'
)
INSERT INTO recipe_steps (section_id, instruction, duration_seconds, position)
SELECT section_id, 'Cream butter and sugars until light and fluffy', 180, 1 FROM section_data
UNION ALL
SELECT section_id, 'Beat in egg and vanilla extract', 60, 2 FROM section_data
UNION ALL
SELECT section_id, 'Mix flour, baking soda, and salt in separate bowl', 30, 3 FROM section_data
UNION ALL
SELECT section_id, 'Combine wet and dry ingredients', 60, 4 FROM section_data
UNION ALL
SELECT section_id, 'Fold in chocolate chips', 30, 5 FROM section_data;

-- Add steps to the bake section
WITH section_data AS (
  SELECT rs.id as section_id
  FROM recipe_sections rs
  JOIN recipes r ON rs.recipe_id = r.id
  WHERE r.title = 'Chocolate Chip Cookies' AND rs.type = 'bake'
)
INSERT INTO recipe_steps (section_id, instruction, duration_seconds, temperature_celsius, position)
SELECT section_id, 'Preheat oven to 375°F', 300, 190, 1 FROM section_data
UNION ALL
SELECT section_id, 'Drop spoonfuls of dough onto baking sheet', 120, 190, 2 FROM section_data
UNION ALL
SELECT section_id, 'Bake until golden brown', 600, 190, 3 FROM section_data;

-- ============================================================================
-- STEP 8: Create Recipe Versions
-- ============================================================================

WITH recipe_data AS (
  SELECT r.id as recipe_id, r.title
  FROM recipes r
  WHERE r.title IN ('Chocolate Chip Cookies', 'Vanilla Sponge Cake')
)
INSERT INTO recipe_versions (recipe_id, version_number, change_summary)
SELECT recipe_id, 1, 'Initial version' FROM recipe_data
UNION ALL
SELECT recipe_id, 2, 'Adjusted sugar ratio for less sweetness' FROM recipe_data WHERE title = 'Chocolate Chip Cookies'
UNION ALL
SELECT recipe_id, 2, 'Added vanilla extract for more flavor' FROM recipe_data WHERE title = 'Vanilla Sponge Cake';

-- ============================================================================
-- STEP 9: Create Baking Journal Entries with Photos and Ratings
-- ============================================================================

WITH recipe_data AS (
  SELECT r.id as recipe_id, r.title
  FROM recipes r
  WHERE r.title IN ('Chocolate Chip Cookies', 'Vanilla Sponge Cake', 'Crusty Sourdough')
)
INSERT INTO recipe_journal_entries (recipe_id, version_id, bake_date, notes, private_notes, rating, outcome_weight_grams, image_urls)
SELECT 
  (SELECT recipe_id FROM recipe_data WHERE title = 'Chocolate Chip Cookies'),
  (SELECT id FROM recipe_versions WHERE recipe_id = (SELECT recipe_id FROM recipe_data WHERE title = 'Chocolate Chip Cookies') AND version_number = 1),
  '2024-01-15',
  'Turned out great! Cookies were perfectly chewy with crispy edges.',
  'Used room temperature butter which helped with creaming.',
  5,
  580.00,
  '["https://cdn.example.com/cookies1.jpg", "https://cdn.example.com/cookies2.jpg"]'::jsonb
UNION ALL
SELECT 
  (SELECT recipe_id FROM recipe_data WHERE title = 'Chocolate Chip Cookies'),
  (SELECT id FROM recipe_versions WHERE recipe_id = (SELECT recipe_id FROM recipe_data WHERE title = 'Chocolate Chip Cookies') AND version_number = 2),
  '2024-01-22',
  'Second batch with less sugar - still delicious and less cloying.',
  'Baked for 10 minutes instead of 12 for chewier texture.',
  4,
  575.00,
  '["https://cdn.example.com/cookies3.jpg"]'::jsonb
UNION ALL
SELECT 
  (SELECT recipe_id FROM recipe_data WHERE title = 'Vanilla Sponge Cake'),
  (SELECT id FROM recipe_versions WHERE recipe_id = (SELECT recipe_id FROM recipe_data WHERE title = 'Vanilla Sponge Cake') AND version_number = 1),
  '2024-01-20',
  'Cake rose beautifully and had great crumb structure.',
  'Oven temperature was accurate - no hot spots.',
  5,
  495.00,
  '["https://cdn.example.com/cake1.jpg", "https://cdn.example.com/cake2.jpg", "https://cdn.example.com/cake3.jpg"]'::jsonb
UNION ALL
SELECT 
  (SELECT recipe_id FROM recipe_data WHERE title = 'Vanilla Sponge Cake'),
  (SELECT id FROM recipe_versions WHERE recipe_id = (SELECT recipe_id FROM recipe_data WHERE title = 'Vanilla Sponge Cake') AND version_number = 2),
  '2024-01-27',
  'Added more vanilla - flavor is more pronounced now.',
  'Slightly denser than first batch but still moist.',
  4,
  510.00,
  '["https://cdn.example.com/cake4.jpg"]'::jsonb
UNION ALL
SELECT 
  (SELECT recipe_id FROM recipe_data WHERE title = 'Crusty Sourdough'),
  NULL,
  '2024-02-01',
  'First attempt at sourdough - crust is crispy and crumb is open.',
  'Fermentation took longer than expected due to cool kitchen.',
  4,
  880.00,
  '["https://cdn.example.com/bread1.jpg", "https://cdn.example.com/bread2.jpg"]'::jsonb;

-- ============================================================================
-- STEP 10: Create Inventory Items with Various Stock Levels
-- ============================================================================

WITH user_ids AS (
  SELECT id, email FROM users WHERE email IN ('priya@example.com', 'raj@example.com', 'meera@example.com')
),
ingredients_map AS (
  SELECT id, name FROM ingredient_master 
  WHERE name IN ('all-purpose flour', 'bread flour', 'butter', 'sugar', 'eggs', 'instant yeast', 'baking powder', 'salt', 'vanilla extract', 'baking chocolate')
)
INSERT INTO inventory_items (user_id, ingredient_master_id, quantity_on_hand, unit, cost_per_unit, currency, purchase_date, expiration_date, min_stock_level, reorder_quantity, notes)
SELECT 
  (SELECT id FROM user_ids WHERE email = 'priya@example.com'),
  (SELECT id FROM ingredients_map WHERE name = 'all-purpose flour'),
  5000, 'grams', 0.40, 'INR', '2024-01-01', '2024-06-01', 1000, 5000, 'High quality brand'
UNION ALL
SELECT 
  (SELECT id FROM user_ids WHERE email = 'priya@example.com'),
  (SELECT id FROM ingredients_map WHERE name = 'butter'),
  500, 'grams', 45.00, 'INR', '2024-01-10', '2024-02-10', 200, 500, 'Salted butter'
UNION ALL
SELECT 
  (SELECT id FROM user_ids WHERE email = 'priya@example.com'),
  (SELECT id FROM ingredients_map WHERE name = 'sugar'),
  2000, 'grams', 0.50, 'INR', '2024-01-05', NULL, 500, 2000, 'Granulated sugar'
UNION ALL
SELECT 
  (SELECT id FROM user_ids WHERE email = 'priya@example.com'),
  (SELECT id FROM ingredients_map WHERE name = 'instant yeast'),
  50, 'grams', 5.00, 'INR', '2024-01-15', '2024-04-15', 10, 50, 'Instant dry yeast'
UNION ALL
SELECT 
  (SELECT id FROM user_ids WHERE email = 'raj@example.com'),
  (SELECT id FROM ingredients_map WHERE name = 'bread flour'),
  3000, 'grams', 0.45, 'INR', '2024-01-08', '2024-06-08', 500, 3000, 'Premium bread flour'
UNION ALL
SELECT 
  (SELECT id FROM user_ids WHERE email = 'raj@example.com'),
  (SELECT id FROM ingredients_map WHERE name = 'baking powder'),
  200, 'grams', 2.00, 'INR', '2024-01-12', '2024-12-12', 50, 200, 'Double acting'
UNION ALL
SELECT 
  (SELECT id FROM user_ids WHERE email = 'raj@example.com'),
  (SELECT id FROM ingredients_map WHERE name = 'vanilla extract'),
  100, 'ml', 15.00, 'INR', '2024-01-01', '2025-01-01', 20, 100, 'Pure vanilla extract'
UNION ALL
SELECT 
  (SELECT id FROM user_ids WHERE email = 'meera@example.com'),
  (SELECT id FROM ingredients_map WHERE name = 'baking chocolate'),
  300, 'grams', 8.00, 'INR', '2024-01-20', '2024-12-20', 100, 300, 'Dark chocolate chips'
UNION ALL
SELECT 
  (SELECT id FROM user_ids WHERE email = 'meera@example.com'),
  (SELECT id FROM ingredients_map WHERE name = 'salt'),
  500, 'grams', 0.20, 'INR', '2024-01-01', NULL, 100, 500, 'Sea salt'
UNION ALL
SELECT 
  (SELECT id FROM user_ids WHERE email = 'meera@example.com'),
  (SELECT id FROM ingredients_map WHERE name = 'all-purpose flour'),
  2000, 'grams', 0.40, 'INR', '2024-01-18', '2024-07-18', 500, 2000, 'Standard all-purpose';

-- ============================================================================
-- STEP 11: Create Inventory Purchase History
-- ============================================================================

WITH user_ids AS (
  SELECT id, email FROM users WHERE email IN ('priya@example.com', 'raj@example.com', 'meera@example.com')
),
ingredients_map AS (
  SELECT id, name FROM ingredient_master 
  WHERE name IN ('all-purpose flour', 'butter', 'sugar', 'instant yeast')
)
INSERT INTO inventory_purchases (user_id, ingredient_master_id, quantity, unit, cost, currency, supplier_id, invoice_number, purchase_date, notes)
SELECT 
  (SELECT id FROM user_ids WHERE email = 'priya@example.com'),
  (SELECT id FROM ingredients_map WHERE name = 'all-purpose flour'),
  5000, 'grams', 2000.00, 'INR', NULL, 'INV-001', '2024-01-01', 'Bulk purchase'
UNION ALL
SELECT 
  (SELECT id FROM user_ids WHERE email = 'priya@example.com'),
  (SELECT id FROM ingredients_map WHERE name = 'butter'),
  500, 'grams', 22500.00, 'INR', NULL, 'INV-002', '2024-01-10', 'Premium brand'
UNION ALL
SELECT 
  (SELECT id FROM user_ids WHERE email = 'raj@example.com'),
  (SELECT id FROM ingredients_map WHERE name = 'bread flour'),
  3000, 'grams', 1350.00, 'INR', NULL, 'INV-003', '2024-01-08', 'Wholesale purchase'
UNION ALL
SELECT 
  (SELECT id FROM user_ids WHERE email = 'meera@example.com'),
  (SELECT id FROM ingredients_map WHERE name = 'sugar'),
  2000, 'grams', 1000.00, 'INR', NULL, 'INV-004', '2024-01-15', 'Monthly stock';

-- ============================================================================
-- STEP 12: Create Sample Suppliers
-- ============================================================================

WITH user_ids AS (
  SELECT id, email FROM users WHERE email IN ('priya@example.com', 'raj@example.com', 'meera@example.com')
)
INSERT INTO suppliers (user_id, name, contact_person, phone, email, address, notes)
SELECT 
  (SELECT id FROM user_ids WHERE email = 'priya@example.com'),
  'Local Flour Mill',
  'Ramesh Kumar',
  '+91-9876543210',
  'ramesh@flourmill.com',
  '123 Mill Street, Delhi',
  'Reliable supplier with good quality'
UNION ALL
SELECT 
  (SELECT id FROM user_ids WHERE email = 'priya@example.com'),
  'Dairy Direct',
  'Sunita Sharma',
  '+91-9876543211',
  'sunita@dairydirect.com',
  '456 Dairy Lane, Delhi',
  'Fresh butter and dairy products'
UNION ALL
SELECT 
  (SELECT id FROM user_ids WHERE email = 'raj@example.com'),
  'Wholesale Bakery Supplies',
  'Vikram Singh',
  '+91-9876543212',
  'vikram@bakesupply.com',
  '789 Supply Road, Mumbai',
  'Bulk ingredients and baking supplies'
UNION ALL
SELECT 
  (SELECT id FROM user_ids WHERE email = 'meera@example.com'),
  'Premium Ingredients Co',
  'Anjali Patel',
  '+91-9876543213',
  'anjali@premiumingredients.com',
  '321 Premium Street, Bangalore',
  'High quality specialty ingredients';

-- ============================================================================
-- STEP 13: Create Sample Audio Notes
-- ============================================================================

WITH recipe_data AS (
  SELECT r.id as recipe_id, r.title
  FROM recipes r
  WHERE r.title = 'Chocolate Chip Cookies'
),
step_data AS (
  SELECT rs.id as section_id
  FROM recipe_sections rs
  JOIN recipes r ON rs.recipe_id = r.id
  WHERE r.title = 'Chocolate Chip Cookies' AND rs.type = 'prep'
  LIMIT 1
)
INSERT INTO recipe_audio_notes (recipe_id, audio_url, duration_seconds, transcription_text, recorded_at_stage)
SELECT 
  (SELECT recipe_id FROM recipe_data),
  'https://cdn.example.com/audio/note1.mp3',
  45,
  'Remember to use room temperature butter for better creaming. This helps incorporate more air into the dough.',
  'prep'
UNION ALL
SELECT 
  (SELECT recipe_id FROM recipe_data),
  'https://cdn.example.com/audio/note2.mp3',
  30,
  'Bake for exactly 10 minutes for chewy cookies. Do not overbake!',
  'bake';

-- ============================================================================
-- STEP 14: Create Sample Timer Instances
-- ============================================================================

WITH recipe_data AS (
  SELECT r.id as recipe_id
  FROM recipes r
  WHERE r.title = 'Chocolate Chip Cookies'
),
step_data AS (
  SELECT rs.id as step_id, rs.section_id
  FROM recipe_steps rs
  JOIN recipe_sections rsec ON rs.section_id = rsec.id
  JOIN recipes r ON rsec.recipe_id = r.id
  WHERE r.title = 'Chocolate Chip Cookies' AND rs.instruction LIKE '%Cream%'
  LIMIT 1
)
INSERT INTO timer_instances (recipe_id, step_id, duration_seconds, status, started_at)
SELECT 
  (SELECT recipe_id FROM recipe_data),
  (SELECT step_id FROM step_data),
  180,
  'completed',
  NOW() - INTERVAL '2 days'
UNION ALL
SELECT 
  (SELECT recipe_id FROM recipe_data),
  (SELECT step_id FROM step_data),
  600,
  'completed',
  NOW() - INTERVAL '1 day';

-- ============================================================================
-- STEP 15: Create Sample Nutrition Cache
-- ============================================================================

WITH recipe_data AS (
  SELECT r.id as recipe_id
  FROM recipes r
  WHERE r.title IN ('Chocolate Chip Cookies', 'Vanilla Sponge Cake')
)
INSERT INTO recipe_nutrition_cache (recipe_id, nutrition_per_100g, nutrition_per_serving, calculated_at)
SELECT 
  (SELECT recipe_id FROM recipe_data WHERE title = 'Chocolate Chip Cookies'),
  '{"energy_kcal": 450, "protein_g": 5.2, "fat_g": 22.5, "carbs_g": 58.3, "fiber_g": 1.2}'::jsonb,
  '{"energy_kcal": 112, "protein_g": 1.3, "fat_g": 5.6, "carbs_g": 14.6, "fiber_g": 0.3}'::jsonb,
  NOW()
UNION ALL
SELECT 
  (SELECT recipe_id FROM recipe_data WHERE title = 'Vanilla Sponge Cake'),
  '{"energy_kcal": 320, "protein_g": 4.8, "fat_g": 12.0, "carbs_g": 48.5, "fiber_g": 0.5}'::jsonb,
  '{"energy_kcal": 160, "protein_g": 2.4, "fat_g": 6.0, "carbs_g": 24.3, "fiber_g": 0.25}'::jsonb,
  NOW();

-- ============================================================================
-- STEP 16: Verification and Summary
-- ============================================================================

DO $
BEGIN
  RAISE NOTICE 'Test data insertion complete!';
  RAISE NOTICE 'Users created: %', (SELECT COUNT(*) FROM users);
  RAISE NOTICE 'Recipes created: %', (SELECT COUNT(*) FROM recipes);
  RAISE NOTICE 'Recipe ingredients added: %', (SELECT COUNT(*) FROM recipe_ingredients);
  RAISE NOTICE 'Recipe sections created: %', (SELECT COUNT(*) FROM recipe_sections);
  RAISE NOTICE 'Recipe steps created: %', (SELECT COUNT(*) FROM recipe_steps);
  RAISE NOTICE 'Recipe versions created: %', (SELECT COUNT(*) FROM recipe_versions);
  RAISE NOTICE 'Journal entries created: %', (SELECT COUNT(*) FROM recipe_journal_entries);
  RAISE NOTICE 'Inventory items created: %', (SELECT COUNT(*) FROM inventory_items);
  RAISE NOTICE 'Inventory purchases recorded: %', (SELECT COUNT(*) FROM inventory_purchases);
  RAISE NOTICE 'Suppliers added: %', (SELECT COUNT(*) FROM suppliers);
  RAISE NOTICE 'Audio notes created: %', (SELECT COUNT(*) FROM recipe_audio_notes);
  RAISE NOTICE 'Timer instances created: %', (SELECT COUNT(*) FROM timer_instances);
  RAISE NOTICE 'Nutrition cache entries: %', (SELECT COUNT(*) FROM recipe_nutrition_cache);
END $;
