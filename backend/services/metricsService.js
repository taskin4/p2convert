const client = require('prom-client');

class MetricsService {
    constructor() {
        this.register = new client.Registry();
        this.isInitialized = false;
    }

    initialize() {
        if (this.isInitialized) return;

        // Add default metrics
        client.collectDefaultMetrics({ register: this.register });

        // Custom metrics
        this.jobsTotal = new client.Counter({
            name: 'p2convert_jobs_total',
            help: 'Total number of conversion jobs',
            labelNames: ['status', 'queue'],
            registers: [this.register]
        });

        this.jobsDuration = new client.Histogram({
            name: 'p2convert_job_duration_seconds',
            help: 'Duration of conversion jobs in seconds',
            labelNames: ['queue', 'file_size_range'],
            buckets: [1, 5, 10, 30, 60, 120, 300, 600, 1800, 3600],
            registers: [this.register]
        });

        this.activeJobs = new client.Gauge({
            name: 'p2convert_active_jobs',
            help: 'Number of currently active jobs',
            labelNames: ['queue'],
            registers: [this.register]
        });

        this.queueSize = new client.Gauge({
            name: 'p2convert_queue_size',
            help: 'Number of jobs in queue',
            labelNames: ['queue', 'status'],
            registers: [this.register]
        });

        this.fileSize = new client.Histogram({
            name: 'p2convert_file_size_bytes',
            help: 'Size of uploaded files in bytes',
            buckets: [1024 * 1024, 10 * 1024 * 1024, 50 * 1024 * 1024, 100 * 1024 * 1024, 250 * 1024 * 1024],
            registers: [this.register]
        });

        this.conversionErrors = new client.Counter({
            name: 'p2convert_conversion_errors_total',
            help: 'Total number of conversion errors',
            labelNames: ['error_type'],
            registers: [this.register]
        });

        this.antivirusScans = new client.Counter({
            name: 'p2convert_antivirus_scans_total',
            help: 'Total number of antivirus scans',
            labelNames: ['result'],
            registers: [this.register]
        });

        this.rateLimitHits = new client.Counter({
            name: 'p2convert_rate_limit_hits_total',
            help: 'Total number of rate limit hits',
            labelNames: ['endpoint', 'ip'],
            registers: [this.register]
        });

        this.websocketConnections = new client.Gauge({
            name: 'p2convert_websocket_connections',
            help: 'Number of active WebSocket connections',
            registers: [this.register]
        });

        this.redisConnections = new client.Gauge({
            name: 'p2convert_redis_connections',
            help: 'Number of Redis connections',
            registers: [this.register]
        });

        this.isInitialized = true;
        console.log('✅ Metrics service initialized');
    }

    // Job metrics
    recordJobStart(queue, fileSize) {
        this.jobsTotal.inc({ status: 'started', queue });
        this.activeJobs.inc({ queue });
        this.fileSize.observe(fileSize);
    }

    recordJobComplete(queue, duration, fileSize) {
        this.jobsTotal.inc({ status: 'completed', queue });
        this.activeJobs.dec({ queue });
        this.jobsDuration.observe({ queue, file_size_range: this.getFileSizeRange(fileSize) }, duration);
    }

    recordJobFailed(queue, errorType) {
        this.jobsTotal.inc({ status: 'failed', queue });
        this.activeJobs.dec({ queue });
        this.conversionErrors.inc({ error_type: errorType });
    }

    // Queue metrics
    updateQueueSize(queue, status, count) {
        this.queueSize.set({ queue, status }, count);
    }

    // Antivirus metrics
    recordAntivirusScan(result) {
        this.antivirusScans.inc({ result });
    }

    // Rate limiting metrics
    recordRateLimitHit(endpoint, ip) {
        this.rateLimitHits.inc({ endpoint, ip });
    }

    // WebSocket metrics
    updateWebSocketConnections(count) {
        this.websocketConnections.set(count);
    }

    // Redis metrics
    updateRedisConnections(count) {
        this.redisConnections.set(count);
    }

    // Helper methods
    getFileSizeRange(fileSize) {
        if (fileSize < 10 * 1024 * 1024) return 'small'; // < 10MB
        if (fileSize < 50 * 1024 * 1024) return 'medium'; // < 50MB
        if (fileSize < 150 * 1024 * 1024) return 'large'; // < 150MB
        return 'xlarge'; // >= 150MB
    }

    // Get metrics in Prometheus format
    async getMetrics() {
        return await this.register.metrics();
    }

    // Get metrics registry
    getRegister() {
        return this.register;
    }
}

// Singleton instance
const metricsService = new MetricsService();

module.exports = metricsService;
