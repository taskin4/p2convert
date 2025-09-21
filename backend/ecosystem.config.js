module.exports = {
  apps: [
    {
      name: 'p2convert-backend',
      script: './server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379,
        REDIS_PASSWORD: process.env.REDIS_PASSWORD || undefined,
        FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379,
        REDIS_PASSWORD: process.env.REDIS_PASSWORD,
        FRONTEND_URL: process.env.FRONTEND_URL || 'https://yourdomain.com'
      },
      // Logging
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Process management
      max_memory_restart: '1G',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      
      // Monitoring
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'uploads', 'converted'],
      
      // Advanced settings
      kill_timeout: 5000,
      listen_timeout: 3000,
      shutdown_with_message: true,
      
      // Health check
      health_check_grace_period: 3000,
      
      // Auto restart on file changes (development only)
      watch_options: {
        followSymlinks: false,
        usePolling: true,
        interval: 1000
      }
    },
    {
      name: 'p2convert-worker-1',
      script: './workers/videoWorker.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379,
        REDIS_PASSWORD: process.env.REDIS_PASSWORD || undefined,
        WORKER_ID: 'worker-1'
      },
      env_production: {
        NODE_ENV: 'production',
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379,
        REDIS_PASSWORD: process.env.REDIS_PASSWORD,
        WORKER_ID: 'worker-1'
      },
      // Logging
      log_file: './logs/worker-1-combined.log',
      out_file: './logs/worker-1-out.log',
      error_file: './logs/worker-1-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Process management
      max_memory_restart: '2G',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      
      // Monitoring
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'uploads', 'converted'],
      
      // Advanced settings
      kill_timeout: 10000,
      listen_timeout: 3000,
      shutdown_with_message: true
    },
    {
      name: 'p2convert-worker-2',
      script: './workers/videoWorker.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379,
        REDIS_PASSWORD: process.env.REDIS_PASSWORD || undefined,
        WORKER_ID: 'worker-2'
      },
      env_production: {
        NODE_ENV: 'production',
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379,
        REDIS_PASSWORD: process.env.REDIS_PASSWORD,
        WORKER_ID: 'worker-2'
      },
      // Logging
      log_file: './logs/worker-2-combined.log',
      out_file: './logs/worker-2-out.log',
      error_file: './logs/worker-2-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Process management
      max_memory_restart: '2G',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      
      // Monitoring
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'uploads', 'converted'],
      
      // Advanced settings
      kill_timeout: 10000,
      listen_timeout: 3000,
      shutdown_with_message: true
    },
    {
      name: 'p2convert-worker-3',
      script: './workers/videoWorker.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379,
        REDIS_PASSWORD: process.env.REDIS_PASSWORD || undefined,
        WORKER_ID: 'worker-3'
      },
      env_production: {
        NODE_ENV: 'production',
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379,
        REDIS_PASSWORD: process.env.REDIS_PASSWORD,
        WORKER_ID: 'worker-3'
      },
      // Logging
      log_file: './logs/worker-3-combined.log',
      out_file: './logs/worker-3-out.log',
      error_file: './logs/worker-3-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Process management
      max_memory_restart: '2G',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      
      // Monitoring
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'uploads', 'converted'],
      
      // Advanced settings
      kill_timeout: 10000,
      listen_timeout: 3000,
      shutdown_with_message: true
    }
  ],

  deploy: {
    production: {
      user: 'ubuntu',
      host: '34.118.206.112',
      ref: 'origin/main',
      repo: 'git@github.com:yourusername/p2convert.git',
      path: '/var/www/p2convert',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};
