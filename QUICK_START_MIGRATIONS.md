# Quick Start: Database Migrations

## Prerequisites

- PostgreSQL 15+ installed and running
- `psql` command available in PATH
- `.env` file configured with DATABASE_URL

## Run Migrations

### Linux/macOS

```bash
chmod +x scripts/migrate-direct.sh
./scripts/migrate-direct.sh
```

### Windows (PowerShell)

```powershell
.\scripts\migrate-direct.ps1
```

### Manual (Any Platform)

```bash
psql postgresql://aibake_user:aibakepassword@localhost:5432/aibake_db < database/01_schema_init.sql
psql postgresql://aibake_user:aibakepassword@localhost:5432/aibake_db < database/02_seed_data.sql
psql postgresql://aibake_user:aibakepassword@localhost:5432/aibake_db < database/02b_seed_ingredient_aliases.sql
psql postgresql://aibake_user:aibakepassword@localhost:5432/aibake_db < database/03_test_data.sql
psql postgresql://aibake_user:aibakepassword@localhost:5432/aibake_db < database/04_mvp_inventory.sql
psql postgresql://aibake_user:aibakepassword@localhost:5432/aibake_db < database/04_reference_data.sql
psql postgresql://aibake_user:aibakepassword@localhost:5432/aibake_db < database/05_mvp_costing.sql
psql postgresql://aibake_user:aibakepassword@localhost:5432/aibake_db < database/06_mvp_advanced_recipe_fields.sql
```

## Verify Migrations

### Linux/macOS

```bash
chmod +x scripts/validate-direct.sh
./scripts/validate-direct.sh
```

### Manual Verification

```bash
psql postgresql://aibake_user:aibakepassword@localhost:5432/aibake_db

# Check tables
SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';

# Check ingredients
SELECT COUNT(*) FROM ingredient_master;

# Check migrations
SELECT * FROM schema_migrations;
```

## Expected Results

- ✅ 24 tables created
- ✅ 8 ENUM types defined
- ✅ 50+ indexes created
- ✅ 70+ ingredients loaded
- ✅ 10+ common issues loaded
- ✅ 5+ water activity references loaded

## Troubleshooting

**Connection failed?**
- Verify PostgreSQL is running
- Check DATABASE_URL in .env
- Test: `psql postgresql://aibake_user:aibakepassword@localhost:5432/aibake_db`

**Migration failed?**
- Check PostgreSQL logs
- Verify migration files exist in `database/` directory
- Try running migrations manually

**Already applied?**
- This is normal - migrations are idempotent
- Safe to re-run

## Next Steps

1. ✅ Database layer complete
2. → Backend setup (Phase 6)
3. → Middleware layer (Phase 7)
4. → Frontend application (Phase 8)

See [DATABASE_LAYER_CHECKPOINT.md](./DATABASE_LAYER_CHECKPOINT.md) for full details.
