-- ============================================================================
-- Rollback Script for Migration 03: test_data
-- This script removes the test data
-- ============================================================================

-- Delete test data (keeping schema intact)
DELETE FROM recipe_journal_entries WHERE recipe_id IN (
  SELECT id FROM recipes WHERE user_id IN (
    SELECT id FROM users WHERE email LIKE 'test%@example.com'
  )
);

DELETE FROM recipe_audio_notes WHERE recipe_id IN (
  SELECT id FROM recipes WHERE user_id IN (
    SELECT id FROM users WHERE email LIKE 'test%@example.com'
  )
);

DELETE FROM recipe_version_snapshots WHERE recipe_version_id IN (
  SELECT id FROM recipe_versions WHERE recipe_id IN (
    SELECT id FROM recipes WHERE user_id IN (
      SELECT id FROM users WHERE email LIKE 'test%@example.com'
    )
  )
);

DELETE FROM recipe_versions WHERE recipe_id IN (
  SELECT id FROM recipes WHERE user_id IN (
    SELECT id FROM users WHERE email LIKE 'test%@example.com'
  )
);

DELETE FROM recipe_steps WHERE section_id IN (
  SELECT id FROM recipe_sections WHERE recipe_id IN (
    SELECT id FROM recipes WHERE user_id IN (
      SELECT id FROM users WHERE email LIKE 'test%@example.com'
    )
  )
);

DELETE FROM recipe_sections WHERE recipe_id IN (
  SELECT id FROM recipes WHERE user_id IN (
    SELECT id FROM users WHERE email LIKE 'test%@example.com'
  )
);

DELETE FROM recipe_ingredients WHERE recipe_id IN (
  SELECT id FROM recipes WHERE user_id IN (
    SELECT id FROM users WHERE email LIKE 'test%@example.com'
  )
);

DELETE FROM recipes WHERE user_id IN (
  SELECT id FROM users WHERE email LIKE 'test%@example.com'
);

DELETE FROM users WHERE email LIKE 'test%@example.com';

-- ============================================================================
-- Rollback complete
-- ============================================================================
