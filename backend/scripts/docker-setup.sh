#!/bin/bash

# Docker Setup Script for P2Convert
# This script sets up Docker and Docker Compose for P2Convert

set -e

echo "🐳 Setting up Docker for P2Convert..."

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

# Install Docker
print_status "Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
rm get-docker.sh

# Install Docker Compose
print_status "Installing Docker Compose..."
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Add current user to docker group
print_status "Adding current user to docker group..."
usermod -aG docker $SUDO_USER

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p uploads converted temp logs ssl
chmod 755 uploads converted temp logs ssl

# Copy environment file
print_status "Setting up environment file..."
if [ ! -f .env ]; then
    cp .env.example .env
    print_warning "Please edit .env file with your configuration"
fi

# Set proper permissions
print_status "Setting proper permissions..."
chown -R $SUDO_USER:$SUDO_USER .

# Create systemd service for Docker Compose
print_status "Creating systemd service..."
cat > /etc/systemd/system/p2convert.service << EOF
[Unit]
Description=P2Convert Docker Compose
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$(pwd)
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

# Enable the service
systemctl daemon-reload
systemctl enable p2convert.service

# Start Docker service
print_status "Starting Docker service..."
systemctl start docker

# Build and start containers
print_status "Building and starting containers..."
docker-compose build
docker-compose up -d

# Wait for services to be ready
print_status "Waiting for services to be ready..."
sleep 30

# Check service status
print_status "Checking service status..."
docker-compose ps

print_status "✅ Docker setup completed successfully!"

echo ""
print_status "Services are now running:"
echo "  - Backend API: http://localhost:3001"
echo "  - Grafana Dashboard: http://localhost:3000 (admin/admin)"
echo "  - Prometheus: http://localhost:9090"
echo "  - Redis: localhost:6379"
echo ""
print_warning "Next steps:"
echo "1. Edit .env file with your configuration"
echo "2. Restart services: sudo systemctl restart p2convert"
echo "3. Check logs: docker-compose logs -f"
echo "4. Access Grafana dashboard to configure monitoring"
echo ""
print_status "Docker setup is complete! 🐳"
