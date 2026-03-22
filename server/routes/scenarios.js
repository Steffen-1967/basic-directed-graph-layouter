const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');

// Logger will be injected by server.js
let logger = null;

// Setter for logger injection
router.setLogger = (loggerInstance) => {
    logger = loggerInstance;
};

/**
 * GET /api/scenarios
 * Returns a list of all available JSON scenario files.
 */
router.get('/scenarios', (req, res) => {
    try {
        const files = fs.readdirSync(DATA_DIR)
            .filter(f => f.endsWith('.json'))
            .sort();
        
        if (logger) logger.info('API', 'Scenarios list requested', { count: files.length });
        
        res.json({
            success: true,
            scenarios: files,
            count: files.length
        });
    } catch (error) {
        console.error('[API] Error reading scenarios (check server connection, server api and data availability at server side):', error);
        if (logger) logger.error('API', 'Failed to read scenarios directory', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to read scenarios directory'
        });
    }
});

/**
 * GET /api/scenario/:name
 * Returns the content of a specific scenario file with timestamp.
 */
router.get('/scenario/:name', (req, res) => {
    try {
        const fileName = req.params.name;
        
        // Security: Prevent directory traversal
        if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
            if (logger) logger.warn('API', 'Invalid file name attempt', { fileName });
            return res.status(400).json({
                success: false,
                error: 'Invalid file name'
            });
        }
        
        const filePath = path.join(DATA_DIR, fileName);
        
        // Check if file exists
        if (!fs.existsSync(filePath)) {
            if (logger) logger.warn('API', 'Scenario not found', { fileName });
            return res.status(404).json({
                success: false,
                error: 'Scenario not found'
            });
        }
        
        const stats = fs.statSync(filePath);
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);
        
        if (logger) logger.info('API', 'Scenario loaded', { fileName, nodeCount: data.length });
        
        res.json({
            success: true,
            fileName: fileName,
            data: data,
            lastModified: stats.mtime.getTime() // Unix timestamp in milliseconds
        });
    } catch (error) {
        console.error('[API] Error reading scenario (check server connection, server api and data availability at server side):', error);
        if (logger) logger.error('API', 'Failed to read scenario file', { fileName: req.params.name, error: error.message });
        res.status(500).json({
            success: false,
            error: 'Failed to read scenario file'
        });
    }
});

module.exports = router;
