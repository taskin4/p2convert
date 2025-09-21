const rateLimit = require('express-rate-limit');
const redis = require('redis');

// Redis client for distributed rate limiting
const redisClient = redis.createClient({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    retry_strategy: (options) => {
        if (options.error && options.error.code === 'ECONNREFUSED') {
            console.log('Redis server connection refused, using memory store');
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

// General API rate limiter
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        error: 'Çok fazla istek gönderildi. 15 dakika sonra tekrar deneyin.',
        retryAfter: 15 * 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: redisClient ? {
        incr: (key, cb) => {
            redisClient.incr(key, cb);
        },
        decrement: (key, cb) => {
            redisClient.decr(key, cb);
        },
        resetKey: (key, cb) => {
            redisClient.del(key, cb);
        }
    } : undefined
});

// Upload rate limiter (more restrictive)
const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 uploads per windowMs
    message: {
        error: 'Çok fazla dosya yüklendi. 15 dakika sonra tekrar deneyin.',
        retryAfter: 15 * 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: redisClient ? {
        incr: (key, cb) => {
            redisClient.incr(key, cb);
        },
        decrement: (key, cb) => {
            redisClient.decr(key, cb);
        },
        resetKey: (key, cb) => {
            redisClient.del(key, cb);
        }
    } : undefined
});

// Conversion rate limiter (most restrictive)
const conversionLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // limit each IP to 10 conversions per hour
    message: {
        error: 'Günlük dönüştürme limitiniz doldu. 1 saat sonra tekrar deneyin.',
        retryAfter: 60 * 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: redisClient ? {
        incr: (key, cb) => {
            redisClient.incr(key, cb);
        },
        decrement: (key, cb) => {
            redisClient.decr(key, cb);
        },
        resetKey: (key, cb) => {
            redisClient.del(key, cb);
        }
    } : undefined
});

module.exports = {
    general: generalLimiter,
    upload: uploadLimiter,
    conversion: conversionLimiter
};
