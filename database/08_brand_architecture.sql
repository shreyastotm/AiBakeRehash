-- ============================================================================
-- AiBake Database Migration - SaaS Brand Architecture
-- Version: 1.2
-- PostgreSQL 15+
--
-- This script adds:
--   1. brand_name and nutrition_overrides to inventory_items
--   2. inventory_item_id to recipe_ingredients
-- ============================================================================

-- Step 1: Update inventory_items for brand tracking
ALTER TABLE inventory_items
  ADD COLUMN brand_name TEXT,
  ADD COLUMN moisture_content NUMERIC(5,2), -- Override for aw calculations
  ADD COLUMN nutrition_overrides JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN inventory_items.brand_name IS 'Commercial brand name (e.g., Ashirwad, Pillsbury)';
COMMENT ON COLUMN inventory_items.moisture_content IS 'Specific moisture content % for this brand/item';
COMMENT ON COLUMN inventory_items.nutrition_overrides IS 'Detailed nutrition overrides if they differ from master';

-- Step 2: Link recipe ingredients to specific inventory items
ALTER TABLE recipe_ingredients
  ADD COLUMN inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE SET NULL;

COMMENT ON COLUMN recipe_ingredients.inventory_item_id IS 'Specific inventory item/brand used for this ingredient';

-- Step 3: Indexing for performance
CREATE INDEX idx_recipe_ingredients_inventory_item ON recipe_ingredients(inventory_item_id)
  WHERE inventory_item_id IS NOT NULL;

DO $$
BEGIN
  RAISE NOTICE 'AiBake SaaS brand architecture migration complete';
  RAISE NOTICE 'Inventory items: +3 columns (brand_name, moisture_content, nutrition_overrides)';
  RAISE NOTICE 'Recipe ingredients: +1 column (inventory_item_id)';
END $$;
