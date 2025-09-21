const os = require('os');
const { exec } = require('child_process');
const redisService = require('./redisService');
const queueService = require('./queueService');

class AutoScalingService {
    constructor() {
        this.isEnabled = true;
        this.scalingInterval = null;
        this.currentWorkers = 3;
        this.minWorkers = 1;
        this.maxWorkers = 6;
        this.cpuThreshold = 70; // CPU usage percentage
        this.memoryThreshold = 80; // Memory usage percentage
        this.queueThreshold = 10; // Queue size threshold
        this.scalingCooldown = 300000; // 5 minutes
        this.lastScalingTime = 0;
    }

    async initialize() {
        if (!this.isEnabled) return;

        console.log('🚀 Auto-scaling service initialized');
        
        // Start monitoring
        this.startMonitoring();
        
        // Set up graceful shutdown
        process.on('SIGTERM', () => this.stop());
        process.on('SIGINT', () => this.stop());
    }

    startMonitoring() {
        // Check every 30 seconds
        this.scalingInterval = setInterval(async () => {
            try {
                await this.checkAndScale();
            } catch (error) {
                console.error('Auto-scaling error:', error);
            }
        }, 30000);

        console.log('📊 Auto-scaling monitoring started');
    }

    async checkAndScale() {
        const now = Date.now();
        
        // Check cooldown period
        if (now - this.lastScalingTime < this.scalingCooldown) {
            return;
        }

        // Get system metrics
        const metrics = await this.getSystemMetrics();
        const queueStats = await this.getQueueStats();

        console.log('📈 System metrics:', {
            cpu: metrics.cpu,
            memory: metrics.memory,
            queueSize: queueStats.total,
            currentWorkers: this.currentWorkers
        });

        // Determine if scaling is needed
        const shouldScaleUp = this.shouldScaleUp(metrics, queueStats);
        const shouldScaleDown = this.shouldScaleDown(metrics, queueStats);

        if (shouldScaleUp && this.currentWorkers < this.maxWorkers) {
            await this.scaleUp();
        } else if (shouldScaleDown && this.currentWorkers > this.minWorkers) {
            await this.scaleDown();
        }
    }

    async getSystemMetrics() {
        return new Promise((resolve) => {
            // Get CPU usage
            exec("top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | awk -F'%' '{print $1}'", (error, stdout) => {
                const cpu = parseFloat(stdout.trim()) || 0;
                
                // Get memory usage
                const totalMem = os.totalmem();
                const freeMem = os.freemem();
                const usedMem = totalMem - freeMem;
                const memory = (usedMem / totalMem) * 100;

                resolve({ cpu, memory });
            });
        });
    }

    async getQueueStats() {
        try {
            const stats = await queueService.getQueueStats();
            const total = Object.values(stats).reduce((sum, queue) => {
                return sum + (queue.waiting || 0) + (queue.active || 0);
            }, 0);

            return { total, stats };
        } catch (error) {
            console.error('Error getting queue stats:', error);
            return { total: 0, stats: {} };
        }
    }

    shouldScaleUp(metrics, queueStats) {
        return (
            metrics.cpu > this.cpuThreshold ||
            metrics.memory > this.memoryThreshold ||
            queueStats.total > this.queueThreshold
        );
    }

    shouldScaleDown(metrics, queueStats) {
        return (
            metrics.cpu < (this.cpuThreshold * 0.5) &&
            metrics.memory < (this.memoryThreshold * 0.5) &&
            queueStats.total < (this.queueThreshold * 0.3)
        );
    }

    async scaleUp() {
        console.log('⬆️ Scaling up workers...');
        
        try {
            // Start new worker
            const workerId = `worker-${this.currentWorkers + 1}`;
            await this.startWorker(workerId);
            
            this.currentWorkers++;
            this.lastScalingTime = Date.now();
            
            console.log(`✅ Worker ${workerId} started. Total workers: ${this.currentWorkers}`);
            
            // Log scaling event
            await this.logScalingEvent('scale_up', this.currentWorkers);
            
        } catch (error) {
            console.error('Error scaling up:', error);
        }
    }

    async scaleDown() {
        console.log('⬇️ Scaling down workers...');
        
        try {
            // Stop last worker
            const workerId = `worker-${this.currentWorkers}`;
            await this.stopWorker(workerId);
            
            this.currentWorkers--;
            this.lastScalingTime = Date.now();
            
            console.log(`✅ Worker ${workerId} stopped. Total workers: ${this.currentWorkers}`);
            
            // Log scaling event
            await this.logScalingEvent('scale_down', this.currentWorkers);
            
        } catch (error) {
            console.error('Error scaling down:', error);
        }
    }

    async startWorker(workerId) {
        return new Promise((resolve, reject) => {
            const command = `pm2 start ecosystem.config.js --only p2convert-${workerId}`;
            
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(stdout);
                }
            });
        });
    }

    async stopWorker(workerId) {
        return new Promise((resolve, reject) => {
            const command = `pm2 stop p2convert-${workerId}`;
            
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(stdout);
                }
            });
        });
    }

    async logScalingEvent(event, workerCount) {
        try {
            const logData = {
                event,
                workerCount,
                timestamp: Date.now(),
                metrics: await this.getSystemMetrics(),
                queueStats: await this.getQueueStats()
            };

            await redisService.set(`scaling:${Date.now()}`, JSON.stringify(logData), 86400); // 24 hours
        } catch (error) {
            console.error('Error logging scaling event:', error);
        }
    }

    // Get scaling history
    async getScalingHistory() {
        try {
            const keys = await redisService.get('scaling:*');
            const history = [];
            
            for (const key of keys) {
                const data = await redisService.get(key);
                if (data) {
                    history.push(JSON.parse(data));
                }
            }
            
            return history.sort((a, b) => b.timestamp - a.timestamp);
        } catch (error) {
            console.error('Error getting scaling history:', error);
            return [];
        }
    }

    // Manual scaling
    async setWorkerCount(count) {
        if (count < this.minWorkers || count > this.maxWorkers) {
            throw new Error(`Worker count must be between ${this.minWorkers} and ${this.maxWorkers}`);
        }

        const difference = count - this.currentWorkers;
        
        if (difference > 0) {
            // Scale up
            for (let i = 0; i < difference; i++) {
                await this.scaleUp();
            }
        } else if (difference < 0) {
            // Scale down
            for (let i = 0; i < Math.abs(difference); i++) {
                await this.scaleDown();
            }
        }
    }

    // Get current status
    getStatus() {
        return {
            enabled: this.isEnabled,
            currentWorkers: this.currentWorkers,
            minWorkers: this.minWorkers,
            maxWorkers: this.maxWorkers,
            cpuThreshold: this.cpuThreshold,
            memoryThreshold: this.memoryThreshold,
            queueThreshold: this.queueThreshold,
            lastScalingTime: this.lastScalingTime,
            scalingCooldown: this.scalingCooldown
        };
    }

    // Update configuration
    updateConfig(config) {
        if (config.minWorkers !== undefined) this.minWorkers = config.minWorkers;
        if (config.maxWorkers !== undefined) this.maxWorkers = config.maxWorkers;
        if (config.cpuThreshold !== undefined) this.cpuThreshold = config.cpuThreshold;
        if (config.memoryThreshold !== undefined) this.memoryThreshold = config.memoryThreshold;
        if (config.queueThreshold !== undefined) this.queueThreshold = config.queueThreshold;
        if (config.scalingCooldown !== undefined) this.scalingCooldown = config.scalingCooldown;
        
        console.log('📝 Auto-scaling configuration updated:', this.getStatus());
    }

    stop() {
        if (this.scalingInterval) {
            clearInterval(this.scalingInterval);
            this.scalingInterval = null;
        }
        console.log('🛑 Auto-scaling service stopped');
    }
}

// Singleton instance
const autoScalingService = new AutoScalingService();

module.exports = autoScalingService;
