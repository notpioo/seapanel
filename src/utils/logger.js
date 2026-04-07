/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                      LOGGER UTILITY                          ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

const config = require('../../config/bot.config');
const fs = require('fs');
const path = require('path');

/**
 * Logger Class with colored console output
 */
class Logger {
    constructor(context = 'App') {
        this.context = context;
        this.colors = {
            reset: '\x1b[0m',
            bright: '\x1b[1m',
            dim: '\x1b[2m',

            // Foreground colors
            red: '\x1b[31m',
            green: '\x1b[32m',
            yellow: '\x1b[33m',
            blue: '\x1b[34m',
            magenta: '\x1b[35m',
            cyan: '\x1b[36m',
            white: '\x1b[37m',
            gray: '\x1b[90m',
        };

        // Ensure log directory exists
        if (config.logging.saveToFile) {
            const logDir = path.resolve(config.logging.logFolder);
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true });
            }
        }
    }

    /**
     * Format log message
     */
    format(level, message) {
        const timestamp = new Date().toISOString();
        return `[${timestamp}] [${level.toUpperCase()}] [${this.context}] ${message}`;
    }

    /**
     * Write to log file
     */
    writeToFile(formattedMessage) {
        if (!config.logging.saveToFile) return;

        const logFile = path.join(
            config.logging.logFolder,
            `bot-${new Date().toISOString().split('T')[0]}.log`
        );

        fs.appendFileSync(logFile, formattedMessage + '\n');
    }

    /**
     * Check if log level is enabled
     */
    shouldLog(level) {
        const levels = ['debug', 'info', 'warn', 'error'];
        const currentLevel = levels.indexOf(config.logging.level);
        const messageLevel = levels.indexOf(level);
        return messageLevel >= currentLevel;
    }

    /**
     * Debug level log
     */
    debug(...args) {
        if (!this.shouldLog('debug')) return;

        const message = args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ');
        const formatted = this.format('debug', message);

        console.log(`${this.colors.gray}${formatted}${this.colors.reset}`);
        this.writeToFile(formatted);
    }

    /**
     * Info level log
     */
    info(...args) {
        if (!this.shouldLog('info')) return;

        const message = args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ');
        const formatted = this.format('info', message);

        console.log(`${this.colors.cyan}${formatted}${this.colors.reset}`);
        this.writeToFile(formatted);
    }

    /**
     * Success log (info level)
     */
    success(...args) {
        if (!this.shouldLog('info')) return;

        const message = args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ');
        const formatted = this.format('success', message);

        console.log(`${this.colors.green}${formatted}${this.colors.reset}`);
        this.writeToFile(formatted);
    }

    /**
     * Warning level log
     */
    warn(...args) {
        if (!this.shouldLog('warn')) return;

        const message = args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ');
        const formatted = this.format('warn', message);

        console.log(`${this.colors.yellow}${formatted}${this.colors.reset}`);
        this.writeToFile(formatted);
    }

    /**
     * Error level log
     */
    error(...args) {
        if (!this.shouldLog('error')) return;

        const message = args.map(a => {
            if (a instanceof Error) {
                return `${a.message}\n${a.stack}`;
            }
            return typeof a === 'object' ? JSON.stringify(a) : a;
        }).join(' ');

        const formatted = this.format('error', message);

        console.error(`${this.colors.red}${formatted}${this.colors.reset}`);
        this.writeToFile(formatted);
    }
}

module.exports = Logger;
