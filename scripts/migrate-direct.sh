#!/bin/bash

# ============================================================================
# AiBake Direct PostgreSQL Migration Script
# ============================================================================
# This script runs all database migrations directly using psql
# without requiring Node.js or Docker
#
# Usage: ./migrate-direct.sh
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '#' | xargs)
else
    echo -e "${RED}✗ .env file not found${NC}"
    exit 1
fi

# Extract database connection details from DATABASE_URL
# Format: postgresql://user:password@host:port/database
DB_URL=$DATABASE_URL
DB_USER=$(echo $DB_URL | sed -n 's/.*:\/\/\([^:]*\).*/\1/p')
DB_PASSWORD=$(echo $DB_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\).*/\1/p')
DB_HOST=$(echo $DB_URL | sed -n 's/.*@\([^:]*\).*/\1/p')
DB_PORT=$(echo $DB_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DB_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

# Set default port if not specified
DB_PORT=${DB_PORT:-5432}

echo -e "${BLUE}🚀 Starting AiBake Database Migrations${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo "Database: $DB_NAME"
echo "Host: $DB_HOST:$DB_PORT"
echo "User: $DB_USER"
echo ""

# Test database connection
echo -e "${YELLOW}Testing database connection...${NC}"
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1" > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Failed to connect to database${NC}"
    echo "Connection string: postgresql://$DB_USER:***@$DB_HOST:$DB_PORT/$DB_NAME"
    exit 1
fi
echo -e "${GREEN}✓ Database connection successful${NC}"
echo ""

# Create schema_migrations table if it doesn't exist
echo -e "${YELLOW}Initializing schema_migrations table...${NC}"
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << 'EOF' > /dev/null 2>&1
CREATE TABLE IF NOT EXISTS schema_migrations (
  id SERIAL PRIMARY KEY,
  version TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  applied_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_schema_migrations_version ON schema_migrations(version);
EOF
echo -e "${GREEN}✓ schema_migrations table initialized${NC}"
echo ""

# Array of migration files in order
MIGRATIONS=(
    "01_schema_init"
    "02_seed_data"
    "02b_seed_ingredient_aliases"
    "03_test_data"
    "04_mvp_inventory"
    "04_reference_data"
    "05_mvp_costing"
    "06_mvp_advanced_recipe_fields"
)

# Track applied migrations
APPLIED_MIGRATIONS=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT version FROM schema_migrations ORDER BY version" 2>/dev/null || echo "")

echo -e "${BLUE}Running migrations...${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"

EXECUTED_COUNT=0
SKIPPED_COUNT=0

# Execute each migration
for MIGRATION in "${MIGRATIONS[@]}"; do
    MIGRATION_FILE="database/${MIGRATION}.sql"
    
    if [ ! -f "$MIGRATION_FILE" ]; then
        echo -e "${YELLOW}⊘ Skipped $MIGRATION: file not found${NC}"
        continue
    fi
    
    # Check if migration already applied
    if echo "$APPLIED_MIGRATIONS" | grep -q "^$MIGRATION$"; then
        echo -e "${YELLOW}⊘ Skipped $MIGRATION: already applied${NC}"
        ((SKIPPED_COUNT++))
        continue
    fi
    
    # Execute migration
    echo -n "Applying $MIGRATION... "
    if PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$MIGRATION_FILE" > /dev/null 2>&1; then
        # Record migration
        PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "INSERT INTO schema_migrations (version, name) VALUES ('$MIGRATION', '${MIGRATION//_/ }')" > /dev/null 2>&1
        echo -e "${GREEN}✓${NC}"
        ((EXECUTED_COUNT++))
    else
        echo -e "${RED}✗${NC}"
        echo -e "${RED}✗ Failed to apply migration: $MIGRATION${NC}"
        exit 1
    fi
done

echo ""
echo -e "${BLUE}════════════════════════════════════════${NC}"
if [ $EXECUTED_COUNT -gt 0 ]; then
    echo -e "${GREEN}✓ Applied $EXECUTED_COUNT new migration(s)${NC}"
fi
if [ $SKIPPED_COUNT -gt 0 ]; then
    echo -e "${YELLOW}⊘ Skipped $SKIPPED_COUNT migration(s) (already applied)${NC}"
fi
echo ""

# Validate migration execution
echo -e "${BLUE}📊 Validating migration execution...${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"

# Count tables
TABLE_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'")
echo "Tables created: $TABLE_COUNT"

# Count indexes
INDEX_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public'")
echo "Indexes created: $INDEX_COUNT"

# Count data in key tables
echo ""
echo "Data counts:"

TABLES=("users" "ingredient_master" "recipes" "recipe_ingredients" "recipe_sections" "recipe_steps" "recipe_versions" "recipe_journal_entries" "common_issues" "water_activity_reference" "ingredient_aliases" "composite_ingredients" "inventory_items" "recipe_costs")

for TABLE in "${TABLES[@]}"; do
    COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM $TABLE" 2>/dev/null || echo "0")
    printf "  %-30s %6s rows\n" "$TABLE:" "$COUNT"
done

echo ""
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Database migrations completed successfully!${NC}"
echo ""
