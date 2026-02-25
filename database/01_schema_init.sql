-- ============================================================================
-- AiBake Database Schema - Initialization Script
-- Version: 1.1
-- PostgreSQL 15+
--
-- This script creates:
--   1. Required PostgreSQL extensions
--   2. Custom ENUM types (8 types)
--   3. Core tables: users, ingredient_master
--   4. Recipe management tables: recipes, recipe_ingredients,
--      recipe_sections, recipe_steps
-- ============================================================================

-- ============================================================================
-- STEP 1: Enable Required Extensions
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";        -- Cryptographic functions
CREATE EXTENSION IF NOT EXISTS "pg_trgm";         -- Trigram fuzzy text search

-- ============================================================================
-- STEP 2: Create Custom ENUM Types
-- ============================================================================

-- Recipe source type
CREATE TYPE recipe_source_type AS ENUM (
  'manual',
  'image',
  'whatsapp',
  'url'
);

-- Recipe status
CREATE TYPE recipe_status AS ENUM (
  'draft',
  'active',
  'archived'
);

-- Unit system preferences
CREATE TYPE unit_system AS ENUM (
  'metric',
  'cups',
  'hybrid',
  'bakers_percent'
);

-- Section types for recipe organization
CREATE TYPE section_type AS ENUM (
  'pre_prep',
  'prep',
  'bake',
  'rest',
  'notes'
);

-- Ingredient categories
CREATE TYPE ingredient_category AS ENUM (
  'flour',
  'fat',
  'sugar',
  'leavening',
  'dairy',
  'liquid',
  'fruit',
  'nut',
  'spice',
  'other'
);

-- Timer status
CREATE TYPE timer_status AS ENUM (
  'running',
  'paused',
  'completed',
  'cancelled'
);

-- Substitution impact types
CREATE TYPE substitution_moisture_impact AS ENUM (
  'increase',
  'decrease',
  'neutral'
);

CREATE TYPE substitution_structural_impact AS ENUM (
  'stronger',
  'weaker',
  'neutral'
);

-- ============================================================================
-- STEP 3: Create Migration Tracking Table
-- ============================================================================

-- Schema Migrations table: tracks applied database migrations
CREATE TABLE IF NOT EXISTS schema_migrations (
  id SERIAL PRIMARY KEY,
  version TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  applied_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE schema_migrations IS 'Tracks applied database migrations for version control';
COMMENT ON COLUMN schema_migrations.version IS 'Migration version identifier (e.g., 001, 002)';
COMMENT ON COLUMN schema_migrations.name IS 'Migration name (e.g., schema_init, seed_data)';
COMMENT ON COLUMN schema_migrations.applied_at IS 'Timestamp when the migration was applied';

CREATE INDEX idx_schema_migrations_version ON schema_migrations(version);

-- ============================================================================
-- STEP 4: Create Core Tables
-- ============================================================================

-- Users table: authentication fields and preferences
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  unit_preferences JSONB DEFAULT '{}'::jsonb,
  default_currency VARCHAR(3) DEFAULT 'INR',
  language VARCHAR(5) DEFAULT 'en',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE users IS 'User accounts with authentication and preferences';
COMMENT ON COLUMN users.unit_preferences IS 'Per-ingredient unit display preferences. Example: {"sugar": "cups", "flour": "grams"}';
COMMENT ON COLUMN users.default_currency IS 'User preferred currency code (default INR)';
COMMENT ON COLUMN users.language IS 'User preferred language: en or hi';

-- Ingredient Master table: global ingredient database
CREATE TABLE ingredient_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category ingredient_category NOT NULL DEFAULT 'other',
  default_density_g_per_ml NUMERIC(10,4),
  allergen_flags JSONB DEFAULT '{}'::jsonb,
  nutrition_per_100g JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE ingredient_master IS 'Global ingredient database with nutrition and density data';
COMMENT ON COLUMN ingredient_master.name IS 'Normalized lowercase ingredient name (singular form)';
COMMENT ON COLUMN ingredient_master.default_density_g_per_ml IS 'Density for volume-to-weight conversion';
COMMENT ON COLUMN ingredient_master.allergen_flags IS 'Allergen flags. Example: {"gluten": true, "dairy": false}';
COMMENT ON COLUMN ingredient_master.nutrition_per_100g IS 'Nutrition per 100g. Example: {"energy_kcal": 364, "protein_g": 10, "fat_g": 1, "carbs_g": 76, "fiber_g": 2.7}';

-- ============================================================================
-- STEP 5: Create Recipe Management Tables
-- ============================================================================

-- Recipes table: master recipe records
CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  source_type recipe_source_type NOT NULL DEFAULT 'manual',
  source_url TEXT,
  original_author TEXT,
  original_author_url TEXT,
  servings INTEGER NOT NULL DEFAULT 1,
  yield_weight_grams NUMERIC(12,2),
  preferred_unit_system unit_system NOT NULL DEFAULT 'metric',
  status recipe_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT chk_recipes_servings_positive CHECK (servings > 0),
  CONSTRAINT chk_recipes_yield_positive CHECK (yield_weight_grams IS NULL OR yield_weight_grams > 0)
);

COMMENT ON TABLE recipes IS 'Recipe master records with metadata and source tracking';
COMMENT ON COLUMN recipes.source_type IS 'How the recipe was created: manual, image, whatsapp, or url';
COMMENT ON COLUMN recipes.yield_weight_grams IS 'Total expected yield weight in grams';
COMMENT ON COLUMN recipes.preferred_unit_system IS 'Display unit preference for this recipe';

-- Recipe Ingredients table: ingredients per recipe with canonical grams
CREATE TABLE recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_master_id UUID NOT NULL REFERENCES ingredient_master(id),
  display_name TEXT NOT NULL,
  quantity_original NUMERIC(12,4) NOT NULL,
  unit_original TEXT NOT NULL,
  quantity_grams NUMERIC(12,4) NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT chk_recipe_ingredients_qty_grams_positive CHECK (quantity_grams > 0),
  CONSTRAINT chk_recipe_ingredients_qty_original_positive CHECK (quantity_original > 0)
);

COMMENT ON TABLE recipe_ingredients IS 'Ingredients per recipe with original display units and canonical grams';
COMMENT ON COLUMN recipe_ingredients.quantity_original IS 'User-entered quantity in original units';
COMMENT ON COLUMN recipe_ingredients.unit_original IS 'User-entered unit (preserved for display)';
COMMENT ON COLUMN recipe_ingredients.quantity_grams IS 'Canonical weight in grams used for all calculations';
COMMENT ON COLUMN recipe_ingredients.position IS 'Display order within the recipe';

-- Recipe Sections table: organizational grouping of steps
CREATE TABLE recipe_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  type section_type NOT NULL DEFAULT 'prep',
  title TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE recipe_sections IS 'Organizational sections within a recipe (pre_prep, prep, bake, rest, notes)';
COMMENT ON COLUMN recipe_sections.type IS 'Section type: pre_prep, prep, bake, rest, or notes';
COMMENT ON COLUMN recipe_sections.position IS 'Display order within the recipe';

-- Recipe Steps table: individual instructions within sections
CREATE TABLE recipe_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES recipe_sections(id) ON DELETE CASCADE,
  instruction TEXT NOT NULL,
  duration_seconds INTEGER,
  temperature_celsius NUMERIC(6,1),
  position INTEGER NOT NULL DEFAULT 0,
  dependency_step_id UUID REFERENCES recipe_steps(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT chk_recipe_steps_duration_positive CHECK (duration_seconds IS NULL OR duration_seconds > 0)
);

COMMENT ON TABLE recipe_steps IS 'Individual instructions within recipe sections';
COMMENT ON COLUMN recipe_steps.duration_seconds IS 'Time required for this step in seconds';
COMMENT ON COLUMN recipe_steps.temperature_celsius IS 'Temperature setting for this step';
COMMENT ON COLUMN recipe_steps.dependency_step_id IS 'Reference to a prerequisite step for timer chaining';

-- ============================================================================
-- STEP 5B: Create Versioning and Journal Tables
-- ============================================================================

-- Recipe Versions table: version history for recipe iterations
CREATE TABLE recipe_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  change_summary TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT uq_recipe_versions_recipe_version UNIQUE (recipe_id, version_number)
);

COMMENT ON TABLE recipe_versions IS 'Version history for recipe iterations';
COMMENT ON COLUMN recipe_versions.version_number IS 'Incrementing version number per recipe';
COMMENT ON COLUMN recipe_versions.change_summary IS 'Description of what changed in this version';

-- Recipe Version Snapshots table: full JSON snapshots at each version
CREATE TABLE recipe_version_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_version_id UUID NOT NULL REFERENCES recipe_versions(id) ON DELETE CASCADE,
  snapshot_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE recipe_version_snapshots IS 'Full recipe JSON snapshots at each version';
COMMENT ON COLUMN recipe_version_snapshots.snapshot_data IS 'Complete recipe data as JSON at time of versioning';

-- Recipe Journal Entries table: baking journal with photos and notes
CREATE TABLE recipe_journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  version_id UUID REFERENCES recipe_versions(id),
  bake_date DATE,
  notes TEXT,
  private_notes TEXT,
  rating INTEGER,
  outcome_weight_grams NUMERIC(12,4),
  image_urls JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT chk_journal_rating_range CHECK (rating IS NULL OR (rating BETWEEN 1 AND 5)),
  CONSTRAINT chk_journal_outcome_weight_positive CHECK (outcome_weight_grams IS NULL OR outcome_weight_grams > 0)
);

COMMENT ON TABLE recipe_journal_entries IS 'Baking journal with photos, notes, and ratings';
COMMENT ON COLUMN recipe_journal_entries.version_id IS 'Reference to specific recipe version for historical accuracy';
COMMENT ON COLUMN recipe_journal_entries.private_notes IS 'Private notes separate from public review';
COMMENT ON COLUMN recipe_journal_entries.rating IS 'Bake rating from 1 to 5';
COMMENT ON COLUMN recipe_journal_entries.image_urls IS 'JSONB array of image URLs: ["https://cdn.../img1.jpg"]';

-- Recipe Audio Notes table: voice notes with transcription
CREATE TABLE recipe_audio_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  step_id UUID REFERENCES recipe_steps(id) ON DELETE SET NULL,
  audio_url TEXT NOT NULL,
  duration_seconds INTEGER,
  transcription_text TEXT,
  recorded_at_stage VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT chk_audio_duration_positive CHECK (duration_seconds IS NULL OR duration_seconds > 0)
);

COMMENT ON TABLE recipe_audio_notes IS 'Voice notes with automatic transcription';
COMMENT ON COLUMN recipe_audio_notes.step_id IS 'Optional reference to a specific recipe step';
COMMENT ON COLUMN recipe_audio_notes.recorded_at_stage IS 'Context stage: prep, bake, cooling, etc.';
COMMENT ON COLUMN recipe_audio_notes.transcription_text IS 'Auto-generated transcription of the audio content';

-- ============================================================================
-- STEP 5C: Create Advanced Features Tables
-- ============================================================================

-- Ingredient Substitutions table: substitution rules with impact warnings
CREATE TABLE ingredient_substitutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_ingredient_id UUID NOT NULL REFERENCES ingredient_master(id) ON DELETE CASCADE,
  substitute_ingredient_id UUID NOT NULL REFERENCES ingredient_master(id) ON DELETE CASCADE,
  ratio_multiplier NUMERIC(10,4) NOT NULL,
  moisture_impact substitution_moisture_impact DEFAULT 'neutral',
  structural_impact substitution_structural_impact DEFAULT 'neutral',
  flavor_impact TEXT,
  preparation_method TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT uq_substitution_pair UNIQUE (original_ingredient_id, substitute_ingredient_id)
);

COMMENT ON TABLE ingredient_substitutions IS 'Ingredient substitution rules with impact warnings';
COMMENT ON COLUMN ingredient_substitutions.ratio_multiplier IS 'Conversion ratio: 1.0 = 1:1, 0.75 = 3/4 substitute to original';
COMMENT ON COLUMN ingredient_substitutions.moisture_impact IS 'Effect on moisture: increase, decrease, or neutral';
COMMENT ON COLUMN ingredient_substitutions.structural_impact IS 'Effect on structure: stronger, weaker, or neutral';
COMMENT ON COLUMN ingredient_substitutions.flavor_impact IS 'Description of flavor changes when substituting';
COMMENT ON COLUMN ingredient_substitutions.preparation_method IS 'Special prep instructions, e.g. "Mix 1 tbsp flax meal with 3 tbsp water"';

-- Timer Instances table: active and completed timers for recipe steps
CREATE TABLE timer_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES recipe_steps(id) ON DELETE CASCADE,
  duration_seconds INTEGER NOT NULL,
  status timer_status DEFAULT 'running',
  started_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT chk_timer_duration_positive CHECK (duration_seconds > 0)
);

COMMENT ON TABLE timer_instances IS 'Active and completed timers for recipe steps';
COMMENT ON COLUMN timer_instances.duration_seconds IS 'Timer duration in seconds';
COMMENT ON COLUMN timer_instances.status IS 'Timer state: running, paused, completed, or cancelled';
COMMENT ON COLUMN timer_instances.started_at IS 'Timestamp when the timer was started';

-- Recipe Nutrition Cache table: cached nutrition calculations
CREATE TABLE recipe_nutrition_cache (
  recipe_id UUID PRIMARY KEY REFERENCES recipes(id) ON DELETE CASCADE,
  nutrition_per_100g JSONB NOT NULL,
  nutrition_per_serving JSONB,
  calculated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE recipe_nutrition_cache IS 'Cached nutrition calculations to avoid recomputation';
COMMENT ON COLUMN recipe_nutrition_cache.nutrition_per_100g IS 'Nutrition values per 100g: {"energy_kcal", "protein_g", "fat_g", "carbs_g", "fiber_g"}';
COMMENT ON COLUMN recipe_nutrition_cache.nutrition_per_serving IS 'Nutrition values per serving';
COMMENT ON COLUMN recipe_nutrition_cache.calculated_at IS 'When the cache was last computed (for invalidation)';

-- Common Issues table: emergency help database for baking problems
CREATE TABLE common_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_type VARCHAR(100) NOT NULL,
  symptoms TEXT NOT NULL,
  solution TEXT NOT NULL,
  prevention_tip TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE common_issues IS 'Panic button database for common baking disasters';
COMMENT ON COLUMN common_issues.issue_type IS 'Category of the issue, e.g. dough_too_sticky, flat_cookies';
COMMENT ON COLUMN common_issues.symptoms IS 'What the user observes';
COMMENT ON COLUMN common_issues.solution IS 'How to fix or rescue the bake';
COMMENT ON COLUMN common_issues.prevention_tip IS 'How to avoid this issue next time';

-- Water Activity Reference table: typical aw ranges for product categories
CREATE TABLE water_activity_reference (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_category VARCHAR(100) NOT NULL,
  typical_aw_min NUMERIC(3,2) NOT NULL,
  typical_aw_max NUMERIC(3,2) NOT NULL,
  shelf_life_days INTEGER,
  safety_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT chk_aw_min_range CHECK (typical_aw_min BETWEEN 0.00 AND 1.00),
  CONSTRAINT chk_aw_max_range CHECK (typical_aw_max BETWEEN 0.00 AND 1.00),
  CONSTRAINT chk_aw_min_lte_max CHECK (typical_aw_min <= typical_aw_max),
  CONSTRAINT chk_shelf_life_positive CHECK (shelf_life_days IS NULL OR shelf_life_days > 0)
);

COMMENT ON TABLE water_activity_reference IS 'Reference data for water activity ranges by product category';
COMMENT ON COLUMN water_activity_reference.typical_aw_min IS 'Lower bound of typical water activity (0.00-1.00)';
COMMENT ON COLUMN water_activity_reference.typical_aw_max IS 'Upper bound of typical water activity (0.00-1.00)';
COMMENT ON COLUMN water_activity_reference.shelf_life_days IS 'Expected shelf life in days at this aw range';
COMMENT ON COLUMN water_activity_reference.safety_notes IS 'Food safety guidance for this product category';

-- ============================================================================
-- STEP 5D: Create Ingredient Alias and Composite Ingredient Tables
-- ============================================================================

-- Ingredient Aliases table: alternative names, abbreviations, and regional variations
CREATE TABLE ingredient_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_master_id UUID NOT NULL REFERENCES ingredient_master(id) ON DELETE CASCADE,
  alias_name TEXT NOT NULL,
  alias_type VARCHAR(50),
  locale VARCHAR(10),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT uq_ingredient_aliases_alias_name UNIQUE (alias_name)
);

COMMENT ON TABLE ingredient_aliases IS 'Alternative names, abbreviations, and regional variations for ingredients';
COMMENT ON COLUMN ingredient_aliases.alias_name IS 'Alternative name for the ingredient (must be globally unique)';
COMMENT ON COLUMN ingredient_aliases.alias_type IS 'Type of alias: abbreviation, regional, brand, or common';
COMMENT ON COLUMN ingredient_aliases.locale IS 'Language/region code for regional variations, e.g. en-US, en-GB, hi-IN';

-- Composite Ingredients table: ingredients composed of other ingredients
CREATE TABLE composite_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_master_id UUID NOT NULL REFERENCES ingredient_master(id) ON DELETE CASCADE,
  is_user_defined BOOLEAN DEFAULT TRUE,
  recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT uq_composite_ingredients_master UNIQUE (ingredient_master_id)
);

COMMENT ON TABLE composite_ingredients IS 'Ingredients that are composed of other ingredients (e.g., GF flour blends, spice mixes)';
COMMENT ON COLUMN composite_ingredients.is_user_defined IS 'True if user created this blend, false if standard/commercial';
COMMENT ON COLUMN composite_ingredients.recipe_id IS 'Optional link to an actual recipe if the composite is also a recipe';

-- Composite Ingredient Components table: individual components of a composite ingredient
CREATE TABLE composite_ingredient_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  composite_ingredient_id UUID NOT NULL REFERENCES composite_ingredients(id) ON DELETE CASCADE,
  component_ingredient_id UUID NOT NULL REFERENCES ingredient_master(id),
  percentage NUMERIC(5,2) NOT NULL,
  weight_grams_per_100g NUMERIC(8,4) NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT chk_component_percentage_valid CHECK (percentage > 0 AND percentage <= 100),
  CONSTRAINT chk_component_weight_positive CHECK (weight_grams_per_100g > 0),
  CONSTRAINT uq_composite_component_pair UNIQUE (composite_ingredient_id, component_ingredient_id)
);

COMMENT ON TABLE composite_ingredient_components IS 'Individual ingredients that make up a composite ingredient';
COMMENT ON COLUMN composite_ingredient_components.percentage IS 'Percentage of total weight (components should sum to 100 per composite)';
COMMENT ON COLUMN composite_ingredient_components.weight_grams_per_100g IS 'Grams of this component per 100g of the composite';
COMMENT ON COLUMN composite_ingredient_components.position IS 'Display order within the composite ingredient';

-- ============================================================================
-- STEP 6: Create Indexes
-- ============================================================================

-- Users indexes
CREATE INDEX idx_users_email ON users(email);

-- Ingredient Master indexes
CREATE INDEX idx_ingredient_master_name ON ingredient_master(name);
CREATE INDEX idx_ingredient_master_category ON ingredient_master(category);
CREATE INDEX idx_ingredient_master_name_trgm ON ingredient_master USING GIN (name gin_trgm_ops);

-- Recipes indexes
CREATE INDEX idx_recipes_user_id ON recipes(user_id);
CREATE INDEX idx_recipes_status ON recipes(status);
CREATE INDEX idx_recipes_user_status ON recipes(user_id, status);
CREATE INDEX idx_recipes_user_created ON recipes(user_id, created_at DESC);
CREATE INDEX idx_recipes_title_trgm ON recipes USING GIN (title gin_trgm_ops);

-- Recipe Ingredients indexes
CREATE INDEX idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);
CREATE INDEX idx_recipe_ingredients_ingredient_master_id ON recipe_ingredients(ingredient_master_id);
CREATE INDEX idx_recipe_ingredients_position ON recipe_ingredients(recipe_id, position);

-- Recipe Sections indexes
CREATE INDEX idx_recipe_sections_recipe_id ON recipe_sections(recipe_id);
CREATE INDEX idx_recipe_sections_position ON recipe_sections(recipe_id, position);

-- Recipe Steps indexes
CREATE INDEX idx_recipe_steps_section_id ON recipe_steps(section_id);
CREATE INDEX idx_recipe_steps_position ON recipe_steps(section_id, position);
CREATE INDEX idx_recipe_steps_dependency ON recipe_steps(dependency_step_id)
  WHERE dependency_step_id IS NOT NULL;

-- Recipe Versions indexes
CREATE INDEX idx_recipe_versions_recipe_id ON recipe_versions(recipe_id);

-- Recipe Version Snapshots indexes
CREATE INDEX idx_recipe_version_snapshots_version_id ON recipe_version_snapshots(recipe_version_id);

-- Recipe Journal Entries indexes
CREATE INDEX idx_recipe_journal_recipe_id ON recipe_journal_entries(recipe_id);
CREATE INDEX idx_recipe_journal_version_id ON recipe_journal_entries(version_id)
  WHERE version_id IS NOT NULL;
CREATE INDEX idx_recipe_journal_bake_date ON recipe_journal_entries(bake_date DESC);

-- Recipe Audio Notes indexes
CREATE INDEX idx_audio_notes_recipe_id ON recipe_audio_notes(recipe_id);
CREATE INDEX idx_audio_notes_step_id ON recipe_audio_notes(step_id)
  WHERE step_id IS NOT NULL;

-- Ingredient Substitutions indexes
CREATE INDEX idx_substitutions_original ON ingredient_substitutions(original_ingredient_id);
CREATE INDEX idx_substitutions_substitute ON ingredient_substitutions(substitute_ingredient_id);

-- Timer Instances indexes
CREATE INDEX idx_timer_recipe_id ON timer_instances(recipe_id);
CREATE INDEX idx_timer_step_id ON timer_instances(step_id);
CREATE INDEX idx_timer_status ON timer_instances(status);
CREATE INDEX idx_timer_active ON timer_instances(recipe_id, status)
  WHERE status IN ('running', 'paused');

-- Common Issues indexes
CREATE INDEX idx_common_issues_type ON common_issues(issue_type);

-- Water Activity Reference indexes
CREATE INDEX idx_water_activity_category ON water_activity_reference(product_category);

-- Ingredient Aliases indexes
CREATE INDEX idx_ingredient_aliases_master ON ingredient_aliases(ingredient_master_id);
CREATE INDEX idx_ingredient_aliases_name ON ingredient_aliases(alias_name);
CREATE INDEX idx_ingredient_aliases_name_trgm ON ingredient_aliases USING GIN (alias_name gin_trgm_ops);

-- Composite Ingredients indexes
CREATE INDEX idx_composite_ingredients_master ON composite_ingredients(ingredient_master_id);

-- Composite Ingredient Components indexes
CREATE INDEX idx_composite_components_composite ON composite_ingredient_components(composite_ingredient_id);
CREATE INDEX idx_composite_components_component ON composite_ingredient_components(component_ingredient_id);

-- Partial index for active recipes (most common query filter)
CREATE INDEX idx_recipes_active ON recipes(user_id, updated_at DESC)
  WHERE status = 'active';

-- Recipe Journal user + created_at for chronological listing
CREATE INDEX idx_recipe_journal_recipe_created ON recipe_journal_entries(recipe_id, created_at DESC);

-- Nutrition cache staleness check
CREATE INDEX idx_nutrition_cache_calculated ON recipe_nutrition_cache(calculated_at);

-- Common issues full-text search on symptoms
CREATE INDEX idx_common_issues_symptoms_trgm ON common_issues USING GIN (symptoms gin_trgm_ops);

-- ============================================================================
-- STEP 7: Create updated_at Trigger Function
-- ============================================================================

CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_users_timestamp
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_ingredient_master_timestamp
  BEFORE UPDATE ON ingredient_master
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_recipes_timestamp
  BEFORE UPDATE ON recipes
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_recipe_ingredients_timestamp
  BEFORE UPDATE ON recipe_ingredients
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_recipe_sections_timestamp
  BEFORE UPDATE ON recipe_sections
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_recipe_steps_timestamp
  BEFORE UPDATE ON recipe_steps
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_ingredient_aliases_timestamp
  BEFORE UPDATE ON ingredient_aliases
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_composite_ingredients_timestamp
  BEFORE UPDATE ON composite_ingredients
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_composite_ingredient_components_timestamp
  BEFORE UPDATE ON composite_ingredient_components
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ============================================================================
-- Verification
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'AiBake schema initialization complete';
  RAISE NOTICE 'Extensions: uuid-ossp, pgcrypto, pg_trgm';
  RAISE NOTICE 'ENUM types: 8 created';
  RAISE NOTICE 'Tables: users, ingredient_master, recipes, recipe_ingredients, recipe_sections, recipe_steps, recipe_versions, recipe_version_snapshots, recipe_journal_entries, recipe_audio_notes, ingredient_substitutions, timer_instances, recipe_nutrition_cache, common_issues, water_activity_reference, ingredient_aliases, composite_ingredients, composite_ingredient_components';
  RAISE NOTICE 'Indexes: 44 created (including trigram, composite, and partial indexes)';
  RAISE NOTICE 'Triggers: 9 updated_at triggers';
  RAISE NOTICE 'Next step: Run subsequent migration scripts for remaining tables';
END $$;
