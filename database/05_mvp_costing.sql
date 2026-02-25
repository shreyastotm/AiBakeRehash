-- ============================================================================
-- AiBake Database Migration - Costing and Pricing Tables
-- Version: 1.0
-- PostgreSQL 15+
--
-- This script creates:
--   1. recipe_costs table
--   2. packaging_items table
--   3. delivery_zones table
--   4. Indexes for performance
--   5. updated_at triggers
--
-- Dependencies: 01_schema_init.sql (users, recipes tables)
-- ============================================================================

-- ============================================================================
-- STEP 1: Create Recipe Costs Table
-- ============================================================================

CREATE TABLE recipe_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_cost NUMERIC(10,2) NOT NULL,
  overhead_cost NUMERIC(10,2) DEFAULT 0,
  packaging_cost NUMERIC(10,2) DEFAULT 0,
  labor_cost NUMERIC(10,2) DEFAULT 0,
  total_cost NUMERIC(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  calculated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT chk_recipe_costs_ingredient_non_negative CHECK (ingredient_cost >= 0),
  CONSTRAINT chk_recipe_costs_overhead_non_negative CHECK (overhead_cost >= 0),
  CONSTRAINT chk_recipe_costs_packaging_non_negative CHECK (packaging_cost >= 0),
  CONSTRAINT chk_recipe_costs_labor_non_negative CHECK (labor_cost >= 0),
  CONSTRAINT chk_recipe_costs_total_non_negative CHECK (total_cost >= 0)
);

COMMENT ON TABLE recipe_costs IS 'Historical cost tracking for recipes including ingredient, overhead, packaging, and labor costs';
COMMENT ON COLUMN recipe_costs.recipe_id IS 'Reference to the recipe being costed';
COMMENT ON COLUMN recipe_costs.ingredient_cost IS 'Sum of all ingredient costs for this recipe';
COMMENT ON COLUMN recipe_costs.overhead_cost IS 'Overhead costs (utilities, equipment depreciation, etc.)';
COMMENT ON COLUMN recipe_costs.packaging_cost IS 'Cost of packaging materials';
COMMENT ON COLUMN recipe_costs.labor_cost IS 'Labor cost for preparation and baking';
COMMENT ON COLUMN recipe_costs.total_cost IS 'Total cost: ingredient + overhead + packaging + labor';
COMMENT ON COLUMN recipe_costs.currency IS 'Currency code (default INR)';
COMMENT ON COLUMN recipe_costs.calculated_at IS 'Timestamp when this cost was calculated';

-- ============================================================================
-- STEP 2: Create Packaging Items Table
-- ============================================================================

CREATE TABLE packaging_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cost_per_unit NUMERIC(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  quantity_on_hand INTEGER,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT chk_packaging_cost_non_negative CHECK (cost_per_unit >= 0),
  CONSTRAINT chk_packaging_qty_non_negative CHECK (quantity_on_hand IS NULL OR quantity_on_hand >= 0)
);

COMMENT ON TABLE packaging_items IS 'Packaging materials with costs and stock tracking';
COMMENT ON COLUMN packaging_items.name IS 'Name of the packaging item (e.g., cake box 8 inch, cupcake liner)';
COMMENT ON COLUMN packaging_items.cost_per_unit IS 'Cost per single unit of packaging';
COMMENT ON COLUMN packaging_items.currency IS 'Currency code (default INR)';
COMMENT ON COLUMN packaging_items.quantity_on_hand IS 'Current stock of this packaging item';

-- ============================================================================
-- STEP 3: Create Delivery Zones Table
-- ============================================================================

CREATE TABLE delivery_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  zone_name TEXT NOT NULL,
  base_charge NUMERIC(10,2) NOT NULL,
  per_km_charge NUMERIC(10,2),
  free_delivery_threshold NUMERIC(10,2),
  currency VARCHAR(3) DEFAULT 'INR',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT chk_delivery_base_non_negative CHECK (base_charge >= 0),
  CONSTRAINT chk_delivery_per_km_non_negative CHECK (per_km_charge IS NULL OR per_km_charge >= 0),
  CONSTRAINT chk_delivery_threshold_positive CHECK (free_delivery_threshold IS NULL OR free_delivery_threshold > 0)
);

COMMENT ON TABLE delivery_zones IS 'Delivery pricing zones for order delivery cost calculation';
COMMENT ON COLUMN delivery_zones.zone_name IS 'Name of the delivery zone (e.g., Local, City, Outskirts)';
COMMENT ON COLUMN delivery_zones.base_charge IS 'Base delivery charge for this zone';
COMMENT ON COLUMN delivery_zones.per_km_charge IS 'Additional charge per kilometer beyond base';
COMMENT ON COLUMN delivery_zones.free_delivery_threshold IS 'Order amount above which delivery is free';
COMMENT ON COLUMN delivery_zones.currency IS 'Currency code (default INR)';

-- ============================================================================
-- STEP 4: Create Indexes
-- ============================================================================

-- Recipe Costs indexes
CREATE INDEX idx_recipe_costs_recipe ON recipe_costs(recipe_id);
CREATE INDEX idx_recipe_costs_calculated ON recipe_costs(calculated_at DESC);
CREATE INDEX idx_recipe_costs_recipe_latest ON recipe_costs(recipe_id, calculated_at DESC);

-- Packaging Items indexes
CREATE INDEX idx_packaging_items_user ON packaging_items(user_id);

-- Delivery Zones indexes
CREATE INDEX idx_delivery_zones_user ON delivery_zones(user_id);

-- ============================================================================
-- STEP 5: Create updated_at Triggers
-- ============================================================================

CREATE TRIGGER update_packaging_items_timestamp
  BEFORE UPDATE ON packaging_items
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_delivery_zones_timestamp
  BEFORE UPDATE ON delivery_zones
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ============================================================================
-- Verification
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'AiBake costing and pricing tables created successfully';
  RAISE NOTICE 'Tables: recipe_costs, packaging_items, delivery_zones';
  RAISE NOTICE 'Indexes: 5 created (including composite index for latest cost lookup)';
  RAISE NOTICE 'Triggers: 2 updated_at triggers (packaging_items, delivery_zones)';
END $$;
