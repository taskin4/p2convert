#!/bin/bash

# Nginx Setup Script for P2Convert
# This script configures Nginx as a reverse proxy

set -e

echo "🌐 Setting up Nginx reverse proxy for P2Convert..."

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

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run as root (use sudo)"
    exit 1
fi

# Update system
print_status "Updating system packages..."
apt update

# Install Nginx
print_status "Installing Nginx..."
apt install nginx -y

# Install Certbot for SSL
print_status "Installing Certbot for SSL certificates..."
apt install certbot python3-certbot-nginx -y

# Create Nginx configuration
print_status "Creating Nginx configuration..."
cp nginx.conf /etc/nginx/sites-available/p2convert

# Enable the site
print_status "Enabling P2Convert site..."
ln -sf /etc/nginx/sites-available/p2convert /etc/nginx/sites-enabled/

# Remove default site
print_status "Removing default Nginx site..."
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
print_status "Testing Nginx configuration..."
nginx -t

if [ $? -eq 0 ]; then
    print_status "Nginx configuration is valid"
else
    print_error "Nginx configuration test failed"
    exit 1
fi

# Create log directories
print_status "Creating log directories..."
mkdir -p /var/log/nginx
touch /var/log/nginx/p2convert_access.log
touch /var/log/nginx/p2convert_error.log

# Set proper permissions
chown -R www-data:www-data /var/log/nginx
chmod -R 755 /var/log/nginx

# Start and enable Nginx
print_status "Starting Nginx service..."
systemctl start nginx
systemctl enable nginx

# Configure firewall
print_status "Configuring firewall..."
ufw allow 'Nginx Full'
ufw allow OpenSSH
ufw --force enable

print_status "✅ Nginx setup completed successfully!"

echo ""
print_warning "IMPORTANT: Next steps:"
echo "1. Update domain name in /etc/nginx/sites-available/p2convert"
echo "2. Get SSL certificate: sudo certbot --nginx -d yourdomain.com"
echo "3. Restart Nginx: sudo systemctl restart nginx"
echo ""
print_status "Nginx is now running and ready to serve P2Convert!"
