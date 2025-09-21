const { exec } = require('child_process');
const os = require('os');

class HardwareAccelerationService {
    constructor() {
        this.isInitialized = false;
        this.supportedCodecs = [];
        this.hardwareAcceleration = null;
        this.cpuInfo = null;
        this.gpuInfo = null;
    }

    async initialize() {
        if (this.isInitialized) return;

        console.log('🔧 Initializing hardware acceleration service...');

        // Detect CPU capabilities
        await this.detectCPU();
        
        // Detect GPU capabilities
        await this.detectGPU();
        
        // Determine best acceleration method
        this.determineAccelerationMethod();
        
        // Test FFmpeg capabilities
        await this.testFFmpegCapabilities();

        this.isInitialized = true;
        console.log('✅ Hardware acceleration service initialized');
    }

    async detectCPU() {
        try {
            this.cpuInfo = {
                model: os.cpus()[0].model,
                cores: os.cpus().length,
                speed: os.cpus()[0].speed
            };

            // Check for Intel Cascade Lake specific features
            if (this.cpuInfo.model.includes('Intel')) {
                console.log('🖥️ Intel CPU detected:', this.cpuInfo.model);
                
                // Check for AVX-512 support
                const hasAVX512 = await this.checkCPUFeature('avx512f');
                if (hasAVX512) {
                    console.log('✅ AVX-512 support detected');
                    this.cpuInfo.avx512 = true;
                }
            }

            console.log('📊 CPU Info:', this.cpuInfo);
        } catch (error) {
            console.error('Error detecting CPU:', error);
        }
    }

    async detectGPU() {
        try {
            // Check for NVIDIA GPU
            const nvidiaInfo = await this.checkNVIDIA();
            if (nvidiaInfo) {
                this.gpuInfo = { type: 'nvidia', ...nvidiaInfo };
                console.log('🎮 NVIDIA GPU detected:', nvidiaInfo.model);
            }

            // Check for Intel Quick Sync
            const intelQSV = await this.checkIntelQSV();
            if (intelQSV) {
                this.gpuInfo = { type: 'intel_qsv', ...intelQSV };
                console.log('🎮 Intel Quick Sync detected');
            }

            // Check for AMD GPU
            const amdInfo = await this.checkAMD();
            if (amdInfo) {
                this.gpuInfo = { type: 'amd', ...amdInfo };
                console.log('🎮 AMD GPU detected:', amdInfo.model);
            }

            if (!this.gpuInfo) {
                console.log('⚠️ No GPU acceleration available');
            }
        } catch (error) {
            console.error('Error detecting GPU:', error);
        }
    }

    async checkCPUFeature(feature) {
        return new Promise((resolve) => {
            exec(`grep -q ${feature} /proc/cpuinfo`, (error) => {
                resolve(!error);
            });
        });
    }

    async checkNVIDIA() {
        return new Promise((resolve) => {
            exec('nvidia-smi --query-gpu=name,driver_version,memory.total --format=csv,noheader,nounits', (error, stdout) => {
                if (error) {
                    resolve(null);
                } else {
                    const [name, driver, memory] = stdout.trim().split(', ');
                    resolve({
                        model: name,
                        driver: driver,
                        memory: parseInt(memory)
                    });
                }
            });
        });
    }

    async checkIntelQSV() {
        return new Promise((resolve) => {
            exec('vainfo 2>/dev/null | grep -i "intel"', (error, stdout) => {
                if (error || !stdout) {
                    resolve(null);
                } else {
                    resolve({ available: true });
                }
            });
        });
    }

    async checkAMD() {
        return new Promise((resolve) => {
            exec('lspci | grep -i "vga.*amd\|radeon"', (error, stdout) => {
                if (error || !stdout) {
                    resolve(null);
                } else {
                    resolve({ model: stdout.trim() });
                }
            });
        });
    }

    async testFFmpegCapabilities() {
        try {
            // Test available encoders
            const encoders = await this.getFFmpegEncoders();
            this.supportedCodecs = encoders;
            
            console.log('🎬 Supported codecs:', this.supportedCodecs);
        } catch (error) {
            console.error('Error testing FFmpeg capabilities:', error);
        }
    }

    async getFFmpegEncoders() {
        return new Promise((resolve) => {
            exec('ffmpeg -encoders 2>/dev/null | grep -E "(h264|h265|hevc|nvenc|qsv|vaapi)"', (error, stdout) => {
                if (error) {
                    resolve([]);
                } else {
                    const encoders = stdout.split('\n')
                        .filter(line => line.trim())
                        .map(line => line.trim().split(/\s+/)[1])
                        .filter(encoder => encoder);
                    resolve(encoders);
                }
            });
        });
    }

    determineAccelerationMethod() {
        if (this.gpuInfo) {
            switch (this.gpuInfo.type) {
                case 'nvidia':
                    this.hardwareAcceleration = 'nvenc';
                    break;
                case 'intel_qsv':
                    this.hardwareAcceleration = 'qsv';
                    break;
                case 'amd':
                    this.hardwareAcceleration = 'vaapi';
                    break;
                default:
                    this.hardwareAcceleration = 'software';
            }
        } else {
            this.hardwareAcceleration = 'software';
        }

        console.log('⚡ Hardware acceleration method:', this.hardwareAcceleration);
    }

    getFFmpegParams(fileSize, queueName) {
        const baseParams = '-vn -c:a libmp3lame';
        
        // Determine quality based on file size and queue
        let quality = '192k';
        let threads = 2;
        
        if (queueName === 'express-conversion' || fileSize < 50 * 1024 * 1024) {
            quality = '192k';
            threads = 2;
        } else if (queueName === 'normal-conversion' || fileSize < 150 * 1024 * 1024) {
            quality = '192k';
            threads = 3;
        } else {
            quality = '320k';
            threads = 4;
        }

        // Add hardware acceleration if available
        let accelerationParams = '';
        if (this.hardwareAcceleration !== 'software') {
            switch (this.hardwareAcceleration) {
                case 'nvenc':
                    accelerationParams = '-hwaccel cuda -hwaccel_output_format cuda';
                    break;
                case 'qsv':
                    accelerationParams = '-hwaccel qsv -hwaccel_output_format qsv';
                    break;
                case 'vaapi':
                    accelerationParams = '-hwaccel vaapi -hwaccel_output_format vaapi';
                    break;
            }
        }

        // Add CPU optimization for Intel Cascade Lake
        let cpuParams = '';
        if (this.cpuInfo && this.cpuInfo.avx512) {
            cpuParams = '-threads ' + threads + ' -preset fast';
        } else {
            cpuParams = '-threads ' + threads;
        }

        return `${accelerationParams} ${baseParams} -b:a ${quality} ${cpuParams}`.trim();
    }

    getOptimalThreadCount() {
        if (!this.cpuInfo) return 2;
        
        // For Intel Cascade Lake, use 3 threads as specified in checklist
        if (this.cpuInfo.model.includes('Intel') && this.cpuInfo.avx512) {
            return 3;
        }
        
        // Default: use half of available cores
        return Math.max(2, Math.floor(this.cpuInfo.cores / 2));
    }

    getMemoryBufferSize(fileSize) {
        // Increase buffer size for large files
        if (fileSize > 100 * 1024 * 1024) { // > 100MB
            return '64M';
        } else if (fileSize > 50 * 1024 * 1024) { // > 50MB
            return '32M';
        } else {
            return '16M';
        }
    }

    getSystemInfo() {
        return {
            cpu: this.cpuInfo,
            gpu: this.gpuInfo,
            acceleration: this.hardwareAcceleration,
            supportedCodecs: this.supportedCodecs,
            optimalThreads: this.getOptimalThreadCount()
        };
    }

    // Test hardware acceleration
    async testAcceleration() {
        if (!this.gpuInfo) {
            return { success: false, message: 'No GPU acceleration available' };
        }

        try {
            const testCommand = this.getTestCommand();
            const result = await this.executeCommand(testCommand);
            
            return {
                success: true,
                method: this.hardwareAcceleration,
                result: result
            };
        } catch (error) {
            return {
                success: false,
                method: this.hardwareAcceleration,
                error: error.message
            };
        }
    }

    getTestCommand() {
        // Create a simple test video and try to encode it
        const testInput = '/dev/urandom';
        const testOutput = '/tmp/test_output.mp4';
        
        let command = `ffmpeg -f rawvideo -pix_fmt yuv420p -s 320x240 -r 1 -i ${testInput} -t 1 -y ${testOutput}`;
        
        if (this.hardwareAcceleration === 'nvenc') {
            command += ' -c:v h264_nvenc';
        } else if (this.hardwareAcceleration === 'qsv') {
            command += ' -c:v h264_qsv';
        } else if (this.hardwareAcceleration === 'vaapi') {
            command += ' -c:v h264_vaapi';
        } else {
            command += ' -c:v libx264';
        }
        
        return command;
    }

    executeCommand(command) {
        return new Promise((resolve, reject) => {
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                } else {
                    resolve({ stdout, stderr });
                }
            });
        });
    }
}

// Singleton instance
const hardwareAccelerationService = new HardwareAccelerationService();

module.exports = hardwareAccelerationService;
