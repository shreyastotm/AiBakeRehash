-- ============================================================================
-- Rollback Script for Migration 04_reference_data
-- This script removes reference data
-- ============================================================================

-- Delete reference data
DELETE FROM common_issues;
DELETE FROM water_activity_reference;

-- ============================================================================
-- Rollback complete
-- ============================================================================
