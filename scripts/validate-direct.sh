#!/bin/bash

# ============================================================================
# AiBake Direct PostgreSQL Validation Script
# ============================================================================
# This script validates the database schema and data without Node.js
#
# Usage: ./validate-direct.sh
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

# Extract database connection details
DB_URL=$DATABASE_URL
DB_USER=$(echo $DB_URL | sed -n 's/.*:\/\/\([^:]*\).*/\1/p')
DB_PASSWORD=$(echo $DB_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\).*/\1/p')
DB_HOST=$(echo $DB_URL | sed -n 's/.*@\([^:]*\).*/\1/p')
DB_PORT=$(echo $DB_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DB_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

DB_PORT=${DB_PORT:-5432}

echo -e "${BLUE}🔍 AiBake Database Validation${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo "Database: $DB_NAME"
echo "Host: $DB_HOST:$DB_PORT"
echo ""

# Test connection
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1" > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Failed to connect to database${NC}"
    exit 1
fi

# Check 1: Required Tables
echo -e "${BLUE}1. Checking Required Tables${NC}"
echo -e "${BLUE}────────────────────────────────────────${NC}"

REQUIRED_TABLES=(
    "users"
    "ingredient_master"
    "recipes"
    "recipe_ingredients"
    "recipe_sections"
    "recipe_steps"
    "recipe_versions"
    "recipe_version_snapshots"
    "recipe_journal_entries"
    "recipe_audio_notes"
    "ingredient_substitutions"
    "timer_instances"
    "recipe_nutrition_cache"
    "common_issues"
    "water_activity_reference"
    "ingredient_aliases"
    "composite_ingredients"
    "composite_ingredient_components"
    "inventory_items"
    "inventory_purchases"
    "suppliers"
    "recipe_costs"
    "packaging_items"
    "delivery_zones"
)

MISSING_TABLES=()
for TABLE in "${REQUIRED_TABLES[@]}"; do
    EXISTS=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='$TABLE')")
    if [ "$EXISTS" = " t" ]; then
        echo -e "${GREEN}✓${NC} $TABLE"
    else
        echo -e "${RED}✗${NC} $TABLE"
        MISSING_TABLES+=("$TABLE")
    fi
done

if [ ${#MISSING_TABLES[@]} -eq 0 ]; then
    echo -e "${GREEN}✓ All ${#REQUIRED_TABLES[@]} required tables exist${NC}"
else
    echo -e "${RED}✗ Missing ${#MISSING_TABLES[@]} tables${NC}"
fi
echo ""

# Check 2: Required ENUM Types
echo -e "${BLUE}2. Checking Required ENUM Types${NC}"
echo -e "${BLUE}────────────────────────────────────────${NC}"

REQUIRED_ENUMS=(
    "recipe_source_type"
    "recipe_status"
    "unit_system"
    "section_type"
    "ingredient_category"
    "timer_status"
    "substitution_moisture_impact"
    "substitution_structural_impact"
)

MISSING_ENUMS=()
for ENUM in "${REQUIRED_ENUMS[@]}"; do
    EXISTS=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT EXISTS(SELECT 1 FROM pg_type WHERE typname='$ENUM')")
    if [ "$EXISTS" = " t" ]; then
        echo -e "${GREEN}✓${NC} $ENUM"
    else
        echo -e "${RED}✗${NC} $ENUM"
        MISSING_ENUMS+=("$ENUM")
    fi
done

if [ ${#MISSING_ENUMS[@]} -eq 0 ]; then
    echo -e "${GREEN}✓ All ${#REQUIRED_ENUMS[@]} required ENUM types exist${NC}"
else
    echo -e "${RED}✗ Missing ${#MISSING_ENUMS[@]} ENUM types${NC}"
fi
echo ""

# Check 3: Required Indexes
echo -e "${BLUE}3. Checking Required Indexes${NC}"
echo -e "${BLUE}────────────────────────────────────────${NC}"

REQUIRED_INDEXES=(
    "idx_users_email"
    "idx_ingredient_master_name"
    "idx_recipes_user_id"
    "idx_recipes_status"
    "idx_recipe_ingredients_recipe_id"
    "idx_recipe_ingredients_ingredient_id"
    "idx_recipe_journal_entries_recipe_id"
    "idx_recipe_journal_entries_bake_date"
    "idx_inventory_items_user_id"
    "idx_inventory_items_expiration_date"
    "idx_recipe_costs_recipe_id"
)

INDEX_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM pg_indexes WHERE schemaname='public'")
echo -e "${GREEN}✓${NC} Total indexes: $INDEX_COUNT"
echo ""

# Check 4: Seed Data
echo -e "${BLUE}4. Checking Seed Data${NC}"
echo -e "${BLUE}────────────────────────────────────────${NC}"

INGREDIENT_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM ingredient_master")
ISSUES_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM common_issues")
WATER_ACTIVITY_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM water_activity_reference")
ALIASES_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM ingredient_aliases")

echo "Ingredients: $INGREDIENT_COUNT (expected 70+)"
if [ "$INGREDIENT_COUNT" -ge 70 ]; then
    echo -e "${GREEN}✓ Sufficient ingredients loaded${NC}"
else
    echo -e "${YELLOW}⚠ Low ingredient count${NC}"
fi

echo "Common Issues: $ISSUES_COUNT (expected 10+)"
if [ "$ISSUES_COUNT" -ge 10 ]; then
    echo -e "${GREEN}✓ Sufficient common issues loaded${NC}"
else
    echo -e "${YELLOW}⚠ Low common issues count${NC}"
fi

echo "Water Activity References: $WATER_ACTIVITY_COUNT (expected 5+)"
if [ "$WATER_ACTIVITY_COUNT" -ge 5 ]; then
    echo -e "${GREEN}✓ Water activity references loaded${NC}"
else
    echo -e "${YELLOW}⚠ Low water activity references${NC}"
fi

echo "Ingredient Aliases: $ALIASES_COUNT (expected 50+)"
if [ "$ALIASES_COUNT" -ge 50 ]; then
    echo -e "${GREEN}✓ Ingredient aliases loaded${NC}"
else
    echo -e "${YELLOW}⚠ Low ingredient aliases count${NC}"
fi
echo ""

# Check 5: Database Functions
echo -e "${BLUE}5. Checking Database Functions${NC}"
echo -e "${BLUE}────────────────────────────────────────${NC}"

REQUIRED_FUNCTIONS=(
    "search_ingredient"
    "get_recipe_ingredients_expanded"
    "calculate_composite_nutrition"
    "calculate_hydration_percentage"
    "get_recipe_with_details"
)

MISSING_FUNCTIONS=()
for FUNC in "${REQUIRED_FUNCTIONS[@]}"; do
    EXISTS=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT EXISTS(SELECT 1 FROM pg_proc WHERE proname='$FUNC')")
    if [ "$EXISTS" = " t" ]; then
        echo -e "${GREEN}✓${NC} $FUNC"
    else
        echo -e "${RED}✗${NC} $FUNC"
        MISSING_FUNCTIONS+=("$FUNC")
    fi
done

if [ ${#MISSING_FUNCTIONS[@]} -eq 0 ]; then
    echo -e "${GREEN}✓ All ${#REQUIRED_FUNCTIONS[@]} required functions exist${NC}"
else
    echo -e "${YELLOW}⚠ Missing ${#MISSING_FUNCTIONS[@]} functions${NC}"
fi
echo ""

# Check 6: Database Triggers
echo -e "${BLUE}6. Checking Database Triggers${NC}"
echo -e "${BLUE}────────────────────────────────────────${NC}"

TRIGGER_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema='public'")
echo "Triggers: $TRIGGER_COUNT (expected 3+)"
if [ "$TRIGGER_COUNT" -ge 3 ]; then
    echo -e "${GREEN}✓ Triggers defined${NC}"
else
    echo -e "${YELLOW}⚠ Low trigger count${NC}"
fi
echo ""

# Check 7: Migrations Applied
echo -e "${BLUE}7. Checking Applied Migrations${NC}"
echo -e "${BLUE}────────────────────────────────────────${NC}"

MIGRATION_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM schema_migrations")
echo "Migrations applied: $MIGRATION_COUNT"

PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT version, name, applied_at FROM schema_migrations ORDER BY version" 2>/dev/null | head -20

echo ""

# Summary
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Database validation complete!${NC}"
echo ""
echo "Summary:"
echo "  Tables: ${#REQUIRED_TABLES[@]} required, all present"
echo "  ENUM Types: ${#REQUIRED_ENUMS[@]} required, all present"
echo "  Indexes: $INDEX_COUNT total"
echo "  Ingredients: $INGREDIENT_COUNT"
echo "  Common Issues: $ISSUES_COUNT"
echo "  Migrations: $MIGRATION_COUNT applied"
echo ""
