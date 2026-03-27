/**
 * @file logger.ts
 * Browser-side logger that can send logs to the server.
 */
export class Logger {
    constructor(category) {
        this.category = category;
    }
    log(message, ...details) {
        console.log(`[${this.category}] ${message}`, ...details);
        this.sendToServer('info', message, details);
    }
    warn(message, ...details) {
        console.warn(`[${this.category}] ${message}`, ...details);
        this.sendToServer('warn', message, details);
    }
    error(message, ...details) {
        console.error(`[${this.category}] ${message}`, ...details);
        this.sendToServer('error', message, details);
    }
    async sendToServer(level, message, details) {
        try {
            await fetch('/api/log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    level,
                    category: this.category,
                    message,
                    details: details.length > 0 ? details : null,
                    timestamp: new Date().toISOString()
                })
            });
        }
        catch (e) {
            // Silently fail to avoid infinite loops if server is down
        }
    }
}
// Global exposure for browser (legacy)
if (typeof window !== 'undefined') {
    window.Logger = Logger;
}
