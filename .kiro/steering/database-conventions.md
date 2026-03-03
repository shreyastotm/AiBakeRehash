# Database Conventions

All database work in AiBake follows these conventions. They apply to migrations, functions, triggers, and all SQL files.

## Naming Conventions

| Entity | Convention | Example |
|--------|-----------|---------|
| Tables | `snake_case`, plural | `recipe_ingredients`, `inventory_items` |
| Columns | `snake_case` | `quantity_grams`, `user_id`, `created_at` |
| Primary keys | always `id UUID` | `id UUID PRIMARY KEY DEFAULT uuid_generate_v4()` |
| Foreign keys | `{referenced_table_singular}_id` | `recipe_id`, `user_id`, `ingredient_master_id` |
| Indexes | `idx_{table}_{column(s)}` | `idx_recipes_user_id` |
| Functions | `snake_case` verbs | `search_ingredient()`, `calculate_hydration()` |
| Triggers | `trg_{table}_{action}` | `trg_journal_entries_baking_loss` |
| ENUM types | `snake_case` | `recipe_status`, `ingredient_category` |
| Migrations | `NN_description.sql` | `05_add_packaging_tables.sql` |

## Required Columns on Every Table

Every table must have these three columns:
```sql
id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
created_at  TIMESTAMPTZ NOT NULL    DEFAULT NOW(),
updated_at  TIMESTAMPTZ NOT NULL    DEFAULT NOW()
```

An `updated_at` trigger is automatically applied via `trg_{table}_updated_at`.

## Canonical Data Storage Rules

### Quantities — Always Grams

All weight quantities are stored in grams. Volume quantities are stored in milliliters. Display units are stored separately for UI rendering.

```sql
-- ✅ Correct
quantity_grams       NUMERIC(10,3) NOT NULL,  -- canonical
quantity_original    NUMERIC(10,3) NOT NULL,  -- display value
unit_original        VARCHAR(20)   NOT NULL,  -- display unit (cups, tbsp, etc.)

-- ❌ Wrong — storing only display units
quantity_cups NUMERIC(10,3)
```

### Currency — INR

All monetary values use `NUMERIC(12,2)` type. Column comments must indicate INR.

```sql
cost_per_unit  NUMERIC(12,2) NOT NULL DEFAULT 0, -- INR
total_cost     NUMERIC(12,2) NOT NULL DEFAULT 0, -- INR
currency       VARCHAR(3)    NOT NULL DEFAULT 'INR'
```

### Timestamps — UTC

All timestamps are `TIMESTAMPTZ` (timestamp with time zone) stored in UTC. IST conversion happens in the application layer.

## Indexing Rules

**Every foreign key column must have an index:**
```sql
CREATE INDEX idx_recipes_user_id ON recipes(user_id);
CREATE INDEX idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);
```

**Frequently filtered columns** must also be indexed:
```sql
CREATE INDEX idx_recipes_status ON recipes(status);
CREATE INDEX idx_journal_entries_bake_date ON recipe_journal_entries(bake_date);
```

**Text search columns** use trigram indexes:
```sql
CREATE INDEX idx_ingredient_master_name_trgm ON ingredient_master USING gin(name gin_trgm_ops);
CREATE INDEX idx_recipes_title_trgm ON recipes USING gin(title gin_trgm_ops);
```

**Partial indexes** for common filters:
```sql
CREATE INDEX idx_recipes_active ON recipes(user_id, created_at) WHERE status = 'published';
CREATE INDEX idx_timers_running ON timer_instances(recipe_id) WHERE status = 'running';
```

## Migration Rules

1. **Sequential numbering**: migrations are numbered `01_`, `02_`, etc. New migrations must use the next number in sequence.
2. **Paired rollback**: every migration file in `database/migrations/` must have a corresponding rollback in `database/rollback/`.
3. **Idempotent where possible**: use `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`.
4. **No destructive changes without migration plan**: dropping columns or enum values requires a multi-step migration plan.
5. **Migration tracker**: the `schema_migrations` table records applied migrations — never delete records from it.

### Migration File Template
```sql
-- database/migrations/NN_description.sql
-- Description: What this migration does
-- Requirements: Req X.Y

BEGIN;

-- Your DDL here

COMMIT;
```

### Rollback File Template
```sql
-- database/rollback/NN_description_rollback.sql

BEGIN;

-- Undo the migration (DROP TABLE, DROP INDEX, etc.)

COMMIT;
```

## PostgreSQL Extensions Required

All three extensions must be enabled:
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";  -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- Encryption functions
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- Trigram fuzzy search
```

## Database Functions

Custom PostgreSQL functions in `database/functions/`:

| Function | Purpose |
|----------|---------|
| `search_ingredient(query TEXT)` | Fuzzy search using pg_trgm on names and aliases |
| `get_recipe_ingredients_expanded(recipe_id UUID)` | Composite ingredient expansion |
| `calculate_composite_nutrition(composite_id UUID)` | Weighted average nutrition |
| `calculate_hydration_percentage(recipe_id UUID)` | Water-to-flour ratio |
| `get_recipe_with_details(recipe_id UUID)` | Full recipe with all relations |

**Do not bypass these functions** in application code — they encapsulate data integrity logic.

## Constraints and Checks

```sql
-- Water activity must be 0.00 to 1.00
CHECK (target_water_activity BETWEEN 0.00 AND 1.00)

-- Positive weights
CHECK (outcome_weight_grams > 0)
CHECK (pre_bake_weight_grams > 0)

-- Composite components sum to 100%
-- Enforced via trigger: trg_composite_components_sum
```

## Connection Pooling

- Pool size: 20 connections per backend instance
- Connection timeout: 5 seconds
- Idle timeout: 30 seconds
- Implement retry with exponential backoff on connection failure

## Query Guidelines

- Always include `ORDER BY` on paginated queries (deterministic results)
- Always include `LIMIT` on queries that could return unbounded rows
- Use `EXPLAIN ANALYZE` to check query plans for new complex queries
- Prefer CTEs (`WITH`) over subqueries for readability on complex reports
