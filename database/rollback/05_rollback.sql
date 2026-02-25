-- ============================================================================
-- Rollback Script for Migration 05: mvp_costing
-- This script removes costing and pricing tables
-- ============================================================================

-- Drop costing-related tables
DROP TABLE IF EXISTS delivery_zones CASCADE;
DROP TABLE IF EXISTS packaging_items CASCADE;
DROP TABLE IF EXISTS recipe_costs CASCADE;

-- ============================================================================
-- Rollback complete
-- ============================================================================
