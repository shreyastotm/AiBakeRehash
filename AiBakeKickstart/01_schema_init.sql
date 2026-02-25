-- ============================================================================
-- AiBake Database Schema - Complete Initialization Script
-- Version: 2.0
-- PostgreSQL 15+
-- ============================================================================

-- ============================================================================
-- STEP 1: Enable Required Extensions
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search

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
-- STEP 3: Create Core Tables
-- ============================================================================

-- Users Table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  unit_preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE users IS 'User accounts with authentication and preferences';
COMMENT ON COLUMN users.unit_preferences IS 'Per-ingredient unit display preferences. Example: {"sugar": "cups", "flour": "grams"}';

-- Ingredient Master Table (Global)
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
COMMENT ON COLUMN ingredient_master.default_density_g_per_ml IS 'Critical for volume to weight conversion';
COMMENT ON COLUMN ingredient_master.nutrition_per_100g IS 'Format: {"energy_kcal": 364, "protein_g": 10, "fat_g": 1, "carbs_g": 76}';

-- Recipes Table
CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  source_type recipe_source_type NOT NULL,
  source_url TEXT,
  original_author TEXT,
  original_author_url TEXT,
  original_author_name TEXT,
  is_verified_listing BOOLEAN DEFAULT FALSE,
  servings INTEGER,
  yield_weight_grams NUMERIC(12,4),
  preferred_unit_system unit_system DEFAULT 'metric',
  status recipe_status DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE recipes IS 'Recipe master records';
COMMENT ON COLUMN recipes.yield_weight_grams IS 'CRITICAL: Base yield for all scaling calculations';
COMMENT ON COLUMN recipes.original_author_url IS 'Backlink to original recipe source (SEO credit)';

-- Recipe Ingredients Table
CREATE TABLE recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_master_id UUID NOT NULL REFERENCES ingredient_master(id),
  display_name TEXT NOT NULL,
  quantity_original NUMERIC(12,4),
  unit_original TEXT,
  quantity_grams NUMERIC(14,6) NOT NULL,
  position INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT check_positive_grams CHECK (quantity_grams > 0)
);

COMMENT ON TABLE recipe_ingredients IS 'Ingredients for each recipe';
COMMENT ON COLUMN recipe_ingredients.quantity_grams IS 'CRITICAL: Canonical value - ALL math uses this field';
COMMENT ON COLUMN recipe_ingredients.display_name IS 'User-friendly name (e.g., "AP flour" vs "all-purpose flour")';

-- Recipe Sections Table
CREATE TABLE recipe_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  type section_type NOT NULL,
  title TEXT,
  position INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE recipe_sections IS 'Organizational sections within recipes (prep, bake, rest, etc.)';

-- Recipe Steps Table
CREATE TABLE recipe_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES recipe_sections(id) ON DELETE CASCADE,
  instruction TEXT NOT NULL,
  duration_seconds INTEGER,
  temperature_celsius NUMERIC(6,2),
  dependency_step_id UUID REFERENCES recipe_steps(id),
  position INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE recipe_steps IS 'Individual steps within recipe sections';
COMMENT ON COLUMN recipe_steps.dependency_step_id IS 'Optional: Link to prerequisite step for timer chaining';

-- Recipe Versions Table
CREATE TABLE recipe_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  change_summary TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (recipe_id, version_number)
);

COMMENT ON TABLE recipe_versions IS 'Version history for recipe iterations';

-- Recipe Version Snapshots Table
CREATE TABLE recipe_version_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_version_id UUID NOT NULL REFERENCES recipe_versions(id) ON DELETE CASCADE,
  snapshot_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE recipe_version_snapshots IS 'Full recipe JSON snapshots at each version';

-- Recipe Journal Entries Table
CREATE TABLE recipe_journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  version_id UUID REFERENCES recipe_versions(id),
  bake_date DATE,
  notes TEXT,
  private_notes TEXT,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  outcome_weight_grams NUMERIC(12,4),
  image_urls JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE recipe_journal_entries IS 'Baking journal with photos and notes';
COMMENT ON COLUMN recipe_journal_entries.private_notes IS 'Private notes separate from public review';
COMMENT ON COLUMN recipe_journal_entries.image_urls IS 'Array of S3/R2 URLs: ["https://cdn.../img1.jpg"]';

-- Recipe Audio Notes Table
CREATE TABLE recipe_audio_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  step_id UUID REFERENCES recipe_steps(id),
  audio_url TEXT NOT NULL,
  duration_seconds INTEGER,
  transcription_text TEXT,
  recorded_at_stage VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE recipe_audio_notes IS 'Voice notes with automatic transcription';
COMMENT ON COLUMN recipe_audio_notes.recorded_at_stage IS 'Context: prep, bake, cooling, etc.';

-- Ingredient Substitutions Table
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
  UNIQUE (original_ingredient_id, substitute_ingredient_id)
);

COMMENT ON TABLE ingredient_substitutions IS 'Ingredient substitution rules with impact warnings';
COMMENT ON COLUMN ingredient_substitutions.ratio_multiplier IS 'Conversion ratio: 1.0 = 1:1, 0.75 = 3/4 substitute to original';
COMMENT ON COLUMN ingredient_substitutions.preparation_method IS 'Special prep: "Mix 1 tbsp flax meal with 3 tbsp water"';

-- Timer Instances Table
CREATE TABLE timer_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES recipe_steps(id) ON DELETE CASCADE,
  started_at TIMESTAMP,
  duration_seconds INTEGER NOT NULL,
  status timer_status DEFAULT 'running',
  created_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE timer_instances IS 'Active and completed timers for recipe steps';

-- Recipe Nutrition Cache Table
CREATE TABLE recipe_nutrition_cache (
  recipe_id UUID PRIMARY KEY REFERENCES recipes(id) ON DELETE CASCADE,
  nutrition_per_100g JSONB NOT NULL,
  nutrition_per_serving JSONB,
  calculated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE recipe_nutrition_cache IS 'Cached nutrition calculations to avoid recomputation';

-- Common Issues Table (Emergency Help)
CREATE TABLE common_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_type VARCHAR(100) NOT NULL,
  symptoms TEXT NOT NULL,
  solution TEXT NOT NULL,
  prevention_tip TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE common_issues IS 'Panic button database for common baking disasters';

-- ============================================================================
-- STEP 4: Create Indexes for Performance
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
CREATE INDEX idx_recipes_updated_at ON recipes(updated_at DESC);
CREATE INDEX idx_recipes_user_status ON recipes(user_id, status) WHERE status = 'active';
CREATE INDEX idx_recipes_title_search ON recipes USING GIN (
  to_tsvector('english', title || ' ' || coalesce(description, ''))
);

-- Recipe Ingredients indexes
CREATE INDEX idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);
CREATE INDEX idx_recipe_ingredients_master_id ON recipe_ingredients(ingredient_master_id);

-- Recipe Sections indexes
CREATE INDEX idx_recipe_sections_recipe_id ON recipe_sections(recipe_id);

-- Recipe Steps indexes
CREATE INDEX idx_recipe_steps_section_id ON recipe_steps(section_id);
CREATE INDEX idx_recipe_steps_dependency ON recipe_steps(dependency_step_id);

-- Recipe Versions indexes
CREATE INDEX idx_recipe_versions_recipe_id ON recipe_versions(recipe_id);

-- Recipe Version Snapshots indexes
CREATE INDEX idx_recipe_version_snapshots_version_id ON recipe_version_snapshots(recipe_version_id);

-- Recipe Journal Entries indexes
CREATE INDEX idx_recipe_journal_recipe_id ON recipe_journal_entries(recipe_id);
CREATE INDEX idx_recipe_journal_bake_date ON recipe_journal_entries(bake_date DESC);

-- Recipe Audio Notes indexes
CREATE INDEX idx_audio_notes_recipe ON recipe_audio_notes(recipe_id);

-- Ingredient Substitutions indexes
CREATE INDEX idx_substitutions_original ON ingredient_substitutions(original_ingredient_id);

-- Timer Instances indexes
CREATE INDEX idx_timer_recipe_id ON timer_instances(recipe_id);
CREATE INDEX idx_timer_status ON timer_instances(status);
CREATE INDEX idx_timer_active ON timer_instances(recipe_id, status) 
  WHERE status IN ('running', 'paused');

-- Common Issues indexes
CREATE INDEX idx_common_issues_type ON common_issues(issue_type);

-- ============================================================================
-- STEP 5: Create Trigger for Updated_At Timestamp
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

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ AiBake database schema created successfully!';
  RAISE NOTICE '📊 Total tables created: 15';
  RAISE NOTICE '🔑 Total indexes created: 25+';
  RAISE NOTICE '⚙️  Next step: Run 02_seed_data.sql to populate ingredient master table';
END $$;
