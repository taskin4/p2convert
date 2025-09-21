# 📤 Proje Dosyalarını VPS'e Yükleme Yöntemleri

## 🎯 **Yöntem 1: SCP ile Direkt Yükleme (Önerilen)**

### Windows'ta:
```bash
# 1. SSH onayı ver (ilk seferde)
ssh ubuntu@34.118.206.112

# 2. Dosyayı yükle
scp p2convert-project.tar.gz ubuntu@34.118.206.112:/tmp/
```

### VPS'te:
```bash
cd /var/www/p2convert
tar -xzf /tmp/p2convert-project.tar.gz
```

---

## 🎯 **Yöntem 2: Git ile Yükleme**

### VPS'te:
```bash
cd /var/www/p2convert
git clone https://github.com/yourusername/p2convert.git .
# veya
git pull origin main
```

---

## 🎯 **Yöntem 3: SFTP ile Yükleme**

### Windows'ta WinSCP veya FileZilla kullan:
- **Host**: 34.118.206.112
- **User**: ubuntu
- **Port**: 22
- **Protocol**: SFTP

### Dosyaları /tmp/ klasörüne yükle

---

## 🎯 **Yöntem 4: Manuel Upload**

### 1. GitHub'a Push Et:
```bash
git add .
git commit -m "Production ready backend"
git push origin main
```

### 2. VPS'te Clone Et:
```bash
cd /var/www/p2convert
git clone https://github.com/yourusername/p2convert.git .
```

---

## 🎯 **Yöntem 5: Cloud Storage (Gelecek için)**

### AWS S3, Google Drive, Dropbox kullanarak:
1. Dosyayı cloud'a yükle
2. VPS'te wget/curl ile indir
3. Çıkar ve kur

---

## ⚡ **Hızlı Deploy (Önerilen Sıra):**

### 1. SSH Bağlantısı:
```bash
ssh ubuntu@34.118.206.112
```

### 2. Temel Kurulumlar:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git nginx redis-server
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2
sudo apt install -y ffmpeg clamav clamav-daemon
```

### 3. Proje Dizini:
```bash
sudo mkdir -p /var/www/p2convert
sudo chown -R ubuntu:ubuntu /var/www/p2convert
```

### 4. Dosya Yükleme (SCP ile):
```bash
# Windows'ta:
scp p2convert-project.tar.gz ubuntu@34.118.206.112:/tmp/
```

### 5. VPS'te Kurulum:
```bash
cd /var/www/p2convert
tar -xzf /tmp/p2convert-project.tar.gz
cd backend
npm install --production
```

### 6. Servisleri Başlat:
```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

---

## 🚨 **SSH Bağlantı Sorunu Çözümü:**

### SSH Key Oluştur:
```bash
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"
```

### Public Key'i VPS'e Ekle:
```bash
ssh-copy-id ubuntu@34.118.206.112
```

### Veya Manuel:
```bash
cat ~/.ssh/id_rsa.pub
# Çıktıyı VPS'te ~/.ssh/authorized_keys dosyasına ekle
```
