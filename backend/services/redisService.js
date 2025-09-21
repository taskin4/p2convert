const redis = require('redis');

class RedisService {
    constructor() {
        this.client = null;
        this.isConnected = false;
    }

    async connect() {
        try {
            this.client = redis.createClient({
                host: process.env.REDIS_HOST || 'localhost',
                port: process.env.REDIS_PORT || 6379,
                password: process.env.REDIS_PASSWORD || undefined,
                retry_strategy: (options) => {
                    if (options.error && options.error.code === 'ECONNREFUSED') {
                        console.log('Redis server connection refused, using fallback');
                        return undefined;
                    }
                    if (options.total_retry_time > 1000 * 60 * 60) {
                        return new Error('Retry time exhausted');
                    }
                    if (options.attempt > 10) {
                        return undefined;
                    }
                    return Math.min(options.attempt * 100, 3000);
                }
            });

            this.client.on('error', (err) => {
                console.error('Redis Client Error:', err);
                this.isConnected = false;
            });

            this.client.on('connect', () => {
                console.log('✅ Redis connected successfully');
                this.isConnected = true;
            });

            this.client.on('ready', () => {
                console.log('✅ Redis ready for operations');
            });

            this.client.on('end', () => {
                console.log('❌ Redis connection ended');
                this.isConnected = false;
            });

            await this.client.connect();
            return true;
        } catch (error) {
            console.error('Redis connection failed:', error);
            this.isConnected = false;
            return false;
        }
    }

    async disconnect() {
        if (this.client) {
            await this.client.quit();
            this.client = null;
            this.isConnected = false;
        }
    }

    async get(key) {
        if (!this.isConnected) return null;
        try {
            return await this.client.get(key);
        } catch (error) {
            console.error('Redis GET error:', error);
            return null;
        }
    }

    async set(key, value, expireInSeconds = null) {
        if (!this.isConnected) return false;
        try {
            if (expireInSeconds) {
                await this.client.setEx(key, expireInSeconds, value);
            } else {
                await this.client.set(key, value);
            }
            return true;
        } catch (error) {
            console.error('Redis SET error:', error);
            return false;
        }
    }

    async del(key) {
        if (!this.isConnected) return false;
        try {
            await this.client.del(key);
            return true;
        } catch (error) {
            console.error('Redis DEL error:', error);
            return false;
        }
    }

    async incr(key) {
        if (!this.isConnected) return 0;
        try {
            return await this.client.incr(key);
        } catch (error) {
            console.error('Redis INCR error:', error);
            return 0;
        }
    }

    async expire(key, seconds) {
        if (!this.isConnected) return false;
        try {
            await this.client.expire(key, seconds);
            return true;
        } catch (error) {
            console.error('Redis EXPIRE error:', error);
            return false;
        }
    }

    async hget(hash, field) {
        if (!this.isConnected) return null;
        try {
            return await this.client.hGet(hash, field);
        } catch (error) {
            console.error('Redis HGET error:', error);
            return null;
        }
    }

    async hset(hash, field, value) {
        if (!this.isConnected) return false;
        try {
            await this.client.hSet(hash, field, value);
            return true;
        } catch (error) {
            console.error('Redis HSET error:', error);
            return false;
        }
    }

    async hgetall(hash) {
        if (!this.isConnected) return {};
        try {
            return await this.client.hGetAll(hash);
        } catch (error) {
            console.error('Redis HGETALL error:', error);
            return {};
        }
    }

    async hdel(hash, field) {
        if (!this.isConnected) return false;
        try {
            await this.client.hDel(hash, field);
            return true;
        } catch (error) {
            console.error('Redis HDEL error:', error);
            return false;
        }
    }

    // Rate limiting helper
    async checkRateLimit(key, limit, windowSeconds) {
        if (!this.isConnected) return { allowed: true, remaining: limit };
        
        try {
            const current = await this.incr(key);
            
            if (current === 1) {
                await this.expire(key, windowSeconds);
            }
            
            const remaining = Math.max(0, limit - current);
            const allowed = current <= limit;
            
            return { allowed, remaining, current };
        } catch (error) {
            console.error('Rate limit check error:', error);
            return { allowed: true, remaining: limit };
        }
    }

    // Job status management
    async setJobStatus(jobId, status, data = {}) {
        const key = `job:${jobId}`;
        const jobData = {
            status,
            timestamp: Date.now(),
            ...data
        };
        
        return await this.set(key, JSON.stringify(jobData), 3600); // 1 hour expiry
    }

    async getJobStatus(jobId) {
        const key = `job:${jobId}`;
        const data = await this.get(key);
        
        if (!data) return null;
        
        try {
            return JSON.parse(data);
        } catch (error) {
            console.error('Job status parse error:', error);
            return null;
        }
    }

    async deleteJobStatus(jobId) {
        const key = `job:${jobId}`;
        return await this.del(key);
    }
}

// Singleton instance
const redisService = new RedisService();

module.exports = redisService;
