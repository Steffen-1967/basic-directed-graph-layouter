import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Server-side Logger with daily rotation and automatic cleanup.
 * 
 * Features:
 * - Daily log rotation (new file per day)
 * - Automatic cleanup of logs older than 7 days
 * - JSON format for structured logging
 * - Configurable log directory
 */
export default class ServerLogger {
    constructor(options = {}) {
        this.logDir = options.logDir || path.join(__dirname, '..', 'logs');
        this.maxAge = options.maxAge || 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
        this.currentDate = null;
        this.currentLogPath = null;
        
        // Ensure log directory exists
        this.ensureLogDirectory();
        
        // Cleanup old logs on initialization
        this.cleanupOldLogs();
        
        // Update log file path
        this.updateLogFile();
    }
    
    /**
     * Ensures the log directory exists.
     */
    ensureLogDirectory() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
            console.log(`[LOG] Created log directory: ${this.logDir}`);
        }
    }
    
    /**
     * Updates the current log file path based on today's date.
     * Creates a new file if the date has changed.
     */
    updateLogFile() {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        
        if (this.currentDate !== today) {
            this.currentDate = today;
            this.currentLogPath = path.join(this.logDir, `app_${today}.log`);
            
            // Create file if it doesn't exist
            if (!fs.existsSync(this.currentLogPath)) {
                fs.writeFileSync(this.currentLogPath, '', 'utf8');
                console.log(`[LOG] Created new log file: ${this.currentLogPath}`);
            }
        }
    }
    
    /**
     * Writes a log entry to the current log file.
     * 
     * @param {string} level - Log level (info, warn, error)
     * @param {string} category - Log category (e.g., 'API', 'WS', 'SERVER')
     * @param {string} message - Log message
     * @param {Object} [details=null] - Additional details (optional)
     */
    write(level, category, message, details = null) {
        this.updateLogFile(); // Check if we need to rotate
        
        const entry = {
            timestamp: new Date().toISOString(),
            level: level.toUpperCase(),
            category: category,
            message: message
        };
        
        if (details) {
            entry.details = details;
        }
        
        const line = JSON.stringify(entry) + '\n';
        
        try {
            fs.appendFileSync(this.currentLogPath, line, 'utf8');
        } catch (error) {
            console.error('[LOG] Failed to write to log file:', error);
        }
    }
    
    /**
     * Logs an informational message.
     */
    info(category, message, details = null) {
        this.write('info', category, message, details);
    }
    
    /**
     * Logs a warning message.
     */
    warn(category, message, details = null) {
        this.write('warn', category, message, details);
    }
    
    /**
     * Logs an error message.
     */
    error(category, message, details = null) {
        this.write('error', category, message, details);
    }
    
    /**
     * Cleans up log files older than maxAge.
     * Called automatically on initialization.
     */
    cleanupOldLogs() {
        console.log('[LOG] Starting cleanup of old log files...');
        
        try {
            const files = fs.readdirSync(this.logDir);
            const now = Date.now();
            let deletedCount = 0;
            
            files.forEach(file => {
                if (!file.startsWith('app_') || !file.endsWith('.log')) {
                    return; // Skip non-log files
                }
                
                const filePath = path.join(this.logDir, file);
                const stats = fs.statSync(filePath);
                const age = now - stats.mtime.getTime();
                
                if (age > this.maxAge) {
                    fs.unlinkSync(filePath);
                    console.log(`[LOG] Deleted old log file: ${file} (age: ${Math.round(age / (24 * 60 * 60 * 1000))} days)`);
                    deletedCount++;
                }
            });
            
            if (deletedCount === 0) {
                console.log('[LOG] No old log files to delete.');
            } else {
                console.log(`[LOG] Cleanup complete. Deleted ${deletedCount} file(s).`);
            }
        } catch (error) {
            console.error('[LOG] Error during cleanup:', error);
        }
    }
}
