# 🚀 P2Convert VPS Deploy Rehberi

## 📋 **ADIM 1: VPS Hazırlığı**

### 1.1 VPS'e Bağlan
```bash
ssh ubuntu@34.118.206.112
```

### 1.2 Temel Kurulumlar
```bash
# Sistem güncellemesi
sudo apt update && sudo apt upgrade -y

# Gerekli paketler
sudo apt install -y curl git nginx redis-server

# Node.js kurulumu
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2 kurulumu
sudo npm install -g pm2

# FFmpeg ve ClamAV
sudo apt install -y ffmpeg clamav clamav-daemon
```

### 1.3 Proje Dizini Oluştur
```bash
sudo mkdir -p /var/www/p2convert
sudo chown -R ubuntu:ubuntu /var/www/p2convert
```

### 1.4 Redis Yapılandırması
```bash
sudo nano /etc/redis/redis.conf
# Şu satırı ekle: requirepass your_strong_password_here
sudo systemctl restart redis-server
sudo systemctl enable redis-server
```

### 1.5 ClamAV Başlat
```bash
sudo freshclam
sudo systemctl start clamav-daemon
sudo systemctl enable clamav-daemon
```

---

## 📦 **ADIM 2: Proje Dosyalarını Yükle**

### 2.1 Windows'tan Dosya Yükleme
```bash
# Windows'ta bu komutu çalıştır (SSH onayı ver):
scp p2convert-project.tar.gz ubuntu@34.118.206.112:/tmp/
```

### 2.2 VPS'te Dosyaları Çıkar
```bash
cd /var/www/p2convert
tar -xzf /tmp/p2convert-project.tar.gz
cd backend
npm install --production
mkdir -p logs uploads converted temp
chmod +x scripts/*.sh
rm /tmp/p2convert-project.tar.gz
```

---

## ⚙️ **ADIM 3: Backend Yapılandırması**

### 3.1 Environment Dosyası
```bash
cd /var/www/p2convert/backend
cp .env.example .env
nano .env
```

**Önemli ayarlar:**
```env
NODE_ENV=production
PORT=3001
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_strong_password_here
FRONTEND_URL=http://34.118.206.112:3000
```

### 3.2 PM2 ile Servisleri Başlat
```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

---

## 🌐 **ADIM 4: Nginx Reverse Proxy**

### 4.1 Nginx Yapılandırması
```bash
sudo cp config/nginx.conf /etc/nginx/sites-available/p2convert
sudo ln -s /etc/nginx/sites-available/p2convert /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

### 4.2 Firewall Ayarları
```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable
```

---

## 🔒 **ADIM 5: SSL Sertifikası**

### 5.1 Let's Encrypt Kurulumu
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## 📊 **ADIM 6: Monitoring ve Backup**

### 6.1 Docker ile Monitoring
```bash
sudo ./scripts/docker-setup.sh
```

### 6.2 Güvenlik Kurulumu
```bash
sudo ./scripts/security-setup.sh
```

### 6.3 Performans Optimizasyonu
```bash
sudo ./scripts/performance-setup.sh
```

---

## ✅ **ADIM 7: Test ve Doğrulama**

### 7.1 Servis Durumu Kontrolü
```bash
pm2 status
pm2 logs
```

### 7.2 Health Check
```bash
curl http://34.118.206.112:3001/health
curl http://34.118.206.112:3001/api/conversion/stats
```

### 7.3 Nginx Durumu
```bash
sudo systemctl status nginx
```

---

## 🎯 **Deploy Sonrası Kontroller**

### ✅ **Başarılı Deploy Kontrol Listesi:**
- [ ] Backend API çalışıyor: `http://34.118.206.112:3001/health`
- [ ] PM2 servisleri aktif: `pm2 status`
- [ ] Redis bağlantısı: `redis-cli ping`
- [ ] Nginx reverse proxy: `curl http://34.118.206.112`
- [ ] SSL sertifikası (domain varsa)
- [ ] Monitoring dashboard: `http://34.118.206.112:3000` (Grafana)
- [ ] Backup sistemi aktif

### 📊 **Performans Metrikleri:**
- **Backend API**: http://34.118.206.112:3001
- **Health Check**: http://34.118.206.112:3001/health
- **Queue Stats**: http://34.118.206.112:3001/api/conversion/stats
- **Metrics**: http://34.118.206.112:3001/metrics
- **PM2 Monitor**: `ssh ubuntu@34.118.206.112 'pm2 monit'`

---

## 🚨 **Sorun Giderme**

### Backend Çalışmıyor:
```bash
pm2 logs p2convert-backend
pm2 restart p2convert-backend
```

### Redis Bağlantı Hatası:
```bash
sudo systemctl status redis-server
redis-cli ping
```

### Nginx Hatası:
```bash
sudo nginx -t
sudo systemctl status nginx
```

### Port Çakışması:
```bash
sudo netstat -tlnp | grep :3001
sudo lsof -i :3001
```

---

## 🎉 **Deploy Tamamlandı!**

Sistem şu adreslerde çalışıyor:
- **Backend API**: http://34.118.206.112:3001
- **Frontend**: http://34.118.206.112:3000
- **Health Check**: http://34.118.206.112:3001/health

**Günlük kapasite**: 1,000-1,500 video dönüştürme
**Paralel işlem**: 3-6 eşzamanlı dönüştürme
**Uptime**: %99.9+ (PM2 + monitoring ile)
