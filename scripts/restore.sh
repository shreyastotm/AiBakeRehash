#!/bin/bash

################################################################################
# AiBake Database Restore Script
################################################################################
#
# Restores database from backup files with integrity verification.
# Supports both full backups and point-in-time recovery (PITR).
#
# Usage:
#   ./restore.sh --backup aibake_backup_20240115_100000.sql.gz
#   ./restore.sh --backup backup.sql --validate
#   ./restore.sh --list                    # List available backups
#   ./restore.sh --pitr --time "2024-01-15 12:00:00"
#
# Requirements:
#   - PostgreSQL client tools (psql, pg_restore)
#   - gzip for decompression
#   - md5sum for integrity validation
#   - .env file with DATABASE_URL or PGHOST, PGUSER, PGPASSWORD, PGDATABASE
#
################################################################################

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DIR="${BACKUP_DIR:-.}"
BACKUP_FILE=""
VALIDATE_BACKUP="${VALIDATE_BACKUP:-true}"
PITR_MODE=false
PITR_TIME=""
LIST_BACKUPS=false
RESTORE_MODE="full" # full or pitr
LOG_FILE=""

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --backup)
      BACKUP_FILE="$2"
      shift 2
      ;;
    --list)
      LIST_BACKUPS=true
      shift
      ;;
    --pitr)
      PITR_MODE=true
      shift
      ;;
    --time)
      PITR_TIME="$2"
      shift 2
      ;;
    --validate)
      VALIDATE_BACKUP=true
      shift
      ;;
    --no-validate)
      VALIDATE_BACKUP=false
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Determine database connection parameters
if [ -n "${DATABASE_URL:-}" ]; then
  PGHOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\).*/\1/p')
  PGPORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*$/\1/p')
  PGUSER=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/\([^:]*\).*/\1/p')
  PGPASSWORD=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/[^:]*:\([^@]*\).*/\1/p')
  PGDATABASE=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')
  PGPORT="${PGPORT:-5432}"
else
  PGHOST="${PGHOST:-localhost}"
  PGPORT="${PGPORT:-5432}"
  PGUSER="${PGUSER:-aibake_user}"
  PGPASSWORD="${PGPASSWORD:-aibakepassword}"
  PGDATABASE="${PGDATABASE:-aibake_db}"
fi

export PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE

# Function to log messages
log_message() {
  local level=$1
  shift
  local message="$@"
  if [ -n "$LOG_FILE" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $message" | tee -a "$LOG_FILE"
  else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $message"
  fi
}

# Function to print colored output
print_status() {
  local status=$1
  local message=$2
  case $status in
    success)
      echo -e "${GREEN}✓${NC} $message"
      ;;
    error)
      echo -e "${RED}✗${NC} $message"
      ;;
    info)
      echo -e "${BLUE}ℹ${NC} $message"
      ;;
    warning)
      echo -e "${YELLOW}⚠${NC} $message"
      ;;
  esac
}

# Function to list available backups
list_backups() {
  print_status info "Available backups in $BACKUP_DIR:"
  echo ""
  
  if [ ! -d "$BACKUP_DIR" ]; then
    print_status warning "Backup directory not found: $BACKUP_DIR"
    return 1
  fi
  
  BACKUP_COUNT=0
  for backup_file in "$BACKUP_DIR"/aibake_backup_*.sql.gz "$BACKUP_DIR"/aibake_backup_*.sql; do
    if [ -f "$backup_file" ]; then
      FILENAME=$(basename "$backup_file")
      SIZE=$(du -h "$backup_file" | cut -f1)
      DATE=$(stat -f%Sm -t "%Y-%m-%d %H:%M:%S" "$backup_file" 2>/dev/null || stat -c%y "$backup_file" 2>/dev/null | cut -d' ' -f1-2)
      
      # Check for checksum file
      CHECKSUM_FILE="${backup_file%.*}.md5"
      if [ -f "$CHECKSUM_FILE" ]; then
        CHECKSUM=$(cut -d' ' -f1 "$CHECKSUM_FILE")
        echo "  $FILENAME"
        echo "    Size:     $SIZE"
        echo "    Date:     $DATE"
        echo "    Checksum: $CHECKSUM"
      else
        echo "  $FILENAME"
        echo "    Size:     $SIZE"
        echo "    Date:     $DATE"
      fi
      echo ""
      BACKUP_COUNT=$((BACKUP_COUNT + 1))
    fi
  done
  
  if [ $BACKUP_COUNT -eq 0 ]; then
    print_status warning "No backups found"
    return 1
  fi
  
  print_status success "Found $BACKUP_COUNT backup(s)"
}

# Function to validate backup integrity
validate_backup_file() {
  local backup_file=$1
  
  print_status info "Validating backup integrity..."
  
  # Check if backup file exists
  if [ ! -f "$backup_file" ]; then
    print_status error "Backup file not found: $backup_file"
    return 1
  fi
  
  # Check if it's compressed
  if [[ "$backup_file" == *.gz ]]; then
    print_status info "Validating gzip integrity..."
    if ! gzip -t "$backup_file" 2>/dev/null; then
      print_status error "Backup file is corrupted (gzip validation failed)"
      return 1
    fi
    print_status success "Gzip integrity check passed"
  fi
  
  # Verify checksum if available
  CHECKSUM_FILE="${backup_file%.*}.md5"
  if [ -f "$CHECKSUM_FILE" ]; then
    print_status info "Verifying checksum..."
    
    # Extract checksum and filename from checksum file
    EXPECTED_CHECKSUM=$(cut -d' ' -f1 "$CHECKSUM_FILE")
    
    # Calculate actual checksum
    if [[ "$backup_file" == *.gz ]]; then
      # For compressed files, calculate checksum of the compressed file
      ACTUAL_CHECKSUM=$(md5sum "$backup_file" | cut -d' ' -f1)
    else
      ACTUAL_CHECKSUM=$(md5sum "$backup_file" | cut -d' ' -f1)
    fi
    
    if [ "$EXPECTED_CHECKSUM" = "$ACTUAL_CHECKSUM" ]; then
      print_status success "Checksum verification passed"
    else
      print_status error "Checksum mismatch!"
      print_status error "  Expected: $EXPECTED_CHECKSUM"
      print_status error "  Actual:   $ACTUAL_CHECKSUM"
      return 1
    fi
  else
    print_status warning "No checksum file found for validation"
  fi
  
  print_status success "Backup validation complete"
  return 0
}

# Function to restore from backup
restore_from_backup() {
  local backup_file=$1
  
  print_status info "Preparing to restore from backup..."
  
  # Resolve backup file path
  if [ ! -f "$backup_file" ]; then
    # Try to find it in backup directory
    if [ -f "$BACKUP_DIR/$backup_file" ]; then
      backup_file="$BACKUP_DIR/$backup_file"
    else
      print_status error "Backup file not found: $backup_file"
      return 1
    fi
  fi
  
  # Initialize log file
  LOG_FILE="${backup_file%.*}.restore.log"
  
  {
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║           AiBake Database Restore Log                          ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
    echo "Backup File:     $(basename "$backup_file")"
    echo "Database:        $PGDATABASE"
    echo "Host:            $PGHOST:$PGPORT"
    echo "User:            $PGUSER"
    echo "Start Time:      $(date '+%Y-%m-%d %H:%M:%S')"
    echo "─────────────────────────────────────────────────────────────────"
  } | tee "$LOG_FILE"
  
  # Validate backup if enabled
  if [ "$VALIDATE_BACKUP" = true ]; then
    if ! validate_backup_file "$backup_file"; then
      print_status error "Backup validation failed. Restore aborted."
      log_message ERROR "Backup validation failed"
      return 1
    fi
  fi
  
  # Test database connection
  print_status info "Testing database connection..."
  if ! PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -c "SELECT 1" > /dev/null 2>&1; then
    print_status error "Failed to connect to database at $PGHOST:$PGPORT"
    log_message ERROR "Connection failed. Check credentials and database availability."
    return 1
  fi
  print_status success "Database connection successful"
  
  # Confirm restore operation
  print_status warning "⚠️  WARNING: This will overwrite the current database!"
  print_status warning "⚠️  All existing data will be replaced."
  echo ""
  print_status info "Backup file: $(basename "$backup_file")"
  print_status info "Database: $PGDATABASE"
  echo ""
  
  # For non-interactive environments, proceed with restore
  # In interactive environments, you might want to add a prompt here
  
  # Prepare temporary file for SQL
  TEMP_SQL=$(mktemp)
  trap "rm -f $TEMP_SQL" EXIT
  
  # Decompress backup if needed
  if [[ "$backup_file" == *.gz ]]; then
    print_status info "Decompressing backup..."
    if ! gzip -dc "$backup_file" > "$TEMP_SQL"; then
      print_status error "Failed to decompress backup"
      log_message ERROR "gzip decompression failed"
      return 1
    fi
    print_status success "Decompression complete"
  else
    TEMP_SQL="$backup_file"
  fi
  
  # Restore database
  print_status info "Restoring database..."
  START_TIME=$(date +%s)
  
  if ! PGPASSWORD="$PGPASSWORD" psql \
    -h "$PGHOST" \
    -p "$PGPORT" \
    -U "$PGUSER" \
    -d "$PGDATABASE" \
    -f "$TEMP_SQL" >> "$LOG_FILE" 2>&1; then
    print_status error "Database restore failed"
    log_message ERROR "psql restore exited with error code $?"
    return 1
  fi
  
  END_TIME=$(date +%s)
  DURATION=$((END_TIME - START_TIME))
  
  print_status success "Database restore completed (${DURATION}s)"
  log_message INFO "Database restore completed successfully"
  
  # Validate restored database
  print_status info "Validating restored database..."
  
  TABLE_COUNT=$(PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'")
  print_status info "Tables restored: $TABLE_COUNT"
  
  # Get data counts
  USERS=$(PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -t -c "SELECT COUNT(*) FROM users" 2>/dev/null || echo "0")
  RECIPES=$(PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -t -c "SELECT COUNT(*) FROM recipes" 2>/dev/null || echo "0")
  INGREDIENTS=$(PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -t -c "SELECT COUNT(*) FROM ingredient_master" 2>/dev/null || echo "0")
  
  {
    echo ""
    echo "─────────────────────────────────────────────────────────────────"
    echo "Restore Summary"
    echo "─────────────────────────────────────────────────────────────────"
    echo "Tables Restored:  $TABLE_COUNT"
    echo "Users:            $USERS"
    echo "Recipes:          $RECIPES"
    echo "Ingredients:      $INGREDIENTS"
    echo "End Time:         $(date '+%Y-%m-%d %H:%M:%S')"
    echo "Status:           SUCCESS"
    echo "─────────────────────────────────────────────────────────────────"
  } | tee -a "$LOG_FILE"
  
  print_status success "Restore completed successfully!"
  print_status info "Log location: $LOG_FILE"
  
  return 0
}

# Function to perform point-in-time recovery
perform_pitr() {
  if [ -z "$PITR_TIME" ]; then
    print_status error "PITR time not specified. Use --time 'YYYY-MM-DD HH:MM:SS'"
    return 1
  fi
  
  print_status info "Performing point-in-time recovery..."
  print_status info "Recovery target time: $PITR_TIME"
  
  # Check if WAL archive exists
  WAL_ARCHIVE_DIR="${WAL_ARCHIVE_DIR:-.}/wal_archive"
  if [ ! -d "$WAL_ARCHIVE_DIR" ]; then
    print_status error "WAL archive directory not found: $WAL_ARCHIVE_DIR"
    print_status error "WAL archiving must be configured for PITR"
    return 1
  fi
  
  # Check if WAL files exist
  WAL_COUNT=$(find "$WAL_ARCHIVE_DIR" -name "0*" -type f 2>/dev/null | wc -l)
  if [ $WAL_COUNT -eq 0 ]; then
    print_status error "No WAL files found in archive"
    return 1
  fi
  
  print_status info "Found $WAL_COUNT WAL files for recovery"
  
  # Create recovery configuration
  RECOVERY_CONF="/tmp/recovery.conf"
  cat > "$RECOVERY_CONF" << EOF
restore_command = 'cp $WAL_ARCHIVE_DIR/%f %p'
recovery_target_time = '$PITR_TIME'
recovery_target_timeline = 'latest'
EOF
  
  print_status info "Recovery configuration created"
  print_status info "See $RECOVERY_CONF for details"
  
  print_status warning "PITR requires manual PostgreSQL configuration"
  print_status info "Steps:"
  print_status info "1. Stop PostgreSQL: docker-compose stop postgres"
  print_status info "2. Restore base backup: ./restore.sh --backup <backup_file>"
  print_status info "3. Copy recovery.conf to PostgreSQL data directory"
  print_status info "4. Start PostgreSQL: docker-compose start postgres"
  print_status info "5. Monitor recovery: docker-compose logs -f postgres"
  
  return 0
}

# Main execution
if [ "$LIST_BACKUPS" = true ]; then
  list_backups
  exit $?
fi

if [ "$PITR_MODE" = true ]; then
  perform_pitr
  exit $?
fi

if [ -z "$BACKUP_FILE" ]; then
  print_status error "No backup file specified"
  echo ""
  echo "Usage: $0 --backup <backup_file> [options]"
  echo ""
  echo "Options:"
  echo "  --backup <file>    Backup file to restore"
  echo "  --validate         Validate backup before restore (default: true)"
  echo "  --no-validate      Skip backup validation"
  echo "  --list             List available backups"
  echo "  --pitr             Perform point-in-time recovery"
  echo "  --time <time>      Recovery target time (YYYY-MM-DD HH:MM:SS)"
  echo ""
  echo "Examples:"
  echo "  ./restore.sh --backup aibake_backup_20240115_100000.sql.gz"
  echo "  ./restore.sh --list"
  echo "  ./restore.sh --pitr --time '2024-01-15 12:00:00'"
  exit 1
fi

restore_from_backup "$BACKUP_FILE"
exit $?
