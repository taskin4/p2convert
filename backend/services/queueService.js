const { Queue, Worker } = require('bullmq');
const redisService = require('./redisService');
const path = require('path');
const fs = require('fs');

class QueueService {
    constructor() {
        this.queues = {};
        this.workers = {};
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) return;

        try {
            // Create different queues for different priorities
            this.queues = {
                express: new Queue('express-conversion', {
                    connection: {
                        host: process.env.REDIS_HOST || 'localhost',
                        port: process.env.REDIS_PORT || 6379,
                        password: process.env.REDIS_PASSWORD || undefined,
                    },
                    defaultJobOptions: {
                        removeOnComplete: 10,
                        removeOnFail: 5,
                        attempts: 3,
                        backoff: {
                            type: 'exponential',
                            delay: 2000,
                        },
                    },
                }),
                normal: new Queue('normal-conversion', {
                    connection: {
                        host: process.env.REDIS_HOST || 'localhost',
                        port: process.env.REDIS_PORT || 6379,
                        password: process.env.REDIS_PASSWORD || undefined,
                    },
                    defaultJobOptions: {
                        removeOnComplete: 10,
                        removeOnFail: 5,
                        attempts: 3,
                        backoff: {
                            type: 'exponential',
                            delay: 2000,
                        },
                    },
                }),
                heavy: new Queue('heavy-conversion', {
                    connection: {
                        host: process.env.REDIS_HOST || 'localhost',
                        port: process.env.REDIS_PORT || 6379,
                        password: process.env.REDIS_PASSWORD || undefined,
                    },
                    defaultJobOptions: {
                        removeOnComplete: 5,
                        removeOnFail: 3,
                        attempts: 2,
                        backoff: {
                            type: 'exponential',
                            delay: 5000,
                        },
                    },
                })
            };

            // Set up queue event listeners
            Object.keys(this.queues).forEach(queueName => {
                const queue = this.queues[queueName];
                
                queue.on('error', (error) => {
                    console.error(`Queue ${queueName} error:`, error);
                });

                queue.on('waiting', (job) => {
                    console.log(`Job ${job.id} waiting in ${queueName} queue`);
                });

                queue.on('active', (job) => {
                    console.log(`Job ${job.id} started in ${queueName} queue`);
                    this.updateJobStatus(job.data.jobId, 'processing');
                });

                queue.on('completed', (job) => {
                    console.log(`Job ${job.id} completed in ${queueName} queue`);
                    this.updateJobStatus(job.data.jobId, 'completed', job.returnvalue);
                });

                queue.on('failed', (job, err) => {
                    console.error(`Job ${job.id} failed in ${queueName} queue:`, err);
                    this.updateJobStatus(job.data.jobId, 'failed', { error: err.message });
                });
            });

            this.isInitialized = true;
            console.log('✅ Queue service initialized successfully');
        } catch (error) {
            console.error('❌ Queue service initialization failed:', error);
            throw error;
        }
    }

    async addConversionJob(jobData) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        const { fileSize, jobId } = jobData;
        
        // Determine queue based on file size
        let queueName;
        if (fileSize < 50 * 1024 * 1024) { // < 50MB
            queueName = 'express';
        } else if (fileSize < 150 * 1024 * 1024) { // < 150MB
            queueName = 'normal';
        } else { // >= 150MB
            queueName = 'heavy';
        }

        try {
            const queue = this.queues[queueName];
            const job = await queue.add('convert-video', jobData, {
                priority: this.getPriority(fileSize),
                delay: 0,
            });

            console.log(`Job ${jobId} added to ${queueName} queue with priority ${this.getPriority(fileSize)}`);
            return { jobId: job.id, queueName };
        } catch (error) {
            console.error('Error adding job to queue:', error);
            throw error;
        }
    }

    getPriority(fileSize) {
        // Smaller files get higher priority (lower number = higher priority in BullMQ)
        if (fileSize < 10 * 1024 * 1024) return 1; // < 10MB
        if (fileSize < 50 * 1024 * 1024) return 5; // < 50MB
        if (fileSize < 150 * 1024 * 1024) return 10; // < 150MB
        return 20; // >= 150MB
    }

    async getJobStatus(jobId) {
        // Check all queues for the job
        for (const [queueName, queue] of Object.entries(this.queues)) {
            try {
                const job = await queue.getJob(jobId);
                if (job) {
                    return {
                        id: job.id,
                        status: await job.getState(),
                        progress: job.progress,
                        data: job.data,
                        returnvalue: job.returnvalue,
                        failedReason: job.failedReason,
                        queueName
                    };
                }
            } catch (error) {
                console.error(`Error getting job status from ${queueName}:`, error);
            }
        }
        return null;
    }

    async updateJobStatus(jobId, status, data = {}) {
        try {
            await redisService.setJobStatus(jobId, status, data);
        } catch (error) {
            console.error('Error updating job status:', error);
        }
    }

    async getQueueStats() {
        const stats = {};
        
        for (const [queueName, queue] of Object.entries(this.queues)) {
            try {
                const waiting = await queue.getWaiting();
                const active = await queue.getActive();
                const completed = await queue.getCompleted();
                const failed = await queue.getFailed();

                stats[queueName] = {
                    waiting: waiting.length,
                    active: active.length,
                    completed: completed.length,
                    failed: failed.length,
                    total: waiting.length + active.length + completed.length + failed.length
                };
            } catch (error) {
                console.error(`Error getting stats for ${queueName}:`, error);
                stats[queueName] = { error: error.message };
            }
        }

        return stats;
    }

    async cleanOldJobs() {
        for (const [queueName, queue] of Object.entries(this.queues)) {
            try {
                // Clean completed jobs older than 1 hour
                await queue.clean(60 * 60 * 1000, 10, 'completed');
                
                // Clean failed jobs older than 24 hours
                await queue.clean(24 * 60 * 60 * 1000, 5, 'failed');
                
                console.log(`Cleaned old jobs from ${queueName} queue`);
            } catch (error) {
                console.error(`Error cleaning ${queueName} queue:`, error);
            }
        }
    }

    async pauseQueue(queueName) {
        if (this.queues[queueName]) {
            await this.queues[queueName].pause();
            console.log(`Queue ${queueName} paused`);
        }
    }

    async resumeQueue(queueName) {
        if (this.queues[queueName]) {
            await this.queues[queueName].resume();
            console.log(`Queue ${queueName} resumed`);
        }
    }

    async close() {
        for (const [queueName, queue] of Object.entries(this.queues)) {
            try {
                await queue.close();
                console.log(`Queue ${queueName} closed`);
            } catch (error) {
                console.error(`Error closing ${queueName} queue:`, error);
            }
        }
        
        for (const [workerName, worker] of Object.entries(this.workers)) {
            try {
                await worker.close();
                console.log(`Worker ${workerName} closed`);
            } catch (error) {
                console.error(`Error closing ${workerName} worker:`, error);
            }
        }
    }
}

// Singleton instance
const queueService = new QueueService();

module.exports = queueService;
