#!/bin/bash

# P2Convert Configuration Script
# Bu script VPS'te servisleri yapılandırır

set -e

echo "⚙️ P2Convert servislerini yapılandırıyor..."

# VPS bilgileri
VPS_HOST="34.118.206.112"
VPS_USER="ubuntu"

echo "📋 VPS'te çalıştırılacak konfigürasyon komutları:"
echo ""
echo "1. Environment dosyasını oluştur:"
echo "   cd /var/www/p2convert/backend"
echo "   cp .env.example .env"
echo "   nano .env  # Redis password ve diğer ayarları güncelle"
echo ""
echo "2. Nginx'i yapılandır:"
echo "   sudo cp config/nginx.conf /etc/nginx/sites-available/p2convert"
echo "   sudo ln -s /etc/nginx/sites-available/p2convert /etc/nginx/sites-enabled/"
echo "   sudo rm /etc/nginx/sites-enabled/default"
echo "   sudo nginx -t"
echo "   sudo systemctl restart nginx"
echo ""
echo "3. PM2 ile servisleri başlat:"
echo "   pm2 start ecosystem.config.js --env production"
echo "   pm2 save"
echo "   pm2 startup"
echo ""
echo "4. SSL sertifikası kur (Let's Encrypt):"
echo "   sudo apt install -y certbot python3-certbot-nginx"
echo "   sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com"
echo ""
echo "5. Firewall ayarları:"
echo "   sudo ufw allow 22"
echo "   sudo ufw allow 80"
echo "   sudo ufw allow 443"
echo "   sudo ufw --force enable"
echo ""
echo "6. Monitoring kurulumu:"
echo "   sudo ./scripts/docker-setup.sh"
echo "   sudo ./scripts/security-setup.sh"
echo ""
echo "✅ Konfigürasyon tamamlandı!"
echo "Backend: http://34.118.206.112:3001"
echo "Health: http://34.118.206.112:3001/health"
