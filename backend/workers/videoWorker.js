const { Worker } = require('bullmq');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const redisService = require('../services/redisService');
const antivirusService = require('../services/antivirusService');
const socketService = require('../services/socketService');
const hardwareAccelerationService = require('../services/hardwareAccelerationService');

class VideoWorker {
    constructor() {
        this.worker = null;
        this.isRunning = false;
    }

    async initialize() {
        if (this.isRunning) return;

        try {
            // Initialize services
            await redisService.connect();
            await antivirusService.initialize();
            await hardwareAccelerationService.initialize();

            // Create worker for each queue
            const queues = ['express-conversion', 'normal-conversion', 'heavy-conversion'];
            
            for (const queueName of queues) {
                const worker = new Worker(queueName, this.processJob.bind(this), {
                    connection: {
                        host: process.env.REDIS_HOST || 'localhost',
                        port: process.env.REDIS_PORT || 6379,
                        password: process.env.REDIS_PASSWORD || undefined,
                    },
                    concurrency: this.getConcurrency(queueName),
                    limiter: {
                        max: this.getConcurrency(queueName),
                        duration: 1000,
                    },
                });

                worker.on('ready', () => {
                    console.log(`✅ Worker for ${queueName} is ready`);
                });

                worker.on('active', (job) => {
                    console.log(`🔄 Processing job ${job.id} in ${queueName}`);
                });

                worker.on('completed', (job) => {
                    console.log(`✅ Job ${job.id} completed in ${queueName}`);
                });

                worker.on('failed', (job, err) => {
                    console.error(`❌ Job ${job.id} failed in ${queueName}:`, err);
                });

                worker.on('error', (err) => {
                    console.error(`❌ Worker error in ${queueName}:`, err);
                });
            }

            this.isRunning = true;
            console.log('✅ Video worker initialized successfully');
        } catch (error) {
            console.error('❌ Video worker initialization failed:', error);
            throw error;
        }
    }

    getConcurrency(queueName) {
        switch (queueName) {
            case 'express-conversion':
                return 3; // Fast processing for small files
            case 'normal-conversion':
                return 2; // Medium processing
            case 'heavy-conversion':
                return 1; // Slow processing for large files
            default:
                return 1;
        }
    }

    async processJob(job) {
        const { jobId, inputPath, outputPath, originalName, fileSize } = job.data;
        
        try {
            console.log(`🔄 Starting conversion for job ${jobId}`);
            
            // Update job status
            await redisService.setJobStatus(jobId, 'processing', {
                progress: 0,
                message: 'Dönüştürme başlatılıyor...'
            });

            // Broadcast progress via WebSocket
            await socketService.broadcastJobProgress(jobId, {
                status: 'processing',
                progress: 0,
                message: 'Dönüştürme başlatılıyor...'
            });

            // Antivirus scan
            console.log(`🔍 Scanning file for viruses: ${inputPath}`);
            const scanResult = await antivirusService.scanFile(inputPath);
            
            if (scanResult.isInfected) {
                throw new Error(`Dosya virüs içeriyor: ${scanResult.viruses?.join(', ')}`);
            }

            // Update progress
            await redisService.setJobStatus(jobId, 'processing', {
                progress: 10,
                message: 'Güvenlik taraması tamamlandı, dönüştürme başlıyor...'
            });

            // Determine FFmpeg parameters based on file size and queue
            const ffmpegParams = this.getFFmpegParams(fileSize, job.queueName);
            
            // Execute FFmpeg conversion
            const command = `ffmpeg -i "${inputPath}" ${ffmpegParams} "${outputPath}"`;
            console.log(`🎬 Executing: ${command}`);

            await this.executeFFmpeg(command, jobId);

            // Verify output file exists
            if (!fs.existsSync(outputPath)) {
                throw new Error('Dönüştürme başarısız: Çıktı dosyası oluşturulmadı');
            }

            // Get output file size
            const outputStats = fs.statSync(outputPath);
            const outputSize = outputStats.size;

            // Clean up input file
            try {
                fs.unlinkSync(inputPath);
                console.log(`🗑️ Cleaned up input file: ${inputPath}`);
            } catch (cleanupError) {
                console.error('Input file cleanup error:', cleanupError);
            }

            // Update final status
            await redisService.setJobStatus(jobId, 'completed', {
                progress: 100,
                message: 'Dönüştürme tamamlandı',
                outputSize,
                downloadUrl: `/download/${path.basename(outputPath)}`,
                fileName: `${originalName}.mp3`
            });

            // Broadcast completion via WebSocket
            await socketService.broadcastJobCompletion(jobId, {
                outputSize,
                downloadUrl: `/download/${path.basename(outputPath)}`,
                fileName: `${originalName}.mp3`
            });

            console.log(`✅ Conversion completed for job ${jobId}`);
            
            return {
                success: true,
                outputPath,
                outputSize,
                originalName
            };

        } catch (error) {
            console.error(`❌ Conversion failed for job ${jobId}:`, error);
            
            // Clean up files on error
            try {
                if (fs.existsSync(inputPath)) {
                    fs.unlinkSync(inputPath);
                }
                if (fs.existsSync(outputPath)) {
                    fs.unlinkSync(outputPath);
                }
            } catch (cleanupError) {
                console.error('Cleanup error:', cleanupError);
            }

            // Update error status
            await redisService.setJobStatus(jobId, 'failed', {
                error: error.message,
                message: 'Dönüştürme başarısız'
            });

            // Broadcast failure via WebSocket
            await socketService.broadcastJobFailure(jobId, error);

            throw error;
        }
    }

    getFFmpegParams(fileSize, queueName) {
        // Use hardware acceleration service for optimal parameters
        return hardwareAccelerationService.getFFmpegParams(fileSize, queueName);
    }

    async executeFFmpeg(command, jobId) {
        return new Promise((resolve, reject) => {
            const process = exec(command, (error, stdout, stderr) => {
                if (error) {
                    console.error('FFmpeg error:', error);
                    console.error('FFmpeg stderr:', stderr);
                    reject(new Error(`FFmpeg hatası: ${error.message}`));
                    return;
                }
                
                if (stderr && stderr.includes('error')) {
                    console.error('FFmpeg stderr:', stderr);
                    reject(new Error('FFmpeg dönüştürme hatası'));
                    return;
                }
                
                resolve({ stdout, stderr });
            });

            // Update progress periodically
            let progress = 20;
            const progressInterval = setInterval(async () => {
                if (progress < 90) {
                    progress += 10;
                    await redisService.setJobStatus(jobId, 'processing', {
                        progress,
                        message: `Dönüştürme devam ediyor... %${progress}`
                    });
                    
                    // Broadcast progress via WebSocket
                    await socketService.broadcastJobProgress(jobId, {
                        status: 'processing',
                        progress,
                        message: `Dönüştürme devam ediyor... %${progress}`
                    });
                }
            }, 5000);

            process.on('close', (code) => {
                clearInterval(progressInterval);
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`FFmpeg process exited with code ${code}`));
                }
            });
        });
    }

    async stop() {
        if (this.worker) {
            await this.worker.close();
            this.isRunning = false;
            console.log('✅ Video worker stopped');
        }
    }
}

// Create and export worker instance
const videoWorker = new VideoWorker();

// Initialize worker if this file is run directly
if (require.main === module) {
    videoWorker.initialize().catch(console.error);
}

module.exports = videoWorker;
