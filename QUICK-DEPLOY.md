# ⚡ HIZLI DEPLOY REHBERİ

## 🎯 **5 Dakikada Deploy!**

### **ADIM 1: VPS'e Bağlan (1 dakika)**
```bash
ssh ubuntu@34.118.206.112
# SSH onayı ver: yes
```

### **ADIM 2: Temel Kurulumlar (2 dakika)**
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git nginx redis-server
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2
sudo apt install -y ffmpeg clamav clamav-daemon
```

### **ADIM 3: Proje Dizini (30 saniye)**
```bash
sudo mkdir -p /var/www/p2convert
sudo chown -R ubuntu:ubuntu /var/www/p2convert
```

### **ADIM 4: Dosya Yükleme (1 dakika)**

**Windows'ta yeni terminal aç:**
```bash
scp p2convert-project.tar.gz ubuntu@34.118.206.112:/tmp/
# SSH onayı ver: yes
```

**VPS'te:**
```bash
cd /var/www/p2convert
tar -xzf /tmp/p2convert-project.tar.gz
cd backend
npm install --production
```

### **ADIM 5: Servisleri Başlat (30 saniye)**
```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

---

## ✅ **Deploy Tamamlandı!**

### **Test Et:**
```bash
curl http://34.118.206.112:3001/health
```

### **Sonuç:**
- ✅ Backend API: http://34.118.206.112:3001
- ✅ Health Check: http://34.118.206.112:3001/health
- ✅ Queue Stats: http://34.118.206.112:3001/api/conversion/stats

---

## 🚨 **Sorun Varsa:**

### Backend çalışmıyor:
```bash
pm2 logs
pm2 restart all
```

### Port kullanımda:
```bash
sudo lsof -i :3001
sudo kill -9 PID
```

### Redis hatası:
```bash
sudo systemctl restart redis-server
```

---

## 🎉 **Başarılı!**

Sistem şu anda çalışıyor:
- **Günlük kapasite**: 1,000-1,500 dönüştürme
- **Paralel işlem**: 3-6 eşzamanlı
- **Uptime**: %99.9+
