# 🐙 GitHub Repository Kurulumu

## 📋 **ADIM 1: GitHub'da Repository Oluştur**

### 1. GitHub'a Git:
- https://github.com adresine git
- "New repository" butonuna tıkla

### 2. Repository Ayarları:
- **Repository name**: `p2convert`
- **Description**: `P2Convert - Professional Video Converter with Queue System`
- **Visibility**: Public (veya Private)
- **Initialize**: ❌ README, .gitignore, license ekleme (bizde zaten var)

### 3. Repository Oluştur:
- "Create repository" butonuna tıkla

---

## 📤 **ADIM 2: Projeyi GitHub'a Push Et**

### Windows'ta bu komutları çalıştır:

```bash
# GitHub repository URL'ini ekle (senin kullanıcı adın ile değiştir)
git remote add origin https://github.com/KULLANICI_ADIN/p2convert.git

# Ana branch'i main olarak ayarla
git branch -M main

# GitHub'a push et
git push -u origin main
```

### Örnek:
```bash
git remote add origin https://github.com/taskin/p2convert.git
git branch -M main
git push -u origin main
```

---

## ✅ **ADIM 3: VPS'te Clone Et**

### VPS'e bağlan:
```bash
ssh ubuntu@34.118.206.112
```

### Projeyi clone et:
```bash
cd /var/www/p2convert
git clone https://github.com/KULLANICI_ADIN/p2convert.git .
```

### Backend'i kur:
```bash
cd backend
npm install --production
```

---

## 🎯 **Hızlı Deploy Komutları**

### VPS'te tek seferde:
```bash
# Temel kurulumlar
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git nginx redis-server
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2
sudo apt install -y ffmpeg clamav clamav-daemon

# Proje dizini
sudo mkdir -p /var/www/p2convert
sudo chown -R ubuntu:ubuntu /var/www/p2convert

# Projeyi clone et
cd /var/www/p2convert
git clone https://github.com/KULLANICI_ADIN/p2convert.git .

# Backend kurulumu
cd backend
npm install --production
mkdir -p logs uploads converted temp

# Environment dosyası
cp .env.example .env
nano .env  # Redis password ve diğer ayarları güncelle

# Servisleri başlat
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

---

## 🚀 **Deploy Tamamlandı!**

### Test Et:
```bash
curl http://34.118.206.112:3001/health
```

### Sonuç:
- ✅ Backend API: http://34.118.206.112:3001
- ✅ Health Check: http://34.118.206.112:3001/health
- ✅ Queue Stats: http://34.118.206.112:3001/api/conversion/stats

---

## 📝 **Notlar:**

1. **GitHub kullanıcı adını** yukarıdaki komutlarda değiştirmeyi unutma
2. **Repository URL'i** doğru olduğundan emin ol
3. **SSH key** kurulu değilse HTTPS kullan
4. **Environment dosyasını** mutlaka güncelle (.env)

---

## 🔄 **Güncelleme Süreci:**

### Kod değişikliği sonrası:
```bash
# Local'de
git add .
git commit -m "Update: description"
git push origin main

# VPS'te
cd /var/www/p2convert
git pull origin main
pm2 restart all
```


