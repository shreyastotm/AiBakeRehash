# AiBake Database Migration System

This document describes the database migration management system for AiBake.

## Overview

The migration system provides version control for database schema changes, allowing safe deployment and rollback of database modifications.

### Key Components

1. **schema_migrations table**: Tracks all applied migrations
2. **migrate.ts**: Runs pending migrations in order
3. **rollback.ts**: Rolls back the last applied migration
4. **Migration files**: SQL files in `database/` directory (01_schema_init.sql, 02_seed_data.sql, etc.)
5. **Rollback files**: SQL files in `database/rollback/` directory for reverting migrations

## Migration Files

Migration files are named with a numeric prefix and underscore-separated name:

```
database/
├── 01_schema_init.sql           # Core schema with 15+ tables
├── 02_seed_data.sql             # 70+ ingredients
├── 02b_seed_ingredient_aliases.sql
├── 03_test_data.sql             # Sample data for development
├── 04_mvp_inventory.sql         # Inventory management tables
├── 04_reference_data.sql        # Common issues, water activity reference
├── 05_mvp_costing.sql           # Costing and pricing tables
├── 06_mvp_advanced_recipe_fields.sql
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

1. Ensure PostgreSQL is running and accessible
2. Set `DATABASE_URL` in `.env` file
3. Install dependencies: `npm install` in the scripts directory

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
5. Validate execution by counting tables, indexes, and data

### Output Example

```
🚀 Starting database migrations...

✓ schema_migrations table initialized
Found 6 migration(s)

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
    recipe_ingredients: 0 rows
    recipe_sections: 0 rows
    recipe_steps: 0 rows
    recipe_versions: 0 rows
    recipe_journal_entries: 0 rows
    common_issues: 10 rows
    water_activity_reference: 5 rows
    ingredient_aliases: 45 rows
    composite_ingredients: 0 rows

✅ Database migrations completed successfully!
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

2. Write your migration SQL (use `CREATE TABLE IF NOT EXISTS` for safety)

3. Create a corresponding rollback script:
   ```
   database/rollback/07_rollback.sql
   ```

4. Write the rollback SQL (reverse the changes)

5. Run migrations:
   ```bash
   npm run migrate
   ```

### Migration Best Practices

- Use `IF NOT EXISTS` and `IF EXISTS` clauses for idempotency
- Keep migrations focused on a single feature or change
- Always create rollback scripts
- Test migrations on a development database first
- Use transactions where possible (PostgreSQL supports DDL transactions)
- Document complex migrations with comments
- Avoid data migrations in schema migrations (use separate scripts)

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

## Database Schema Tracking

The `schema_migrations` table tracks all applied migrations:

```sql
SELECT * FROM schema_migrations ORDER BY version;

 id | version |           name            |         applied_at
----+---------+---------------------------+----------------------------
  1 | 01      | schema_init               | 2024-01-15 10:30:00
  2 | 02      | seed_data                 | 2024-01-15 10:30:15
  3 | 02b     | seed_ingredient_aliases   | 2024-01-15 10:30:20
  4 | 03      | test_data                 | 2024-01-15 10:30:25
  5 | 04      | mvp_inventory             | 2024-01-15 10:30:30
  6 | 04_ref  | reference_data            | 2024-01-15 10:30:35
  7 | 05      | mvp_costing               | 2024-01-15 10:30:40
  8 | 06      | mvp_advanced_recipe_fields| 2024-01-15 10:30:45
```

## Performance Considerations

- Migrations run sequentially to maintain consistency
- Large data migrations may take time (consider running during maintenance windows)
- Indexes are created after table population for better performance
- Connection pooling is used to manage database connections efficiently

## Support

For issues or questions about the migration system:

1. Check this documentation
2. Review migration SQL files for syntax
3. Check PostgreSQL logs: `docker-compose logs postgres`
4. Verify database connectivity and credentials
