/**
 * Central Logger Class for consistent logging across the application.
 * Provides category-based logging with automatic prefixing.
 * 
 * Usage:
 *   const logger = new Logger('WS');
 *   logger.log('Connected to server');
 *   logger.warn('Connection unstable');
 *   logger.error('Connection failed', error);
 */
class Logger {
    /**
     * @param {string} category - Log category (e.g., 'WS', 'HISTORY', 'API')
     */
    constructor(category) {
        this.category = category;
    }

    /**
     * Logs an informational message.
     * @param {string} message - The message to log
     * @param {...any} args - Additional arguments to log
     */
    log(message, ...args) {
        console.log(`[${this.category}]`, message, ...args);
    }

    /**
     * Logs a warning message.
     * @param {string} message - The warning message
     * @param {...any} args - Additional arguments to log
     */
    warn(message, ...args) {
        console.warn(`[${this.category}]`, message, ...args);
    }

    /**
     * Logs an error message.
     * @param {string} message - The error message
     * @param {...any} args - Additional arguments to log
     */
    error(message, ...args) {
        console.error(`[${this.category}]`, message, ...args);
    }

    /**
     * Creates a child logger with a sub-category.
     * @param {string} subCategory - Sub-category name
     * @returns {Logger} New logger instance with combined category
     * 
     * Example:
     *   const wsLogger = new Logger('WS');
     *   const lockLogger = wsLogger.child('Lock');
     *   lockLogger.log('Acquired'); // Output: [WS:Lock] Acquired
     */
    child(subCategory) {
        return new Logger(`${this.category}:${subCategory}`);
    }
}

// Export for browser use
if (typeof module !== 'undefined') {
    module.exports = Logger;
}
