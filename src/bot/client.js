/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║              WHATSAPP BOT CLIENT - SANKA BAILEYS             ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

const baileys = require('sanka-baileyss');
const pino = require('pino');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');

const config = require('../../config/bot.config');
const Logger = require('../utils/logger');
const MessageHandler = require('./handlers/message');
const { Session } = require('../models');

const logger = new Logger('BotClient');

// Extract functions from baileys
const _baileys = baileys.default || baileys;
const makeCacheableSignalKeyStore = _baileys.makeCacheableSignalKeyStore || baileys.makeCacheableSignalKeyStore;
const fetchLatestWaWebVersion = _baileys.fetchLatestWaWebVersion || baileys.fetchLatestWaWebVersion;
const fetchLatestBaileysVersion = _baileys.fetchLatestBaileysVersion || baileys.fetchLatestBaileysVersion;
const DisconnectReason = _baileys.DisconnectReason || baileys.DisconnectReason;
const Browsers = _baileys.Browsers || baileys.Browsers;

const makeInMemoryStore = _baileys.makeInMemoryStore || baileys.makeInMemoryStore;
const getAggregateVotesInPollMessage = _baileys.getAggregateVotesInPollMessage || baileys.getAggregateVotesInPollMessage;

// Fallback for makeWASocket
const makeWASocket = _baileys.makeWASocket || baileys.makeWASocket || _baileys;

if (!makeCacheableSignalKeyStore) {
    console.error('[FATAL] makeCacheableSignalKeyStore missing in client.js!', Object.keys(baileys));
}

const useMongoAuthState = require('../utils/mongoAuth');

/**
 * WhatsApp Bot Client
 */
class BotClient {
    constructor(io) {
        this.socket = null;
        this.io = io;
        this.isConnected = false;
        this.qrCode = null;
        this.connectionState = 'disconnected';
        this.messageHandler = null;
        this.retryCount = 0;
        this.saveCreds = null;
        this.isInitializing = false;
        this.store = null;
    }

    /**
     * Clear session
     */
    clearSession() {
        const sessionPath = path.resolve(
            config.session.folderPath,
            config.session.sessionName
        );
        if (fs.existsSync(sessionPath)) {
            logger.warn('Clearing session...');
            try {
                fs.rmSync(sessionPath, { recursive: true, force: true });
            } catch (e) {
                logger.error('Failed to clear session:', e);
            }
        }
    }

    /**
     * Get WhatsApp version
     */
    async getWaVersion() {
        try {
            // Try fetchLatestWaWebVersion first
            if (typeof fetchLatestWaWebVersion === 'function') {
                const { version } = await fetchLatestWaWebVersion({});
                logger.info(`Got WA Web version: ${version.join('.')}`);
                return version;
            }
        } catch (e) {
            logger.warn('fetchLatestWaWebVersion failed:', e.message);
        }

        try {
            // Try fetchLatestBaileysVersion
            if (typeof fetchLatestBaileysVersion === 'function') {
                const { version } = await fetchLatestBaileysVersion();
                logger.info(`Got Baileys version: ${version.join('.')}`);
                return version;
            }
        } catch (e) {
            logger.warn('fetchLatestBaileysVersion failed:', e.message);
        }

        // Fallback to known working version
        logger.info('Using fallback version');
        return [2, 2413, 1];
    }

    /**
     * Initialize the WhatsApp connection
     */
    async initialize() {
        if (this.isInitializing) {
            logger.warn('Already initializing, skipping...');
            return;
        }

        this.isInitializing = true;

        try {
            logger.info('Initializing WhatsApp connection...');

            // Ensure session folder exists
            const sessionPath = path.resolve(config.session.folderPath);
            logger.info(`Session folder path: ${sessionPath}`);

            if (!fs.existsSync(sessionPath)) {
                logger.info('Creating session folder...');
                fs.mkdirSync(sessionPath, { recursive: true });
            }

            const fullSessionPath = path.join(sessionPath, config.session.sessionName);
            logger.info(`Full session path: ${fullSessionPath}`);

            // Check if session exists
            if (fs.existsSync(fullSessionPath)) {
                const files = fs.readdirSync(fullSessionPath);
                logger.info(`Existing session files: ${files.length} files - ${files.join(', ')}`);
            } else {
                logger.info('No existing session found, will generate QR code');
            }

            // Get auth state
            logger.info(`Using MongoDB session: ${config.session.sessionName}`);
            const { state, saveCreds } = await useMongoAuthState(config.session.sessionName);
            this.saveCreds = saveCreds;

            // Get WhatsApp version
            const version = await this.getWaVersion();
            logger.info(`Using WA version: ${version.join('.')}`);

            // Create socket
            // Initialize Store
            if (!this.store) {
                this.store = makeInMemoryStore({ logger: pino({ level: 'silent' }) });
            }

            const socketConfig = {
                getMessage: async (key) => {
                    if (this.store) {
                        const msg = await this.store.loadMessage(key.remoteJid, key.id);
                        return msg?.message || undefined;
                    }
                    return { conversation: 'SankaBot' };
                },
                version,
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
                },
                browser: Browsers.ubuntu(config.connection.browserName),
                printQRInTerminal: true,
                logger: pino({ level: 'silent' }),
                connectTimeoutMs: 60000,
                defaultQueryTimeoutMs: 60000,
                keepAliveIntervalMs: 25000,
                emitOwnEvents: true,
                fireInitQueries: true,
                generateHighQualityLinkPreview: false,
                syncFullHistory: false,
                markOnlineOnConnect: false,
            };

            logger.info('Creating socket with config...');
            this.socket = makeWASocket(socketConfig);

            if (!this.socket) {
                throw new Error('Failed to create socket - makeWASocket returned null');
            }

            global.__sankaSendMessage = async (jid, content, options) => {
                let lastErr;
                for (let attempt = 0; attempt < 2; attempt++) {
                    try {
                        return await this.socket.sendMessage(jid, content, options);
                    } catch (e) {
                        lastErr = e;
                        await new Promise(r => setTimeout(r, 400));
                    }
                }
                throw lastErr;
            };

            // Expose Store to Socket (for commands)
            if (this.store) this.socket.store = this.store;
            this.socket.clearSession = this.clearSession.bind(this);
            this.socket.pollResults = new Map(); // Accumulate poll votes here

            // Bind Store
            if (this.store) this.store.bind(this.socket.ev);

            // Initialize message handler
            this.messageHandler = new MessageHandler(this.socket);

            // Setup event handlers
            this.setupEventHandlers();

            this.isInitializing = false;
            return this.socket;
        } catch (error) {
            this.isInitializing = false;
            logger.error('Failed to initialize bot client:', error.message || error);

            // Wait before retry
            const delay = Math.min((this.retryCount + 1) * 3000, 30000);
            logger.info(`Retrying in ${delay / 1000}s...`);
            await new Promise(r => setTimeout(r, delay));
            this.retryCount++;
            return this.initialize();
        }
    }

    /**
     * Setup all event handlers
     */
    setupEventHandlers() {
        // Connection update events
        this.socket.ev.on('connection.update', async (update) => {
            await this.handleConnectionUpdate(update);
        });

        // Credentials update
        this.socket.ev.on('creds.update', this.saveCreds);

        // Message events
        this.socket.ev.on('messages.upsert', async (m) => {
            await this.handleMessages(m);
        });

        // Group participant events
        this.socket.ev.on('group-participants.update', async (update) => {
            await this.handleGroupUpdate(update);
        });

        // getMessage helper inside client just like docs
        const getMessage = async (key) => {
            if (this.store) {
                const msg = await this.store.loadMessage(key.remoteJid, key.id);
                return msg?.message;
            }
            return {
                conversation: "Sanka AI"
            };
        };

        // Poll Vote Detection
        this.socket.ev.on('messages.update', async (chatUpdate) => {
            for (const { key, update } of chatUpdate) {
                if (update.pollUpdates && key.fromMe) {
                    try {
                        logger.info(`Received poll update for message ID: ${key.id}`);
                        const pollCreation = await getMessage(key);
                        if (pollCreation) {
                            const pollUpdate = await getAggregateVotesInPollMessage({
                                message: pollCreation, // No .message suffix here, `getMessage` returns the `message` object directly
                                pollUpdates: update.pollUpdates,
                            });
                            
                            const toCmd = pollUpdate.filter(v => v.voters.length !== 0)[0]?.name;
                            logger.info(`Poll decrypted successfully for ID: ${key.id}. Selected: ${toCmd || 'none'}`);
                            
                            this.socket.pollResults.set(key.id, pollUpdate);
                        } else {
                            logger.warn(`Poll creation message not found in store for ID: ${key.id}`);
                        }
                    } catch (e) {
                        logger.error(`Error decrypting poll votes: ${e.message}`, e);
                    }
                }
            }
        });
    }

    /**
     * Handle connection update events
     */
    async handleConnectionUpdate(update) {
        const { connection, lastDisconnect, qr } = update;

        // Handle QR code
        if (qr) {
            logger.info('✅ QR code generated! Sending to web panel...');
            this.qrCode = qr;
            this.connectionState = 'waiting_qr';
            this.retryCount = 0;

            try {
                const qrDataURL = await QRCode.toDataURL(qr, {
                    width: 512,
                    margin: 2,
                    color: {
                        dark: '#000000',
                        light: '#FFFFFF',
                    },
                });

                this.io.emit('bot-status', {
                    state: 'waiting_qr',
                    connected: false,
                    qr: qr,
                    qrImage: qrDataURL,
                    botName: config.bot.name,
                });
            } catch (err) {
                logger.error('Failed to generate QR image:', err);
                this.emitStatus();
            }
        }

        // Handle connection state changes
        if (connection) {
            this.connectionState = connection;
            logger.info(`Connection state: ${connection}`);

            switch (connection) {
                case 'close':
                    await this.handleDisconnect(lastDisconnect);
                    break;

                case 'open':
                    this.handleConnect();
                    break;

                case 'connecting':
                    this.emitStatus();
                    break;
            }
        }
    }

    /**
     * Handle successful connection
     */
    handleConnect() {
        this.isConnected = true;
        this.qrCode = null;
        this.retryCount = 0;

        const user = this.socket.user;
        logger.success(`✅ Connected as: ${user?.name || user?.id || 'Unknown'}`);

        this.emitStatus({
            connected: true,
            user: {
                id: user?.id,
                name: user?.name,
            },
        });
    }

    /**
     * Handle disconnection
     */
    async handleDisconnect(lastDisconnect) {
        this.isConnected = false;
        this.isInitializing = false;

        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const reason = DisconnectReason;

        logger.warn(`Disconnected. Status code: ${statusCode}`);

        // Log actual error
        if (lastDisconnect?.error) {
            logger.error('Error details:', lastDisconnect.error.message || JSON.stringify(lastDisconnect.error));
        }

        // Handle logged out
        if (statusCode === reason.loggedOut) {
            logger.warn('Logged out. Clearing session and restarting...');
            this.clearSession(); // Re-enabled: Auto clear session on logout
            this.retryCount = 0;
            await new Promise(r => setTimeout(r, 3000));
            await this.initialize();
            return;
        }

        // For all other errors, reconnect with exponential backoff
        this.retryCount++;
        const delay = Math.min(this.retryCount * 3000, 30000);
        logger.info(`Reconnecting in ${delay / 1000}s... (attempt ${this.retryCount})`);
        await new Promise(r => setTimeout(r, delay));
        await this.initialize();

        this.emitStatus();
    }

    /**
     * Handle incoming messages
     */
    async handleMessages(m) {
        if (!m.messages || !m.messages[0]) return;

        const message = m.messages[0];

        if (message.key.remoteJid === 'status@broadcast') return;
        if (message.key.fromMe) return;

        try {
            await this.messageHandler.handle(message);
        } catch (error) {
            logger.error('Error handling message:', error);
        }
    }

    /**
     * Handle group participant updates
     */
    async handleGroupUpdate(update) {
        const { id, participants, action } = update;

        if (!config.groupSettings.welcomeEnabled && !config.groupSettings.goodbyeEnabled) {
            return;
        }

        try {
            for (const participant of participants) {
                if (action === 'add' && config.groupSettings.welcomeEnabled) {
                    const welcomeMsg = config.groupSettings.welcomeMessage
                        .replace('{user}', `@${participant.split('@')[0]}`);

                    await this.socket.sendMessage(id, {
                        text: welcomeMsg,
                        mentions: [participant],
                    });
                } else if (action === 'remove' && config.groupSettings.goodbyeEnabled) {
                    const goodbyeMsg = config.groupSettings.goodbyeMessage
                        .replace('{user}', `@${participant.split('@')[0]}`);

                    await this.socket.sendMessage(id, {
                        text: goodbyeMsg,
                        mentions: [participant],
                    });
                }
            }
        } catch (error) {
            logger.error('Error handling group update:', error);
        }
    }

    /**
     * Emit status to web panel
     */
    emitStatus(extra = {}) {
        if (this.io) {
            this.io.emit('bot-status', {
                state: this.connectionState,
                connected: this.isConnected,
                qr: this.qrCode,
                botName: config.bot.name,
                ...extra,
            });
        }
    }

    /**
     * Send a message
     */
    async sendMessage(jid, content) {
        if (!this.isConnected) {
            throw new Error('Bot is not connected');
        }
        return await this.socket.sendMessage(jid, content);
    }

    /**
     * Disconnect the bot
     */
    async disconnect() {
        if (this.socket) {
            logger.info('Disconnecting bot...');
            try {
                await this.socket.logout();
            } catch (e) { }
            this.socket = null;
            this.isConnected = false;
        }
    }

    async clearSession() {
        try {
            const sessionId = config.session.sessionName;
            logger.info(`Clearing session ${sessionId} from MongoDB...`);
            await Session.deleteMany({ sessionId });
            logger.info('Session cleared successfully');
        } catch (error) {
            logger.error('Failed to clear session:', error);
        }
    }

    /**
     * Get current status
     */
    getStatus() {
        return {
            connected: this.isConnected,
            state: this.connectionState,
            qr: this.qrCode,
            user: this.socket?.user,
        };
    }
}

module.exports = BotClient;
