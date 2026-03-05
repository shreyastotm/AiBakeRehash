-- Migration: Add is_flour and is_liquid to recipe_ingredients
ALTER TABLE recipe_ingredients
  ADD COLUMN IF NOT EXISTS is_flour BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_liquid BOOLEAN NOT NULL DEFAULT FALSE;

-- Update the schema_migrations tracking table
INSERT INTO schema_migrations (version, name)
VALUES ('002', 'add_flour_liquid_flags_to_recipe_ingredients')
ON CONFLICT (version) DO NOTHING;
