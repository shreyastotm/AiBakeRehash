-- ============================================================================
-- AiBake Database Migration - Inventory Management Tables
-- Version: 1.0
-- PostgreSQL 15+
--
-- This script creates:
--   1. suppliers table
--   2. inventory_items table
--   3. inventory_purchases table
--   4. Indexes for performance
--   5. updated_at triggers
--
-- Dependencies: 01_schema_init.sql (users, ingredient_master tables)
-- ============================================================================

-- ============================================================================
-- STEP 1: Create Suppliers Table
-- ============================================================================
-- Created first because inventory_items and inventory_purchases reference it.

CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE suppliers IS 'Supplier contact and pricing information for ingredient purchases';
COMMENT ON COLUMN suppliers.user_id IS 'Owner of this supplier record';
COMMENT ON COLUMN suppliers.name IS 'Supplier business name';
COMMENT ON COLUMN suppliers.contact_person IS 'Primary contact at the supplier';

-- ============================================================================
-- STEP 2: Create Inventory Items Table
-- ============================================================================

CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ingredient_master_id UUID NOT NULL REFERENCES ingredient_master(id),
  quantity_on_hand NUMERIC(12,4) NOT NULL,
  unit TEXT NOT NULL,
  cost_per_unit NUMERIC(10,2),
  currency VARCHAR(3) DEFAULT 'INR',
  purchase_date DATE,
  expiration_date DATE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  min_stock_level NUMERIC(12,4),
  reorder_quantity NUMERIC(12,4),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT chk_inventory_qty_non_negative CHECK (quantity_on_hand >= 0),
  CONSTRAINT chk_inventory_cost_positive CHECK (cost_per_unit IS NULL OR cost_per_unit >= 0),
  CONSTRAINT chk_inventory_min_stock_positive CHECK (min_stock_level IS NULL OR min_stock_level >= 0),
  CONSTRAINT chk_inventory_reorder_positive CHECK (reorder_quantity IS NULL OR reorder_quantity > 0)
);

COMMENT ON TABLE inventory_items IS 'Ingredient stock tracking with costs and expiration dates';
COMMENT ON COLUMN inventory_items.quantity_on_hand IS 'Current quantity in stock';
COMMENT ON COLUMN inventory_items.unit IS 'Unit of measurement for quantity_on_hand (e.g., g, kg, ml)';
COMMENT ON COLUMN inventory_items.cost_per_unit IS 'Cost per unit in the specified currency';
COMMENT ON COLUMN inventory_items.currency IS 'Currency code (default INR)';
COMMENT ON COLUMN inventory_items.min_stock_level IS 'Threshold for low stock alerts';
COMMENT ON COLUMN inventory_items.reorder_quantity IS 'Suggested quantity to reorder when below min_stock_level';

-- ============================================================================
-- STEP 3: Create Inventory Purchases Table
-- ============================================================================

CREATE TABLE inventory_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ingredient_master_id UUID NOT NULL REFERENCES ingredient_master(id),
  quantity NUMERIC(12,4) NOT NULL,
  unit TEXT NOT NULL,
  cost NUMERIC(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  invoice_number TEXT,
  purchase_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT chk_purchase_qty_positive CHECK (quantity > 0),
  CONSTRAINT chk_purchase_cost_non_negative CHECK (cost >= 0)
);

COMMENT ON TABLE inventory_purchases IS 'Purchase history for ingredient inventory tracking';
COMMENT ON COLUMN inventory_purchases.quantity IS 'Quantity purchased in the specified unit';
COMMENT ON COLUMN inventory_purchases.cost IS 'Total cost of this purchase';
COMMENT ON COLUMN inventory_purchases.invoice_number IS 'Supplier invoice or receipt number';
COMMENT ON COLUMN inventory_purchases.purchase_date IS 'Date of purchase';

-- ============================================================================
-- STEP 4: Create Indexes
-- ============================================================================

-- Suppliers indexes
CREATE INDEX idx_suppliers_user ON suppliers(user_id);

-- Inventory Items indexes
CREATE INDEX idx_inventory_items_user ON inventory_items(user_id);
CREATE INDEX idx_inventory_items_ingredient ON inventory_items(ingredient_master_id);
CREATE INDEX idx_inventory_items_supplier ON inventory_items(supplier_id)
  WHERE supplier_id IS NOT NULL;
CREATE INDEX idx_inventory_items_expiration ON inventory_items(expiration_date)
  WHERE expiration_date IS NOT NULL;
CREATE INDEX idx_inventory_items_user_ingredient ON inventory_items(user_id, ingredient_master_id);
CREATE INDEX idx_inventory_items_low_stock ON inventory_items(user_id)
  WHERE min_stock_level IS NOT NULL AND quantity_on_hand <= min_stock_level;

-- Inventory Purchases indexes
CREATE INDEX idx_inventory_purchases_user ON inventory_purchases(user_id);
CREATE INDEX idx_inventory_purchases_ingredient ON inventory_purchases(ingredient_master_id);
CREATE INDEX idx_inventory_purchases_supplier ON inventory_purchases(supplier_id)
  WHERE supplier_id IS NOT NULL;
CREATE INDEX idx_inventory_purchases_date ON inventory_purchases(purchase_date DESC);
CREATE INDEX idx_inventory_purchases_user_date ON inventory_purchases(user_id, purchase_date DESC);

-- ============================================================================
-- STEP 5: Create updated_at Triggers
-- ============================================================================

CREATE TRIGGER update_suppliers_timestamp
  BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_inventory_items_timestamp
  BEFORE UPDATE ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ============================================================================
-- Verification
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'AiBake inventory management tables created successfully';
  RAISE NOTICE 'Tables: suppliers, inventory_items, inventory_purchases';
  RAISE NOTICE 'Indexes: 11 created (including partial indexes for expiration and low stock)';
  RAISE NOTICE 'Triggers: 2 updated_at triggers (suppliers, inventory_items)';
END $$;
