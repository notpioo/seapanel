/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                    MESSAGE HANDLER                           ║
 * ║                    OPTIMIZED VERSION                         ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

const config = require('../../../config/bot.config');
const Logger = require('../../utils/logger');

const CommandLoader = require('../commands/loader');
const { BotUser, AIMode } = require('../../models');
const aiService = require('../utils/aiService');
const susunKataEngine = require('../games/susunkataEngine');
const tebakKataEngine = require('../games/tebakkataEngine');
const tebakGambarEngine = require('../games/tebakgambarEngine');

const logger = new Logger('MessageHandler');

// Cache command loader instance (singleton)
let commandLoaderInstance = null;

// AI Mode cache: Set of group JIDs with AI mode enabled
// Refreshed periodically to avoid hitting DB on every message
let aiModeCache = new Set();
let aiModeCacheLastUpdate = 0;
const AI_MODE_CACHE_TTL = 30000; // 30 seconds

async function refreshAiModeCache() {
    try {
        const groups = await AIMode.getEnabledGroups();
        aiModeCache = new Set(groups.map(g => g.groupJid));
        aiModeCacheLastUpdate = Date.now();
    } catch (e) {
        // Keep old cache on error
    }
}

/**
 * Message Handler Class - Optimized for speed
 */
class MessageHandler {
    constructor(socket) {
        this.socket = socket;
        // Use singleton for command loader to avoid reloading commands
        if (!commandLoaderInstance) {
            commandLoaderInstance = new CommandLoader();
        }
        this.commandLoader = commandLoaderInstance;
        this.cooldowns = new Map();
        this.spamCache = new Map();
    }

    /**
     * Handle incoming message - Optimized
     */
    async handle(message) {
        const { key, message: msg } = message;
        const jid = key.remoteJid;
        const isGroup = jid.endsWith('@g.us');
        const sender = isGroup ? key.participant : jid;

        // Extract text first - early return if no text
        const text = this.extractText(msg);
        if (!text) return;

        // Dewa LID Sync from MessageKey `participantAlt` / `remoteJidAlt` (Baileys 6.8+ hidden feature)
        this.syncLidMetadata(message.key);

        // Register/Update User in DB (Fire and Forget)
        this.registerUser(sender, message.pushName);

        // ═══════════════════════ AI MODE CHECK ═══════════════════════
        // Refresh AI mode cache if stale
        if (Date.now() - aiModeCacheLastUpdate > AI_MODE_CACHE_TTL) {
            refreshAiModeCache(); // Fire and forget
        }

        if (isGroup && aiModeCache.has(jid)) {
            // Allow .aimode command to still work in AI mode groups
            if (text.startsWith(config.bot.prefix)) {
                const cmdName = text.slice(config.bot.prefix.length).trim().split(/\s+/)[0]?.toLowerCase();
                if (cmdName === 'aimode' || cmdName === 'ai') {
                    // Let it fall through to normal command processing
                } else {
                    // Ignore all other commands in AI mode
                    return;
                }
            } else {
                // Non-command message → send to AI
                await this.handleAIMode(jid, text, message, sender);
                return;
            }
        }
        // ═══════════════════════════════════════════════════════════════

        // Check if it's a command first (fast check)
        if (!text.startsWith(config.bot.prefix)) {
            const sessionKey = susunKataEngine.getSessionKey({ isGroup, jid, sender });

            const susunAttempt = susunKataEngine.tryAnswer(sessionKey, text);
            if (susunAttempt.handled && susunAttempt.result === 'correct') {
                await this.reply(jid, `✅ *BENAR!* 🎉\nJawaban: *${susunAttempt.session.jawaban.toUpperCase()}*\n\nMain lagi: *.susunkata*`, message);
                return;
            }

            const tebakAttempt = tebakKataEngine.tryAnswer(sessionKey, text);
            if (tebakAttempt.handled && tebakAttempt.result === 'correct') {
                await this.reply(jid, `✅ *BENAR!* 🎉\nJawaban: *${tebakAttempt.session.jawaban.toUpperCase()}*\n\nMain lagi: *.tebakkata*`, message);
                return;
            }

            const gambarAttempt = tebakGambarEngine.tryAnswer(sessionKey, text);
            if (gambarAttempt.handled && gambarAttempt.result === 'correct') {
                await this.reply(jid, `✅ *BENAR!* 🎉\nJawaban: *${gambarAttempt.session.jawaban.toUpperCase()}*\n\nMain lagi: *.tebakgambar*`, message);
                return;
            }

            // Only check auto response if enabled and not a command
            if (config.autoResponse.enabled) {
                const autoReply = this.checkAutoResponse(text);
                if (autoReply) {
                    await this.reply(jid, autoReply, message);
                }
            }
            return;
        }

        // Quick context check
        if (isGroup && !config.features.enableGroupCommands) return;
        if (!isGroup && !config.features.enablePrivateCommands) return;

        // Log if enabled (async, don't await)
        if (config.features.logMessages) {
            logger.info(`[${isGroup ? 'G' : 'P'}] ${sender.split('@')[0]}: ${text}`);
        }

        // Parse command
        const args = text.slice(config.bot.prefix.length).trim().split(/\s+/);
        const commandName = args.shift().toLowerCase();

        // Get command
        const command = this.commandLoader.getCommand(commandName);
        if (!command) {
            // Don't reply for unknown commands - saves time and bandwidth
            const sessionKey = susunKataEngine.getSessionKey({ isGroup, jid, sender });
            const textWithoutPrefix = text.slice(config.bot.prefix.length).trim();

            const susunAttempt = susunKataEngine.tryAnswer(sessionKey, textWithoutPrefix);
            if (susunAttempt.handled && susunAttempt.result === 'correct') {
                await this.reply(jid, `✅ *BENAR!* 🎉\nJawaban: *${susunAttempt.session.jawaban.toUpperCase()}*\n\nMain lagi: *.susunkata*`, message);
                return;
            }

            const tebakAttempt = tebakKataEngine.tryAnswer(sessionKey, textWithoutPrefix);
            if (tebakAttempt.handled && tebakAttempt.result === 'correct') {
                await this.reply(jid, `✅ *BENAR!* 🎉\nJawaban: *${tebakAttempt.session.jawaban.toUpperCase()}*\n\nMain lagi: *.tebakkata*`, message);
                return;
            }

            const gambarAttempt = tebakGambarEngine.tryAnswer(sessionKey, textWithoutPrefix);
            if (gambarAttempt.handled && gambarAttempt.result === 'correct') {
                await this.reply(jid, `✅ *BENAR!* 🎉\nJawaban: *${gambarAttempt.session.jawaban.toUpperCase()}*\n\nMain lagi: *.tebakgambar*`, message);
                return;
            }

            return;
        }

        // Quick checks
        if (config.features.maintenanceMode && !this.isOwner(sender)) {
            await this.reply(jid, config.messages.maintenanceMessage, message);
            return;
        }

        if (command.ownerOnly && !this.isOwner(sender)) {
            await this.reply(jid, config.messages.ownerOnlyMessage, message);
            return;
        }

        // Cooldown check
        if (this.isOnCooldown(sender, commandName)) {
            return; // Silent return - don't spam user with cooldown messages
        }

        // Execute command immediately (no typing indicator for speed)
        try {
            await command.execute({
                socket: this.socket,
                message,
                args,
                command: commandName,
                text: args.join(' '),
                sender,
                jid,
                isGroup,
                isOwner: this.isOwner(sender),
                reply: (content, options) => this.reply(jid, content, message, options),
                config,
            });

            // Set cooldown after successful execution
            this.setCooldown(sender, commandName);
        } catch (error) {
            logger.error('Command error:', error.message);
        }
    }

    /**
     * Register or update user in database (Async)
     */
    async registerUser(sender, pushName) {
        if (!sender) return;
        try {
            const isLid = sender.includes('@lid');
            const cleanId = sender.replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@lid', '');
            const name = pushName || 'User';

            if (isLid) {
                // If the sender is an LID, we only update LID if we can find them, but it's hard to find without phone num.
                // At least update the LID if a match exists, or create a placeholder if desired. 
                // But typically, we should let group metadata mapping handle phone-lid binding.
                // For now, if it's LID, we can just save it into a new field or ignore. 
                // Wait! If they are sending from LID, we might not know their phone number yet.
                // We'll trust the group sync to link Phone and LID.
                await BotUser.findOneAndUpdate(
                    { lid: cleanId },
                    {
                        $set: { pushName: name, lid: cleanId },
                        $setOnInsert: { phoneNumber: cleanId, limit: 30, balance: 0, isPremium: false } // Fallback: make phone number the LID temporarily until synced
                    },
                    { upsert: true }
                );
            } else {
                // Normal phone number sender
                await BotUser.findOneAndUpdate(
                    { phoneNumber: cleanId },
                    {
                        $set: { pushName: name },
                        $setOnInsert: { limit: 30, balance: 0, isPremium: false }
                    },
                    { upsert: true }
                );
            }
        } catch (error) {
            // Ignore DB errors to ensure bot stability
        }
    }

    /**
     * Secretly syncs LIDs using the hidden `participantAlt` in Baileys 6.8+
     */
    syncLidMetadata(key) {
        if (!key) return;
        try {
            // In groups: sender is participant, ID is participantAlt. In DMs: remoteJid and remoteJidAlt
            let lid = null;
            let pn = null;

            if (key.participant && key.participant.includes('@lid') && key.participantAlt) {
                lid = key.participant.replace('@lid', '');
                pn = key.participantAlt.replace('@s.whatsapp.net', '').replace('@c.us', '');
            } else if (key.remoteJid && key.remoteJid.includes('@lid') && key.remoteJidAlt) {
                lid = key.remoteJid.replace('@lid', '');
                pn = key.remoteJidAlt.replace('@s.whatsapp.net', '').replace('@c.us', '');
            }

            if (lid && pn) {
                // Background update
                BotUser.updateOne(
                    { phoneNumber: pn },
                    { $set: { lid: lid } },
                    { upsert: false } // We don't want to blindly create empty profiles just yet
                ).catch(() => { });
            }
        } catch (e) {
            // Silently ignore to not spam logs
        }
    }

    /**
     * Extract text from message object - Optimized
     */
    extractText(msg) {
        if (!msg) return '';

        let interactiveId = '';
        if (msg.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson) {
            try {
                interactiveId = JSON.parse(msg.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson).id || '';
            } catch (e) { }
        }

        return msg.conversation ||
            msg.extendedTextMessage?.text ||
            msg.imageMessage?.caption ||
            msg.videoMessage?.caption ||
            msg.listResponseMessage?.singleSelectReply?.selectedRowId ||
            msg.buttonsResponseMessage?.selectedButtonId ||
            msg.templateButtonReplyMessage?.selectedId ||
            interactiveId ||
            '';
    }

    /**
     * Reply to a message
     */
    async reply(jid, content, quotedMessage, options = {}) {
        let messageContent = typeof content === 'string'
            ? { text: content }
            : content;

        // Merge options (e.g. mentions) into message content
        if (options && typeof options === 'object') {
            messageContent = { ...messageContent, ...options };
        }

        const sendOptions = { quoted: quotedMessage };
        let lastErr;
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                return await this.socket.sendMessage(jid, messageContent, sendOptions);
            } catch (e) {
                lastErr = e;
                const fallbackSend = global.__sankaSendMessage;
                if (typeof fallbackSend === 'function') {
                    try {
                        return await fallbackSend(jid, messageContent, sendOptions);
                    } catch (e2) {
                        lastErr = e2;
                    }
                }
                await new Promise(r => setTimeout(r, 400));
            }
        }
        throw lastErr;
    }

    /**
     * Handle AI Mode - Send message to Qwen AI and reply
     */
    async handleAIMode(jid, text, message, sender) {
        try {
            // Get group AI config
            const groupConfig = await AIMode.getGroupConfig(jid);
            if (!groupConfig || !groupConfig.enabled) return;

            // Check cooldown
            if (aiService.isOnCooldown(jid, groupConfig.cooldownSeconds)) {
                return; // Silent ignore during cooldown
            }

            // Check if API key is configured
            if (!aiService.isConfigured()) {
                logger.warn('AI Mode: QWEN_API_KEY not configured');
                return;
            }

            const senderName = message.pushName || 'User';

            // Call Qwen API with chat history
            const aiReply = await aiService.chat(
                groupConfig.model,
                groupConfig.systemPrompt,
                groupConfig.chatHistory || [],
                text,
                senderName
            );

            if (!aiReply) return;

            // Set cooldown
            aiService.setCooldown(jid);

            // Save user message + AI reply to history (fire and forget)
            AIMode.addToHistory(jid, 'user', text, senderName).catch(() => {});
            AIMode.addToHistory(jid, 'assistant', aiReply, 'AI').catch(() => {});

            // Reply to the message
            await this.reply(jid, aiReply, message);
        } catch (error) {
            logger.error('AI Mode error:', error.message);
            // Don't reply with error to avoid spamming the group
        }
    }

    /**
     * Check if sender is owner - Cached
     */
    isOwner(sender) {
        // Handle array of owner numbers
        const ownerNumbers = Array.isArray(config.bot.ownerNumber) ? config.bot.ownerNumber : [config.bot.ownerNumber];
        const senderNumber = sender.replace('@s.whatsapp.net', '').replace('@c.us', '');

        return ownerNumbers.some(owner => {
            const cleanOwner = owner.toString().replace(/\D/g, '');
            return senderNumber === cleanOwner; // Exact match required
        });
    }

    /**
     * Check auto response - Optimized with Map
     */
    checkAutoResponse(text) {
        const lowerText = text.toLowerCase().trim();
        return config.autoResponse.responses[lowerText] || null;
    }

    /**
     * Check if user is on cooldown
     */
    isOnCooldown(sender, commandName) {
        if (!config.rateLimit.enabled) return false;

        const key = `${sender}-${commandName}`;
        const cooldownEnd = this.cooldowns.get(key);

        return cooldownEnd && Date.now() < cooldownEnd;
    }

    /**
     * Set cooldown for a command
     */
    setCooldown(sender, commandName) {
        const key = `${sender}-${commandName}`;
        const cooldownTime = (config.cooldowns.commands[commandName] || config.cooldowns.default) * 1000;
        this.cooldowns.set(key, Date.now() + cooldownTime);
    }
}

module.exports = MessageHandler;
