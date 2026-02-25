# Direct PostgreSQL Migration Guide

This guide explains how to run AiBake database migrations directly using `psql` without Docker or Node.js.

## Prerequisites

- PostgreSQL 15+ installed and running
- `psql` command-line tool available in your PATH
- `.env` file configured with `DATABASE_URL`
- Bash shell (Linux/macOS) or PowerShell (Windows)

## Quick Start

### Linux/macOS

```bash
# Make script executable
chmod +x scripts/migrate-direct.sh

# Run migrations
./scripts/migrate-direct.sh

# Validate database
./scripts/validate-direct.sh
```

### Windows (PowerShell)

```powershell
# Run migrations
.\scripts\migrate-direct.ps1

# Validate database
# (Use validate-direct.sh with WSL or Git Bash)
```

## What Gets Executed

The migration script runs the following migrations in order:

1. **01_schema_init.sql** - Core schema with 24 tables, 8 ENUM types, extensions
2. **02_seed_data.sql** - 70+ common baking ingredients with nutrition data
3. **02b_seed_ingredient_aliases.sql** - Ingredient aliases and regional variations
4. **03_test_data.sql** - Sample users, recipes, and journal entries
5. **04_mvp_inventory.sql** - Inventory management tables
6. **04_reference_data.sql** - Common issues and water activity references
7. **05_mvp_costing.sql** - Costing and pricing tables
8. **06_mvp_advanced_recipe_fields.sql** - Advanced recipe features

## Database Connection

The scripts extract connection details from your `.env` file:

```env
DATABASE_URL=postgresql://aibake_user:aibakepassword@localhost:5432/aibake_db
```

Connection string format:
```
postgresql://[user]:[password]@[host]:[port]/[database]
```

## Migration Tracking

Migrations are tracked in the `schema_migrations` table:

```sql
CREATE TABLE schema_migrations (
  id SERIAL PRIMARY KEY,
  version TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  applied_at TIMESTAMP DEFAULT NOW()
);
```

This ensures:
- Each migration runs only once
- Migrations can be safely re-run (idempotent)
- Migration history is preserved

## Validation

After migrations complete, the script validates:

### Tables (24 total)
- ✓ Core tables: users, ingredient_master, recipes
- ✓ Recipe management: recipe_ingredients, recipe_sections, recipe_steps
- ✓ Versioning: recipe_versions, recipe_version_snapshots
- ✓ Journal: recipe_journal_entries, recipe_audio_notes
- ✓ Advanced: ingredient_substitutions, timer_instances, recipe_nutrition_cache
- ✓ Reference: common_issues, water_activity_reference
- ✓ Aliases: ingredient_aliases, composite_ingredients, composite_ingredient_components
- ✓ Inventory: inventory_items, inventory_purchases, suppliers
- ✓ Costing: recipe_costs, packaging_items, delivery_zones

### ENUM Types (8 total)
- recipe_source_type (manual, image, whatsapp, url)
- recipe_status (draft, active, archived)
- unit_system (metric, cups, hybrid, bakers_percent)
- section_type (pre_prep, prep, bake, rest, notes)
- ingredient_category (flour, fat, sugar, leavening, dairy, liquid, fruit, nut, spice, other)
- timer_status (running, paused, completed, cancelled)
- substitution_moisture_impact (increase, decrease, neutral)
- substitution_structural_impact (stronger, weaker, neutral)

### Indexes (50+)
- Foreign key indexes for performance
- Text search indexes on ingredient names
- Trigram indexes for fuzzy search
- Composite indexes for common queries

### Seed Data
- **70+ ingredients** with density and nutrition data
- **10+ common issues** with solutions
- **5+ water activity references** for shelf life prediction
- **50+ ingredient aliases** for search

### Database Functions (5 total)
- search_ingredient() - Fuzzy ingredient search
- get_recipe_ingredients_expanded() - Composite ingredient breakdown
- calculate_composite_nutrition() - Weighted nutrition calculation
- calculate_hydration_percentage() - Baker's percentage
- get_recipe_with_details() - Complete recipe retrieval

### Triggers (3+ total)
- Automatic baking loss calculation
- Timestamp auto-update
- Composite ingredient validation

## Troubleshooting

### Connection Failed

**Error:** `Failed to connect to database`

**Solution:**
1. Verify PostgreSQL is running
2. Check `.env` DATABASE_URL is correct
3. Test connection manually:
   ```bash
   psql postgresql://aibake_user:aibakepassword@localhost:5432/aibake_db
   ```

### Migration Failed

**Error:** `Failed to apply migration: XX_name`

**Solution:**
1. Check PostgreSQL logs for detailed error
2. Verify migration file exists: `database/XX_name.sql`
3. Check for syntax errors in migration file
4. Ensure previous migrations completed successfully

### Already Applied

**Message:** `Skipped XX_name: already applied`

**Explanation:** Migration was already run. This is normal and safe to ignore.

**To re-run migrations:**
1. Rollback using rollback scripts in `database/rollback/`
2. Or manually delete from schema_migrations table:
   ```sql
   DELETE FROM schema_migrations WHERE version = '01_schema_init';
   ```

## Manual Migration Execution

If scripts don't work, run migrations manually:

```bash
# Connect to database
psql postgresql://aibake_user:aibakepassword@localhost:5432/aibake_db

# Run migration file
\i database/01_schema_init.sql

# Record migration
INSERT INTO schema_migrations (version, name) VALUES ('01', 'schema_init');

# Repeat for each migration file
```

## Rollback Procedures

To rollback a migration:

```bash
# Rollback script (if available)
psql postgresql://aibake_user:aibakepassword@localhost:5432/aibake_db -f database/rollback/01_rollback.sql

# Remove from tracking
DELETE FROM schema_migrations WHERE version = '01_schema_init';
```

## Performance Considerations

- Migrations run sequentially to maintain consistency
- Large data migrations (seed data) may take 30-60 seconds
- Indexes are created after table population for better performance
- Connection pooling is not used in direct psql execution

## Verification Checklist

After running migrations, verify:

- [ ] All 24 tables created
- [ ] All 8 ENUM types defined
- [ ] 50+ indexes created
- [ ] 70+ ingredients loaded
- [ ] 10+ common issues loaded
- [ ] 5+ water activity references loaded
- [ ] 5 database functions created
- [ ] 3+ triggers created
- [ ] schema_migrations table populated with 8 entries

## Next Steps

After successful migration:

1. **Backend Setup** - Initialize Node.js backend with Express
2. **API Development** - Create REST endpoints for recipe management
3. **Frontend Setup** - Initialize React application
4. **Integration Testing** - Test API with database

## Related Documentation

- [MIGRATIONS.md](./MIGRATIONS.md) - Detailed migration system documentation
- [../database/](../../database/) - Migration files
- [../../.env.example](../../.env.example) - Environment configuration template
- [../../README.md](../../README.md) - Project overview

## Support

For issues:

1. Check PostgreSQL logs: `tail -f /var/log/postgresql/postgresql.log`
2. Verify database connection: `psql --version`
3. Check migration files exist: `ls database/*.sql`
4. Review this guide's troubleshooting section
