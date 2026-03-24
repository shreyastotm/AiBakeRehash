-- Add tags column to recipes table
-- 20260308141811_add_recipe_tags.sql

ALTER TABLE recipes 
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}'::TEXT[];

-- Create an index to make text array searching faster
CREATE INDEX IF NOT EXISTS idx_recipes_tags ON recipes USING GIN(tags);
