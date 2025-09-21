const request = require('supertest');

// Simple test without complex mocking
describe('P2Convert API Tests', () => {
  
  // Basic functionality tests
  describe('Basic Tests', () => {
    it('should have proper package.json configuration', () => {
      const packageJson = require('../package.json');
      expect(packageJson.name).toBe('p2convert-backend');
      expect(packageJson.scripts.start).toBe('node server.js');
      expect(packageJson.dependencies.express).toBeDefined();
      expect(packageJson.dependencies.bullmq).toBeDefined();
    });

    it('should have all required dependencies', () => {
      const packageJson = require('../package.json');
      const requiredDeps = [
        'express', 'bullmq', 'redis', 'multer', 'file-type',
        'express-rate-limit', 'clamscan', 'helmet', 'cors',
        'compression', 'morgan', 'prom-client'
      ];
      
      requiredDeps.forEach(dep => {
        expect(packageJson.dependencies[dep]).toBeDefined();
      });
    });

    it('should have proper PM2 ecosystem configuration', () => {
      const ecosystem = require('../ecosystem.config');
      expect(ecosystem.apps).toBeDefined();
      expect(ecosystem.apps.length).toBeGreaterThan(0);
      expect(ecosystem.apps[0].name).toBe('p2convert-backend');
    });

    it('should have Docker configuration', () => {
      const fs = require('fs');
      const path = require('path');
      expect(fs.existsSync(path.join(__dirname, '..', 'Dockerfile'))).toBe(true);
      expect(fs.existsSync(path.join(__dirname, '..', 'docker-compose.yml'))).toBe(true);
    });

    it('should have all required scripts', () => {
      const fs = require('fs');
      const path = require('path');
      const scriptsDir = path.join(__dirname, '..', 'scripts');
      const requiredScripts = [
        'deploy.sh', 'backup.sh', 'restore.sh', 'security-setup.sh',
        'performance-setup.sh', 'docker-setup.sh', 'setup-nginx.sh'
      ];
      
      requiredScripts.forEach(script => {
        expect(fs.existsSync(path.join(scriptsDir, script))).toBe(true);
      });
    });

    it('should have all required services', () => {
      const fs = require('fs');
      const path = require('path');
      const servicesDir = path.join(__dirname, '..', 'services');
      const requiredServices = [
        'redisService.js', 'queueService.js', 'antivirusService.js',
        'socketService.js', 'metricsService.js', 'autoScalingService.js',
        'hardwareAccelerationService.js'
      ];
      
      requiredServices.forEach(service => {
        expect(fs.existsSync(path.join(servicesDir, service))).toBe(true);
      });
    });

    it('should have all required middleware', () => {
      const fs = require('fs');
      const path = require('path');
      const middlewareDir = path.join(__dirname, '..', 'middleware');
      const requiredMiddleware = [
        'rateLimiter.js', 'fileValidator.js', 'securityHeaders.js'
      ];
      
      requiredMiddleware.forEach(middleware => {
        expect(fs.existsSync(path.join(middlewareDir, middleware))).toBe(true);
      });
    });

    it('should have configuration files', () => {
      const fs = require('fs');
      const path = require('path');
      const configDir = path.join(__dirname, '..', 'config');
      const requiredConfigs = [
        'nginx.conf', 'redis.conf', 'prometheus.yml'
      ];
      
      requiredConfigs.forEach(config => {
        expect(fs.existsSync(path.join(configDir, config))).toBe(true);
      });
    });
  });
});

