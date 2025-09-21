const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const router = express.Router();

// Import services
const queueService = require('../services/queueService');
const redisService = require('../services/redisService');
const antivirusService = require('../services/antivirusService');

// Import middleware
const { upload, conversion } = require('../middleware/rateLimiter');
const { fileValidationMiddleware } = require('../middleware/fileValidator');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const uploadMiddleware = multer({
    storage: storage,
    limits: {
        fileSize: 250 * 1024 * 1024, // 250MB limit
        files: 1
    },
    fileFilter: (req, file, cb) => {
        // Basic file type check
        if (file.mimetype.startsWith('video/')) {
            cb(null, true);
        } else {
            cb(new Error('Sadece video dosyaları kabul edilir'), false);
        }
    }
});

// Initialize services
router.use(async (req, res, next) => {
    try {
        await queueService.initialize();
        await redisService.connect();
        await antivirusService.initialize();
        next();
    } catch (error) {
        console.error('Service initialization error:', error);
        res.status(500).json({ error: 'Servis başlatma hatası' });
    }
});

// Upload and start conversion
router.post('/upload', upload, uploadMiddleware.single('video'), fileValidationMiddleware, async (req, res) => {
    try {
        const file = req.file;
        const originalName = path.parse(file.originalname).name;
        const jobId = crypto.randomBytes(16).toString('hex');
        
        // Create output path
        const convertedDir = path.join(__dirname, '..', '..', 'converted');
        if (!fs.existsSync(convertedDir)) {
            fs.mkdirSync(convertedDir, { recursive: true });
        }
        
        const outputFilename = `${originalName}-${jobId}.mp3`;
        const outputPath = path.join(convertedDir, outputFilename);
        
        // Prepare job data
        const jobData = {
            jobId,
            inputPath: file.path,
            outputPath,
            originalName,
            fileSize: file.size,
            mimeType: file.mimetype,
            timestamp: Date.now()
        };
        
        // Add job to queue
        const queueResult = await queueService.addConversionJob(jobData);
        
        // Set initial job status
        await redisService.setJobStatus(jobId, 'queued', {
            message: 'Dönüştürme kuyruğuna eklendi',
            queueName: queueResult.queueName,
            estimatedTime: estimateProcessingTime(file.size)
        });
        
        console.log(`📝 Job ${jobId} created for file: ${file.originalname}`);
        
        res.json({
            success: true,
            jobId,
            message: 'Dosya başarıyla yüklendi ve dönüştürme başlatıldı',
            estimatedTime: estimateProcessingTime(file.size)
        });
        
    } catch (error) {
        console.error('Upload error:', error);
        
        // Clean up uploaded file on error
        if (req.file && fs.existsSync(req.file.path)) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (cleanupError) {
                console.error('File cleanup error:', cleanupError);
            }
        }
        
        res.status(500).json({
            error: 'Dosya yükleme hatası',
            details: error.message
        });
    }
});

// Get job status
router.get('/status/:jobId', async (req, res) => {
    try {
        const { jobId } = req.params;
        
        // Get status from Redis
        const status = await redisService.getJobStatus(jobId);
        
        if (!status) {
            return res.status(404).json({
                error: 'İş bulunamadı veya süresi dolmuş'
            });
        }
        
        // Get additional info from queue if available
        const queueStatus = await queueService.getJobStatus(jobId);
        
        res.json({
            jobId,
            status: status.status,
            progress: status.progress || 0,
            message: status.message || '',
            data: status,
            queueInfo: queueStatus
        });
        
    } catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({
            error: 'Durum kontrolü hatası',
            details: error.message
        });
    }
});

// Get queue statistics
router.get('/stats', async (req, res) => {
    try {
        const stats = await queueService.getQueueStats();
        const redisStats = {
            connected: redisService.isConnected,
            uptime: process.uptime()
        };
        
        res.json({
            queues: stats,
            redis: redisStats,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({
            error: 'İstatistik alma hatası',
            details: error.message
        });
    }
});

// Health check for conversion service
router.get('/health', async (req, res) => {
    try {
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            services: {
                redis: redisService.isConnected,
                queue: queueService.isInitialized,
                antivirus: await antivirusService.healthCheck()
            },
            uptime: process.uptime(),
            memory: process.memoryUsage()
        };
        
        res.json(health);
        
    } catch (error) {
        console.error('Health check error:', error);
        res.status(500).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Clean old jobs (admin endpoint)
router.post('/cleanup', async (req, res) => {
    try {
        await queueService.cleanOldJobs();
        res.json({
            success: true,
            message: 'Eski işler temizlendi',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Cleanup error:', error);
        res.status(500).json({
            error: 'Temizlik hatası',
            details: error.message
        });
    }
});

// Estimate processing time based on file size
function estimateProcessingTime(fileSizeInBytes) {
    const fileSizeInMB = fileSizeInBytes / (1024 * 1024);
    
    // Rough estimation: 1MB = 1 second processing time
    const estimatedSeconds = Math.max(30, Math.ceil(fileSizeInMB));
    
    if (estimatedSeconds < 60) {
        return `${estimatedSeconds} saniye`;
    } else if (estimatedSeconds < 3600) {
        const minutes = Math.ceil(estimatedSeconds / 60);
        return `${minutes} dakika`;
    } else {
        const hours = Math.ceil(estimatedSeconds / 3600);
        return `${hours} saat`;
    }
}

module.exports = router;
