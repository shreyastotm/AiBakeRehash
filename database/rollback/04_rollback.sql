-- ============================================================================
-- Rollback Script for Migration 04: mvp_inventory
-- This script removes inventory management tables
-- ============================================================================

-- Drop inventory-related tables
DROP TABLE IF EXISTS delivery_zones CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS inventory_purchases CASCADE;
DROP TABLE IF EXISTS inventory_items CASCADE;

-- ============================================================================
-- Rollback complete
-- ============================================================================
