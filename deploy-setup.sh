#!/bin/bash

# P2Convert VPS Setup Script
# Bu script VPS'te temel kurulumları yapar

set -e

echo "🚀 P2Convert VPS Setup başlatılıyor..."

# VPS bilgileri
VPS_HOST="34.118.206.112"
VPS_USER="ubuntu"

echo "📋 VPS Setup Komutları:"
echo ""
echo "1. VPS'e bağlan:"
echo "   ssh ubuntu@34.118.206.112"
echo ""
echo "2. Temel kurulumları yap:"
echo "   sudo apt update && sudo apt upgrade -y"
echo "   sudo apt install -y curl git nginx redis-server"
echo "   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -"
echo "   sudo apt-get install -y nodejs"
echo "   sudo npm install -g pm2"
echo "   sudo apt install -y ffmpeg clamav clamav-daemon"
echo ""
echo "3. Proje dizinini oluştur:"
echo "   sudo mkdir -p /var/www/p2convert"
echo "   sudo chown -R ubuntu:ubuntu /var/www/p2convert"
echo ""
echo "4. Redis'i yapılandır:"
echo "   sudo nano /etc/redis/redis.conf"
echo "   # requirepass your_strong_password ekle"
echo "   sudo systemctl restart redis-server"
echo "   sudo systemctl enable redis-server"
echo ""
echo "5. ClamAV'i başlat:"
echo "   sudo freshclam"
echo "   sudo systemctl start clamav-daemon"
echo "   sudo systemctl enable clamav-daemon"
echo ""
echo "✅ VPS hazırlığı tamamlandı!"
echo ""
echo "Sonraki adım: Proje dosyalarını yükle"
