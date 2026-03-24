-- Migration: Add default recipe creation mode column to users table

ALTER TABLE users ADD COLUMN IF NOT EXISTS default_recipe_creation_mode VARCHAR(20) DEFAULT 'manual';
