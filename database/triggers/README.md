# AiBake Database Triggers

This directory contains all database trigger definitions for the AiBake system. Triggers are used to automatically enforce business rules and maintain data integrity at the database level.

## Trigger Files

### 1. baking_loss.sql
**Purpose**: Automatically calculate baking loss metrics when journal entries are created or updated.

**Triggers**:
- `calculate_baking_loss_on_insert`: Calculates baking loss when a new journal entry is created
- `calculate_baking_loss_on_update`: Recalculates baking loss when a journal entry is modified

**Function**: `calculate_baking_loss()`

**Behavior**:
- When both `pre_bake_weight_grams` and `outcome_weight_grams` are provided:
  - Calculates `baking_loss_grams = pre_bake_weight_grams - outcome_weight_grams`
  - Calculates `baking_loss_percentage = (baking_loss_grams / pre_bake_weight_grams) × 100`
- If either weight is NULL, clears the calculated fields
- Prevents division by zero errors

**Requirements**: 16.2

**Example**:
```sql
-- Insert a journal entry with pre-bake and outcome weights
INSERT INTO recipe_journal_entries (
  recipe_id, bake_date, pre_bake_weight_grams, outcome_weight_grams
) VALUES (
  'recipe-uuid', '2024-01-15', 500, 425
);

-- Trigger automatically calculates:
-- baking_loss_grams = 75
-- baking_loss_percentage = 15.0
```

---

### 2. updated_at.sql
**Purpose**: Automatically update `updated_at` timestamps when records are modified.

**Base Function**: `update_timestamp()` (created in 01_schema_init.sql)

**Triggers**:
- `update_recipes_timestamp`: Updates recipes.updated_at on modification
- `update_recipe_ingredients_timestamp`: Updates recipe_ingredients.updated_at on modification
- `cascade_recipe_update_on_ingredient_insert`: Updates parent recipe when ingredient is added
- `cascade_recipe_update_on_ingredient_update`: Updates parent recipe when ingredient is modified
- `cascade_recipe_update_on_ingredient_delete`: Updates parent recipe when ingredient is removed

**Functions**:
- `update_timestamp()`: Sets updated_at to NOW()
- `cascade_recipe_update_on_ingredient_change()`: Cascades updates to parent recipe

**Behavior**:
- Direct updates: Automatically set updated_at to current timestamp
- Cascading updates: When recipe_ingredients change, also update the parent recipe's updated_at
- Ensures recipe reflects all ingredient modifications

**Requirements**: 48.5

**Example**:
```sql
-- Update a recipe
UPDATE recipes SET title = 'New Title' WHERE id = 'recipe-uuid';
-- Trigger automatically sets updated_at = NOW()

-- Add an ingredient to a recipe
INSERT INTO recipe_ingredients (recipe_id, ...) VALUES ('recipe-uuid', ...);
-- Trigger automatically updates recipes.updated_at for the parent recipe
```

---

### 3. composite_ingredient_validation.sql
**Purpose**: Validate that composite ingredient components sum to exactly 100%.

**Triggers**:
- `validate_composite_percentages_on_insert`: Validates when adding a new component
- `validate_composite_percentages_on_update`: Validates when modifying a component
- `validate_composite_percentages_on_delete`: Validates when removing a component

**Functions**:
- `validate_composite_ingredient_percentages()`: Main validation function
- `check_composite_ingredient_validity(UUID)`: Helper to manually check a composite
- `validate_all_composite_ingredients()`: Helper to check all composites

**Behavior**:
- Prevents invalid composite ingredients from being created or modified
- Raises an exception if component percentages don't sum to 100%
- Provides helper functions for manual validation and auditing

**Requirements**: 18.3

**Example**:
```sql
-- Try to add components that don't sum to 100%
INSERT INTO composite_ingredient_components (
  composite_ingredient_id, component_ingredient_id, percentage
) VALUES ('composite-uuid', 'ingredient-uuid', 60);

-- Trigger raises exception:
-- ERROR: Composite ingredient components must sum to 100%. Current total: 60.00

-- Check validity of a composite ingredient
SELECT * FROM check_composite_ingredient_validity('composite-uuid');

-- Validate all composite ingredients
SELECT * FROM validate_all_composite_ingredients();
```

---

## Execution Order

When setting up the database, execute triggers in this order:

1. **01_schema_init.sql** - Creates base tables and `update_timestamp()` function
2. **06_mvp_advanced_recipe_fields.sql** - Adds advanced columns to recipes and journal_entries
3. **baking_loss.sql** - Creates baking loss calculation triggers
4. **updated_at.sql** - Verifies/creates cascading update triggers
5. **composite_ingredient_validation.sql** - Creates composite ingredient validation triggers

## Testing Triggers

### Test Baking Loss Calculation
```sql
-- Create a test journal entry
INSERT INTO recipe_journal_entries (
  recipe_id, bake_date, pre_bake_weight_grams, outcome_weight_grams
) VALUES (
  (SELECT id FROM recipes LIMIT 1),
  CURRENT_DATE,
  1000,
  850
);

-- Verify calculation
SELECT 
  pre_bake_weight_grams,
  outcome_weight_grams,
  baking_loss_grams,
  baking_loss_percentage
FROM recipe_journal_entries
WHERE pre_bake_weight_grams = 1000;
-- Expected: baking_loss_grams = 150, baking_loss_percentage = 15.0
```

### Test Updated_at Cascading
```sql
-- Get current recipe updated_at
SELECT updated_at FROM recipes WHERE id = 'recipe-uuid';

-- Add an ingredient
INSERT INTO recipe_ingredients (recipe_id, ...) VALUES ('recipe-uuid', ...);

-- Check that recipe updated_at changed
SELECT updated_at FROM recipes WHERE id = 'recipe-uuid';
-- Should be more recent than before
```

### Test Composite Ingredient Validation
```sql
-- Try to create invalid composite (components don't sum to 100%)
INSERT INTO composite_ingredient_components (
  composite_ingredient_id, component_ingredient_id, percentage
) VALUES ('composite-uuid', 'ingredient-uuid', 75);
-- Trigger will raise exception

-- Create valid composite (components sum to 100%)
INSERT INTO composite_ingredient_components (
  composite_ingredient_id, component_ingredient_id, percentage
) VALUES 
  ('composite-uuid', 'ingredient-1', 60),
  ('composite-uuid', 'ingredient-2', 40);
-- Success - components sum to 100%
```

## Monitoring Triggers

### List All Triggers
```sql
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;
```

### List Trigger Functions
```sql
SELECT 
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_type = 'FUNCTION'
  AND routine_name LIKE '%trigger%' OR routine_name LIKE '%calculate%' OR routine_name LIKE '%validate%'
ORDER BY routine_name;
```

### Check Trigger Performance
```sql
-- Triggers are typically very fast, but you can monitor with:
EXPLAIN ANALYZE
INSERT INTO recipe_journal_entries (
  recipe_id, bake_date, pre_bake_weight_grams, outcome_weight_grams
) VALUES (
  'recipe-uuid', CURRENT_DATE, 1000, 850
);
```

## Troubleshooting

### Composite Ingredient Validation Fails
**Problem**: "Composite ingredient components must sum to 100%"

**Solution**: 
1. Check current percentages: `SELECT * FROM check_composite_ingredient_validity('composite-uuid')`
2. Adjust component percentages to sum to exactly 100%
3. Retry the operation

### Updated_at Not Cascading
**Problem**: Parent recipe's updated_at doesn't change when ingredients are modified

**Solution**:
1. Verify cascading triggers exist: `SELECT * FROM information_schema.triggers WHERE trigger_name LIKE 'cascade%'`
2. Check trigger is enabled: `ALTER TABLE recipe_ingredients ENABLE TRIGGER cascade_recipe_update_on_ingredient_update`
3. Manually update recipe: `UPDATE recipes SET updated_at = NOW() WHERE id = 'recipe-uuid'`

### Baking Loss Not Calculating
**Problem**: baking_loss_grams and baking_loss_percentage remain NULL

**Solution**:
1. Verify both pre_bake_weight_grams and outcome_weight_grams are provided
2. Check that pre_bake_weight_grams > 0 (to avoid division by zero)
3. Verify trigger exists: `SELECT * FROM information_schema.triggers WHERE trigger_name LIKE 'calculate_baking_loss%'`

## Performance Considerations

- **Baking Loss Trigger**: O(1) - Simple arithmetic calculation
- **Updated_at Trigger**: O(1) - Single timestamp update
- **Composite Validation Trigger**: O(n) where n = number of components - Sums all percentages
- **Cascading Updates**: O(1) - Single parent record update

All triggers are designed to be fast and have minimal performance impact.

## Requirements Mapping

| Trigger | Requirement | Description |
|---------|-------------|-------------|
| calculate_baking_loss | 16.2 | Auto-calculate baking loss when weights are set |
| update_recipes_timestamp | 48.5 | Update recipes.updated_at on modification |
| update_recipe_ingredients_timestamp | 48.5 | Update recipe_ingredients.updated_at on modification |
| cascade_recipe_update_on_ingredient_* | 48.5 | Cascade updates to parent recipe |
| validate_composite_percentages_* | 18.3 | Validate component percentages sum to 100 |
