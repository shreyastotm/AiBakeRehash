# Advanced Baking Features - Detailed Guide

## Overview

This guide explains the 4 advanced features now supported in the AiBake schema:

1. **Water Activity (aw)** - Food safety & shelf life
2. **Hydration Loss** - Baking weight loss tracking
3. **Ingredient Aliases** - Smart search with nicknames
4. **Composite Ingredients** - Complex ingredient blends

---

## 1. Water Activity (aw) Tracking

### What is Water Activity?

Water activity (aw) measures the "free" water available for microbial growth on a scale of 0.00 to 1.00:

- **1.00** = Pure water
- **0.95-0.99** = Fresh bread, cakes (short shelf life, mold risk)
- **0.85-0.94** = Soft cookies, cheese (bacterial growth possible)
- **0.60-0.84** = Hard cookies, crackers (very stable)
- **<0.60** = Dry crackers, chips (extremely stable)

### Why It Matters

| aw Value | Microbes Can Grow | Shelf Life | Example Products |
|----------|-------------------|------------|------------------|
| >0.95 | Bacteria, yeast, mold | 1-3 days | Fresh bread, cream pastries |
| 0.87-0.95 | Yeast, mold | 5-7 days | Soft bread, cakes |
| 0.80-0.86 | Most molds | 2-3 weeks | Semi-dry cookies |
| 0.65-0.79 | Xerophilic molds | 1-3 months | Hard cookies, brownies |
| <0.65 | Almost nothing | 6+ months | Crackers, dry biscuits |

### Schema Fields

```sql
-- In recipes table:
target_water_activity        -- What you're aiming for (e.g., 0.92 for soft bread)
min_safe_water_activity      -- Minimum safe aw (usually 0.85)
estimated_shelf_life_days    -- Expected shelf life at target aw

-- In recipe_journal_entries:
measured_water_activity      -- Actual measured aw (requires aw meter)
storage_days_achieved        -- How long it actually stayed fresh
```

### Practical Example

```sql
-- Set target water activity for a cookie recipe
UPDATE recipes
SET 
  target_water_activity = 0.65,
  min_safe_water_activity = 0.60,
  estimated_shelf_life_days = 90
WHERE title = 'Classic Chocolate Chip Cookies';

-- After baking, record actual measurement
UPDATE recipe_journal_entries
SET 
  measured_water_activity = 0.68,  -- Slightly higher than target
  storage_days_achieved = 75        -- Still good after 75 days
WHERE id = 'your-journal-entry-id';

-- Query water activity reference for guidance
SELECT * FROM water_activity_reference
WHERE product_category LIKE '%cookie%';
```

### How to Use in Application

**Planning Stage:**
```javascript
// Suggest target aw based on recipe type
function suggestWaterActivity(recipeType) {
  const awGuide = {
    'crusty-bread': { target: 0.95, shelf: 3 },
    'soft-bread': { target: 0.94, shelf: 7 },
    'cookies': { target: 0.65, shelf: 90 },
    'crackers': { target: 0.30, shelf: 365 }
  };
  return awGuide[recipeType];
}
```

**Quality Control:**
```javascript
// Alert if measured aw is too high
if (measuredAw > targetAw + 0.05) {
  alert('Warning: Water activity is higher than target. ' +
        'Product may spoil faster than expected. ' +
        'Consider reducing moisture or adding preservatives.');
}
```

---

## 2. Hydration Loss Tracking

### What is Hydration Loss?

During baking, water evaporates. A 1000g dough might become an 850g loaf (15% loss). This affects:

- **Texture** - More loss = crustier, drier
- **Yield** - Need to account for loss in scaling
- **Consistency** - Track variations between bakes

### Schema Fields

```sql
-- In recipe_journal_entries:
pre_bake_weight_grams        -- Weight before going in oven
outcome_weight_grams         -- Weight after baking (already existed)
baking_loss_grams            -- AUTO-CALCULATED: pre - post
baking_loss_percentage       -- AUTO-CALCULATED: (loss / pre) × 100

-- In recipes:
total_hydration_percentage   -- Baker's percentage for dough
```

### Automatic Calculation

When you insert/update a journal entry with pre-bake and post-bake weights:

```sql
INSERT INTO recipe_journal_entries (
  recipe_id,
  bake_date,
  pre_bake_weight_grams,  -- You provide this
  outcome_weight_grams     -- You provide this
  -- baking_loss_grams and baking_loss_percentage are AUTO-CALCULATED
) VALUES (
  'recipe-id',
  '2026-02-16',
  1000,  -- 1000g dough
  850    -- 850g bread
);

-- Trigger automatically sets:
-- baking_loss_grams = 150
-- baking_loss_percentage = 15.00
```

### Baker's Hydration Percentage

For dough-based recipes (bread, pizza), calculate hydration:

```sql
-- Calculate and store hydration percentage
SELECT calculate_hydration_percentage('your-bread-recipe-id');

-- Result: 70.00 (means 70% water relative to flour)
-- Common ranges:
-- Bagels: 50-57%
-- French bread: 65-70%
-- Ciabatta: 75-85%
-- Focaccia: 80-90%
```

### Practical Example

```sql
-- Record a bake with pre/post weights
INSERT INTO recipe_journal_entries (
  recipe_id,
  bake_date,
  pre_bake_weight_grams,
  outcome_weight_grams,
  notes
) VALUES (
  'sourdough-recipe-id',
  CURRENT_DATE,
  1500,  -- 1.5kg dough
  1275,  -- 1.275kg bread
  'Perfect spring! Crust was extra crispy today.'
);

-- Query baking loss trends over time
SELECT 
  bake_date,
  pre_bake_weight_grams,
  outcome_weight_grams,
  baking_loss_percentage,
  CASE 
    WHEN baking_loss_percentage < 12 THEN 'Low loss - might be underbaked'
    WHEN baking_loss_percentage > 18 THEN 'High loss - might be overbaked'
    ELSE 'Normal'
  END as assessment
FROM recipe_journal_entries
WHERE recipe_id = 'sourdough-recipe-id'
ORDER BY bake_date DESC;
```

### How to Use in Application

**During Baking:**
```javascript
// Calculate expected final weight
function predictFinalWeight(preBakeWeight, recipeType) {
  const typicalLoss = {
    'crusty-bread': 0.15,    // 15% loss
    'soft-bread': 0.12,      // 12% loss
    'cookies': 0.08,         // 8% loss
    'cakes': 0.10            // 10% loss
  };
  
  const lossRate = typicalLoss[recipeType] || 0.12;
  return preBakeWeight * (1 - lossRate);
}

// Alert user
const expected = predictFinalWeight(1000, 'crusty-bread');
// Result: 850g expected final weight
```

**Quality Analysis:**
```javascript
// Analyze consistency across bakes
SELECT 
  AVG(baking_loss_percentage) as avg_loss,
  STDDEV(baking_loss_percentage) as loss_variation
FROM recipe_journal_entries
WHERE recipe_id = 'your-recipe-id';

// If loss_variation > 3, recipe execution is inconsistent
```

---

## 3. Ingredient Aliases & Smart Search

### The Problem

Users search for ingredients using:
- Abbreviations: "AP flour", "APF"
- Regional terms: "plain flour" (UK) vs "all-purpose flour" (US)
- Brand names: "King Arthur bread flour"
- Common names: "powdered sugar" vs "confectioners sugar"

Without aliases, each search term requires exact matching.

### Schema Design

```sql
ingredient_master          -- Canonical names: "all-purpose flour"
    ↓
ingredient_aliases         -- All variations: "AP flour", "APF", "plain flour"
```

### Alias Types

| Type | Example | Use Case |
|------|---------|----------|
| `abbreviation` | AP flour, APF | Quick entry |
| `regional` | Plain flour (UK), Maida (India) | Localization |
| `brand` | King Arthur AP, Bob's Red Mill | Brand recognition |
| `common` | White flour, Bread flour | Casual terms |

### Adding Aliases

```sql
-- Add aliases for an ingredient
INSERT INTO ingredient_aliases (
  ingredient_master_id,
  alias_name,
  alias_type,
  locale
)
SELECT 
  (SELECT id FROM ingredient_master WHERE name = 'all-purpose flour'),
  alias,
  type,
  locale
FROM (VALUES 
  ('ap flour', 'abbreviation', 'en-US'),
  ('apf', 'abbreviation', 'en-US'),
  ('plain flour', 'regional', 'en-GB'),
  ('maida', 'regional', 'en-IN')
) AS aliases(alias, type, locale);
```

### Smart Search Function

```sql
-- Search with fuzzy matching across canonical names AND aliases
SELECT * FROM search_ingredient('ap');

-- Returns:
-- ingredient_id | canonical_name      | matched_via              | similarity_score
-- --------------|---------------------|--------------------------|------------------
-- uuid-1        | all-purpose flour   | alias: ap flour          | 1.0
-- uuid-1        | all-purpose flour   | alias: apf               | 0.67
-- uuid-2        | almond flour        | canonical                | 0.33
```

### Practical Example

```sql
-- User types "flor" in search box
SELECT * FROM search_ingredient('flor');

-- Returns all flour types ranked by similarity:
-- bread flour (0.80)
-- all-purpose flour (0.75)
-- almond flour (0.70)
-- ...

-- User types "icing sugar"
SELECT * FROM search_ingredient('icing sugar');

-- Returns:
-- confectioners sugar (via alias: "icing sugar")
-- powdered sugar (similar name)
```

### How to Use in Application

**Autocomplete:**
```javascript
async function searchIngredients(query) {
  const results = await db.query(
    'SELECT * FROM search_ingredient($1) LIMIT 5',
    [query]
  );
  
  return results.rows.map(r => ({
    id: r.ingredient_id,
    name: r.canonical_name,
    matchedVia: r.matched_via,
    score: r.similarity_score
  }));
}

// User types "ap" → Shows "all-purpose flour (matched via: ap flour)"
```

**Locale Support:**
```sql
-- Get ingredients with locale-specific aliases
SELECT 
  im.name as canonical_name,
  ia.alias_name,
  ia.locale
FROM ingredient_master im
JOIN ingredient_aliases ia ON ia.ingredient_master_id = im.id
WHERE ia.locale = 'en-GB';  -- British terms

-- Results:
-- all-purpose flour → plain flour
-- confectioners sugar → icing sugar
-- eggplant → aubergine
```

---

## 4. Composite Ingredients (Complex Blends)

### The Problem

Some "ingredients" are actually recipes themselves:

- **Gluten-free flour blend** = rice flour + tapioca + potato starch + xanthan
- **Garam masala** = cumin + coriander + cardamom + cloves + pepper + cinnamon
- **Sourdough starter** = flour + water + wild yeast culture
- **Cake flour substitute** = all-purpose flour (95%) + cornstarch (5%)

### Schema Design

```
ingredient_master (GF Flour Blend)
    ↓
composite_ingredients (marks it as composite)
    ↓
composite_ingredient_components (40% rice, 30% tapioca, etc.)
```

### Creating a Composite Ingredient

**Step 1: Create the ingredient**
```sql
INSERT INTO ingredient_master (name, category, default_density_g_per_ml)
VALUES ('gluten-free flour blend', 'flour', 0.48);
```

**Step 2: Mark it as composite**
```sql
INSERT INTO composite_ingredients (ingredient_master_id, is_user_defined)
VALUES (
  (SELECT id FROM ingredient_master WHERE name = 'gluten-free flour blend'),
  TRUE  -- User-defined blend (vs commercial pre-made)
);
```

**Step 3: Add components**
```sql
INSERT INTO composite_ingredient_components (
  composite_ingredient_id,
  component_ingredient_id,
  percentage,
  weight_grams_per_100g,
  position
)
VALUES
-- Rice flour: 40%
(
  (SELECT id FROM composite_ingredients WHERE ingredient_master_id = 
    (SELECT id FROM ingredient_master WHERE name = 'gluten-free flour blend')),
  (SELECT id FROM ingredient_master WHERE name = 'whole wheat flour'),
  40.00,
  40.00,
  1
),
-- Almond flour: 30%
(
  (SELECT id FROM composite_ingredients WHERE ingredient_master_id = 
    (SELECT id FROM ingredient_master WHERE name = 'gluten-free flour blend')),
  (SELECT id FROM ingredient_master WHERE name = 'almond flour'),
  30.00,
  30.00,
  2
),
-- Coconut flour: 20%
(
  (SELECT id FROM composite_ingredients WHERE ingredient_master_id = 
    (SELECT id FROM ingredient_master WHERE name = 'gluten-free flour blend')),
  (SELECT id FROM ingredient_master WHERE name = 'coconut flour'),
  20.00,
  20.00,
  3
),
-- Xanthan gum: 10%
(
  (SELECT id FROM composite_ingredients WHERE ingredient_master_id = 
    (SELECT id FROM ingredient_master WHERE name = 'gluten-free flour blend')),
  (SELECT id FROM ingredient_master WHERE name = 'baking powder'),
  10.00,
  10.00,
  4
);
```

### Viewing Composite Breakdown

```sql
-- See what's in a composite ingredient
SELECT 
  im.name as composite_name,
  cim.name as component,
  cic.percentage || '%' as percentage,
  cic.weight_grams_per_100g || 'g per 100g' as amount
FROM composite_ingredients ci
JOIN ingredient_master im ON im.id = ci.ingredient_master_id
JOIN composite_ingredient_components cic ON cic.composite_ingredient_id = ci.id
JOIN ingredient_master cim ON cim.id = cic.component_ingredient_id
WHERE im.name = 'gluten-free flour blend'
ORDER BY cic.position;

-- Result:
-- composite_name          | component           | percentage | amount
-- ------------------------|---------------------|------------|---------------
-- gluten-free flour blend | whole wheat flour   | 40%        | 40g per 100g
-- gluten-free flour blend | almond flour        | 30%        | 30g per 100g
-- gluten-free flour blend | coconut flour       | 20%        | 20g per 100g
-- gluten-free flour blend | baking powder       | 10%        | 10g per 100g
```

### Expanded Recipe View

When a recipe uses a composite ingredient, you can see the full breakdown:

```sql
-- Get recipe with composite ingredients expanded
SELECT * FROM get_recipe_ingredients_expanded('your-recipe-id');

-- Result:
-- ingredient_name          | quantity_grams | is_composite | composite_breakdown
-- -------------------------|----------------|--------------|---------------------
-- gluten-free flour blend  | 250            | true         | [{"component": "whole wheat flour", "quantity_grams": 100},
--                          |                |              |  {"component": "almond flour", "quantity_grams": 75},
--                          |                |              |  {"component": "coconut flour", "quantity_grams": 50},
--                          |                |              |  {"component": "baking powder", "quantity_grams": 25}]
-- sugar                    | 150            | false        | null
```

### Practical Example: Spice Blend

```sql
-- Create "Garam Masala" composite
INSERT INTO ingredient_master (name, category) 
VALUES ('garam masala', 'spice');

INSERT INTO composite_ingredients (ingredient_master_id, is_user_defined)
VALUES ((SELECT id FROM ingredient_master WHERE name = 'garam masala'), FALSE);

-- Add components (percentages must sum to 100)
-- Component breakdown for authentic Garam Masala:
-- Cumin: 30%
-- Coriander: 25%
-- Cardamom: 20%
-- Black pepper: 10%
-- Cinnamon: 10%
-- Cloves: 5%

-- (Insert statements similar to GF flour example above)
```

### How to Use in Application

**Smart Shopping List:**
```javascript
// When user adds GF flour blend to recipe, show them what they actually need
async function getShoppingList(recipeId) {
  const ingredients = await db.query(`
    SELECT * FROM get_recipe_ingredients_expanded($1)
  `, [recipeId]);
  
  const shoppingList = [];
  
  for (const ing of ingredients.rows) {
    if (ing.is_composite && ing.composite_breakdown) {
      // Expand composite
      for (const component of ing.composite_breakdown) {
        shoppingList.push({
          name: component.component,
          amount: component.quantity_grams,
          partOf: ing.ingredient_name
        });
      }
    } else {
      shoppingList.push({
        name: ing.ingredient_name,
        amount: ing.quantity_grams
      });
    }
  }
  
  return shoppingList;
}

// Result for recipe with "250g GF flour blend":
// [
//   { name: "whole wheat flour", amount: 100, partOf: "gluten-free flour blend" },
//   { name: "almond flour", amount: 75, partOf: "gluten-free flour blend" },
//   { name: "coconut flour", amount: 50, partOf: "gluten-free flour blend" },
//   { name: "baking powder", amount: 25, partOf: "gluten-free flour blend" },
//   { name: "sugar", amount: 150 }
// ]
```

**Nutrition Calculation:**
```sql
-- Composite nutrition is automatically calculated from components
SELECT calculate_composite_nutrition(
  (SELECT id FROM composite_ingredients WHERE ingredient_master_id = 
    (SELECT id FROM ingredient_master WHERE name = 'gluten-free flour blend'))
);

-- Returns:
-- {
--   "energy_kcal": 385,
--   "protein_g": 12.5,
--   "fat_g": 8.2,
--   ...weighted average of all components
-- }
```

---

## Integration Examples

### Complete Workflow: Create GF Bread Recipe

```sql
-- 1. Create recipe
INSERT INTO recipes (user_id, title, servings, yield_weight_grams, status)
VALUES ('user-id', 'Gluten-Free Sandwich Bread', 1, 900, 'active')
RETURNING id;  -- Returns 'recipe-123'

-- 2. Set water activity targets
UPDATE recipes
SET 
  target_water_activity = 0.94,
  estimated_shelf_life_days = 7
WHERE id = 'recipe-123';

-- 3. Add ingredients (including composite GF flour)
INSERT INTO recipe_ingredients (recipe_id, ingredient_master_id, display_name, quantity_grams, position)
VALUES
('recipe-123', (SELECT id FROM ingredient_master WHERE name = 'gluten-free flour blend'), 'GF Flour Blend', 350, 1),
('recipe-123', (SELECT id FROM ingredient_master WHERE name = 'water'), 'Warm water', 280, 2),
('recipe-123', (SELECT id FROM ingredient_master WHERE name = 'yeast'), 'Active dry yeast', 7, 3);

-- 4. Calculate hydration
SELECT calculate_hydration_percentage('recipe-123');
-- Result: 80.00% (280g water / 350g flour)

-- 5. After baking, log results
INSERT INTO recipe_journal_entries (
  recipe_id,
  bake_date,
  pre_bake_weight_grams,
  outcome_weight_grams,
  measured_water_activity,
  notes
) VALUES (
  'recipe-123',
  CURRENT_DATE,
  1050,  -- Dough weight
  900,   -- Bread weight (loss calculated automatically: 14.29%)
  0.93,  -- Slightly drier than target
  'Good rise! Texture a bit dry, maybe increase water next time.'
);

-- 6. View complete ingredient breakdown
SELECT * FROM get_recipe_ingredients_expanded('recipe-123');
-- Shows GF blend expanded into individual components
```

---

## Summary Table

| Feature | Tables Involved | Key Functions | Primary Use Case |
|---------|----------------|---------------|------------------|
| **Water Activity** | `recipes`, `recipe_journal_entries`, `water_activity_reference` | None (direct columns) | Food safety, shelf life prediction |
| **Hydration Loss** | `recipe_journal_entries` | `calculate_baking_loss()` (auto-trigger), `calculate_hydration_percentage()` | Quality control, consistency tracking |
| **Ingredient Aliases** | `ingredient_aliases` | `search_ingredient()` | Smart search, autocomplete, localization |
| **Composite Ingredients** | `composite_ingredients`, `composite_ingredient_components` | `get_recipe_ingredients_expanded()`, `calculate_composite_nutrition()` | Complex blends, shopping lists, nutrition |

---

## Best Practices

### 1. Water Activity
- Measure aw with proper meter (not estimation)
- Record in journal for every critical bake
- Use reference table for initial targets
- Monitor trends: if measured > target consistently, adjust recipe

### 2. Hydration Loss
- Always weigh dough before baking
- Weigh immediately after cooling (not while hot)
- Track variation: >5% variance = inconsistent baking
- Use for scaling: if loss = 15%, make 1176g dough for 1000g bread

### 3. Ingredient Aliases
- Add aliases as users search
- Include regional variations for international users
- Keep abbreviations obvious (AP, GF, not obscure acronyms)
- Update aliases when users can't find ingredients

### 4. Composite Ingredients
- Percentages must sum to exactly 100%
- Auto-calculate nutrition from components
- Allow users to create custom blends
- Provide option to view "simplified" (composite) or "detailed" (expanded) ingredient lists

---

## Migration Guide

If you already have data, run these to add the enhancements:

```bash
# 1. Run enhancement script
psql -U postgres -d aibake -f 04_schema_enhancements.sql

# 2. Backfill water activity for existing recipes (optional)
UPDATE recipes 
SET target_water_activity = 0.94, estimated_shelf_life_days = 7
WHERE title LIKE '%bread%';

# 3. Calculate hydration for existing bread recipes
SELECT calculate_hydration_percentage(id) FROM recipes WHERE title LIKE '%bread%';

# 4. Add aliases for your most common ingredients
-- (See examples in the enhancement script)
```

---

## Performance Notes

- All search functions use trigram indexes (fast fuzzy search)
- Composite ingredient expansion is done via materialized query (efficient)
- Auto-triggers for baking loss add minimal overhead
- Consider caching composite breakdowns for very large recipes

---

**You now have professional-grade baking features!** 🎉
