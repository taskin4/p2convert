# P2Convert Backend

Güçlü video dönüştürme servisi - MP4'ten MP3'e dönüştürme işlemleri için queue tabanlı backend sistemi.

## 🚀 Özellikler

- **Queue Sistemi**: BullMQ ile güçlü job queue yönetimi
- **Multi-Worker**: 3 paralel worker ile yüksek performans
- **Güvenlik**: Dosya doğrulama, antivirüs tarama, rate limiting
- **Redis**: Distributed caching ve job management
- **PM2**: Production-ready process management
- **Monitoring**: Real-time job status ve queue monitoring

## 📋 Sistem Gereksinimleri

- Node.js 18+
- Redis Server
- FFmpeg
- ClamAV (antivirüs)
- PM2 (process manager)

## 🛠️ Kurulum

### 1. Bağımlılıkları Yükle

```bash
npm install
```

### 2. Ortam Değişkenleri

`.env` dosyası oluşturun:

```env
NODE_ENV=production
PORT=3001
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
FRONTEND_URL=http://localhost:3000
```

### 3. Servisleri Başlat

```bash
# Development
npm run dev

# Production
npm start

# Worker'ları ayrı ayrı başlat
npm run worker
```

### 4. PM2 ile Production

```bash
# Tüm servisleri başlat
npm run pm2:start

# Durum kontrolü
npm run pm2:logs
npm run pm2:monit

# Restart
npm run pm2:restart
```

## 📁 Proje Yapısı

```
backend/
├── config/              # Konfigürasyon dosyaları
├── middleware/          # Express middleware'leri
│   ├── rateLimiter.js   # Rate limiting
│   ├── fileValidator.js # Dosya doğrulama
│   └── securityHeaders.js # Güvenlik headers
├── services/            # Servis katmanı
│   ├── redisService.js  # Redis bağlantı yönetimi
│   ├── queueService.js  # Queue yönetimi
│   └── antivirusService.js # Antivirüs tarama
├── workers/             # Background workers
│   └── videoWorker.js   # Video dönüştürme worker'ı
├── routes/              # API routes
│   └── conversion.js    # Dönüştürme API'leri
├── scripts/             # Deployment script'leri
├── server.js            # Ana server dosyası
├── ecosystem.config.js  # PM2 konfigürasyonu
└── package.json
```

## 🔧 API Endpoints

### Upload ve Dönüştürme

```http
POST /api/conversion/upload
Content-Type: multipart/form-data

# Response
{
  "success": true,
  "jobId": "abc123...",
  "message": "Dosya başarıyla yüklendi",
  "estimatedTime": "2 dakika"
}
```

### Job Status

```http
GET /api/conversion/status/{jobId}

# Response
{
  "jobId": "abc123...",
  "status": "processing",
  "progress": 45,
  "message": "Dönüştürme devam ediyor...",
  "data": { ... }
}
```

### Queue Statistics

```http
GET /api/conversion/stats

# Response
{
  "queues": {
    "express": { "waiting": 2, "active": 1, "completed": 150 },
    "normal": { "waiting": 1, "active": 1, "completed": 75 },
    "heavy": { "waiting": 0, "active": 1, "completed": 25 }
  },
  "redis": { "connected": true },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Health Check

```http
GET /api/conversion/health

# Response
{
  "status": "healthy",
  "services": {
    "redis": true,
    "queue": true,
    "antivirus": { "status": "healthy" }
  },
  "uptime": 3600,
  "memory": { "rss": 50000000, "heapTotal": 20000000 }
}
```

## 🔒 Güvenlik

### Rate Limiting
- **Genel API**: 15 dakikada 100 istek
- **Upload**: 15 dakikada 5 dosya
- **Dönüştürme**: 1 saatte 10 işlem

### Dosya Doğrulama
- Maksimum boyut: 250MB
- Desteklenen formatlar: MP4, AVI, MOV, MKV, WebM, 3GP, FLV
- MIME type kontrolü
- Dosya içeriği doğrulama

### Antivirüs Tarama
- ClamAV entegrasyonu
- Upload sonrası otomatik tarama
- Virüs tespitinde dosya reddi

## 📊 Monitoring

### PM2 Monitoring
```bash
# Real-time monitoring
pm2 monit

# Logs
pm2 logs

# Status
pm2 status
```

### Queue Monitoring
- Express queue: Küçük dosyalar (< 50MB)
- Normal queue: Orta dosyalar (50-150MB)
- Heavy queue: Büyük dosyalar (> 150MB)

### Performance Metrics
- Job processing time
- Queue length
- Memory usage
- CPU usage
- Error rates

## 🚀 Deployment

### VPS'e Deploy

```bash
# Deployment script'ini çalıştır
./scripts/deploy.sh
```

### Manuel Deployment

```bash
# 1. Dosyaları VPS'e kopyala
scp -r backend/ user@vps:/var/www/p2convert/

# 2. Bağımlılıkları yükle
ssh user@vps "cd /var/www/p2convert/backend && npm install"

# 3. PM2 ile başlat
ssh user@vps "cd /var/www/p2convert/backend && pm2 start ecosystem.config.js"
```

## 🔧 Troubleshooting

### Redis Bağlantı Hatası
```bash
# Redis servisini kontrol et
sudo systemctl status redis-server

# Redis'i başlat
sudo systemctl start redis-server
```

### FFmpeg Hatası
```bash
# FFmpeg'i kontrol et
ffmpeg -version

# FFmpeg'i yükle
sudo apt install ffmpeg
```

### PM2 Sorunları
```bash
# PM2'yi yeniden başlat
pm2 restart all

# Logs'u kontrol et
pm2 logs --lines 100
```

## 📈 Performance Tuning

### Intel Cascade Lake Optimizasyonu
- AVX-512 instruction set
- 3 thread kullanımı
- Memory buffer optimizasyonu

### RAM Disk (Opsiyonel)
```bash
# 4GB tmpfs oluştur
sudo mount -t tmpfs -o size=4G,mode=1777 tmpfs /tmp/videoconv
```

## 📝 Logs

Log dosyaları `logs/` dizininde:
- `combined.log`: Tüm loglar
- `out.log`: Standard output
- `error.log`: Hata logları
- `worker-*.log`: Worker logları

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## 📄 Lisans

ISC License - Detaylar için `LICENSE` dosyasına bakın.
