# ============================================================================
# AiBake Direct PostgreSQL Migration Script (PowerShell)
# ============================================================================
# This script runs all database migrations directly using psql
# without requiring Node.js or Docker
#
# Usage: .\migrate-direct.ps1
# ============================================================================

param(
    [switch]$Verbose = $false
)

# Colors for output
$Colors = @{
    Red    = 'Red'
    Green  = 'Green'
    Yellow = 'Yellow'
    Blue   = 'Cyan'
}

function Write-Status {
    param([string]$Message, [string]$Color = 'White')
    Write-Host $Message -ForegroundColor $Color
}

function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

function Write-Warning-Custom {
    param([string]$Message)
    Write-Host "⊘ $Message" -ForegroundColor Yellow
}

# Load environment variables from .env
Write-Status "Loading environment configuration..." -Color $Colors.Blue

if (-not (Test-Path ".env")) {
    Write-Error-Custom ".env file not found"
    exit 1
}

$envContent = Get-Content ".env" | Where-Object { $_ -notmatch '^#' -and $_ -match '=' }
$env_vars = @{}

foreach ($line in $envContent) {
    $parts = $line -split '=', 2
    if ($parts.Count -eq 2) {
        $env_vars[$parts[0].Trim()] = $parts[1].Trim()
    }
}

$DATABASE_URL = $env_vars['DATABASE_URL']

if (-not $DATABASE_URL) {
    Write-Error-Custom "DATABASE_URL not found in .env"
    exit 1
}

# Parse connection string
# Format: postgresql://user:password@host:port/database
$pattern = 'postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)'
if ($DATABASE_URL -match $pattern) {
    $DB_USER = $matches[1]
    $DB_PASSWORD = $matches[2]
    $DB_HOST = $matches[3]
    $DB_PORT = $matches[4]
    $DB_NAME = $matches[5]
} else {
    Write-Error-Custom "Invalid DATABASE_URL format"
    exit 1
}

Write-Status "🚀 Starting AiBake Database Migrations" -Color $Colors.Blue
Write-Status "════════════════════════════════════════" -Color $Colors.Blue
Write-Host "Database: $DB_NAME"
Write-Host "Host: $DB_HOST`:$DB_PORT"
Write-Host "User: $DB_USER"
Write-Host ""

# Test database connection
Write-Status "Testing database connection..." -Color $Colors.Yellow

$env:PGPASSWORD = $DB_PASSWORD
$testConnection = & psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1" 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Error-Custom "Failed to connect to database"
    Write-Host "Connection string: postgresql://$DB_USER`:***@$DB_HOST`:$DB_PORT/$DB_NAME"
    exit 1
}

Write-Success "Database connection successful"
Write-Host ""

# Create schema_migrations table if it doesn't exist
Write-Status "Initializing schema_migrations table..." -Color $Colors.Yellow

$initSQL = @"
CREATE TABLE IF NOT EXISTS schema_migrations (
  id SERIAL PRIMARY KEY,
  version TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  applied_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_schema_migrations_version ON schema_migrations(version);
"@

$initSQL | & psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME 2>&1 | Out-Null

Write-Success "schema_migrations table initialized"
Write-Host ""

# Array of migration files in order
$MIGRATIONS = @(
    "01_schema_init",
    "02_seed_data",
    "02b_seed_ingredient_aliases",
    "03_test_data",
    "04_mvp_inventory",
    "04_reference_data",
    "05_mvp_costing",
    "06_mvp_advanced_recipe_fields"
)

# Get applied migrations
$appliedQuery = "SELECT version FROM schema_migrations ORDER BY version"
$appliedMigrations = & psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c $appliedQuery 2>&1 | Where-Object { $_ -match '\S' }

Write-Status "Running migrations..." -Color $Colors.Blue
Write-Status "════════════════════════════════════════" -Color $Colors.Blue

$executedCount = 0
$skippedCount = 0

# Execute each migration
foreach ($MIGRATION in $MIGRATIONS) {
    $MIGRATION_FILE = "database\$MIGRATION.sql"
    
    if (-not (Test-Path $MIGRATION_FILE)) {
        Write-Warning-Custom "Skipped $MIGRATION`: file not found"
        continue
    }
    
    # Check if migration already applied
    if ($appliedMigrations -contains $MIGRATION) {
        Write-Warning-Custom "Skipped $MIGRATION`: already applied"
        $skippedCount++
        continue
    }
    
    # Execute migration
    Write-Host -NoNewline "Applying $MIGRATION... "
    
    $migrationSQL = Get-Content $MIGRATION_FILE -Raw
    
    try {
        $migrationSQL | & psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME 2>&1 | Out-Null
        
        # Record migration
        $recordSQL = "INSERT INTO schema_migrations (version, name) VALUES ('$MIGRATION', '${MIGRATION -replace '_', ' '}')"
        $recordSQL | & psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME 2>&1 | Out-Null
        
        Write-Host "✓" -ForegroundColor Green
        $executedCount++
    }
    catch {
        Write-Host "✗" -ForegroundColor Red
        Write-Error-Custom "Failed to apply migration: $MIGRATION"
        exit 1
    }
}

Write-Host ""
Write-Status "════════════════════════════════════════" -Color $Colors.Blue

if ($executedCount -gt 0) {
    Write-Success "Applied $executedCount new migration(s)"
}
if ($skippedCount -gt 0) {
    Write-Warning-Custom "Skipped $skippedCount migration(s) (already applied)"
}

Write-Host ""

# Validate migration execution
Write-Status "📊 Validating migration execution..." -Color $Colors.Blue
Write-Status "════════════════════════════════════════" -Color $Colors.Blue

# Count tables
$tableCountQuery = "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'"
$tableCount = & psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c $tableCountQuery 2>&1 | Select-Object -First 1
Write-Host "Tables created: $($tableCount.Trim())"

# Count indexes
$indexCountQuery = "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public'"
$indexCount = & psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c $indexCountQuery 2>&1 | Select-Object -First 1
Write-Host "Indexes created: $($indexCount.Trim())"

# Count data in key tables
Write-Host ""
Write-Host "Data counts:"

$tables = @(
    "users",
    "ingredient_master",
    "recipes",
    "recipe_ingredients",
    "recipe_sections",
    "recipe_steps",
    "recipe_versions",
    "recipe_journal_entries",
    "common_issues",
    "water_activity_reference",
    "ingredient_aliases",
    "composite_ingredients",
    "inventory_items",
    "recipe_costs"
)

foreach ($table in $tables) {
    $countQuery = "SELECT COUNT(*) FROM $table"
    $count = & psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c $countQuery 2>&1 | Select-Object -First 1
    $count = $count.Trim()
    Write-Host "  $($table.PadRight(30)) $($count.PadLeft(6)) rows"
}

Write-Host ""
Write-Status "════════════════════════════════════════" -Color $Colors.Blue
Write-Success "Database migrations completed successfully!"
Write-Host ""

# Clean up
Remove-Item env:PGPASSWORD -ErrorAction SilentlyContinue
