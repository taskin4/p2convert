#!/bin/bash

# P2Convert Backend Deployment Script
# This script deploys the backend to the VPS

set -e

echo "🚀 Starting P2Convert Backend Deployment..."

# Configuration
VPS_HOST="34.118.206.112"
VPS_USER="ubuntu"
APP_DIR="/var/www/p2convert"
BACKEND_DIR="$APP_DIR/backend"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "backend" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

print_status "Deploying to VPS: $VPS_HOST"

# Step 1: Create deployment package
print_status "Creating deployment package..."
tar -czf p2convert-backend.tar.gz backend/ --exclude=backend/node_modules --exclude=backend/logs

# Step 2: Upload to VPS
print_status "Uploading to VPS..."
scp p2convert-backend.tar.gz $VPS_USER@$VPS_HOST:/tmp/

# Step 3: Deploy on VPS
print_status "Deploying on VPS..."
ssh $VPS_USER@$VPS_HOST << 'EOF'
    set -e
    
    echo "📦 Extracting backend files..."
    cd /var/www/p2convert
    tar -xzf /tmp/p2convert-backend.tar.gz
    
    echo "📦 Installing dependencies..."
    cd backend
    npm install --production
    
    echo "🔧 Setting up directories..."
    mkdir -p logs
    mkdir -p uploads
    mkdir -p converted
    mkdir -p temp
    
    echo "🔐 Setting permissions..."
    chown -R www-data:www-data /var/www/p2convert
    chmod -R 755 /var/www/p2convert
    
    echo "🔄 Restarting services..."
    pm2 stop ecosystem.config.js || true
    pm2 start ecosystem.config.js --env production
    
    echo "🧹 Cleaning up..."
    rm /tmp/p2convert-backend.tar.gz
    
    echo "✅ Deployment completed!"
    pm2 status
EOF

# Step 4: Clean up local files
print_status "Cleaning up local files..."
rm p2convert-backend.tar.gz

print_status "🎉 Deployment completed successfully!"
print_status "Backend is now running on: http://$VPS_HOST:3001"
print_status "Health check: http://$VPS_HOST:3001/health"

# Step 5: Show PM2 status
print_status "Checking PM2 status..."
ssh $VPS_USER@$VPS_HOST "pm2 status"

echo ""
print_status "Deployment Summary:"
echo "  - Backend API: http://$VPS_HOST:3001"
echo "  - Health Check: http://$VPS_HOST:3001/health"
echo "  - Queue Stats: http://$VPS_HOST:3001/api/conversion/stats"
echo "  - PM2 Monitor: ssh $VPS_USER@$VPS_HOST 'pm2 monit'"
echo "  - Logs: ssh $VPS_USER@$VPS_HOST 'pm2 logs'"
