# AiBake Database Schema Migrations

This document describes the schema migrations system for AiBake, which provides version control for database schema changes.

## Overview

The schema migrations system tracks all applied database changes, enabling safe deployment, rollback, and version control of database modifications.

## Schema Migrations Table

The `schema_migrations` table is created in `database/01_schema_init.sql` and tracks all applied migrations.

### Table Definition

```sql
CREATE TABLE schema_migrations (
  id SERIAL PRIMARY KEY,
  version TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  applied_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_schema_migrations_version ON schema_migrations(version);
```

### Columns

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Auto-incrementing primary key |
| `version` | TEXT | Migration version identifier (e.g., '01', '02', '02b', '03') |
| `name` | TEXT | Migration name (e.g., 'schema_init', 'seed_data', 'mvp_inventory') |
| `applied_at` | TIMESTAMP | Timestamp when the migration was applied (defaults to NOW()) |

### Indexes

- `idx_schema_migrations_version`: Unique index on `version` column for fast lookup

## Migration Files

Migration files are located in the `database/` directory and are executed in numeric order:

```
database/
├── 01_schema_init.sql              # Core schema (extensions, ENUMs, 19 tables, indexes, triggers)
├── 02_seed_data.sql                # 70+ ingredients with nutrition and density data
├── 02b_seed_ingredient_aliases.sql # Ingredient aliases (abbreviations, regional variations, Hindi)
├── 03_test_data.sql                # Sample data for development (users, recipes, journal entries)
├── 04_mvp_inventory.sql            # Inventory management (items, purchases, suppliers)
├── 04_reference_data.sql           # Reference data (common issues, water activity ranges)
├── 05_mvp_costing.sql              # Costing and pricing (recipe costs, packaging, delivery zones)
├── 06_mvp_advanced_recipe_fields.sql # Advanced fields (water activity, hydration, baking loss)
└── rollback/
    ├── 01_rollback.sql
    ├── 02_rollback.sql
    ├── 02b_rollback.sql
    ├── 03_rollback.sql
    ├── 04_rollback.sql
    ├── 04_reference_rollback.sql
    ├── 05_rollback.sql
    └── 06_rollback.sql
```

## Running Migrations

### Prerequisites

- Node.js 18+
- PostgreSQL 15+ running and accessible
- `.env` file configured with `DATABASE_URL`
- Dependencies installed: `npm install` in the scripts directory

### Run All Pending Migrations

```bash
cd scripts
npm run migrate
```

This will:
1. Connect to the database
2. Initialize the `schema_migrations` table if needed
3. Execute all pending migrations in order
4. Track each migration in `schema_migrations`
5. Validate successful execution

### Output Example

```
🚀 Starting database migrations...

✓ schema_migrations table initialized
Found 8 migration(s)

✓ Applied migration 01: schema_init
✓ Applied migration 02: seed_data
✓ Applied migration 02b: seed_ingredient_aliases
✓ Applied migration 03: test_data
✓ Applied migration 04: mvp_inventory
✓ Applied migration 04_reference_data: reference_data
✓ Applied migration 05: mvp_costing
✓ Applied migration 06: mvp_advanced_recipe_fields

✓ Applied 8 new migration(s)

📊 Validating migration execution...

✓ Validation Results:
  Tables created: 28
  Indexes created: 52

  Data counts:
    users: 0 rows
    ingredient_master: 70 rows
    recipes: 0 rows
    ...

✅ Database migrations completed successfully!
```

## Checking Applied Migrations

### View All Applied Migrations

```sql
SELECT version, name, applied_at 
FROM schema_migrations 
ORDER BY version;
```

### Example Output

```
 version |           name            |         applied_at
---------+---------------------------+----------------------------
 01      | schema_init               | 2024-01-15 10:30:00
 02      | seed_data                 | 2024-01-15 10:30:15
 02b     | seed_ingredient_aliases   | 2024-01-15 10:30:20
 03      | test_data                 | 2024-01-15 10:30:25
 04      | mvp_inventory             | 2024-01-15 10:30:30
 04_ref  | reference_data            | 2024-01-15 10:30:35
 05      | mvp_costing               | 2024-01-15 10:30:40
 06      | mvp_advanced_recipe_fields| 2024-01-15 10:30:45
```

## Rolling Back Migrations

### Rollback Last Migration

```bash
cd scripts
npm run rollback
```

This will:
1. Connect to the database
2. Find the last applied migration
3. Execute the corresponding rollback script
4. Remove the migration from `schema_migrations`
5. Validate the rollback

### Important Notes

- Only the last migration can be rolled back at a time
- Rollback scripts must exist for each migration
- Rollback is destructive and cannot be undone without re-running migrations
- Always backup your database before rolling back in production

## Creating New Migrations

### Steps to Create a New Migration

1. Create a new SQL file in the `database/` directory with the next version number:
   ```
   database/07_new_feature.sql
   ```

2. Write your migration SQL (use `CREATE TABLE IF NOT EXISTS` for safety):
   ```sql
   -- ============================================================================
   -- Migration 07: Add new feature tables
   -- ============================================================================

   CREATE TABLE IF NOT EXISTS new_feature (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     name TEXT NOT NULL,
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW()
   );

   CREATE INDEX idx_new_feature_user ON new_feature(user_id);

   -- ============================================================================
   -- Migration complete
   -- ============================================================================
   ```

3. Create a corresponding rollback script:
   ```
   database/rollback/07_rollback.sql
   ```

4. Write the rollback SQL (reverse the changes):
   ```sql
   -- ============================================================================
   -- Rollback for Migration 07: Remove new feature tables
   -- ============================================================================

   DROP TABLE IF EXISTS new_feature CASCADE;

   -- ============================================================================
   -- Rollback complete
   -- ============================================================================
   ```

5. Run migrations:
   ```bash
   npm run migrate
   ```

## Migration Best Practices

### Idempotency

Use `IF NOT EXISTS` and `IF EXISTS` clauses to make migrations safe to re-run:

```sql
CREATE TABLE IF NOT EXISTS users (...);
DROP TABLE IF EXISTS old_table;
```

### Transactions

PostgreSQL supports DDL transactions, so migrations are atomic:

```sql
BEGIN;
  CREATE TABLE new_table (...);
  CREATE INDEX idx_new_table ON new_table(...);
COMMIT;
```

### Naming

Use clear, descriptive names for migration files:

```
07_add_user_preferences.sql
08_create_inventory_tables.sql
09_add_water_activity_tracking.sql
```

### Documentation

Add comments explaining complex changes:

```sql
-- Add water activity tracking for shelf life prediction
ALTER TABLE recipes ADD COLUMN target_water_activity NUMERIC(3,2);
ALTER TABLE recipes ADD COLUMN min_safe_water_activity NUMERIC(3,2);
```

### Rollback Design

Rollback scripts should exactly undo the migration:

```sql
-- Migration: CREATE TABLE
-- Rollback: DROP TABLE

-- Migration: ALTER TABLE ADD COLUMN
-- Rollback: ALTER TABLE DROP COLUMN

-- Migration: CREATE INDEX
-- Rollback: DROP INDEX
```

### Data Preservation

Consider backing up data before destructive operations:

```sql
-- Backup data before dropping
CREATE TABLE table_backup AS SELECT * FROM table;
DROP TABLE table;
```

## Validation

The migration system validates successful execution by checking:

1. **Table Count**: Verifies expected number of tables were created
2. **Index Count**: Verifies indexes were created for performance
3. **Data Count**: Verifies seed data was loaded correctly

### Validation Queries

```sql
-- Count tables
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

-- Count indexes
SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public';

-- Count data in specific tables
SELECT COUNT(*) FROM ingredient_master;
SELECT COUNT(*) FROM common_issues;
```

## Troubleshooting

### Migration Fails

1. Check database connectivity: `psql $DATABASE_URL`
2. Review error message for SQL syntax issues
3. Check if migration was partially applied: `SELECT * FROM schema_migrations`
4. Fix the SQL and re-run: `npm run migrate`

### Rollback Fails

1. Ensure rollback script exists: `ls database/rollback/`
2. Check rollback SQL for syntax errors
3. Verify database state before rollback
4. Contact database administrator if data loss occurred

### Schema Migrations Table Issues

If the `schema_migrations` table is corrupted:

```sql
-- Recreate the table
DROP TABLE IF EXISTS schema_migrations;

CREATE TABLE schema_migrations (
  id SERIAL PRIMARY KEY,
  version TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  applied_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_schema_migrations_version ON schema_migrations(version);

-- Manually record applied migrations
INSERT INTO schema_migrations (version, name) VALUES ('01', 'schema_init');
INSERT INTO schema_migrations (version, name) VALUES ('02', 'seed_data');
-- ... etc
```

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Database Migrations

on:
  push:
    branches: [main, develop]
    paths:
      - 'database/**'
      - 'scripts/**'

jobs:
  migrate:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: aibake_user
          POSTGRES_PASSWORD: aibakepassword
          POSTGRES_DB: aibake_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: cd scripts && npm install
      
      - name: Run migrations
        env:
          DATABASE_URL: postgresql://aibake_user:aibakepassword@localhost:5432/aibake_db
        run: cd scripts && npm run migrate
```

## Performance Considerations

- Migrations run sequentially to maintain consistency
- Large data migrations may take time (consider running during maintenance windows)
- Indexes are created after table population for better performance
- Connection pooling is used to manage database connections efficiently

## Related Documentation

- [Database Functions](functions.md) - Custom PostgreSQL functions
- [Database Triggers](triggers.md) - Automatic triggers for data consistency
- [Backup and Recovery](../scripts/BACKUP_GUIDE.md) - Backup and restore procedures
- [Migration Scripts](../scripts/MIGRATIONS.md) - Detailed migration system documentation

