-- Function: search_ingredient
-- Purpose: Fuzzy search for ingredients by name or alias using trigram matching
-- Returns: Ranked results with similarity scores
-- Requirements: 48.1, 48.2

CREATE OR REPLACE FUNCTION search_ingredient(query TEXT)
RETURNS TABLE (
  ingredient_id UUID,
  ingredient_name TEXT,
  match_type TEXT,
  similarity_score REAL,
  category TEXT,
  density_g_per_ml NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  -- Search canonical ingredient names
  SELECT 
    im.id,
    im.name,
    'canonical'::TEXT as match_type,
    similarity(im.name, query) as similarity_score,
    im.category::TEXT,
    im.default_density_g_per_ml
  FROM ingredient_master im
  WHERE im.name % query  -- trigram operator for fuzzy match
  
  UNION ALL
  
  -- Search ingredient aliases
  SELECT 
    im.id,
    im.name,
    'alias'::TEXT as match_type,
    similarity(ia.alias_name, query) as similarity_score,
    im.category::TEXT,
    im.default_density_g_per_ml
  FROM ingredient_aliases ia
  JOIN ingredient_master im ON ia.ingredient_master_id = im.id
  WHERE ia.alias_name % query  -- trigram operator for fuzzy match
  
  ORDER BY similarity_score DESC, ingredient_name ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create trigram index for performance
CREATE INDEX IF NOT EXISTS idx_ingredient_master_name_trgm 
  ON ingredient_master USING gin(name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_ingredient_aliases_name_trgm 
  ON ingredient_aliases USING gin(alias_name gin_trgm_ops);
