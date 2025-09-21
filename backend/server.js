const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
const http = require('http');

// Import middleware
const rateLimiter = require('./middleware/rateLimiter');
const fileValidator = require('./middleware/fileValidator');
const securityHeaders = require('./middleware/securityHeaders');

// Import services
const redisService = require('./services/redisService');
const queueService = require('./services/queueService');
const antivirusService = require('./services/antivirusService');
const socketService = require('./services/socketService');
const metricsService = require('./services/metricsService');

// Import routes
const conversionRoutes = require('./routes/conversion');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// Create necessary directories
const uploadsDir = path.join(__dirname, '..', 'uploads');
const convertedDir = path.join(__dirname, '..', 'converted');
const tempDir = path.join(__dirname, '..', 'temp');

[uploadsDir, convertedDir, tempDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));

app.use(securityHeaders);
app.use(compression());
app.use(morgan('combined'));

// CORS configuration
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use(rateLimiter);

// Initialize metrics service
metricsService.initialize();

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage()
    });
});

// Metrics endpoint for Prometheus
app.get('/metrics', async (req, res) => {
    try {
        const metrics = await metricsService.getMetrics();
        res.set('Content-Type', 'text/plain');
        res.send(metrics);
    } catch (error) {
        res.status(500).send('Error generating metrics');
    }
});

// API routes
app.use('/api/conversion', conversionRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ 
            error: 'Dosya boyutu çok büyük. Maksimum 250MB desteklenir.' 
        });
    }
    
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ 
            error: 'Beklenmeyen dosya formatı.' 
        });
    }
    
    res.status(500).json({ 
        error: 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.' 
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Endpoint bulunamadı' });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    await redisService.disconnect();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully');
    await redisService.disconnect();
    process.exit(0);
});

// Initialize Socket.io
socketService.initialize(server);

// Start server
server.listen(PORT, () => {
    console.log(`🚀 Backend server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🔌 WebSocket server ready for connections`);
});

module.exports = app;
