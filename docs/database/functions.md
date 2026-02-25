# AiBake Database Functions

This document describes all custom PostgreSQL functions created for the AiBake system. These functions provide specialized business logic at the database layer for ingredient search, recipe expansion, nutrition calculation, and hydration analysis.

## Overview

Database functions are located in `database/functions/` and are organized by functionality:

- `search_ingredient.sql` - Fuzzy ingredient search with trigram matching
- `get_recipe_ingredients_expanded.sql` - Recipe ingredient expansion with composite breakdown
- `calculate_composite_nutrition.sql` - Weighted nutrition calculation for composite ingredients
- `calculate_hydration_percentage.sql` - Baker's percentage calculation for dough recipes
- `get_recipe_with_details.sql` - Complete recipe retrieval with all related data

All functions are also aggregated in `all_functions.sql` for convenient deployment.

---

## Function 1: search_ingredient

**Purpose**: Fuzzy search for ingredients by name or alias using trigram matching

**Location**: `database/functions/search_ingredient.sql`

**Requirements**: 48.1, 48.2

### Signature

```sql
search_ingredient(query TEXT)
RETURNS TABLE (
  ingredient_id UUID,
  ingredient_name TEXT,
  match_type TEXT,
  similarity_score REAL,
  category TEXT,
  density_g_per_ml NUMERIC
)
```

### Description

Performs fuzzy text search across both canonical ingredient names and ingredient aliases using PostgreSQL's trigram (pg_trgm) extension. Results are ranked by similarity score, allowing users to find ingredients even with typos or partial names.

### Parameters

- `query` (TEXT): Search term (e.g., "flour", "maida", "AP flour")

### Returns

| Column | Type | Description |
|--------|------|-------------|
| `ingredient_id` | UUID | Unique identifier of the ingredient |
| `ingredient_name` | TEXT | Canonical name of the ingredient |
| `match_type` | TEXT | Where match was found: 'canonical' or 'alias' |
| `similarity_score` | REAL | Trigram similarity score (0.0-1.0, higher is better) |
| `category` | TEXT | Ingredient category (flour, fat, sugar, etc.) |
| `density_g_per_ml` | NUMERIC | Density for volume-to-weight conversion |

### Examples

```sql
-- Search for "flour"
SELECT * FROM search_ingredient('flour');
-- Returns: all-purpose flour, bread flour, cake flour, etc.

-- Search for "maida" (Indian all-purpose flour)
SELECT * FROM search_ingredient('maida');
-- Returns: maida with match_type='alias' pointing to all-purpose flour

-- Search with typo "flor"
SELECT * FROM search_ingredient('flor');
-- Returns: flour matches with lower similarity scores
```

### Performance

- Uses trigram GIN indexes on both `ingredient_master.name` and `ingredient_aliases.alias_name`
- Indexes created: `idx_ingredient_master_name_trgm`, `idx_ingredient_aliases_name_trgm`
- Typical query time: <50ms for 100+ ingredients

### Implementation Notes

- Trigram operator `%` performs fuzzy matching (requires pg_trgm extension)
- `similarity()` function returns score between 0 and 1
- Results ordered by similarity (descending) then name (ascending) for consistency
- Searches both canonical names and aliases in single query using UNION ALL

---

## Function 2: get_recipe_ingredients_expanded

**Purpose**: Return recipe ingredients with composite ingredient breakdowns

**Location**: `database/functions/get_recipe_ingredients_expanded.sql`

**Requirements**: 48.2, 18.4

### Signature

```sql
get_recipe_ingredients_expanded(recipe_id UUID)
RETURNS TABLE (
  ingredient_id UUID,
  ingredient_name TEXT,
  quantity_grams NUMERIC,
  quantity_original NUMERIC,
  unit_original TEXT,
  display_name TEXT,
  is_composite BOOLEAN,
  component_ingredient_id UUID,
  component_ingredient_name TEXT,
  component_quantity_grams NUMERIC,
  component_percentage NUMERIC,
  position INTEGER
)
```

### Description

Expands recipe ingredients to show composite ingredient breakdowns. For simple ingredients, returns one row per ingredient. For composite ingredients (e.g., flour blends, spice mixes), returns multiple rows showing each component with its calculated quantity and percentage.

### Parameters

- `recipe_id` (UUID): The recipe to expand

### Returns

| Column | Type | Description |
|--------|------|-------------|
| `ingredient_id` | UUID | ID of the ingredient (composite or simple) |
| `ingredient_name` | TEXT | Canonical name of the ingredient |
| `quantity_grams` | NUMERIC | Total quantity in grams for this ingredient |
| `quantity_original` | NUMERIC | Original user-entered quantity |
| `unit_original` | TEXT | Original user-entered unit |
| `display_name` | TEXT | Display name for UI presentation |
| `is_composite` | BOOLEAN | True if this is a composite ingredient |
| `component_ingredient_id` | UUID | ID of component (NULL for simple ingredients) |
| `component_ingredient_name` | TEXT | Name of component (NULL for simple ingredients) |
| `component_quantity_grams` | NUMERIC | Calculated quantity of component in grams |
| `component_percentage` | NUMERIC | Percentage of component in composite |
| `position` | INTEGER | Display order in recipe |

### Examples

```sql
-- Get expanded ingredients for a recipe
SELECT * FROM get_recipe_ingredients_expanded('recipe-uuid-123');

-- Result for simple ingredient:
-- ingredient_name: 'all-purpose flour', quantity_grams: 250, is_composite: false, ...

-- Result for composite ingredient (GF flour blend):
-- ingredient_name: 'gf flour blend', quantity_grams: 200, is_composite: true
-- component_ingredient_name: 'rice flour', component_quantity_grams: 100, component_percentage: 50
-- component_ingredient_name: 'tapioca starch', component_quantity_grams: 80, component_percentage: 40
-- component_ingredient_name: 'xanthan gum', component_quantity_grams: 20, component_percentage: 10
```

### Use Cases

- Display ingredient list with optional component breakdown
- Calculate nutrition from composite ingredients
- Generate shopping lists with component details
- Show ingredient substitution options

### Performance

- Indexes on `recipe_id`, `ingredient_master_id`, and composite relationships
- Typical query time: <100ms for recipes with 20+ ingredients

---

## Function 3: calculate_composite_nutrition

**Purpose**: Calculate weighted average nutrition for composite ingredients

**Location**: `database/functions/calculate_composite_nutrition.sql`

**Requirements**: 48.3, 18.5

### Signature

```sql
calculate_composite_nutrition(composite_ingredient_id UUID)
RETURNS TABLE (
  energy_kcal NUMERIC,
  protein_g NUMERIC,
  fat_g NUMERIC,
  carbs_g NUMERIC,
  fiber_g NUMERIC
)
```

### Description

Calculates weighted average nutrition data for a composite ingredient by averaging the nutrition of all components according to their percentages. Validates that component percentages sum to 100%.

### Parameters

- `composite_ingredient_id` (UUID): The composite ingredient to calculate nutrition for

### Returns

| Column | Type | Description |
|--------|------|-------------|
| `energy_kcal` | NUMERIC | Energy in kilocalories per 100g |
| `protein_g` | NUMERIC | Protein in grams per 100g |
| `fat_g` | NUMERIC | Fat in grams per 100g |
| `carbs_g` | NUMERIC | Carbohydrates in grams per 100g |
| `fiber_g` | NUMERIC | Fiber in grams per 100g |

### Examples

```sql
-- Calculate nutrition for a GF flour blend
SELECT * FROM calculate_composite_nutrition('composite-id-456');
-- Returns: energy_kcal: 364, protein_g: 8.5, fat_g: 1.2, carbs_g: 75.3, fiber_g: 2.1

-- Use in recipe nutrition calculation
SELECT 
  recipe_id,
  (SELECT energy_kcal FROM calculate_composite_nutrition(ci.id)) as energy_kcal
FROM composite_ingredients ci
WHERE ci.ingredient_master_id = 'some-ingredient-id';
```

### Validation

- Raises exception if component percentages don't sum to 100%
- Handles NULL nutrition values gracefully (treats as 0)
- Rounds results to 2 decimal places

### Performance

- Single table scan of composite components
- Typical query time: <10ms

---

## Function 4: calculate_hydration_percentage

**Purpose**: Calculate baker's percentage (water-to-flour ratio) for dough recipes

**Location**: `database/functions/calculate_hydration_percentage.sql`

**Requirements**: 48.4, 16.5

### Signature

```sql
calculate_hydration_percentage(recipe_id UUID)
RETURNS NUMERIC
```

### Description

Calculates baker's percentage (hydration) for dough-based recipes by computing the ratio of total liquid weight to total flour weight, expressed as a percentage. Returns NULL for non-dough recipes (zero flour).

**Formula**: `(total_liquid_weight / total_flour_weight) × 100`

### Parameters

- `recipe_id` (UUID): The recipe to calculate hydration for

### Returns

- NUMERIC: Hydration percentage (e.g., 65.5 for 65.5% hydration), or NULL if no flour

### Examples

```sql
-- Calculate hydration for a bread recipe
SELECT calculate_hydration_percentage('bread-recipe-id');
-- Returns: 68.5 (68.5% hydration)

-- Calculate hydration for a cake recipe (no flour)
SELECT calculate_hydration_percentage('cake-recipe-id');
-- Returns: NULL (not a dough recipe)

-- Update recipe with calculated hydration
UPDATE recipes 
SET total_hydration_percentage = calculate_hydration_percentage(id)
WHERE id = 'recipe-id';
```

### Ingredient Categories

- **Flour**: All ingredients in 'flour' category
- **Liquid**: All ingredients in 'liquid' or 'dairy' categories

### Performance

- Two aggregate queries (one for flour, one for liquid)
- Typical query time: <20ms

### Notes

- Dairy ingredients (milk, yogurt, etc.) are counted as liquid
- Returns NULL for non-dough recipes to distinguish from 0% hydration
- Useful for bread, pizza dough, pasta, and other dough-based recipes

---

## Function 5: get_recipe_with_details

**Purpose**: Return complete recipe with ingredients, sections, and steps

**Location**: `database/functions/get_recipe_with_details.sql`

**Requirements**: 48.6, 23.8

### Signature

```sql
get_recipe_with_details(recipe_id UUID)
RETURNS JSON
```

### Description

Retrieves a complete recipe as a single JSON object including all metadata, ingredients with master data, sections, and steps. Useful for API endpoints that need to return full recipe details in a single query.

### Parameters

- `recipe_id` (UUID): The recipe to retrieve

### Returns

- JSON: Complete recipe object with nested ingredients, sections, and steps

### Example Return Structure

```json
{
  "id": "recipe-uuid",
  "user_id": "user-uuid",
  "title": "Classic Chocolate Chip Cookies",
  "description": "Soft and chewy cookies",
  "servings": 24,
  "yield_weight_grams": 600,
  "status": "active",
  "total_hydration_percentage": null,
  "created_at": "2024-01-15T10:30:00Z",
  "ingredients": [
    {
      "id": "ingredient-uuid",
      "ingredient_master_id": "master-uuid",
      "display_name": "All-purpose flour",
      "quantity_original": 250,
      "unit_original": "grams",
      "quantity_grams": 250,
      "position": 1,
      "ingredient_master": {
        "id": "master-uuid",
        "name": "all-purpose flour",
        "category": "flour",
        "default_density_g_per_ml": 0.59,
        "nutrition_per_100g": {
          "energy_kcal": 364,
          "protein_g": 10,
          "fat_g": 1,
          "carbs_g": 76
        }
      }
    }
  ],
  "sections": [
    {
      "id": "section-uuid",
      "type": "prep",
      "title": "Prepare Dough",
      "position": 1,
      "steps": [
        {
          "id": "step-uuid",
          "instruction": "Cream butter and sugar",
          "duration_seconds": 180,
          "temperature_celsius": null,
          "position": 1,
          "dependency_step_id": null
        }
      ]
    }
  ]
}
```

### Use Cases

- API endpoint for retrieving full recipe details
- Recipe export/import functionality
- Recipe versioning snapshots
- Frontend recipe display

### Performance

- Single query with nested JSON aggregation
- Typical query time: <100ms for recipes with 20+ ingredients and 50+ steps

---

## Deployment

### Creating Functions

All functions are defined in `database/functions/` and can be deployed in two ways:

**Option 1: Deploy individual functions**
```bash
psql -U aibake_user -d aibake_db -f database/functions/search_ingredient.sql
psql -U aibake_user -d aibake_db -f database/functions/get_recipe_ingredients_expanded.sql
# ... etc
```

**Option 2: Deploy all functions at once**
```bash
psql -U aibake_user -d aibake_db -f database/functions/all_functions.sql
```

### Updating Functions

Functions can be updated using `CREATE OR REPLACE FUNCTION` (as long as the signature doesn't change):

```bash
psql -U aibake_user -d aibake_db -f database/functions/search_ingredient.sql
```

### Verifying Functions

```sql
-- List all custom functions
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
ORDER BY routine_name;

-- Check function definition
\df+ search_ingredient

-- Test function
SELECT * FROM search_ingredient('flour') LIMIT 5;
```

---

## Testing

### Unit Tests

Each function should have corresponding unit tests in the middleware layer:

```typescript
// middleware/tests/unit/searchEngine.test.ts
describe('search_ingredient', () => {
  it('should find ingredients by canonical name', async () => {
    const results = await db.query('SELECT * FROM search_ingredient($1)', ['flour']);
    expect(results.rows.length).toBeGreaterThan(0);
    expect(results.rows[0].match_type).toBe('canonical');
  });

  it('should find ingredients by alias', async () => {
    const results = await db.query('SELECT * FROM search_ingredient($1)', ['maida']);
    expect(results.rows.some(r => r.match_type === 'alias')).toBe(true);
  });
});
```

### Integration Tests

Test functions with real data:

```bash
# Run integration tests
cd middleware
npm test -- --testPathPattern=integration
```

---

## Performance Considerations

### Indexes

All functions rely on indexes for performance:

```sql
-- Trigram indexes for fuzzy search
CREATE INDEX idx_ingredient_master_name_trgm 
  ON ingredient_master USING gin(name gin_trgm_ops);

CREATE INDEX idx_ingredient_aliases_name_trgm 
  ON ingredient_aliases USING gin(alias_name gin_trgm_ops);

-- Foreign key indexes
CREATE INDEX idx_recipe_ingredients_recipe_id 
  ON recipe_ingredients(recipe_id);

CREATE INDEX idx_composite_components_composite 
  ON composite_ingredient_components(composite_ingredient_id);
```

### Query Optimization

- Use `EXPLAIN ANALYZE` to check query plans
- Monitor slow queries in PostgreSQL logs
- Consider caching results for frequently accessed data

```sql
-- Check query plan
EXPLAIN ANALYZE
SELECT * FROM search_ingredient('flour');
```

---

## Troubleshooting

### Function not found error

```
ERROR: function search_ingredient(text) does not exist
```

**Solution**: Deploy the function using the SQL files in `database/functions/`

### Trigram index not used

```
-- Check if index is being used
EXPLAIN ANALYZE
SELECT * FROM search_ingredient('flour');
```

**Solution**: Ensure pg_trgm extension is enabled and indexes are created

### Composite nutrition calculation fails

```
ERROR: Composite ingredient components must sum to 100%
```

**Solution**: Verify that component percentages in `composite_ingredient_components` sum to exactly 100%

---

## Related Documentation

- [Database Schema](schema.md)
- [Database Triggers](triggers.md)
- [API Endpoints](../api/openapi.yaml)
- [Middleware Layer](../architecture/middleware.md)
