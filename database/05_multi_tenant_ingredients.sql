-- Migration: 05_multi_tenant_ingredients.sql

BEGIN;

-- 1. Add user_id and metadata columns to master
ALTER TABLE public.ingredient_master
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS is_composite BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ai_estimated BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Add user_id to aliases
ALTER TABLE public.ingredient_aliases
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;

-- 3. Drop the overly restrictive global unique constraints
ALTER TABLE public.ingredient_master DROP CONSTRAINT IF EXISTS ingredient_master_name_key;
ALTER TABLE public.ingredient_aliases DROP CONSTRAINT IF EXISTS uq_ingredient_aliases_alias_name;
-- Also drop any other name-based unique constraints if they exist
ALTER TABLE public.ingredient_master DROP CONSTRAINT IF EXISTS uq_ingredient_master_name;

-- 4. Create user-scoped unique indexes
-- A user cannot have two ingredients with the exact same name. 
-- System ingredients (where user_id is NULL) also cannot have duplicate names.
-- We use COALESCE to treat NULL user_ids as a specific 'system' UUID for the sake of the index.
CREATE UNIQUE INDEX IF NOT EXISTS uq_ingredient_master_name_user 
ON public.ingredient_master (LOWER(name), COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::UUID));

CREATE UNIQUE INDEX IF NOT EXISTS uq_ingredient_aliases_name_user 
ON public.ingredient_aliases (LOWER(alias_name), COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::UUID));

-- 5. Recreate the search_ingredient function to be user-aware
DROP FUNCTION IF EXISTS public.search_ingredient(text);

CREATE OR REPLACE FUNCTION public.search_ingredient(query text, p_user_id UUID DEFAULT NULL)
 RETURNS TABLE(ingredient_id uuid, ingredient_name text, match_type text, similarity_score real, category text, density_g_per_ml numeric, is_system boolean)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
  RETURN QUERY
  -- Search canonical ingredient names (System OR User's own)
  SELECT 
    im.id,
    im.name,
    'canonical'::TEXT as match_type,
    similarity(im.name, query) as similarity_score,
    im.category::TEXT,
    im.default_density_g_per_ml,
    (im.user_id IS NULL) as is_system
  FROM ingredient_master im
  WHERE im.name % query 
    AND (im.user_id IS NULL OR im.user_id = p_user_id)
  
  UNION ALL
  
  -- Search ingredient aliases (System OR User's own)
  SELECT 
    im.id,
    im.name,
    'alias'::TEXT as match_type,
    similarity(ia.alias_name, query) as similarity_score,
    im.category::TEXT,
    im.default_density_g_per_ml,
    (im.user_id IS NULL) as is_system
  FROM ingredient_aliases ia
  JOIN ingredient_master im ON ia.ingredient_master_id = im.id
  WHERE ia.alias_name % query
    AND (ia.user_id IS NULL OR ia.user_id = p_user_id)
  
  ORDER BY similarity_score DESC, ingredient_name ASC;
END;
$function$;

COMMIT;
