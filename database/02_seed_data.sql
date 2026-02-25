-- Seed Data: Common Baking Ingredients
-- This script populates the ingredient_master table with 70+ common baking ingredients
-- including Indian ingredients, with density values, nutrition data, and allergen flags

-- Disable triggers temporarily for faster insertion
ALTER TABLE ingredient_master DISABLE TRIGGER ALL;

-- Clear existing data (if any)
DELETE FROM ingredient_master;

-- Insert common baking ingredients
INSERT INTO ingredient_master (name, category, default_density_g_per_ml, nutrition_per_100g, allergen_flags) VALUES

-- FLOURS (10 entries)
('all-purpose flour', 'flour', 0.57, '{"energy_kcal": 364, "protein_g": 10.3, "fat_g": 1.0, "carbs_g": 76.3, "fiber_g": 2.7}'::jsonb, '{"gluten": true}'::jsonb),
('bread flour', 'flour', 0.60, '{"energy_kcal": 364, "protein_g": 12.6, "fat_g": 1.0, "carbs_g": 75.4, "fiber_g": 2.7}'::jsonb, '{"gluten": true}'::jsonb),
('cake flour', 'flour', 0.55, '{"energy_kcal": 364, "protein_g": 8.0, "fat_g": 1.0, "carbs_g": 79.0, "fiber_g": 2.0}'::jsonb, '{"gluten": true}'::jsonb),
('whole wheat flour', 'flour', 0.60, '{"energy_kcal": 340, "protein_g": 13.7, "fat_g": 2.7, "carbs_g": 72.6, "fiber_g": 10.7}'::jsonb, '{"gluten": true}'::jsonb),
('maida', 'flour', 0.57, '{"energy_kcal": 364, "protein_g": 10.3, "fat_g": 1.0, "carbs_g": 76.3, "fiber_g": 2.7}'::jsonb, '{"gluten": true}'::jsonb),
('atta', 'flour', 0.60, '{"energy_kcal": 340, "protein_g": 13.7, "fat_g": 2.7, "carbs_g": 72.6, "fiber_g": 10.7}'::jsonb, '{"gluten": true}'::jsonb),
('besan', 'flour', 0.65, '{"energy_kcal": 387, "protein_g": 22.0, "fat_g": 6.3, "carbs_g": 58.0, "fiber_g": 10.8}'::jsonb, '{"gluten": false}'::jsonb),
('sooji', 'flour', 0.70, '{"energy_kcal": 360, "protein_g": 12.0, "fat_g": 1.1, "carbs_g": 73.0, "fiber_g": 3.7}'::jsonb, '{"gluten": true}'::jsonb),
('rice flour', 'flour', 0.60, '{"energy_kcal": 366, "protein_g": 6.0, "fat_g": 1.4, "carbs_g": 80.1, "fiber_g": 1.3}'::jsonb, '{"gluten": false}'::jsonb),
('cornstarch', 'flour', 0.60, '{"energy_kcal": 381, "protein_g": 0.3, "fat_g": 0.1, "carbs_g": 91.3, "fiber_g": 0.0}'::jsonb, '{"gluten": false}'::jsonb),

-- FATS (8 entries)
('butter', 'fat', 0.91, '{"energy_kcal": 717, "protein_g": 0.9, "fat_g": 81.1, "carbs_g": 0.1, "fiber_g": 0.0}'::jsonb, '{"dairy": true}'::jsonb),
('ghee', 'fat', 0.91, '{"energy_kcal": 884, "protein_g": 0.0, "fat_g": 99.5, "carbs_g": 0.0, "fiber_g": 0.0}'::jsonb, '{"dairy": true}'::jsonb),
('desi ghee', 'fat', 0.91, '{"energy_kcal": 884, "protein_g": 0.0, "fat_g": 99.5, "carbs_g": 0.0, "fiber_g": 0.0}'::jsonb, '{"dairy": true}'::jsonb),
('vegetable oil', 'fat', 0.92, '{"energy_kcal": 884, "protein_g": 0.0, "fat_g": 100.0, "carbs_g": 0.0, "fiber_g": 0.0}'::jsonb, '{"gluten": false}'::jsonb),
('coconut oil', 'fat', 0.92, '{"energy_kcal": 892, "protein_g": 0.0, "fat_g": 99.1, "carbs_g": 0.0, "fiber_g": 0.0}'::jsonb, '{"gluten": false}'::jsonb),
('olive oil', 'fat', 0.92, '{"energy_kcal": 884, "protein_g": 0.0, "fat_g": 100.0, "carbs_g": 0.0, "fiber_g": 0.0}'::jsonb, '{"gluten": false}'::jsonb),
('shortening', 'fat', 0.88, '{"energy_kcal": 884, "protein_g": 0.0, "fat_g": 100.0, "carbs_g": 0.0, "fiber_g": 0.0}'::jsonb, '{"gluten": false}'::jsonb),
('mawa', 'fat', 0.95, '{"energy_kcal": 495, "protein_g": 25.2, "fat_g": 32.0, "carbs_g": 25.0, "fiber_g": 0.0}'::jsonb, '{"dairy": true}'::jsonb),

-- SUGARS (6 entries)
('granulated sugar', 'sugar', 0.80, '{"energy_kcal": 387, "protein_g": 0.0, "fat_g": 0.0, "carbs_g": 100.0, "fiber_g": 0.0}'::jsonb, '{"gluten": false}'::jsonb),
('brown sugar', 'sugar', 0.88, '{"energy_kcal": 380, "protein_g": 0.2, "fat_g": 0.2, "carbs_g": 98.1, "fiber_g": 0.0}'::jsonb, '{"gluten": false}'::jsonb),
('powdered sugar', 'sugar', 0.50, '{"energy_kcal": 387, "protein_g": 0.0, "fat_g": 0.0, "carbs_g": 100.0, "fiber_g": 0.0}'::jsonb, '{"gluten": false}'::jsonb),
('honey', 'sugar', 1.42, '{"energy_kcal": 304, "protein_g": 0.3, "fat_g": 0.0, "carbs_g": 82.4, "fiber_g": 0.2}'::jsonb, '{"gluten": false}'::jsonb),
('jaggery', 'sugar', 1.20, '{"energy_kcal": 383, "protein_g": 0.4, "fat_g": 0.3, "carbs_g": 98.0, "fiber_g": 0.0}'::jsonb, '{"gluten": false}'::jsonb),
('molasses', 'sugar', 1.38, '{"energy_kcal": 290, "protein_g": 1.9, "fat_g": 0.2, "carbs_g": 74.7, "fiber_g": 0.0}'::jsonb, '{"gluten": false}'::jsonb),

-- LEAVENING (5 entries)
('baking powder', 'leavening', 0.96, '{"energy_kcal": 5, "protein_g": 0.0, "fat_g": 0.0, "carbs_g": 1.1, "fiber_g": 0.0}'::jsonb, '{"gluten": false}'::jsonb),
('baking soda', 'leavening', 2.16, '{"energy_kcal": 0, "protein_g": 0.0, "fat_g": 0.0, "carbs_g": 0.0, "fiber_g": 0.0}'::jsonb, '{"gluten": false}'::jsonb),
('instant yeast', 'leavening', 1.04, '{"energy_kcal": 82, "protein_g": 12.8, "fat_g": 1.0, "carbs_g": 5.0, "fiber_g": 0.0}'::jsonb, '{"gluten": false}'::jsonb),
('active dry yeast', 'leavening', 1.04, '{"energy_kcal": 82, "protein_g": 12.8, "fat_g": 1.0, "carbs_g": 5.0, "fiber_g": 0.0}'::jsonb, '{"gluten": false}'::jsonb),
('cream of tartar', 'leavening', 1.04, '{"energy_kcal": 0, "protein_g": 0.0, "fat_g": 0.0, "carbs_g": 0.0, "fiber_g": 0.0}'::jsonb, '{"gluten": false}'::jsonb),

-- DAIRY (8 entries)
('milk', 'dairy', 1.03, '{"energy_kcal": 61, "protein_g": 3.2, "fat_g": 3.3, "carbs_g": 4.8, "fiber_g": 0.0}'::jsonb, '{"dairy": true}'::jsonb),
('buttermilk', 'dairy', 1.01, '{"energy_kcal": 40, "protein_g": 3.3, "fat_g": 0.9, "carbs_g": 4.8, "fiber_g": 0.0}'::jsonb, '{"dairy": true}'::jsonb),
('yogurt', 'dairy', 1.01, '{"energy_kcal": 59, "protein_g": 3.5, "fat_g": 0.4, "carbs_g": 3.3, "fiber_g": 0.0}'::jsonb, '{"dairy": true}'::jsonb),
('sour cream', 'dairy', 1.01, '{"energy_kcal": 193, "protein_g": 3.6, "fat_g": 19.9, "carbs_g": 3.7, "fiber_g": 0.0}'::jsonb, '{"dairy": true}'::jsonb),
('cream cheese', 'dairy', 1.05, '{"energy_kcal": 342, "protein_g": 5.9, "fat_g": 34.4, "carbs_g": 4.1, "fiber_g": 0.0}'::jsonb, '{"dairy": true}'::jsonb),
('paneer', 'dairy', 1.10, '{"energy_kcal": 265, "protein_g": 25.4, "fat_g": 20.8, "carbs_g": 3.6, "fiber_g": 0.0}'::jsonb, '{"dairy": true}'::jsonb),
('khoya', 'dairy', 1.15, '{"energy_kcal": 495, "protein_g": 25.2, "fat_g": 32.0, "carbs_g": 25.0, "fiber_g": 0.0}'::jsonb, '{"dairy": true}'::jsonb),
('condensed milk', 'dairy', 1.30, '{"energy_kcal": 321, "protein_g": 7.9, "fat_g": 8.7, "carbs_g": 54.4, "fiber_g": 0.0}'::jsonb, '{"dairy": true}'::jsonb),

-- EGGS (1 entry)
('egg', 'dairy', 1.03, '{"energy_kcal": 155, "protein_g": 13.0, "fat_g": 11.0, "carbs_g": 1.1, "fiber_g": 0.0}'::jsonb, '{"eggs": true}'::jsonb),

-- LIQUIDS (5 entries)
('water', 'liquid', 1.00, '{"energy_kcal": 0, "protein_g": 0.0, "fat_g": 0.0, "carbs_g": 0.0, "fiber_g": 0.0}'::jsonb, '{"gluten": false}'::jsonb),
('apple juice', 'liquid', 1.04, '{"energy_kcal": 46, "protein_g": 0.1, "fat_g": 0.1, "carbs_g": 11.3, "fiber_g": 0.2}'::jsonb, '{"gluten": false}'::jsonb),
('orange juice', 'liquid', 1.04, '{"energy_kcal": 47, "protein_g": 0.7, "fat_g": 0.3, "carbs_g": 11.2, "fiber_g": 0.2}'::jsonb, '{"gluten": false}'::jsonb),
('lemon juice', 'liquid', 1.03, '{"energy_kcal": 29, "protein_g": 1.1, "fat_g": 0.3, "carbs_g": 9.3, "fiber_g": 2.8}'::jsonb, '{"gluten": false}'::jsonb),
('rose water', 'liquid', 0.99, '{"energy_kcal": 0, "protein_g": 0.0, "fat_g": 0.0, "carbs_g": 0.0, "fiber_g": 0.0}'::jsonb, '{"gluten": false}'::jsonb),

-- NUTS (6 entries)
('almond flour', 'nut', 0.65, '{"energy_kcal": 579, "protein_g": 21.2, "fat_g": 50.6, "carbs_g": 21.6, "fiber_g": 12.5}'::jsonb, '{"nuts": true}'::jsonb),
('almond', 'nut', 0.65, '{"energy_kcal": 579, "protein_g": 21.2, "fat_g": 50.6, "carbs_g": 21.6, "fiber_g": 12.5}'::jsonb, '{"nuts": true}'::jsonb),
('walnut', 'nut', 0.65, '{"energy_kcal": 654, "protein_g": 9.1, "fat_g": 65.2, "carbs_g": 13.7, "fiber_g": 6.7}'::jsonb, '{"nuts": true}'::jsonb),
('cashew', 'nut', 0.65, '{"energy_kcal": 553, "protein_g": 18.2, "fat_g": 43.9, "carbs_g": 30.2, "fiber_g": 3.3}'::jsonb, '{"nuts": true}'::jsonb),
('peanut', 'nut', 0.65, '{"energy_kcal": 567, "protein_g": 25.8, "fat_g": 49.2, "carbs_g": 16.1, "fiber_g": 6.0}'::jsonb, '{"nuts": true}'::jsonb),
('coconut', 'nut', 0.65, '{"energy_kcal": 354, "protein_g": 3.3, "fat_g": 33.5, "carbs_g": 15.2, "fiber_g": 9.0}'::jsonb, '{"nuts": true}'::jsonb),

-- SPICES (12 entries)
('cardamom', 'spice', 0.80, '{"energy_kcal": 311, "protein_g": 10.8, "fat_g": 6.7, "carbs_g": 68.5, "fiber_g": 28.0}'::jsonb, '{"gluten": false}'::jsonb),
('cinnamon', 'spice', 0.88, '{"energy_kcal": 247, "protein_g": 3.9, "fat_g": 1.2, "carbs_g": 80.7, "fiber_g": 53.1}'::jsonb, '{"gluten": false}'::jsonb),
('vanilla extract', 'spice', 0.99, '{"energy_kcal": 288, "protein_g": 0.1, "fat_g": 0.1, "carbs_g": 12.7, "fiber_g": 0.0}'::jsonb, '{"gluten": false}'::jsonb),
('saffron', 'spice', 1.00, '{"energy_kcal": 310, "protein_g": 11.4, "fat_g": 5.9, "carbs_g": 65.4, "fiber_g": 3.9}'::jsonb, '{"gluten": false}'::jsonb),
('nutmeg', 'spice', 0.88, '{"energy_kcal": 525, "protein_g": 5.8, "fat_g": 36.3, "carbs_g": 49.3, "fiber_g": 20.8}'::jsonb, '{"gluten": false}'::jsonb),
('ginger powder', 'spice', 0.80, '{"energy_kcal": 335, "protein_g": 8.9, "fat_g": 4.3, "carbs_g": 71.6, "fiber_g": 14.1}'::jsonb, '{"gluten": false}'::jsonb),
('turmeric', 'spice', 0.85, '{"energy_kcal": 312, "protein_g": 9.7, "fat_g": 3.1, "carbs_g": 67.1, "fiber_g": 21.0}'::jsonb, '{"gluten": false}'::jsonb),
('clove', 'spice', 0.90, '{"energy_kcal": 323, "protein_g": 6.0, "fat_g": 20.1, "carbs_g": 61.5, "fiber_g": 33.9}'::jsonb, '{"gluten": false}'::jsonb),
('black pepper', 'spice', 0.85, '{"energy_kcal": 251, "protein_g": 10.4, "fat_g": 3.3, "carbs_g": 64.8, "fiber_g": 25.3}'::jsonb, '{"gluten": false}'::jsonb),
('salt', 'spice', 2.16, '{"energy_kcal": 0, "protein_g": 0.0, "fat_g": 0.0, "carbs_g": 0.0, "fiber_g": 0.0}'::jsonb, '{"gluten": false}'::jsonb),
('baking chocolate', 'spice', 0.90, '{"energy_kcal": 403, "protein_g": 12.0, "fat_g": 23.4, "carbs_g": 48.0, "fiber_g": 9.4}'::jsonb, '{"gluten": false}'::jsonb),
('cocoa powder', 'spice', 0.80, '{"energy_kcal": 12, "protein_g": 1.2, "fat_g": 0.3, "carbs_g": 3.0, "fiber_g": 0.0}'::jsonb, '{"gluten": false}'::jsonb),

-- FRUITS (8 entries)
('raisin', 'fruit', 0.80, '{"energy_kcal": 299, "protein_g": 3.1, "fat_g": 0.5, "carbs_g": 79.8, "fiber_g": 3.7}'::jsonb, '{"gluten": false}'::jsonb),
('date', 'fruit', 0.75, '{"energy_kcal": 282, "protein_g": 2.7, "fat_g": 0.3, "carbs_g": 75.0, "fiber_g": 6.7}'::jsonb, '{"gluten": false}'::jsonb),
('banana', 'fruit', 0.95, '{"energy_kcal": 89, "protein_g": 1.1, "fat_g": 0.3, "carbs_g": 23.0, "fiber_g": 2.6}'::jsonb, '{"gluten": false}'::jsonb),
('apple', 'fruit', 0.92, '{"energy_kcal": 52, "protein_g": 0.3, "fat_g": 0.2, "carbs_g": 13.8, "fiber_g": 2.4}'::jsonb, '{"gluten": false}'::jsonb),
('blueberry', 'fruit', 0.85, '{"energy_kcal": 57, "protein_g": 0.7, "fat_g": 0.3, "carbs_g": 14.5, "fiber_g": 2.4}'::jsonb, '{"gluten": false}'::jsonb),
('strawberry', 'fruit', 0.91, '{"energy_kcal": 32, "protein_g": 0.7, "fat_g": 0.3, "carbs_g": 7.7, "fiber_g": 2.0}'::jsonb, '{"gluten": false}'::jsonb),
('cranberry', 'fruit', 0.92, '{"energy_kcal": 46, "protein_g": 0.4, "fat_g": 0.1, "carbs_g": 12.2, "fiber_g": 4.6}'::jsonb, '{"gluten": false}'::jsonb),
('lemon', 'fruit', 0.94, '{"energy_kcal": 29, "protein_g": 1.1, "fat_g": 0.3, "carbs_g": 9.3, "fiber_g": 2.8}'::jsonb, '{"gluten": false}'::jsonb),

-- OTHER (4 entries)
('vanilla bean', 'other', 0.80, '{"energy_kcal": 288, "protein_g": 0.1, "fat_g": 0.1, "carbs_g": 12.7, "fiber_g": 0.0}'::jsonb, '{"gluten": false}'::jsonb),
('gelatin', 'other', 1.00, '{"energy_kcal": 335, "protein_g": 87.6, "fat_g": 0.1, "carbs_g": 0.0, "fiber_g": 0.0}'::jsonb, '{"gluten": false}'::jsonb),
('cornmeal', 'other', 0.75, '{"energy_kcal": 363, "protein_g": 8.7, "fat_g": 4.7, "carbs_g": 76.8, "fiber_g": 7.3}'::jsonb, '{"gluten": false}'::jsonb),
('tapioca starch', 'other', 0.80, '{"energy_kcal": 358, "protein_g": 0.2, "fat_g": 0.1, "carbs_g": 88.7, "fiber_g": 0.8}'::jsonb, '{"gluten": false}'::jsonb);

-- Re-enable triggers
ALTER TABLE ingredient_master ENABLE TRIGGER ALL;

-- Verify insertion
SELECT COUNT(*) as total_ingredients FROM ingredient_master;
