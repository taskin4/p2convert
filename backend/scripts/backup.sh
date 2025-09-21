#!/bin/bash

# P2Convert Backup Script
# Automated backup system for code, data, and configurations

set -e

# Configuration
BACKUP_DIR="/var/backups/p2convert"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30
APP_DIR="/var/www/p2convert"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Create backup directory
mkdir -p $BACKUP_DIR

print_status "Starting backup process - $DATE"

# 1. Backup application code
print_status "Backing up application code..."
tar -czf "$BACKUP_DIR/p2convert_code_$DATE.tar.gz" \
    --exclude=node_modules \
    --exclude=uploads \
    --exclude=converted \
    --exclude=temp \
    --exclude=logs \
    --exclude=.git \
    -C /var/www p2convert

# 2. Backup Redis data
print_status "Backing up Redis data..."
redis-cli --rdb "$BACKUP_DIR/redis_dump_$DATE.rdb"

# 3. Backup configuration files
print_status "Backing up configuration files..."
tar -czf "$BACKUP_DIR/config_$DATE.tar.gz" \
    /etc/nginx/sites-available/p2convert \
    /etc/redis/redis.conf \
    /etc/systemd/system/p2convert.service \
    /etc/crontab \
    /etc/cron.d/p2convert-backup

# 4. Backup logs (last 7 days)
print_status "Backing up recent logs..."
find /var/log -name "*p2convert*" -mtime -7 -exec tar -czf "$BACKUP_DIR/logs_$DATE.tar.gz" {} +

# 5. Backup PM2 configuration
print_status "Backing up PM2 configuration..."
pm2 save
cp ~/.pm2/dump.pm2 "$BACKUP_DIR/pm2_dump_$DATE.pm2"

# 6. Create backup manifest
print_status "Creating backup manifest..."
cat > "$BACKUP_DIR/manifest_$DATE.txt" << EOF
P2Convert Backup Manifest
========================
Date: $DATE
Backup Type: Full System Backup
Components:
- Application Code
- Redis Database
- Configuration Files
- System Logs (7 days)
- PM2 Configuration

Files:
- p2convert_code_$DATE.tar.gz
- redis_dump_$DATE.rdb
- config_$DATE.tar.gz
- logs_$DATE.tar.gz
- pm2_dump_$DATE.pm2
- manifest_$DATE.txt

Backup Size: $(du -sh $BACKUP_DIR/*_$DATE.* | awk '{sum+=$1} END {print sum}')
EOF

# 7. Compress all backups into single archive
print_status "Creating final backup archive..."
tar -czf "$BACKUP_DIR/p2convert_full_backup_$DATE.tar.gz" \
    -C $BACKUP_DIR \
    p2convert_code_$DATE.tar.gz \
    redis_dump_$DATE.rdb \
    config_$DATE.tar.gz \
    logs_$DATE.tar.gz \
    pm2_dump_$DATE.pm2 \
    manifest_$DATE.txt

# 8. Clean up individual files
rm -f "$BACKUP_DIR/p2convert_code_$DATE.tar.gz"
rm -f "$BACKUP_DIR/redis_dump_$DATE.rdb"
rm -f "$BACKUP_DIR/config_$DATE.tar.gz"
rm -f "$BACKUP_DIR/logs_$DATE.tar.gz"
rm -f "$BACKUP_DIR/pm2_dump_$DATE.pm2"
rm -f "$BACKUP_DIR/manifest_$DATE.txt"

# 9. Clean old backups
print_status "Cleaning old backups (older than $RETENTION_DAYS days)..."
find $BACKUP_DIR -name "p2convert_full_backup_*.tar.gz" -mtime +$RETENTION_DAYS -delete

# 10. Upload to cloud storage (optional)
if [ ! -z "$AWS_S3_BUCKET" ]; then
    print_status "Uploading backup to S3..."
    aws s3 cp "$BACKUP_DIR/p2convert_full_backup_$DATE.tar.gz" \
        "s3://$AWS_S3_BUCKET/backups/p2convert_full_backup_$DATE.tar.gz"
fi

# 11. Send notification (optional)
if [ ! -z "$NOTIFICATION_EMAIL" ]; then
    print_status "Sending backup notification..."
    echo "P2Convert backup completed successfully on $(date)" | \
        mail -s "P2Convert Backup - $DATE" $NOTIFICATION_EMAIL
fi

print_status "✅ Backup completed successfully!"
print_status "Backup file: $BACKUP_DIR/p2convert_full_backup_$DATE.tar.gz"
print_status "Backup size: $(du -sh $BACKUP_DIR/p2convert_full_backup_$DATE.tar.gz | cut -f1)"

# 12. Verify backup integrity
print_status "Verifying backup integrity..."
if tar -tzf "$BACKUP_DIR/p2convert_full_backup_$DATE.tar.gz" > /dev/null; then
    print_status "✅ Backup integrity verified"
else
    print_error "❌ Backup integrity check failed"
    exit 1
fi

print_status "Backup process completed at $(date)"
