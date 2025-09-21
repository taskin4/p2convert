#!/bin/bash

# P2Convert Restore Script
# Restore system from backup

set -e

# Configuration
BACKUP_DIR="/var/backups/p2convert"
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

# Check if backup file is provided
if [ -z "$1" ]; then
    print_error "Usage: $0 <backup_file>"
    print_error "Example: $0 p2convert_full_backup_20240101_120000.tar.gz"
    exit 1
fi

BACKUP_FILE="$1"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_FILE"

if [ ! -f "$BACKUP_PATH" ]; then
    print_error "Backup file not found: $BACKUP_PATH"
    exit 1
fi

print_status "Starting restore process from: $BACKUP_FILE"
print_warning "This will overwrite current system data. Continue? (y/N)"
read -r response
if [[ ! "$response" =~ ^[Yy]$ ]]; then
    print_status "Restore cancelled"
    exit 0
fi

# Create temporary restore directory
RESTORE_TEMP="/tmp/p2convert_restore_$(date +%s)"
mkdir -p "$RESTORE_TEMP"

print_status "Extracting backup to temporary directory..."
tar -xzf "$BACKUP_PATH" -C "$RESTORE_TEMP"

# 1. Stop services
print_status "Stopping services..."
systemctl stop p2convert || true
pm2 stop all || true
systemctl stop redis-server || true
systemctl stop nginx || true

# 2. Restore application code
print_status "Restoring application code..."
if [ -f "$RESTORE_TEMP/p2convert_code_"*.tar.gz ]; then
    rm -rf "$APP_DIR"
    mkdir -p "$APP_DIR"
    tar -xzf "$RESTORE_TEMP/p2convert_code_"*.tar.gz -C /var/www/
    chown -R www-data:www-data "$APP_DIR"
fi

# 3. Restore Redis data
print_status "Restoring Redis data..."
if [ -f "$RESTORE_TEMP/redis_dump_"*.rdb ]; then
    cp "$RESTORE_TEMP/redis_dump_"*.rdb /var/lib/redis/dump.rdb
    chown redis:redis /var/lib/redis/dump.rdb
fi

# 4. Restore configuration files
print_status "Restoring configuration files..."
if [ -f "$RESTORE_TEMP/config_"*.tar.gz ]; then
    tar -xzf "$RESTORE_TEMP/config_"*.tar.gz -C /
fi

# 5. Restore PM2 configuration
print_status "Restoring PM2 configuration..."
if [ -f "$RESTORE_TEMP/pm2_dump_"*.pm2 ]; then
    cp "$RESTORE_TEMP/pm2_dump_"*.pm2 ~/.pm2/dump.pm2
fi

# 6. Install dependencies
print_status "Installing application dependencies..."
cd "$APP_DIR/backend"
npm install --production

# 7. Start services
print_status "Starting services..."
systemctl start redis-server
sleep 5
systemctl start nginx
sleep 5
pm2 resurrect
systemctl start p2convert

# 8. Verify services
print_status "Verifying services..."
sleep 10

# Check Redis
if redis-cli ping | grep -q "PONG"; then
    print_status "✅ Redis is running"
else
    print_error "❌ Redis is not responding"
fi

# Check Nginx
if systemctl is-active --quiet nginx; then
    print_status "✅ Nginx is running"
else
    print_error "❌ Nginx is not running"
fi

# Check PM2
if pm2 list | grep -q "online"; then
    print_status "✅ PM2 processes are running"
else
    print_error "❌ PM2 processes are not running"
fi

# Check backend health
if curl -f http://localhost:3001/health > /dev/null 2>&1; then
    print_status "✅ Backend API is responding"
else
    print_error "❌ Backend API is not responding"
fi

# 9. Clean up
print_status "Cleaning up temporary files..."
rm -rf "$RESTORE_TEMP"

print_status "✅ Restore process completed!"
print_warning "Please verify all services are working correctly:"
print_warning "- Check application functionality"
print_warning "- Verify data integrity"
print_warning "- Test file uploads and conversions"
print_warning "- Monitor logs for any errors"

print_status "Restore completed at $(date)"
