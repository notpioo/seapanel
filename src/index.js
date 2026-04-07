/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║              SANKA BOT DEPLOYER - MAIN ENTRY                 ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

// ═══════════════════════════════════════════════════════════════
// EARLY HEALTH CHECK - Start IMMEDIATELY before any heavy imports
// This ensures Railway's /health check passes while the app loads
// ═══════════════════════════════════════════════════════════════
const http = require('http');
const EARLY_PORT = parseInt(process.env.PORT) || 3000;

const earlyServer = http.createServer((req, res) => {
    if (req.url === '/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('OK');
    } else {
        res.writeHead(503, { 'Content-Type': 'text/plain' });
        res.end('Starting...');
    }
});

earlyServer.listen(EARLY_PORT, '0.0.0.0', () => {
    console.log(`[EARLY HEALTH] Listening on 0.0.0.0:${EARLY_PORT} - /health ready`);
});
// ═══════════════════════════════════════════════════════════════

const config = require('../config/bot.config');
const WebServer = require('./server/app');
const Logger = require('./utils/logger');
const database = require('./utils/database');
const { User, BotSettings } = require('./models');

// Initialize logger
const logger = new Logger('Main');

// ASCII Art Banner
const banner = `
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   ███████╗ █████╗ ███╗   ██╗██╗  ██╗ █████╗                  ║
║   ██╔════╝██╔══██╗████╗  ██║██║ ██╔╝██╔══██╗                 ║
║   ███████╗███████║██╔██╗ ██║█████╔╝ ███████║                 ║
║   ╚════██║██╔══██║██║╚██╗██║██╔═██╗ ██╔══██║                 ║
║   ███████║██║  ██║██║ ╚████║██║  ██╗██║  ██║                 ║
║   ╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝  ╚═╝                 ║
║                                                              ║
║              BOT DEPLOYER - Powered by Sanka-Baileys         ║
╚══════════════════════════════════════════════════════════════╝
`;

/**
 * Main Application Class
 */
class Application {
    constructor() {
        this.bot = null;
        this.server = null;
    }

    /**
     * Initialize and start the application
     */
    async start() {
        try {
            console.log(banner);
            console.log(`[DEBUG] RAW PORT: ${process.env.PORT}`); // Force Debug
            logger.info('Starting Sanka Bot Deployer...');
            logger.info(`Bot Name: ${config.bot.name}`);
            logger.info(`Version: ${config.bot.version}`);

            // 1. Close early health server to free the port
            logger.info('Closing early health server to hand off to WebServer...');
            await new Promise((resolve) => earlyServer.close(resolve));
            logger.info('Early health server closed.');

            // 2. Initialize web server (for health checks + panel)
            this.server = new WebServer();
            await this.server.start();

            // 3. Connect to MongoDB
            const dbConnected = await database.connect();
            if (dbConnected) {
                // Initialize default users
                await User.initializeDefaultUsers();

                // Auto-sync MiningConfig: tambahkan zona & ore baru yang belum ada di DB
                try {
                    const { MiningConfig } = require('./models');
                    await MiningConfig.getConfig();
                    logger.info('Mining config synced (zones & resources up to date)');
                } catch (e) {
                    logger.warn('Failed to sync mining config:', e.message);
                }

                // Load settings from DB
                try {
                    const settings = await BotSettings.getSettings();
                    config.bot.name = settings.botName;
                    config.bot.prefix = settings.prefix;
                    if (settings.ownerNumber) {
                        config.ownerNumber = [settings.ownerNumber];
                    }
                    logger.info(`Settings loaded: ${config.bot.name} (Prefix: ${config.bot.prefix})`);
                } catch (e) {
                    logger.warn('Failed to load settings:', e.message);
                }
            } else {
                logger.warn('Running without database - using fallback auth');
            }

            // 4. Initialize bot client
            try {
                const BotClient = require('./bot/client');
                this.bot = new BotClient(this.server.getIO());
                await this.bot.initialize();

                // Inject bot client to server
                this.server.setBotClient(this.bot);
            } catch (botError) {
                logger.error('Failed to initialize Bot Client:', botError);
                // Continue running server even if bot fails
            }

            // Handle graceful shutdown
            this.setupGracefulShutdown();

            logger.success('Application started successfully!');
        } catch (error) {
            logger.error('Failed to start application:', error);
            process.exit(1);
        }
    }

    /**
     * Setup graceful shutdown handlers
     */
    setupGracefulShutdown() {
        const shutdown = async (signal) => {
            logger.warn(`Received ${signal}. Shutting down gracefully...`);

            try {
                // Disconnect bot if connected
                if (this.bot) {
                    await this.bot.disconnect();
                }

                // Stop web server
                if (this.server) {
                    await this.server.stop();
                }

                // Disconnect database
                await database.disconnect();

                logger.info('Shutdown complete. Goodbye!');
                process.exit(0);
            } catch (error) {
                logger.error('Error during shutdown:', error);
                process.exit(1);
            }
        };

        // Handle termination signals
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));

        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            logger.error('Uncaught Exception:', error);
            shutdown('uncaughtException');
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
        });
    }
}

// Start the application
const app = new Application();
app.start();
