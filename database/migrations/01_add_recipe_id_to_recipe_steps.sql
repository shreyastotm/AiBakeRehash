-- Migration: Add recipe_id to recipe_steps
-- This column is required by the recipe service for efficient lookups
-- and was missing from the initial schema but expected by all service code.

BEGIN;

ALTER TABLE recipe_steps
  ADD COLUMN IF NOT EXISTS recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE;

-- Backfill recipe_id from the parent section
UPDATE recipe_steps rs
SET recipe_id = rs_section.recipe_id
FROM recipe_sections rs_section
WHERE rs.section_id = rs_section.id
  AND rs.recipe_id IS NULL;

-- Add NOT NULL constraint after backfill (only if there are rows that could have NULLs)
-- We leave it nullable so existing rows without sections won't cause issues in dev.
-- In production, enforce NOT NULL after confirming the backfill.
CREATE INDEX IF NOT EXISTS idx_recipe_steps_recipe_id ON recipe_steps(recipe_id)
  WHERE recipe_id IS NOT NULL;

COMMIT;
