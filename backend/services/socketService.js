const { Server } = require('socket.io');
const redisService = require('./redisService');

class SocketService {
    constructor() {
        this.io = null;
        this.connectedClients = new Map();
    }

    initialize(server) {
        this.io = new Server(server, {
            cors: {
                origin: process.env.FRONTEND_URL || "http://localhost:3000",
                methods: ["GET", "POST"],
                credentials: true
            },
            transports: ['websocket', 'polling']
        });

        this.setupEventHandlers();
        console.log('✅ Socket.io service initialized');
    }

    setupEventHandlers() {
        this.io.on('connection', (socket) => {
            console.log(`🔌 Client connected: ${socket.id}`);
            
            // Store client connection
            this.connectedClients.set(socket.id, {
                socket,
                connectedAt: Date.now(),
                jobId: null
            });

            // Handle job tracking
            socket.on('track-job', (data) => {
                const { jobId } = data;
                if (jobId) {
                    const client = this.connectedClients.get(socket.id);
                    if (client) {
                        client.jobId = jobId;
                        console.log(`📊 Client ${socket.id} tracking job: ${jobId}`);
                    }
                }
            });

            // Handle disconnect
            socket.on('disconnect', () => {
                console.log(`🔌 Client disconnected: ${socket.id}`);
                this.connectedClients.delete(socket.id);
            });

            // Handle ping/pong for connection health
            socket.on('ping', () => {
                socket.emit('pong', { timestamp: Date.now() });
            });

            // Send initial connection confirmation
            socket.emit('connected', {
                message: 'Connected to P2Convert backend',
                timestamp: Date.now(),
                clientId: socket.id
            });
        });
    }

    // Broadcast job progress to all clients tracking this job
    async broadcastJobProgress(jobId, progressData) {
        if (!this.io) return;

        const clients = Array.from(this.connectedClients.values())
            .filter(client => client.jobId === jobId);

        if (clients.length > 0) {
            const message = {
                jobId,
                ...progressData,
                timestamp: Date.now()
            };

            clients.forEach(client => {
                client.socket.emit('job-progress', message);
            });

            console.log(`📊 Broadcasted progress for job ${jobId} to ${clients.length} clients`);
        }
    }

    // Broadcast job completion
    async broadcastJobCompletion(jobId, result) {
        if (!this.io) return;

        const clients = Array.from(this.connectedClients.values())
            .filter(client => client.jobId === jobId);

        if (clients.length > 0) {
            const message = {
                jobId,
                status: 'completed',
                result,
                timestamp: Date.now()
            };

            clients.forEach(client => {
                client.socket.emit('job-completed', message);
                // Clear job tracking after completion
                client.jobId = null;
            });

            console.log(`✅ Broadcasted completion for job ${jobId} to ${clients.length} clients`);
        }
    }

    // Broadcast job failure
    async broadcastJobFailure(jobId, error) {
        if (!this.io) return;

        const clients = Array.from(this.connectedClients.values())
            .filter(client => client.jobId === jobId);

        if (clients.length > 0) {
            const message = {
                jobId,
                status: 'failed',
                error: error.message || error,
                timestamp: Date.now()
            };

            clients.forEach(client => {
                client.socket.emit('job-failed', message);
                // Clear job tracking after failure
                client.jobId = null;
            });

            console.log(`❌ Broadcasted failure for job ${jobId} to ${clients.length} clients`);
        }
    }

    // Broadcast system status
    broadcastSystemStatus(status) {
        if (!this.io) return;

        const message = {
            type: 'system-status',
            status,
            timestamp: Date.now()
        };

        this.io.emit('system-status', message);
    }

    // Broadcast queue statistics
    async broadcastQueueStats(stats) {
        if (!this.io) return;

        const message = {
            type: 'queue-stats',
            stats,
            timestamp: Date.now()
        };

        this.io.emit('queue-stats', message);
    }

    // Get connected clients info
    getConnectedClientsInfo() {
        return Array.from(this.connectedClients.entries()).map(([id, client]) => ({
            id,
            connectedAt: client.connectedAt,
            jobId: client.jobId,
            uptime: Date.now() - client.connectedAt
        }));
    }

    // Get socket.io server instance
    getIO() {
        return this.io;
    }

    // Close all connections
    async close() {
        if (this.io) {
            this.io.close();
            this.connectedClients.clear();
            console.log('🔌 Socket.io service closed');
        }
    }
}

// Singleton instance
const socketService = new SocketService();

module.exports = socketService;
