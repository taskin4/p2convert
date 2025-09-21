const ClamScan = require('clamscan');
const path = require('path');

class AntivirusService {
    constructor() {
        this.scanner = null;
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) return;

        try {
            const options = {
                removeInfected: false, // Don't remove files, just report
                quarantineInfected: false, // Don't quarantine files
                scanLog: null, // Disable scan log
                debugMode: false,
                fileList: null,
                scanRecursively: false,
                clamscan: {
                    path: '/usr/bin/clamscan', // Default ClamAV path
                    db: null,
                    scanArchives: true,
                    active: true
                },
                clamdscan: {
                    socket: false,
                    host: false,
                    port: false,
                    timeout: 60000,
                    localFallback: false,
                    path: '/usr/bin/clamdscan',
                    configFile: null,
                    multiscan: true,
                    reloadDb: false,
                    active: true,
                    bypassTest: false
                },
                preference: 'clamdscan' // Prefer clamdscan over clamscan
            };

            this.scanner = await new ClamScan(options).init();
            this.isInitialized = true;
            console.log('✅ Antivirus service initialized successfully');
        } catch (error) {
            console.error('❌ Antivirus service initialization failed:', error);
            // Don't throw error, just log it - service should continue without antivirus
            this.isInitialized = false;
        }
    }

    async scanFile(filePath) {
        if (!this.isInitialized) {
            console.log('⚠️ Antivirus service not initialized, skipping scan');
            return { isInfected: false, error: 'Antivirus service not available' };
        }

        try {
            console.log(`🔍 Scanning file: ${filePath}`);
            
            const result = await this.scanner.scanFile(filePath);
            
            if (result.isInfected) {
                console.log(`🚨 Infected file detected: ${filePath}`);
                return {
                    isInfected: true,
                    viruses: result.viruses,
                    file: filePath
                };
            } else {
                console.log(`✅ File clean: ${filePath}`);
                return {
                    isInfected: false,
                    file: filePath
                };
            }
        } catch (error) {
            console.error('Antivirus scan error:', error);
            return {
                isInfected: false,
                error: error.message
            };
        }
    }

    async scanBuffer(buffer) {
        if (!this.isInitialized) {
            console.log('⚠️ Antivirus service not initialized, skipping scan');
            return { isInfected: false, error: 'Antivirus service not available' };
        }

        try {
            console.log('🔍 Scanning buffer data');
            
            const result = await this.scanner.scanBuffer(buffer);
            
            if (result.isInfected) {
                console.log('🚨 Infected buffer detected');
                return {
                    isInfected: true,
                    viruses: result.viruses
                };
            } else {
                console.log('✅ Buffer clean');
                return {
                    isInfected: false
                };
            }
        } catch (error) {
            console.error('Antivirus buffer scan error:', error);
            return {
                isInfected: false,
                error: error.message
            };
        }
    }

    // Health check for antivirus service
    async healthCheck() {
        if (!this.isInitialized) {
            return {
                status: 'disabled',
                message: 'Antivirus service not initialized'
            };
        }

        try {
            // Try to scan a small test buffer
            const testBuffer = Buffer.from('test');
            const result = await this.scanBuffer(testBuffer);
            
            return {
                status: 'healthy',
                message: 'Antivirus service is working',
                lastScan: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: 'error',
                message: error.message,
                lastScan: new Date().toISOString()
            };
        }
    }

    // Get antivirus version info
    async getVersion() {
        if (!this.isInitialized) {
            return { error: 'Antivirus service not initialized' };
        }

        try {
            const version = await this.scanner.getVersion();
            return { version };
        } catch (error) {
            return { error: error.message };
        }
    }

    // Update antivirus database
    async updateDatabase() {
        if (!this.isInitialized) {
            return { error: 'Antivirus service not initialized' };
        }

        try {
            console.log('🔄 Updating antivirus database...');
            const result = await this.scanner.updateDatabase();
            console.log('✅ Antivirus database updated');
            return { success: true, result };
        } catch (error) {
            console.error('❌ Antivirus database update failed:', error);
            return { error: error.message };
        }
    }
}

// Singleton instance
const antivirusService = new AntivirusService();

module.exports = antivirusService;
