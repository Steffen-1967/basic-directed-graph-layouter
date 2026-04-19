/**
 * @file logger.ts
 * @description Simple server-side logger with category support and consistent formatting.
 * Writes logs to the console with timestamps and category prefixes.
 */

import fs from 'fs';
import path from 'path';

export default class ServerLogger {
    private category: string;
    private static currentLogDate: string = '';

    /**
     * Creates a new logger instance for a specific category.
     * @param category - The prefix for all logs from this instance (e.g., 'AGE', 'WS').
     */
    constructor(category: string) {
        this.category = category;
        this.ensureLogsDir();
    }

    private ensureLogsDir(): void {
        const logsDir = path.join(process.cwd(), 'logs');
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }
        
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        if (ServerLogger.currentLogDate !== dateStr) {
            ServerLogger.currentLogDate = dateStr;
            this.cleanupOldLogs(logsDir);
        }
    }

    /**
     * Deletes log files older than 7 days.
     */
    private cleanupOldLogs(logsDir: string): void {
        try {
            const files = fs.readdirSync(logsDir);
            const now = Date.now();
            const maxAge = 7 * 24 * 60 * 60 * 1000;

            files.forEach(file => {
                if (file.endsWith('.log')) {
                    const filePath = path.join(logsDir, file);
                    const stats = fs.statSync(filePath);
                    if (now - stats.mtimeMs > maxAge) {
                        fs.unlinkSync(filePath);
                    }
                }
            });
        } catch (err) {}
    }

    info(subCategory: string, message: string, details?: any): void {
        this.log('INFO', subCategory, message, details);
    }

    warn(subCategory: string, message: string, details?: any): void {
        this.log('WARN', subCategory, message, details);
    }

    error(subCategory: string, message: string, details?: any): void {
        this.log('ERROR', subCategory, message, details);
    }

    private log(level: string, subCategory: string, message: string, details?: any): void {
        const timestamp = new Date().toISOString();
        const prefix = `[${timestamp}] [${level}] [${this.category}:${subCategory}]`;
        let logLine = `${prefix} ${message}`;
        
        if (details) {
            const detailsStr = typeof details === 'string' ? details : JSON.stringify(details);
            logLine += ` | Data: ${detailsStr}`;
        }

        // 1. Console Output
        console.log(logLine);

        // 2. File Output
        const dateStr = new Date().toISOString().split('T')[0];
        const filePrefix = this.category === 'CLIENT' ? 'cli' : 'srv';
        const fileName = `${filePrefix}_${dateStr}.log`;
        const logsDir = path.join(process.cwd(), 'logs');
        const filePath = path.join(logsDir, fileName);

        try {
            if (!fs.existsSync(logsDir)) {
                fs.mkdirSync(logsDir, { recursive: true });
            }
            fs.appendFileSync(filePath, logLine + '\n', 'utf8');
        } catch (err) {
            console.error(`CRITICAL: Failed to write to log file ${filePath}:`, err);
        }
    }
}
