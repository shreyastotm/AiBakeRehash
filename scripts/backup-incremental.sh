#!/bin/bash

################################################################################
# AiBake Database Incremental Backup Script (WAL Archiving)
################################################################################
#
# Manages Write-Ahead Log (WAL) archiving for point-in-time recovery (PITR).
# This script sets up and maintains WAL archiving for continuous backup.
#
# Usage:
#   ./backup-incremental.sh --setup              # Initialize WAL archiving
#   ./backup-incremental.sh --archive            # Archive WAL files
#   ./backup-incremental.sh --cleanup            # Clean old WAL files
#   ./backup-incremental.sh --status             # Show archiving status
#
# Requirements:
#   - PostgreSQL 15+ with WAL archiving support
#   - .env file with DATABASE_URL or PGHOST, PGUSER, PGPASSWORD, PGDATABASE
#   - Write access to WAL archive directory
#
# WAL Archiving enables:
#   - Point-in-time recovery (PITR)
#   - Continuous backup without full dumps
#   - Recovery to any point in time
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
WAL_ARCHIVE_DIR="${WAL_ARCHIVE_DIR:-.}/wal_archive"
WAL_RETENTION_DAYS="${WAL_RETENTION_DAYS:-30}"
COMMAND="${1:-status}"
LOG_FILE="${WAL_ARCHIVE_DIR}/wal_archiving.log"

# Parse command line arguments
case "${1:-status}" in
  --setup)
    COMMAND="setup"
    ;;
  --archive)
    COMMAND="archive"
    ;;
  --cleanup)
    COMMAND="cleanup"
    ;;
  --status)
    COMMAND="status"
    ;;
  *)
    COMMAND="${1:-status}"
    ;;
esac

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
  mkdir -p "$WAL_ARCHIVE_DIR"
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $message" | tee -a "$LOG_FILE"
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

# Function to setup WAL archiving
setup_wal_archiving() {
  print_status info "Setting up WAL archiving..."
  
  # Create WAL archive directory
  mkdir -p "$WAL_ARCHIVE_DIR"
  print_status success "Created WAL archive directory: $WAL_ARCHIVE_DIR"
  
  # Create archive script
  cat > "$WAL_ARCHIVE_DIR/archive_wal.sh" << 'EOF'
#!/bin/bash
# WAL archive script called by PostgreSQL
# Arguments: %p (path) %f (filename)

WAL_FILE="$1"
WAL_DEST="$2"

if [ -z "$WAL_FILE" ] || [ -z "$WAL_DEST" ]; then
  echo "Usage: $0 <wal_file> <destination_dir>" >&2
  exit 1
fi

# Copy WAL file to archive directory
if cp "$WAL_FILE" "$WAL_DEST/"; then
  exit 0
else
  exit 1
fi
EOF
  
  chmod +x "$WAL_ARCHIVE_DIR/archive_wal.sh"
  print_status success "Created archive script"
  
  # Create restore script
  cat > "$WAL_ARCHIVE_DIR/restore_wal.sh" << 'EOF'
#!/bin/bash
# WAL restore script for PITR
# Arguments: %r (restore path) %f (filename)

RESTORE_PATH="$1"
WAL_FILE="$2"
WAL_ARCHIVE_DIR="$3"

if [ -z "$RESTORE_PATH" ] || [ -z "$WAL_FILE" ] || [ -z "$WAL_ARCHIVE_DIR" ]; then
  echo "Usage: $0 <restore_path> <wal_file> <archive_dir>" >&2
  exit 1
fi

# Restore WAL file from archive
if [ -f "$WAL_ARCHIVE_DIR/$WAL_FILE" ]; then
  cp "$WAL_ARCHIVE_DIR/$WAL_FILE" "$RESTORE_PATH"
  exit 0
else
  exit 1
fi
EOF
  
  chmod +x "$WAL_ARCHIVE_DIR/restore_wal.sh"
  print_status success "Created restore script"
  
  # Create configuration guide
  cat > "$WAL_ARCHIVE_DIR/SETUP_GUIDE.md" << 'EOF'
# PostgreSQL WAL Archiving Setup Guide

## Overview

WAL (Write-Ahead Log) archiving enables point-in-time recovery (PITR) by continuously archiving database transaction logs.

## Configuration Steps

### 1. Update PostgreSQL Configuration

Edit `postgresql.conf`:

```ini
# Enable WAL archiving
wal_level = replica
archive_mode = on
archive_command = '/path/to/archive_wal.sh %p /path/to/wal_archive'
archive_timeout = 300
```

### 2. Restart PostgreSQL

```bash
# Using Docker Compose
docker-compose restart postgres

# Or using systemctl
sudo systemctl restart postgresql
```

### 3. Verify Archiving

```bash
# Check if WAL files are being archived
ls -la /path/to/wal_archive/

# Monitor archiving status
tail -f /path/to/wal_archiving.log
```

## Point-in-Time Recovery (PITR)

### Prerequisites

1. Full backup created with `backup.sh`
2. WAL files archived since the backup
3. Target recovery time

### Recovery Steps

1. **Stop PostgreSQL**
   ```bash
   docker-compose stop postgres
   ```

2. **Restore base backup**
   ```bash
   ./restore.sh --backup aibake_backup_20240115_100000.sql.gz
   ```

3. **Create recovery configuration**
   ```bash
   cat > /var/lib/postgresql/data/recovery.conf << 'RECOVERY'
   restore_command = '/path/to/restore_wal.sh %p %f /path/to/wal_archive'
   recovery_target_timeline = 'latest'
   recovery_target_time = '2024-01-15 12:00:00'
   RECOVERY
   ```

4. **Start PostgreSQL**
   ```bash
   docker-compose start postgres
   ```

5. **Monitor recovery**
   ```bash
   docker-compose logs -f postgres
   ```

## Maintenance

### Clean Old WAL Files

```bash
./backup-incremental.sh --cleanup
```

### Check Archiving Status

```bash
./backup-incremental.sh --status
```

## Troubleshooting

### WAL Files Not Being Archived

1. Check PostgreSQL configuration: `SHOW archive_command;`
2. Check archive directory permissions
3. Review PostgreSQL logs for errors
4. Verify archive script is executable

### Recovery Fails

1. Ensure base backup is valid
2. Verify WAL files exist for recovery period
3. Check recovery.conf syntax
4. Review PostgreSQL logs during recovery

## Performance Considerations

- Archive timeout: 300 seconds (adjust based on workload)
- WAL retention: 30 days (adjust based on storage)
- Archive command should be fast (use local storage)
- Monitor disk space for WAL archive directory

## References

- [PostgreSQL WAL Archiving](https://www.postgresql.org/docs/current/continuous-archiving.html)
- [Point-in-Time Recovery](https://www.postgresql.org/docs/current/runtime-config-wal.html)
EOF
  
  print_status success "Created setup guide: $WAL_ARCHIVE_DIR/SETUP_GUIDE.md"
  
  log_message INFO "WAL archiving setup complete"
  print_status info "Next steps:"
  print_status info "1. Review $WAL_ARCHIVE_DIR/SETUP_GUIDE.md"
  print_status info "2. Update PostgreSQL configuration"
  print_status info "3. Restart PostgreSQL"
  print_status info "4. Run './backup-incremental.sh --status' to verify"
}

# Function to archive WAL files
archive_wal_files() {
  print_status info "Archiving WAL files..."
  
  mkdir -p "$WAL_ARCHIVE_DIR"
  
  # Get PostgreSQL data directory
  PG_DATA_DIR=$(PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -t -c "SHOW data_directory")
  
  if [ -z "$PG_DATA_DIR" ]; then
    print_status error "Could not determine PostgreSQL data directory"
    log_message ERROR "Failed to get data_directory from PostgreSQL"
    return 1
  fi
  
  print_status info "PostgreSQL data directory: $PG_DATA_DIR"
  
  # Archive WAL files from pg_wal directory
  WAL_SOURCE_DIR="$PG_DATA_DIR/pg_wal"
  
  if [ ! -d "$WAL_SOURCE_DIR" ]; then
    print_status warning "WAL directory not found: $WAL_SOURCE_DIR"
    return 1
  fi
  
  # Count WAL files
  WAL_COUNT=$(find "$WAL_SOURCE_DIR" -name "0*" -type f 2>/dev/null | wc -l)
  print_status info "Found $WAL_COUNT WAL files"
  
  # Copy WAL files to archive directory
  ARCHIVED_COUNT=0
  for wal_file in "$WAL_SOURCE_DIR"/0*; do
    if [ -f "$wal_file" ]; then
      FILENAME=$(basename "$wal_file")
      if ! [ -f "$WAL_ARCHIVE_DIR/$FILENAME" ]; then
        cp "$wal_file" "$WAL_ARCHIVE_DIR/"
        ARCHIVED_COUNT=$((ARCHIVED_COUNT + 1))
      fi
    fi
  done
  
  print_status success "Archived $ARCHIVED_COUNT WAL files"
  log_message INFO "Archived $ARCHIVED_COUNT WAL files to $WAL_ARCHIVE_DIR"
}

# Function to cleanup old WAL files
cleanup_wal_files() {
  print_status info "Cleaning up old WAL files (retention: $WAL_RETENTION_DAYS days)..."
  
  if [ ! -d "$WAL_ARCHIVE_DIR" ]; then
    print_status warning "WAL archive directory not found: $WAL_ARCHIVE_DIR"
    return 0
  fi
  
  CUTOFF_DATE=$(date -d "$WAL_RETENTION_DAYS days ago" +%s 2>/dev/null || date -v-${WAL_RETENTION_DAYS}d +%s 2>/dev/null)
  DELETED_COUNT=0
  
  for wal_file in "$WAL_ARCHIVE_DIR"/0*; do
    if [ -f "$wal_file" ]; then
      FILE_DATE=$(stat -f%m "$wal_file" 2>/dev/null || stat -c%Y "$wal_file" 2>/dev/null)
      if [ "$FILE_DATE" -lt "$CUTOFF_DATE" ]; then
        rm -f "$wal_file"
        DELETED_COUNT=$((DELETED_COUNT + 1))
        log_message INFO "Deleted old WAL file: $(basename "$wal_file")"
      fi
    fi
  done
  
  if [ $DELETED_COUNT -gt 0 ]; then
    print_status success "Deleted $DELETED_COUNT old WAL file(s)"
  else
    print_status info "No old WAL files to delete"
  fi
  
  log_message INFO "WAL cleanup complete: deleted $DELETED_COUNT files"
}

# Function to show archiving status
show_status() {
  print_status info "WAL Archiving Status"
  echo ""
  
  # Check if WAL archive directory exists
  if [ ! -d "$WAL_ARCHIVE_DIR" ]; then
    print_status warning "WAL archive directory not found: $WAL_ARCHIVE_DIR"
    print_status info "Run './backup-incremental.sh --setup' to initialize"
    return 0
  fi
  
  # Count archived WAL files
  WAL_FILE_COUNT=$(find "$WAL_ARCHIVE_DIR" -name "0*" -type f 2>/dev/null | wc -l)
  print_status info "Archived WAL files: $WAL_FILE_COUNT"
  
  # Calculate archive size
  ARCHIVE_SIZE=$(du -sh "$WAL_ARCHIVE_DIR" 2>/dev/null | cut -f1)
  print_status info "Archive directory size: $ARCHIVE_SIZE"
  
  # Show oldest and newest WAL files
  OLDEST_WAL=$(find "$WAL_ARCHIVE_DIR" -name "0*" -type f -printf '%T@ %p\n' 2>/dev/null | sort -n | head -1 | cut -d' ' -f2-)
  NEWEST_WAL=$(find "$WAL_ARCHIVE_DIR" -name "0*" -type f -printf '%T@ %p\n' 2>/dev/null | sort -n | tail -1 | cut -d' ' -f2-)
  
  if [ -n "$OLDEST_WAL" ]; then
    print_status info "Oldest WAL: $(basename "$OLDEST_WAL")"
  fi
  
  if [ -n "$NEWEST_WAL" ]; then
    print_status info "Newest WAL: $(basename "$NEWEST_WAL")"
  fi
  
  # Check PostgreSQL archiving status
  print_status info ""
  print_status info "PostgreSQL Archiving Configuration:"
  
  ARCHIVE_MODE=$(PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -t -c "SHOW archive_mode" 2>/dev/null || echo "unknown")
  print_status info "  archive_mode: $ARCHIVE_MODE"
  
  WAL_LEVEL=$(PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -t -c "SHOW wal_level" 2>/dev/null || echo "unknown")
  print_status info "  wal_level: $WAL_LEVEL"
  
  # Show recent log entries
  if [ -f "$LOG_FILE" ]; then
    print_status info ""
    print_status info "Recent Activity (last 5 entries):"
    tail -5 "$LOG_FILE" | sed 's/^/  /'
  fi
}

# Main execution
case "$COMMAND" in
  setup)
    setup_wal_archiving
    ;;
  archive)
    archive_wal_files
    ;;
  cleanup)
    cleanup_wal_files
    ;;
  status)
    show_status
    ;;
  *)
    print_status error "Unknown command: $COMMAND"
    echo ""
    echo "Usage: $0 [--setup|--archive|--cleanup|--status]"
    echo ""
    echo "Commands:"
    echo "  --setup    Initialize WAL archiving"
    echo "  --archive  Archive WAL files"
    echo "  --cleanup  Clean old WAL files"
    echo "  --status   Show archiving status"
    exit 1
    ;;
esac

exit 0
