// Test setup file
const path = require('path');
const fs = require('fs');

// Create test directories
const testDirs = [
  path.join(__dirname, '..', 'test-uploads'),
  path.join(__dirname, '..', 'test-converted'),
  path.join(__dirname, '..', 'test-temp')
];

testDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.PORT = '3002';

// Global test timeout
jest.setTimeout(30000);
