-- ============================================================
-- NUTRITION DIAGNOSTIC & FIX SCRIPT
-- Run each step separately in DBeaver
-- ============================================================

-- ==========================================================
-- STEP 1: See what nutrition is stored for the problem recipe
-- ==========================================================
SELECT 
    ri.display_name,
    im.name AS canonical_name,
    im.nutrition_per_100g,
    im.nutrition_per_100g->>'sugar_g' AS sugar_g,
    im.nutrition_per_100g->>'sugars_g' AS sugars_g,
    im.nutrition_per_100g->>'sugars_grams' AS sugars_grams,
    im.nutrition_per_100g->>'added_sugar_g' AS added_sugar_g,
    im.nutrition_per_100g->>'added_sugars_grams' AS added_sugars_grams,
    im.nutrition_per_100g->>'fiber_g' AS fiber_g
FROM recipe_ingredients ri
JOIN ingredient_master im ON im.id = ri.ingredient_master_id
WHERE ri.recipe_id = '275f6935-3217-4f90-b193-f392603d95f4'
ORDER BY ri.position;

-- ============================================================
-- STEP 2: Clear the cached nutrition so next click recalculates fresh
-- ============================================================
DELETE FROM recipe_nutrition_cache WHERE recipe_id = '275f6935-3217-4f90-b193-f392603d95f4';

-- ============================================================
-- STEP 3: Fix sugar_g for ingredients that have wrong/missing sugar data
-- (run AFTER reviewing STEP 1 output)
-- This updates any ingredient whose nutrition_per_100g exists but 
-- has sugar_g = 0 or null despite being a sugar-rich ingredient.
-- Adjust the names and values to match what STEP 1 shows.
-- ============================================================

-- Raisins
UPDATE ingredient_master
SET nutrition_per_100g = nutrition_per_100g 
    || '{"sugar_g": 59, "added_sugar_g": 0, "fiber_g": 3.7}'::jsonb
WHERE TRIM(LOWER(name)) IN ('raisin', 'raisins', 'sultana', 'sultanas')
  AND user_id IS NULL
  AND nutrition_per_100g IS NOT NULL;

-- Dates
UPDATE ingredient_master
SET nutrition_per_100g = nutrition_per_100g 
    || '{"sugar_g": 63, "added_sugar_g": 0, "fiber_g": 8}'::jsonb
WHERE TRIM(LOWER(name)) IN ('date', 'dates', 'pitted dates', 'dried dates')
  AND user_id IS NULL
  AND nutrition_per_100g IS NOT NULL;

-- Dried apricots
UPDATE ingredient_master
SET nutrition_per_100g = nutrition_per_100g 
    || '{"sugar_g": 53, "added_sugar_g": 0, "fiber_g": 7.3}'::jsonb
WHERE TRIM(LOWER(name)) LIKE '%apricot%'
  AND user_id IS NULL
  AND nutrition_per_100g IS NOT NULL;

-- Glace cherries
UPDATE ingredient_master
SET nutrition_per_100g = nutrition_per_100g 
    || '{"sugar_g": 60, "added_sugar_g": 40, "fiber_g": 1}'::jsonb
WHERE TRIM(LOWER(name)) LIKE '%glac%' OR TRIM(LOWER(name)) LIKE '%candied cherry%'
  AND user_id IS NULL
  AND nutrition_per_100g IS NOT NULL;

-- Mixed peel
UPDATE ingredient_master
SET nutrition_per_100g = nutrition_per_100g 
    || '{"sugar_g": 62, "added_sugar_g": 50, "fiber_g": 4}'::jsonb
WHERE TRIM(LOWER(name)) LIKE '%mixed peel%' OR TRIM(LOWER(name)) LIKE '%candied peel%'
  AND user_id IS NULL
  AND nutrition_per_100g IS NOT NULL;

-- Cherries (fresh)
UPDATE ingredient_master
SET nutrition_per_100g = nutrition_per_100g 
    || '{"sugar_g": 12.8, "added_sugar_g": 0, "fiber_g": 2.1}'::jsonb
WHERE TRIM(LOWER(name)) IN ('cherry', 'cherries', 'fresh cherries')
  AND user_id IS NULL
  AND nutrition_per_100g IS NOT NULL;

-- Apple juice
UPDATE ingredient_master
SET nutrition_per_100g = nutrition_per_100g 
    || '{"sugar_g": 10.9, "added_sugar_g": 0, "fiber_g": 0.1}'::jsonb
WHERE TRIM(LOWER(name)) LIKE '%apple juice%'
  AND user_id IS NULL
  AND nutrition_per_100g IS NOT NULL;

-- Marzipan
UPDATE ingredient_master
SET nutrition_per_100g = nutrition_per_100g 
    || '{"sugar_g": 57, "added_sugar_g": 50, "fiber_g": 3}'::jsonb
WHERE TRIM(LOWER(name)) LIKE '%marzipan%'
  AND user_id IS NULL
  AND nutrition_per_100g IS NOT NULL;

-- White fondant
UPDATE ingredient_master
SET nutrition_per_100g = nutrition_per_100g 
    || '{"sugar_g": 85, "added_sugar_g": 85, "fiber_g": 0}'::jsonb
WHERE TRIM(LOWER(name)) LIKE '%fondant%'
  AND user_id IS NULL
  AND nutrition_per_100g IS NOT NULL;

-- Pouring custard
UPDATE ingredient_master
SET nutrition_per_100g = nutrition_per_100g 
    || '{"sugar_g": 14, "added_sugar_g": 10, "fiber_g": 0}'::jsonb
WHERE TRIM(LOWER(name)) LIKE '%custard%'
  AND user_id IS NULL
  AND nutrition_per_100g IS NOT NULL;

-- Dark brown sugar
UPDATE ingredient_master
SET nutrition_per_100g = nutrition_per_100g 
    || '{"sugar_g": 97, "added_sugar_g": 97, "fiber_g": 0}'::jsonb
WHERE TRIM(LOWER(name)) LIKE '%brown sugar%'
  AND user_id IS NULL
  AND nutrition_per_100g IS NOT NULL;

-- Molasses
UPDATE ingredient_master
SET nutrition_per_100g = nutrition_per_100g 
    || '{"sugar_g": 75, "added_sugar_g": 75, "fiber_g": 0}'::jsonb
WHERE TRIM(LOWER(name)) LIKE '%molasses%'
  AND user_id IS NULL
  AND nutrition_per_100g IS NOT NULL;

-- Golden syrup
UPDATE ingredient_master
SET nutrition_per_100g = nutrition_per_100g 
    || '{"sugar_g": 79, "added_sugar_g": 79, "fiber_g": 0}'::jsonb
WHERE TRIM(LOWER(name)) LIKE '%golden syrup%'
  AND user_id IS NULL
  AND nutrition_per_100g IS NOT NULL;

-- ============================================================
-- STEP 4: For ingredients with NO nutrition data at all, set it from scratch
-- Check which ones are NULL from STEP 1 and add them here.
-- Example:
-- INSERT INTO ... or use an UPDATE with a full JSON object.
-- ============================================================

-- ============================================================
-- STEP 5: Verify the fix worked
-- ============================================================
SELECT 
    im.name,
    im.nutrition_per_100g->>'sugar_g' AS sugar_g,
    im.nutrition_per_100g->>'added_sugar_g' AS added_sugar_g,
    im.nutrition_per_100g->>'fiber_g' AS fiber_g
FROM recipe_ingredients ri
JOIN ingredient_master im ON im.id = ri.ingredient_master_id
WHERE ri.recipe_id = '275f6935-3217-4f90-b193-f392603d95f4'
ORDER BY ri.position;

-- ============================================================
-- STEP 2: Run after STEP 3 to clear any cached result
-- ============================================================
DELETE FROM recipe_nutrition_cache WHERE recipe_id = '275f6935-3217-4f90-b193-f392603d95f4';

-- ============================================================
-- UNIVERSAL CACHE CLEAR (if multiple recipes show same issue)
-- TRUNCATE TABLE recipe_nutrition_cache;
-- ============================================================

-- ============================================================
-- EGG MASTER DATA CLEANUP (run if STEP 1 of main script returns duplicates)
-- ============================================================
DO $$
DECLARE
    target_id UUID;
    duplicate_ids UUID[];
BEGIN
    SELECT id INTO target_id
    FROM ingredient_master
    WHERE TRIM(LOWER(name)) = 'egg' AND user_id IS NULL
    ORDER BY created_at ASC
    LIMIT 1;

    IF target_id IS NULL THEN
        RAISE NOTICE 'No canonical "egg" found.';
        RETURN;
    END IF;

    duplicate_ids := ARRAY(
        SELECT id FROM ingredient_master
        WHERE TRIM(LOWER(name)) IN ('eggs', 'large egg', 'large eggs', 'egg (large)', 'egg, large')
          AND id != target_id
    );

    IF array_length(duplicate_ids, 1) IS NULL THEN
        RAISE NOTICE 'No egg duplicates found.';
        RETURN;
    END IF;

    UPDATE recipe_ingredients SET ingredient_master_id = target_id WHERE ingredient_master_id = ANY(duplicate_ids);
    UPDATE inventory_items SET ingredient_master_id = target_id WHERE ingredient_master_id = ANY(duplicate_ids);
    INSERT INTO ingredient_aliases (ingredient_master_id, alias_name)
    SELECT target_id, name FROM ingredient_master WHERE id = ANY(duplicate_ids)
    ON CONFLICT DO NOTHING;
    DELETE FROM ingredient_master WHERE id = ANY(duplicate_ids);
    RAISE NOTICE 'Egg cleanup: merged % duplicates', array_length(duplicate_ids, 1);
END $$;

-- DATE CLEANUP
DO $$
DECLARE
    target_id UUID;
    duplicate_ids UUID[];
BEGIN
    SELECT id INTO target_id
    FROM ingredient_master
    WHERE TRIM(LOWER(name)) = 'date' AND user_id IS NULL
    ORDER BY created_at ASC
    LIMIT 1;

    IF target_id IS NULL THEN
        RAISE NOTICE 'No canonical "date" found.';
        RETURN;
    END IF;

    duplicate_ids := ARRAY(
        SELECT id FROM ingredient_master
        WHERE TRIM(LOWER(name)) IN ('dates', 'pitted date', 'pitted dates', 'dried dates', 'dried date', 'medjool date', 'medjool dates')
          AND id != target_id
    );

    IF array_length(duplicate_ids, 1) IS NULL THEN
        RAISE NOTICE 'No date duplicates found.';
        RETURN;
    END IF;

    UPDATE recipe_ingredients SET ingredient_master_id = target_id WHERE ingredient_master_id = ANY(duplicate_ids);
    UPDATE inventory_items SET ingredient_master_id = target_id WHERE ingredient_master_id = ANY(duplicate_ids);
    INSERT INTO ingredient_aliases (ingredient_master_id, alias_name)
    SELECT target_id, name FROM ingredient_master WHERE id = ANY(duplicate_ids)
    ON CONFLICT DO NOTHING;
    DELETE FROM ingredient_master WHERE id = ANY(duplicate_ids);
    RAISE NOTICE 'Date cleanup: merged % duplicates', array_length(duplicate_ids, 1);
END $$;
