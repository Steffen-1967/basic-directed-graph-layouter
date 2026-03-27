import express from 'express';
import path from 'path';
import fs from 'fs';
import { WebSocketServer } from 'ws';
import http from 'http';
import { fileURLToPath } from 'url';
import ServerLogger from './logger.js';
import scenariosRouter from './routes/scenarios.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Initialize Server Logger
const logger = new ServerLogger({
    logDir: path.join(__dirname, '..', 'logs'),
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
});

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'out')));

// Root route - redirect to graph.htm
app.get('/', (req, res) => {
    res.redirect('/graph.htm');
});

// CORS headers for local development
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

// Health check
app.get('/api/health', (req, res) => {
    logger.info('API', 'Health check requested');
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Log endpoint - receives logs from client
app.post('/api/log', (req, res) => {
    try {
        const { level, category, message, details } = req.body;
        
        // Validate input
        if (!level || !category || !message) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: level, category, message'
            });
        }
        
        // Write to server log
        logger.write(level, category, message, details);
        
        res.json({ success: true });
    } catch (error) {
        console.error('[API] Error processing log request:', error);
        logger.error('API', 'Failed to process log request', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to write log entry'
        });
    }
});

// Inject logger into routes
scenariosRouter.setLogger(logger); 
app.use('/api', scenariosRouter);

// Lock Manager
const lockManager = {
    locks: new Map(), // scenarioName -> { clientId, timestamp }
    
    tryAcquire(scenarioName, clientId) {
        const existing = this.locks.get(scenarioName);
        if (!existing || existing.clientId === clientId) {
            this.locks.set(scenarioName, { clientId, timestamp: Date.now() });
            return { success: true, holder: clientId };
        }
        return { success: false, holder: existing.clientId };
    },
    
    release(scenarioName, clientId) {
        const existing = this.locks.get(scenarioName);
        if (existing && existing.clientId === clientId) {
            this.locks.delete(scenarioName);
            return true;
        }
        return false;
    },
    
    releaseAll(clientId) {
        const released = [];
        for (const [scenarioName, lock] of this.locks.entries()) {
            if (lock.clientId === clientId) {
                this.locks.delete(scenarioName);
                released.push(scenarioName);
            }
        }
        return released;
    },
    
    getStatus(scenarioName) {
        return this.locks.get(scenarioName) || null;
    }
};

// WebSocket connection handling
wss.on('connection', (ws) => {
    const clientId = Math.random().toString(36).substring(2, 9);
    console.log(`[WS] Client connected: ${clientId}`);
    logger.info('WS', 'Client connected', { clientId });
    
    ws.clientId = clientId;
    
    // Send client ID to client
    ws.send(JSON.stringify({
        type: 'connected',
        clientId: clientId
    }));
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            switch (data.type) {
                case 'lock_request':
                    const lockResult = lockManager.tryAcquire(data.scenario, clientId);
                    ws.send(JSON.stringify({
                        type: 'lock_response',
                        scenario: data.scenario,
                        success: lockResult.success,
                        holder: lockResult.holder
                    }));
                    
                    // Broadcast lock status to all clients
                    if (lockResult.success) {
                        broadcast({
                            type: 'lock_acquired',
                            scenario: data.scenario,
                            holder: clientId
                        }, clientId);
                    }
                    break;
                    
                case 'lock_release':
                    const released = lockManager.release(data.scenario, clientId);
                    
                    // Broadcast lock release to ALL clients (including sender)
                    if (released) {
                        broadcast({
                            type: 'lock_released',
                            scenario: data.scenario,
                            releasedBy: clientId
                        }); // No exclusion - all clients get notified
                    }
                    
                    ws.send(JSON.stringify({
                        type: 'lock_release_confirmed',
                        scenario: data.scenario,
                        success: released
                    }));
                    break;
                    
                case 'lock_status':
                    const status = lockManager.getStatus(data.scenario);
                    ws.send(JSON.stringify({
                        type: 'lock_status',
                        scenario: data.scenario,
                        locked: !!status,
                        holder: status ? status.holder : null
                    }));
                    break;
            }
        } catch (e) {
            console.error('[WS] Error processing message:', e);
        }
    });
    
    ws.on('close', () => {
        console.log(`[WS] Client disconnected: ${clientId}`);
        logger.info('WS', 'Client disconnected', { clientId });
        const released = lockManager.releaseAll(clientId);
        
        // Broadcast released locks to all clients
        released.forEach(scenario => {
            logger.info('LOCK', 'Lock released due to disconnect', { clientId, scenario });
            broadcast({
                type: 'lock_released',
                scenario: scenario,
                reason: 'disconnect'
            });
        });
    });
    
    ws.on('error', (error) => {
        console.error(`[WS] Error for client ${clientId}:`, error);
        logger.error('WS', 'WebSocket error', { clientId, error: error.message });
    });
});

// Broadcast helper function
function broadcast(message, excludeClientId = null) {
    const messageStr = JSON.stringify(message);
    wss.clients.forEach(client => {
        if (client.readyState === 1 && client.clientId !== excludeClientId) { // 1 = OPEN
            client.send(messageStr);
        }
    });
}

// Start server
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`API available at http://localhost:${PORT}/api/scenarios`);
    console.log(`WebSocket server running on ws://localhost:${PORT}`);
    logger.info('SERVER', 'Server started', { port: PORT });
});

// Graceful shutdown handler
function shutdown(signal) {
    console.log(`\n${signal} received. Closing server gracefully...`);
    logger.info('SERVER', 'Shutdown initiated', { signal });
    
    // Close WebSocket server
    wss.clients.forEach(client => {
        client.close(1000, 'Server shutting down');
    });
    
    // Close HTTP server
    server.close(() => {
        console.log('Server closed. Exiting process.');
        logger.info('SERVER', 'Server closed');
        process.exit(0);
    });
    
    // Force exit after 5 seconds if graceful shutdown fails
    setTimeout(() => {
        console.error('Forced shutdown after timeout');
        logger.error('SERVER', 'Forced shutdown after timeout');
        process.exit(1);
    }, 5000);
}

process.on('SIGINT', () => shutdown('SIGINT'));  // Ctrl+C
process.on('SIGTERM', () => shutdown('SIGTERM')); // Kill command
