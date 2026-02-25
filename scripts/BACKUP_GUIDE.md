# AiBake Database Backup and Recovery Guide

## Overview

This guide covers the complete backup and recovery procedures for the AiBake database system. The backup strategy includes:

- **Full Backups**: Complete database dumps with compression and integrity validation
- **Incremental Backups**: WAL (Write-Ahead Log) archiving for point-in-time recovery
- **Integrity Validation**: Checksum verification and backup validation
- **Point-in-Time Recovery (PITR)**: Recovery to any specific point in time
- **Automated Cleanup**: Retention policies for backup management

## Quick Start

### Create a Full Backup

```bash
cd scripts
./backup.sh
```

This creates a compressed backup with timestamp in the current directory.

### Restore from Backup

```bash
cd scripts
./restore.sh --backup aibake_backup_20240115_100000.sql.gz
```

### List Available Backups

```bash
cd scripts
./restore.sh --list
```

## Full Backup System

### Overview

Full backups create complete database dumps using PostgreSQL's `pg_dump` utility. Each backup includes:

- Complete schema (tables, indexes, functions, triggers)
- All data
- Compression (gzip, ~70% reduction)
- MD5 checksum for integrity verification
- Detailed logging

### Creating Full Backups

#### Basic Backup

```bash
./backup.sh
```

Creates backup with default settings:
- Output directory: current directory
- Compression: enabled
- Retention: 30 days
- Validation: disabled

#### Custom Output Directory

```bash
./backup.sh --output /backups/aibake
```

#### Custom Retention Policy

```bash
./backup.sh --retention 60
```

Keeps backups for 60 days instead of default 30 days.

#### With Validation

```bash
./backup.sh --validate
```

Validates backup integrity after creation.

#### Without Compression

```bash
./backup.sh --no-compress
```

Creates uncompressed SQL dump (larger file size).

### Backup File Structure

Each backup creates multiple files:

```
aibake_backup_20240115_100000.sql.gz    # Compressed backup
aibake_backup_20240115_100000.md5       # Checksum file
aibake_backup_20240115_100000.log       # Backup log
```

### Backup Naming Convention

Backups are named with timestamp: `aibake_backup_YYYYMMDD_HHMMSS.sql.gz`

Example: `aibake_backup_20240115_143022.sql.gz` (January 15, 2024 at 14:30:22)

### Backup Validation

#### Checksum Verification

```bash
md5sum -c aibake_backup_20240115_100000.md5
```

Output:
```
aibake_backup_20240115_100000.sql.gz: OK
```

#### Gzip Integrity Check

```bash
gzip -t aibake_backup_20240115_100000.sql.gz
```

No output means the file is valid.

#### Manual Validation

```bash
# Decompress and check SQL syntax
gzip -dc aibake_backup_20240115_100000.sql.gz | head -100
```

Should show PostgreSQL dump header:
```sql
--
-- PostgreSQL database dump
--
```

### Backup Scheduling

#### Using Cron (Linux/macOS)

```bash
# Daily backup at 2 AM
0 2 * * * cd /path/to/aibake/scripts && ./backup.sh --output /backups/aibake

# Weekly backup on Sunday at 3 AM
0 3 * * 0 cd /path/to/aibake/scripts && ./backup.sh --output /backups/aibake --retention 90
```

#### Using Docker Compose

Create a backup service in `docker-compose.yml`:

```yaml
backup:
  image: postgres:15
  volumes:
    - ./scripts:/scripts
    - ./backups:/backups
  environment:
    - DATABASE_URL=postgresql://aibake_user:aibakepassword@postgres:5432/aibake_db
  command: >
    sh -c "
    while true; do
      /scripts/backup.sh --output /backups
      sleep 86400
    done
    "
  depends_on:
    - postgres
```

## Incremental Backup System (WAL Archiving)

### Overview

WAL (Write-Ahead Log) archiving enables point-in-time recovery by continuously archiving database transaction logs. This allows recovery to any specific point in time, not just to the time of the last full backup.

### How WAL Archiving Works

1. PostgreSQL writes all changes to WAL files before applying them
2. WAL files are archived to a designated directory
3. Combined with a full backup, WAL files enable recovery to any point in time
4. Old WAL files are automatically cleaned up based on retention policy

### Setup WAL Archiving

#### Step 1: Initialize WAL Archiving

```bash
./backup-incremental.sh --setup
```

This creates:
- WAL archive directory
- Archive and restore scripts
- Setup guide

#### Step 2: Configure PostgreSQL

Edit PostgreSQL configuration (`postgresql.conf`):

```ini
# Enable WAL archiving
wal_level = replica
archive_mode = on
archive_command = '/path/to/scripts/backup-incremental.sh --archive'
archive_timeout = 300
```

For Docker Compose, add to `docker-compose.yml`:

```yaml
postgres:
  environment:
    - POSTGRES_INITDB_ARGS=-c wal_level=replica -c archive_mode=on -c archive_command='/scripts/backup-incremental.sh --archive'
```

#### Step 3: Restart PostgreSQL

```bash
docker-compose restart postgres
```

#### Step 4: Verify Archiving

```bash
./backup-incremental.sh --status
```

Output:
```
ℹ WAL Archiving Status

ℹ Archived WAL files: 42
ℹ Archive directory size: 256M
ℹ Oldest WAL: 000000010000000000000001
ℹ Newest WAL: 00000001000000000000002A

ℹ PostgreSQL Archiving Configuration:
  archive_mode: on
  wal_level: replica
```

### Managing WAL Archives

#### Archive WAL Files

```bash
./backup-incremental.sh --archive
```

Manually archives pending WAL files (usually done automatically).

#### Clean Old WAL Files

```bash
./backup-incremental.sh --cleanup
```

Removes WAL files older than retention period (default: 30 days).

#### Check Archiving Status

```bash
./backup-incremental.sh --status
```

Shows current archiving status and configuration.

### WAL Archive Maintenance

#### Monitor Archive Size

```bash
du -sh wal_archive/
```

#### List Recent WAL Files

```bash
ls -lh wal_archive/ | tail -20
```

#### Calculate Archive Growth

```bash
# Daily growth rate
du -sh wal_archive/ > /tmp/size1.txt
sleep 86400
du -sh wal_archive/ > /tmp/size2.txt
diff /tmp/size1.txt /tmp/size2.txt
```

## Point-in-Time Recovery (PITR)

### Overview

Point-in-time recovery allows you to restore the database to any specific point in time, not just to the time of the last backup. This is critical for:

- Recovering from accidental data deletion
- Recovering from application bugs
- Auditing database state at specific times
- Testing recovery procedures

### Prerequisites

1. Full backup created with `backup.sh`
2. WAL archiving enabled and configured
3. WAL files available for the recovery period
4. Target recovery time

### PITR Recovery Steps

#### Step 1: Stop PostgreSQL

```bash
docker-compose stop postgres
```

#### Step 2: Restore Base Backup

```bash
./restore.sh --backup aibake_backup_20240115_100000.sql.gz
```

#### Step 3: Create Recovery Configuration

Create `recovery.conf` in PostgreSQL data directory:

```bash
cat > /var/lib/postgresql/data/recovery.conf << 'EOF'
restore_command = 'cp /path/to/wal_archive/%f %p'
recovery_target_time = '2024-01-15 12:00:00'
recovery_target_timeline = 'latest'
EOF
```

For Docker Compose:

```bash
docker-compose exec postgres bash -c 'cat > /var/lib/postgresql/data/recovery.conf << EOF
restore_command = '"'"'cp /wal_archive/%f %p'"'"'
recovery_target_time = '"'"'2024-01-15 12:00:00'"'"'
recovery_target_timeline = '"'"'latest'"'"'
EOF'
```

#### Step 4: Start PostgreSQL

```bash
docker-compose start postgres
```

PostgreSQL will automatically enter recovery mode and restore to the specified time.

#### Step 5: Monitor Recovery

```bash
docker-compose logs -f postgres
```

Look for messages like:
```
LOG: database system was interrupted; last known up at 2024-01-15 14:30:22 UTC
LOG: starting archive recovery
LOG: restored log file "000000010000000000000001" from archive
...
LOG: recovery complete at 2024-01-15 12:00:00 UTC
LOG: database system is ready to accept connections
```

#### Step 6: Verify Recovery

```bash
docker-compose exec postgres psql -U aibake_user -d aibake_db -c "SELECT COUNT(*) FROM recipes;"
```

### PITR Recovery Scenarios

#### Recover to Specific Time

```bash
recovery_target_time = '2024-01-15 12:00:00'
```

#### Recover to Specific Transaction

```bash
recovery_target_xid = '12345'
```

#### Recover to Latest Available

```bash
recovery_target_timeline = 'latest'
```

#### Recover to Specific Timeline

```bash
recovery_target_timeline = '1'
```

### PITR Limitations

- Can only recover to times when WAL files are available
- Requires sufficient disk space for WAL archive
- Recovery time depends on amount of WAL data
- Cannot recover beyond the oldest available WAL file

## Restore Procedures

### Full Restore

#### Basic Restore

```bash
./restore.sh --backup aibake_backup_20240115_100000.sql.gz
```

#### Restore with Validation

```bash
./restore.sh --backup aibake_backup_20240115_100000.sql.gz --validate
```

#### Restore Without Validation

```bash
./restore.sh --backup aibake_backup_20240115_100000.sql.gz --no-validate
```

### Restore Validation

The restore script automatically validates:

1. **Backup file integrity**: Checks gzip compression
2. **Checksum verification**: Compares MD5 checksums
3. **Database connectivity**: Verifies connection to target database
4. **Restore success**: Counts tables and data after restore

### Restore Verification

After restore completes, verify the database:

```bash
# Check table count
docker-compose exec postgres psql -U aibake_user -d aibake_db -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"

# Check data counts
docker-compose exec postgres psql -U aibake_user -d aibake_db -c "SELECT COUNT(*) FROM recipes; SELECT COUNT(*) FROM ingredient_master;"

# Check indexes
docker-compose exec postgres psql -U aibake_user -d aibake_db -c "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public';"
```

## Backup Storage

### Local Storage

Store backups on the same machine:

```bash
./backup.sh --output ./backups
```

**Pros**: Fast, simple
**Cons**: Not protected from hardware failure

### External Storage

#### USB Drive

```bash
./backup.sh --output /mnt/usb_backup
```

#### Network Storage (NFS)

```bash
# Mount NFS
sudo mount -t nfs server:/export/backups /mnt/nfs_backup

# Create backup
./backup.sh --output /mnt/nfs_backup
```

#### Cloud Storage (AWS S3)

```bash
# Install AWS CLI
pip install awscli

# Create backup and upload
./backup.sh --output /tmp/backup
aws s3 cp /tmp/backup/aibake_backup_*.sql.gz s3://my-bucket/aibake-backups/
```

#### Cloud Storage (Cloudflare R2)

```bash
# Configure R2 credentials
aws configure --profile r2

# Upload backup
aws s3 cp /tmp/backup/aibake_backup_*.sql.gz s3://my-bucket/aibake-backups/ --profile r2
```

### Backup Retention Policy

#### Local Retention

Keep last 30 days of backups:

```bash
./backup.sh --retention 30
```

#### Archive Old Backups

```bash
# Move backups older than 30 days to archive
find ./backups -name "aibake_backup_*.sql.gz" -mtime +30 -exec mv {} ./archive/ \;
```

#### Delete Old Backups

```bash
# Delete backups older than 90 days
find ./backups -name "aibake_backup_*.sql.gz" -mtime +90 -delete
```

## Disaster Recovery Plan

### Recovery Time Objective (RTO)

- **Full restore**: 5-15 minutes (depending on backup size)
- **PITR restore**: 15-30 minutes (depending on WAL data)

### Recovery Point Objective (RPO)

- **Full backups**: 24 hours (daily backups)
- **WAL archiving**: 5 minutes (archive timeout)

### Disaster Recovery Checklist

- [ ] Backup files are accessible
- [ ] Checksums are verified
- [ ] WAL archive is available (for PITR)
- [ ] PostgreSQL client tools are installed
- [ ] Database credentials are available
- [ ] Target database is accessible
- [ ] Sufficient disk space for restore
- [ ] Recovery procedure is documented
- [ ] Recovery procedure is tested monthly

### Testing Recovery Procedures

#### Monthly Recovery Test

```bash
# 1. Create test database
docker-compose exec postgres createdb -U aibake_user aibake_test

# 2. Restore to test database
PGDATABASE=aibake_test ./restore.sh --backup aibake_backup_20240115_100000.sql.gz

# 3. Verify test database
docker-compose exec postgres psql -U aibake_user -d aibake_test -c "SELECT COUNT(*) FROM recipes;"

# 4. Drop test database
docker-compose exec postgres dropdb -U aibake_user aibake_test
```

#### PITR Recovery Test

```bash
# 1. Create test database
docker-compose exec postgres createdb -U aibake_user aibake_pitr_test

# 2. Restore base backup
PGDATABASE=aibake_pitr_test ./restore.sh --backup aibake_backup_20240115_100000.sql.gz

# 3. Test PITR recovery
./restore.sh --pitr --time "2024-01-15 12:00:00"

# 4. Verify recovery
docker-compose exec postgres psql -U aibake_user -d aibake_pitr_test -c "SELECT COUNT(*) FROM recipes;"

# 5. Drop test database
docker-compose exec postgres dropdb -U aibake_user aibake_pitr_test
```

## Troubleshooting

### Backup Creation Issues

#### "pg_dump not found"

```bash
# Install PostgreSQL client tools
# macOS
brew install postgresql

# Ubuntu/Debian
sudo apt-get install postgresql-client

# CentOS/RHEL
sudo yum install postgresql
```

#### "Failed to connect to database"

```bash
# Check database is running
docker-compose ps postgres

# Check credentials in .env
cat .env | grep DATABASE_URL

# Test connection manually
psql $DATABASE_URL
```

#### "Permission denied" on backup directory

```bash
# Create backup directory with proper permissions
mkdir -p ./backups
chmod 755 ./backups
```

### Restore Issues

#### "Backup file not found"

```bash
# List available backups
./restore.sh --list

# Use full path to backup file
./restore.sh --backup /full/path/to/backup.sql.gz
```

#### "Checksum mismatch"

```bash
# Backup file may be corrupted
# Try restoring from another backup
./restore.sh --backup aibake_backup_20240114_100000.sql.gz

# Or skip validation
./restore.sh --backup aibake_backup_20240115_100000.sql.gz --no-validate
```

#### "Database restore failed"

```bash
# Check restore log for details
cat aibake_backup_20240115_100000.restore.log

# Verify database is accessible
docker-compose exec postgres psql -U aibake_user -d aibake_db -c "SELECT 1;"

# Try restoring to a test database
PGDATABASE=aibake_test ./restore.sh --backup aibake_backup_20240115_100000.sql.gz
```

### WAL Archiving Issues

#### "WAL files not being archived"

```bash
# Check PostgreSQL configuration
docker-compose exec postgres psql -U aibake_user -d aibake_db -c "SHOW archive_mode;"
docker-compose exec postgres psql -U aibake_user -d aibake_db -c "SHOW archive_command;"

# Check archive directory
ls -la wal_archive/

# Check PostgreSQL logs
docker-compose logs postgres | grep archive
```

#### "Archive directory full"

```bash
# Check archive size
du -sh wal_archive/

# Clean old WAL files
./backup-incremental.sh --cleanup

# Increase retention if needed
WAL_RETENTION_DAYS=60 ./backup-incremental.sh --cleanup
```

## Performance Considerations

### Backup Performance

- **Backup size**: Typically 20-30% of database size after compression
- **Backup time**: 1-5 minutes for typical database
- **Compression ratio**: ~70% reduction with gzip -9
- **CPU usage**: High during compression phase

### Restore Performance

- **Restore time**: 2-10 minutes depending on backup size
- **Disk I/O**: High during restore
- **Memory usage**: Moderate (connection pooling)

### Optimization Tips

1. **Schedule backups during low-traffic periods**
   ```bash
   # 2 AM backup
   0 2 * * * cd /path/to/scripts && ./backup.sh
   ```

2. **Use external storage for backups**
   - Reduces local disk I/O
   - Protects from hardware failure

3. **Compress backups**
   - Reduces storage by ~70%
   - Minimal CPU overhead

4. **Archive old backups**
   - Keep recent backups locally
   - Archive older backups to cloud storage

## Security Considerations

### Backup File Protection

```bash
# Restrict backup file permissions
chmod 600 aibake_backup_*.sql.gz

# Encrypt backups
gpg --symmetric aibake_backup_20240115_100000.sql.gz

# Decrypt for restore
gpg --decrypt aibake_backup_20240115_100000.sql.gz.gpg | gzip -dc | psql
```

### Credentials Protection

```bash
# Don't store credentials in backup scripts
# Use .env file with restricted permissions
chmod 600 .env

# Or use environment variables
export DATABASE_URL="postgresql://user:pass@host/db"
```

### Backup Storage Security

- Store backups in secure location
- Restrict access to backup files
- Use encrypted storage for sensitive backups
- Consider off-site backup storage

## Monitoring and Alerting

### Backup Monitoring

```bash
# Check backup status
ls -lh backups/aibake_backup_*.sql.gz | tail -5

# Monitor backup size growth
du -sh backups/

# Check backup age
find backups/ -name "aibake_backup_*.sql.gz" -mtime +1 -exec echo "Old backup: {}" \;
```

### Alerting Setup

#### Email Alert on Backup Failure

```bash
#!/bin/bash
if ! ./backup.sh; then
  echo "Backup failed" | mail -s "AiBake Backup Alert" admin@example.com
fi
```

#### Slack Alert on Backup Failure

```bash
#!/bin/bash
if ! ./backup.sh; then
  curl -X POST -H 'Content-type: application/json' \
    --data '{"text":"AiBake backup failed"}' \
    $SLACK_WEBHOOK_URL
fi
```

## References

- [PostgreSQL Backup and Restore](https://www.postgresql.org/docs/current/backup.html)
- [PostgreSQL WAL Archiving](https://www.postgresql.org/docs/current/continuous-archiving.html)
- [Point-in-Time Recovery](https://www.postgresql.org/docs/current/runtime-config-wal.html)
- [pg_dump Documentation](https://www.postgresql.org/docs/current/app-pgdump.html)
- [pg_restore Documentation](https://www.postgresql.org/docs/current/app-pgrestore.html)

## Support

For issues or questions:

1. Check this guide
2. Review backup/restore logs
3. Check PostgreSQL logs: `docker-compose logs postgres`
4. Verify database connectivity: `psql $DATABASE_URL`
5. Test backup/restore procedures monthly
