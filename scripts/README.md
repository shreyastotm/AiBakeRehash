# AiBake Database Scripts

This directory contains utility scripts for managing the AiBake database, including migration management, validation, and maintenance tasks.

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 15+ running and accessible
- `.env` file configured with `DATABASE_URL`

### Installation

```bash
cd scripts
npm install
```

## Available Scripts

### 1. Database Migrations

Run all pending database migrations:

```bash
npm run migrate
```

**What it does:**
- Connects to PostgreSQL database
- Initializes `schema_migrations` tracking table
- Executes all pending migration files in order
- Tracks each migration in the database
- Validates successful execution

**Output:**
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
    ...

✅ Database migrations completed successfully!
```

### 2. Rollback Last Migration

Roll back the most recently applied migration:

```bash
npm run rollback
```

**What it does:**
- Connects to PostgreSQL database
- Identifies the last applied migration
- Executes the corresponding rollback script
- Removes the migration from tracking
- Validates the rollback

**⚠️ Warning:** This is destructive and cannot be undone without re-running migrations.

### 3. Database Validation

Validate the current database schema and data:

```bash
npm run validate
```

**What it does:**
- Connects to PostgreSQL database
- Counts tables, indexes, ENUM types, functions, and triggers
- Counts data in each table
- Lists all applied migrations
- Generates a comprehensive validation report

**Output:**
```
📊 AiBake Database Validation Report
════════════════════════════════════════════════════════

📋 Schema Objects
────────────────────────────────────────────────────────
Tables:     28
Indexes:    52
ENUM Types: 8
Functions:  5
Triggers:   9

📦 Tables
────────────────────────────────────────────────────────
  users                              0 rows  1 indexes
  ingredient_master                 70 rows  4 indexes
  recipes                            0 rows  5 indexes
  ...

🔄 Migrations
────────────────────────────────────────────────────────
Applied: 8

  01    schema_init                   2024-01-15T10:30:00.000Z
  02    seed_data                     2024-01-15T10:30:15.000Z
  ...

🔍 Validation Results
────────────────────────────────────────────────────────

  Foreign Keys: 24/24 valid
  ✅ All foreign keys valid

  Foreign Key Indexes: 0 missing
  ✅ All foreign key columns indexed

  ENUM Types: 0 issues
  ✅ All ENUM types consistent

✅ Validation complete
```

**Additional Features:**
- Validates foreign key relationships and detects orphaned records
- Checks for missing indexes on foreign key columns
- Validates ENUM type usage consistency
- Generates schema documentation saved to `docs/database/schema.md`

### 4. Database Backup

Create full database backup with compression and integrity validation:

```bash
./backup.sh
```

**What it does:**
- Creates full database dump using pg_dump
- Compresses with gzip (~70% reduction)
- Calculates MD5 checksum for integrity
- Validates backup after creation
- Cleans up old backups based on retention policy

**Options:**
```bash
./backup.sh --output /backups/aibake    # Custom output directory
./backup.sh --retention 60              # Keep backups for 60 days
./backup.sh --validate                  # Validate backup after creation
./backup.sh --no-compress               # Create uncompressed backup
```

**Output:**
```
✓ Database connection successful
ℹ Database size: 125MB
✓ Backup created successfully (45s)
ℹ Backup file size: 35MB
✓ Checksum: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
✓ Compression complete (12s)
ℹ Compressed size: 10MB (71% reduction)
✓ Backup completed successfully!
```

### 5. Incremental Backup (WAL Archiving)

Setup and manage WAL archiving for point-in-time recovery:

```bash
./backup-incremental.sh --setup
```

**What it does:**
- Initializes WAL archive directory
- Creates archive and restore scripts
- Generates setup guide for PostgreSQL configuration

**Commands:**
```bash
./backup-incremental.sh --setup      # Initialize WAL archiving
./backup-incremental.sh --archive    # Archive WAL files
./backup-incremental.sh --cleanup    # Clean old WAL files
./backup-incremental.sh --status     # Show archiving status
```

### 6. Database Restore

Restore database from backup files with integrity verification:

```bash
./restore.sh --backup aibake_backup_20240115_100000.sql.gz
```

**What it does:**
- Validates backup integrity (checksum, gzip)
- Tests database connection
- Restores database from backup
- Validates restored data

**Commands:**
```bash
./restore.sh --backup <file>         # Restore from backup
./restore.sh --list                  # List available backups
./restore.sh --validate              # Validate backup before restore
./restore.sh --no-validate           # Skip validation
./restore.sh --pitr --time "2024-01-15 12:00:00"  # Point-in-time recovery
```

### 7. Comprehensive Database Check

Run comprehensive database validation checks:

```bash
npm run check
```

**What it does:**
- Verifies all required tables exist (24 tables)
- Verifies all required ENUM types exist (8 types)
- Verifies all required indexes exist
- Verifies foreign key constraints are defined
- Verifies seed data is loaded (70+ ingredients, 10+ issues)
- Verifies database functions exist (5 functions)
- Verifies database triggers exist (3+ triggers)
- Checks for orphaned foreign key records

**Output:**
```
🔍 Running comprehensive database checks...

📋 Database Check Results
══════════════════════════════════════════════════════════════════════

✅ Required Tables
   All 24 required tables exist

✅ Required ENUM Types
   All 8 required ENUM types exist

⚠️  Required Indexes
   Missing 2 recommended indexes
   • inventory_items.expiration_date
   • recipe_costs.recipe_id

✅ Foreign Key Constraints
   24 foreign key constraints defined

✅ Seed Data
   Seed data validation: complete
   ✓ 70 ingredients loaded
   ✓ 10 common issues loaded
   ✓ 5 water activity references loaded

✅ Database Functions
   All 5 required functions exist

✅ Database Triggers
   3 triggers defined

✅ Orphaned Records
   No orphaned foreign key records found

══════════════════════════════════════════════════════════════════════
Summary: 8 passed, 1 warnings, 0 failed
══════════════════════════════════════════════════════════════════════
```

## Backup and Recovery Scripts

The AiBake system includes comprehensive backup and recovery scripts:

### Backup Scripts

- **`backup.sh`** - Full database backup with compression and integrity validation
- **`backup-incremental.sh`** - WAL archiving for point-in-time recovery (PITR)
- **`restore.sh`** - Restore from backup files with validation
- **`BACKUP_GUIDE.md`** - Complete backup and recovery documentation

### Quick Backup Commands

```bash
# Create full backup
./backup.sh

# Setup WAL archiving
./backup-incremental.sh --setup

# List available backups
./restore.sh --list

# Restore from backup
./restore.sh --backup aibake_backup_20240115_100000.sql.gz

# Point-in-time recovery
./restore.sh --pitr --time "2024-01-15 12:00:00"
```

### Backup Features

- ✅ Full database dumps with timestamp
- ✅ Automatic compression (gzip, ~70% reduction)
- ✅ MD5 checksum integrity validation
- ✅ WAL archiving for point-in-time recovery
- ✅ Automated cleanup based on retention policy
- ✅ Detailed logging and validation
- ✅ Support for Docker Compose and direct PostgreSQL connections

### For Complete Documentation

See [BACKUP_GUIDE.md](./BACKUP_GUIDE.md) for:
- Full backup procedures
- WAL archiving setup
- Point-in-time recovery (PITR)
- Disaster recovery planning
- Troubleshooting and monitoring
- Performance and security considerations

## Migration Files

Migration files are located in the `database/` directory and are executed in numeric order:

```
database/
├── 01_schema_init.sql              # Core schema (28 tables, 8 ENUMs)
├── 02_seed_data.sql                # 70+ ingredients
├── 02b_seed_ingredient_aliases.sql # Ingredient aliases
├── 03_test_data.sql                # Sample data for development
├── 04_mvp_inventory.sql            # Inventory management
├── 04_reference_data.sql           # Common issues, water activity
├── 05_mvp_costing.sql              # Costing and pricing
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

## Configuration

### Environment Variables

The scripts use the following environment variables from `.env`:

```env
# Database connection
DATABASE_URL=postgresql://aibake_user:aibakepassword@localhost:5432/aibake_db

# Optional: Connection pool settings
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=20
```

### Database Connection

The scripts connect to PostgreSQL using the `DATABASE_URL` environment variable. Ensure your database is running:

```bash
# Using Docker Compose
docker-compose up -d postgres

# Or connect to an existing PostgreSQL instance
# Update DATABASE_URL in .env
```

## Workflow Examples

### Initial Setup

```bash
# 1. Start database services
docker-compose up -d postgres

# 2. Install dependencies
npm install

# 3. Run all migrations
npm run migrate

# 4. Validate the setup
npm run validate
```

### Development Workflow

```bash
# 1. Make changes to migration files
# 2. Run migrations
npm run migrate

# 3. Test your changes
# 4. If needed, rollback
npm run rollback

# 5. Fix and re-run
npm run migrate
```

### Production Deployment

```bash
# 1. Backup database
./backup.sh --output /backups/aibake

# 2. Run migrations
npm run migrate

# 3. Validate
npm run validate

# 4. Monitor application
# If issues occur, restore from backup
./restore.sh --backup aibake_backup_20240115_100000.sql.gz
```

### Backup and Recovery Workflow

```bash
# 1. Create full backup
./backup.sh --output /backups/aibake

# 2. Setup WAL archiving for PITR
./backup-incremental.sh --setup

# 3. Configure PostgreSQL for WAL archiving
# Edit postgresql.conf and restart

# 4. Monitor archiving status
./backup-incremental.sh --status

# 5. Test restore procedure monthly
./restore.sh --list
./restore.sh --backup aibake_backup_20240115_100000.sql.gz --validate

# 6. Test point-in-time recovery
./restore.sh --pitr --time "2024-01-15 12:00:00"
```

## Creating New Migrations

### Step 1: Create Migration File

Create a new SQL file in `database/` with the next version number:

```bash
# Create migration file
touch database/07_new_feature.sql
```

### Step 2: Write Migration SQL

```sql
-- database/07_new_feature.sql
-- ============================================================================
-- Migration 07: Add new feature tables
-- ============================================================================

CREATE TABLE new_feature (
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

### Step 3: Create Rollback Script

```bash
# Create rollback file
touch database/rollback/07_rollback.sql
```

### Step 4: Write Rollback SQL

```sql
-- database/rollback/07_rollback.sql
-- ============================================================================
-- Rollback for Migration 07: Remove new feature tables
-- ============================================================================

DROP TABLE IF EXISTS new_feature CASCADE;

-- ============================================================================
-- Rollback complete
-- ============================================================================
```

### Step 5: Run Migration

```bash
npm run migrate
```

## Best Practices

### Migration Design

1. **Idempotency**: Use `IF NOT EXISTS` and `IF EXISTS` clauses
   ```sql
   CREATE TABLE IF NOT EXISTS users (...);
   DROP TABLE IF EXISTS old_table;
   ```

2. **Transactions**: PostgreSQL supports DDL transactions
   ```sql
   BEGIN;
   -- Your DDL statements
   COMMIT;
   ```

3. **Naming**: Use clear, descriptive names
   ```
   07_add_user_preferences.sql
   08_create_inventory_tables.sql
   ```

4. **Documentation**: Add comments explaining complex changes
   ```sql
   -- Add water activity tracking for shelf life prediction
   ALTER TABLE recipes ADD COLUMN target_water_activity NUMERIC(3,2);
   ```

### Rollback Design

1. **Reverse Operations**: Rollback should undo the migration exactly
   ```sql
   -- Migration: CREATE TABLE
   -- Rollback: DROP TABLE
   ```

2. **Cascade Handling**: Consider foreign key constraints
   ```sql
   DROP TABLE IF EXISTS dependent_table CASCADE;
   DROP TABLE IF EXISTS parent_table CASCADE;
   ```

3. **Data Preservation**: Consider backing up data before destructive operations
   ```sql
   -- Backup data before dropping
   CREATE TABLE table_backup AS SELECT * FROM table;
   DROP TABLE table;
   ```

## Troubleshooting

### Connection Issues

```bash
# Test database connection
psql $DATABASE_URL

# Check if PostgreSQL is running
docker-compose ps postgres

# View PostgreSQL logs
docker-compose logs postgres
```

### Migration Failures

```bash
# Check applied migrations
psql $DATABASE_URL -c "SELECT * FROM schema_migrations;"

# Check for syntax errors in migration file
psql $DATABASE_URL -f database/07_new_feature.sql

# Manually fix and re-run
npm run migrate
```

### Rollback Issues

```bash
# Verify rollback script exists
ls database/rollback/

# Check rollback SQL syntax
psql $DATABASE_URL -f database/rollback/07_rollback.sql

# Manually fix and re-run
npm run rollback
```

## Performance Considerations

- Migrations run sequentially to maintain consistency
- Large data migrations may take time (consider maintenance windows)
- Indexes are created after table population for better performance
- Connection pooling manages database connections efficiently

## Integration with CI/CD

### GitHub Actions

```yaml
name: Database Migrations

on:
  push:
    branches: [main]
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
      
      - name: Validate
        env:
          DATABASE_URL: postgresql://aibake_user:aibakepassword@localhost:5432/aibake_db
        run: cd scripts && npm run validate
```

## Support

For issues or questions:

1. Check this README
2. Review migration SQL files
3. Check PostgreSQL logs: `docker-compose logs postgres`
4. Verify database connectivity: `psql $DATABASE_URL`
5. Review the MIGRATIONS.md file for detailed documentation

## Related Documentation

- [MIGRATIONS.md](./MIGRATIONS.md) - Detailed migration system documentation
- [../database/](../database/) - Migration files
- [../.env.example](../.env.example) - Environment configuration template
