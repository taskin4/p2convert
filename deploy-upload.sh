#!/bin/bash

# P2Convert Project Upload Script
# Bu script proje dosyalarını VPS'e yükler

set -e

echo "📦 P2Convert proje dosyalarını VPS'e yüklüyor..."

# VPS bilgileri
VPS_HOST="34.118.206.112"
VPS_USER="ubuntu"
APP_DIR="/var/www/p2convert"

# Proje dosyalarını paketle
echo "📦 Proje dosyalarını paketliyor..."
tar -czf p2convert-project.tar.gz \
    --exclude=node_modules \
    --exclude=backend/node_modules \
    --exclude=uploads \
    --exclude=converted \
    --exclude=convertedcls \
    --exclude=.git \
    --exclude=*.log \
    .

echo "📤 VPS'e yükleniyor..."
scp p2convert-project.tar.gz $VPS_USER@$VPS_HOST:/tmp/

echo "📋 VPS'te çalıştırılacak komutlar:"
echo ""
echo "ssh ubuntu@34.118.206.112"
echo "cd /var/www/p2convert"
echo "tar -xzf /tmp/p2convert-project.tar.gz"
echo "cd backend"
echo "npm install --production"
echo "mkdir -p logs uploads converted temp"
echo "chmod +x scripts/*.sh"
echo "rm /tmp/p2convert-project.tar.gz"
echo ""
echo "✅ Proje dosyaları yüklendi!"
echo "Şimdi VPS'e bağlanıp yukarıdaki komutları çalıştır"
