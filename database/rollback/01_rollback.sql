-- ============================================================================
-- Rollback Script for Migration 01: schema_init
-- This script reverses the schema initialization
-- ============================================================================

-- Drop all triggers first (they depend on tables)
DROP TRIGGER IF EXISTS update_composite_ingredient_components_timestamp ON composite_ingredient_components;
DROP TRIGGER IF EXISTS update_composite_ingredients_timestamp ON composite_ingredients;
DROP TRIGGER IF EXISTS update_ingredient_aliases_timestamp ON ingredient_aliases;
DROP TRIGGER IF EXISTS update_recipe_steps_timestamp ON recipe_steps;
DROP TRIGGER IF EXISTS update_recipe_sections_timestamp ON recipe_sections;
DROP TRIGGER IF EXISTS update_recipe_ingredients_timestamp ON recipe_ingredients;
DROP TRIGGER IF EXISTS update_recipes_timestamp ON recipes;
DROP TRIGGER IF EXISTS update_ingredient_master_timestamp ON ingredient_master;
DROP TRIGGER IF EXISTS update_users_timestamp ON users;

-- Drop trigger function
DROP FUNCTION IF EXISTS update_timestamp();

-- Drop all tables (in reverse dependency order)
DROP TABLE IF EXISTS composite_ingredient_components CASCADE;
DROP TABLE IF EXISTS composite_ingredients CASCADE;
DROP TABLE IF EXISTS ingredient_aliases CASCADE;
DROP TABLE IF EXISTS water_activity_reference CASCADE;
DROP TABLE IF EXISTS common_issues CASCADE;
DROP TABLE IF EXISTS recipe_nutrition_cache CASCADE;
DROP TABLE IF EXISTS timer_instances CASCADE;
DROP TABLE IF EXISTS ingredient_substitutions CASCADE;
DROP TABLE IF EXISTS recipe_audio_notes CASCADE;
DROP TABLE IF EXISTS recipe_journal_entries CASCADE;
DROP TABLE IF EXISTS recipe_version_snapshots CASCADE;
DROP TABLE IF EXISTS recipe_versions CASCADE;
DROP TABLE IF EXISTS recipe_steps CASCADE;
DROP TABLE IF EXISTS recipe_sections CASCADE;
DROP TABLE IF EXISTS recipe_ingredients CASCADE;
DROP TABLE IF EXISTS recipes CASCADE;
DROP TABLE IF EXISTS ingredient_master CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop ENUM types
DROP TYPE IF EXISTS substitution_structural_impact;
DROP TYPE IF EXISTS substitution_moisture_impact;
DROP TYPE IF EXISTS timer_status;
DROP TYPE IF EXISTS ingredient_category;
DROP TYPE IF EXISTS section_type;
DROP TYPE IF EXISTS unit_system;
DROP TYPE IF EXISTS recipe_status;
DROP TYPE IF EXISTS recipe_source_type;

-- Drop extensions
DROP EXTENSION IF EXISTS pg_trgm;
DROP EXTENSION IF EXISTS pgcrypto;
DROP EXTENSION IF EXISTS "uuid-ossp";

-- ============================================================================
-- Rollback complete
-- ============================================================================
