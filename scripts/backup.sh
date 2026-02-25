#!/bin/bash

################################################################################
# AiBake Database Backup Script
################################################################################
# 
# Creates full database dumps with timestamp, compression, and integrity validation.
# Supports both Docker Compose and direct PostgreSQL connections.
#
# Usage:
#   ./backup.sh                    # Create backup with default settings
#   ./backup.sh --output /path     # Specify custom output directory
#   ./backup.sh --retention 30     # Keep backups for 30 days
#   ./backup.sh --validate         # Validate backup after creation
#
# Requirements:
#   - PostgreSQL client tools (pg_dump)
#   - gzip for compression
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
RETENTION_DAYS="${RETENTION_DAYS:-30}"
VALIDATE_BACKUP="${VALIDATE_BACKUP:-false}"
COMPRESS="${COMPRESS:-true}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="aibake_backup_${TIMESTAMP}"
BACKUP_FILE="${BACKUP_DIR}/${BACKUP_NAME}.sql"
BACKUP_FILE_GZ="${BACKUP_FILE}.gz"
CHECKSUM_FILE="${BACKUP_DIR}/${BACKUP_NAME}.md5"
LOG_FILE="${BACKUP_DIR}/${BACKUP_NAME}.log"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --output)
      BACKUP_DIR="$2"
      shift 2
      ;;
    --retention)
      RETENTION_DAYS="$2"
      shift 2
      ;;
    --validate)
      VALIDATE_BACKUP=true
      shift
      ;;
    --no-compress)
      COMPRESS=false
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
  # Parse DATABASE_URL format: postgresql://user:password@host:port/database
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

# Export for pg_dump
export PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Initialize log
{
  echo "╔════════════════════════════════════════════════════════════════╗"
  echo "║           AiBake Database Backup Log                           ║"
  echo "╚════════════════════════════════════════════════════════════════╝"
  echo ""
  echo "Backup Name:     $BACKUP_NAME"
  echo "Timestamp:       $TIMESTAMP"
  echo "Database:        $PGDATABASE"
  echo "Host:            $PGHOST:$PGPORT"
  echo "User:            $PGUSER"
  echo "Output Dir:      $BACKUP_DIR"
  echo "Compression:     $COMPRESS"
  echo "Validation:      $VALIDATE_BACKUP"
  echo "Retention:       $RETENTION_DAYS days"
  echo ""
  echo "Start Time:      $(date '+%Y-%m-%d %H:%M:%S')"
  echo "─────────────────────────────────────────────────────────────────"
} | tee "$LOG_FILE"

# Function to log messages
log_message() {
  local level=$1
  shift
  local message="$@"
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $message" | tee -a "$LOG_FILE"
}

# Function to print colored output
print_status() {
  local status=$1
  local message=$2
  case $status in
    success)
      echo -e "${GREEN}✓${NC} $message" | tee -a "$LOG_FILE"
      ;;
    error)
      echo -e "${RED}✗${NC} $message" | tee -a "$LOG_FILE"
      ;;
    info)
      echo -e "${BLUE}ℹ${NC} $message" | tee -a "$LOG_FILE"
      ;;
    warning)
      echo -e "${YELLOW}⚠${NC} $message" | tee -a "$LOG_FILE"
      ;;
  esac
}

# Test database connection
print_status info "Testing database connection..."
if ! pg_dump --version > /dev/null 2>&1; then
  print_status error "pg_dump not found. Please install PostgreSQL client tools."
  exit 1
fi

if ! PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -c "SELECT 1" > /dev/null 2>&1; then
  print_status error "Failed to connect to database at $PGHOST:$PGPORT"
  log_message ERROR "Connection failed. Check credentials and database availability."
  exit 1
fi
print_status success "Database connection successful"

# Get database size before backup
DB_SIZE=$(PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -t -c "SELECT pg_size_pretty(pg_database_size('$PGDATABASE'))")
print_status info "Database size: $DB_SIZE"

# Create backup
print_status info "Creating database backup..."
START_TIME=$(date +%s)

if ! PGPASSWORD="$PGPASSWORD" pg_dump \
  -h "$PGHOST" \
  -p "$PGPORT" \
  -U "$PGUSER" \
  -d "$PGDATABASE" \
  --verbose \
  --format=plain \
  --no-password \
  > "$BACKUP_FILE" 2>> "$LOG_FILE"; then
  print_status error "Backup creation failed"
  log_message ERROR "pg_dump exited with error code $?"
  rm -f "$BACKUP_FILE"
  exit 1
fi

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
print_status success "Backup created successfully (${DURATION}s)"

# Get backup file size
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
BACKUP_SIZE_BYTES=$(stat -f%z "$BACKUP_FILE" 2>/dev/null || stat -c%s "$BACKUP_FILE" 2>/dev/null)
print_status info "Backup file size: $BACKUP_SIZE"

# Calculate checksum before compression
print_status info "Calculating backup integrity checksum..."
md5sum "$BACKUP_FILE" > "$CHECKSUM_FILE"
CHECKSUM=$(cut -d' ' -f1 "$CHECKSUM_FILE")
print_status success "Checksum: $CHECKSUM"

# Compress backup if enabled
if [ "$COMPRESS" = true ]; then
  print_status info "Compressing backup..."
  START_TIME=$(date +%s)
  
  if ! gzip -9 "$BACKUP_FILE"; then
    print_status error "Compression failed"
    log_message ERROR "gzip exited with error code $?"
    exit 1
  fi
  
  END_TIME=$(date +%s)
  DURATION=$((END_TIME - START_TIME))
  
  COMPRESSED_SIZE=$(du -h "$BACKUP_FILE_GZ" | cut -f1)
  COMPRESSION_RATIO=$(echo "scale=2; (1 - $(stat -f%z "$BACKUP_FILE_GZ" 2>/dev/null || stat -c%s "$BACKUP_FILE_GZ" 2>/dev/null) / $BACKUP_SIZE_BYTES) * 100" | bc 2>/dev/null || echo "N/A")
  
  print_status success "Compression complete (${DURATION}s)"
  print_status info "Compressed size: $COMPRESSED_SIZE (${COMPRESSION_RATIO}% reduction)"
  
  # Update checksum file to reference compressed file
  echo "$CHECKSUM  $BACKUP_FILE_GZ" > "$CHECKSUM_FILE"
  FINAL_BACKUP_FILE="$BACKUP_FILE_GZ"
else
  FINAL_BACKUP_FILE="$BACKUP_FILE"
fi

# Validate backup if enabled
if [ "$VALIDATE_BACKUP" = true ]; then
  print_status info "Validating backup integrity..."
  
  if [ "$COMPRESS" = true ]; then
    # For compressed backups, decompress and validate
    if ! gzip -t "$BACKUP_FILE_GZ" 2>> "$LOG_FILE"; then
      print_status error "Backup validation failed: corrupted gzip file"
      log_message ERROR "gzip integrity check failed"
      exit 1
    fi
    print_status success "Gzip integrity check passed"
  else
    # For uncompressed backups, verify it's valid SQL
    if ! head -100 "$BACKUP_FILE" | grep -q "PostgreSQL database dump"; then
      print_status error "Backup validation failed: invalid SQL dump"
      log_message ERROR "Backup file does not appear to be a valid PostgreSQL dump"
      exit 1
    fi
    print_status success "SQL dump format validation passed"
  fi
fi

# Clean up old backups based on retention policy
print_status info "Cleaning up old backups (retention: $RETENTION_DAYS days)..."
CUTOFF_DATE=$(date -d "$RETENTION_DAYS days ago" +%s 2>/dev/null || date -v-${RETENTION_DAYS}d +%s 2>/dev/null)
DELETED_COUNT=0

for backup_file in "$BACKUP_DIR"/aibake_backup_*.sql.gz "$BACKUP_DIR"/aibake_backup_*.sql; do
  if [ -f "$backup_file" ]; then
    FILE_DATE=$(stat -f%m "$backup_file" 2>/dev/null || stat -c%Y "$backup_file" 2>/dev/null)
    if [ "$FILE_DATE" -lt "$CUTOFF_DATE" ]; then
      rm -f "$backup_file"
      # Also remove associated checksum and log files
      BASE_NAME="${backup_file%.*}"
      rm -f "${BASE_NAME}.md5" "${BASE_NAME}.log"
      DELETED_COUNT=$((DELETED_COUNT + 1))
      log_message INFO "Deleted old backup: $(basename "$backup_file")"
    fi
  fi
done

if [ $DELETED_COUNT -gt 0 ]; then
  print_status success "Deleted $DELETED_COUNT old backup(s)"
else
  print_status info "No old backups to delete"
fi

# Generate backup summary
{
  echo ""
  echo "─────────────────────────────────────────────────────────────────"
  echo "Backup Summary"
  echo "─────────────────────────────────────────────────────────────────"
  echo "Backup File:     $(basename "$FINAL_BACKUP_FILE")"
  echo "File Size:       $COMPRESSED_SIZE"
  echo "Checksum:        $CHECKSUM"
  echo "Checksum File:   $(basename "$CHECKSUM_FILE")"
  echo "End Time:        $(date '+%Y-%m-%d %H:%M:%S')"
  echo "Status:          SUCCESS"
  echo "─────────────────────────────────────────────────────────────────"
} | tee -a "$LOG_FILE"

print_status success "Backup completed successfully!"
print_status info "Backup location: $FINAL_BACKUP_FILE"
print_status info "Log location: $LOG_FILE"

exit 0
