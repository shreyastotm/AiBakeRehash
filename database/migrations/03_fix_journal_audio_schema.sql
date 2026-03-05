-- Migration: Fix Journal and Audio Notes Schema Mismatches
-- Adds missing columns and renames columns to match backend service code.

BEGIN;

-- 1. Fix recipe_journal_entries table
ALTER TABLE recipe_journal_entries 
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Backfill user_id from recipes if possible
UPDATE recipe_journal_entries j
SET user_id = r.user_id
FROM recipes r
WHERE j.recipe_id = r.id;

-- Ensure user_id is NOT NULL after backfill
-- ALTER TABLE recipe_journal_entries ALTER COLUMN user_id SET NOT NULL;

-- Rename image_urls to images to match service code
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='recipe_journal_entries' AND column_name='image_urls') THEN
    ALTER TABLE recipe_journal_entries RENAME COLUMN image_urls TO images;
  END IF;
END $$;


-- 2. Fix recipe_audio_notes table
ALTER TABLE recipe_audio_notes
  ADD COLUMN IF NOT EXISTS journal_entry_id UUID REFERENCES recipe_journal_entries(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS transcription_status VARCHAR(20) DEFAULT 'pending';

-- Add check constraint for transcription_status
ALTER TABLE recipe_audio_notes
  ADD CONSTRAINT chk_audio_transcription_status 
  CHECK (transcription_status IN ('pending', 'processing', 'completed', 'failed'));

-- 3. Add missing indexes
CREATE INDEX IF NOT EXISTS idx_audio_notes_journal_id ON recipe_audio_notes(journal_entry_id)
  WHERE journal_entry_id IS NOT NULL;

-- Update the schema_migrations tracking table
INSERT INTO schema_migrations (version, name)
VALUES ('003', 'fix_journal_audio_schema_mismatches')
ON CONFLICT (version) DO NOTHING;

COMMIT;
