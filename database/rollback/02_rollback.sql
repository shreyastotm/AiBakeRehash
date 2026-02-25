-- ============================================================================
-- Rollback Script for Migration 02: seed_data
-- This script removes the seeded ingredient data
-- ============================================================================

-- Delete all seeded ingredients
DELETE FROM ingredient_master 
WHERE name IN (
  'all-purpose flour', 'bread flour', 'cake flour', 'pastry flour', 'whole wheat flour',
  'maida', 'atta', 'besan', 'sooji', 'ragi flour',
  'butter', 'ghee', 'desi ghee', 'coconut oil', 'vegetable oil',
  'granulated sugar', 'brown sugar', 'powdered sugar', 'jaggery', 'honey',
  'eggs', 'milk', 'yogurt', 'khoya', 'mawa', 'paneer', 'cream',
  'baking powder', 'baking soda', 'yeast', 'instant yeast', 'active dry yeast',
  'salt', 'vanilla extract', 'almond extract', 'lemon juice', 'orange juice',
  'water', 'milk powder', 'cocoa powder', 'chocolate chips', 'dark chocolate',
  'almonds', 'cashews', 'walnuts', 'pistachios', 'peanuts',
  'cardamom', 'cinnamon', 'nutmeg', 'cloves', 'ginger powder',
  'saffron', 'rose water', 'gulab jal', 'kewra water', 'elaichi',
  'raisins', 'dates', 'apricots', 'cranberries', 'blueberries',
  'apple', 'banana', 'orange', 'lemon', 'strawberry',
  'black pepper', 'white pepper', 'turmeric', 'chili powder', 'cumin'
);

-- ============================================================================
-- Rollback complete
-- ============================================================================
