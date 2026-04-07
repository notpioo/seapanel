/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                    AI MODE MODEL                              ║
 * ║          Stores AI Mode settings per group                    ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
    role: {
        type: String,
        enum: ['user', 'assistant'],
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
    senderName: {
        type: String,
        default: 'User',
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
}, { _id: false });

const aiModeSchema = new mongoose.Schema({
    // Group JID (e.g. 120363xxx@g.us)
    groupJid: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },

    // Whether AI mode is enabled
    enabled: {
        type: Boolean,
        default: false,
    },

    // Qwen model to use (can be changed per group)
    model: {
        type: String,
        default: 'qwen3.5-plus',
    },

    // System prompt for the AI persona
    systemPrompt: {
        type: String,
        default: 'Kamu adalah asisten AI yang ramah dan helpful di grup WhatsApp. Jawab dengan bahasa yang natural dan sesuai konteks percakapan. Gunakan bahasa Indonesia kecuali diminta pakai bahasa lain. Jangan terlalu panjang jawabannya, usahakan ringkas tapi informatif.',
    },

    // Chat history for context (limited to last N messages)
    chatHistory: {
        type: [chatMessageSchema],
        default: [],
    },

    // Max history messages to keep (for context window)
    maxHistory: {
        type: Number,
        default: 20,
    },

    // Cooldown in seconds between AI responses
    cooldownSeconds: {
        type: Number,
        default: 3,
    },

    // Who enabled it
    enabledBy: {
        type: String,
        default: '',
    },

    // Timestamps
    enabledAt: {
        type: Date,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

/**
 * Get AI Mode config for a group
 */
aiModeSchema.statics.getGroupConfig = async function (groupJid) {
    let config = await this.findOne({ groupJid });
    return config;
};

/**
 * Enable AI Mode for a group
 */
aiModeSchema.statics.enableForGroup = async function (groupJid, enabledBy) {
    return await this.findOneAndUpdate(
        { groupJid },
        {
            $set: {
                enabled: true,
                enabledBy,
                enabledAt: new Date(),
                updatedAt: new Date(),
            },
        },
        { upsert: true, new: true }
    );
};

/**
 * Disable AI Mode for a group
 */
aiModeSchema.statics.disableForGroup = async function (groupJid) {
    return await this.findOneAndUpdate(
        { groupJid },
        {
            $set: {
                enabled: false,
                updatedAt: new Date(),
            },
        },
        { upsert: false, new: true }
    );
};

/**
 * Add message to chat history (keeps last N messages)
 */
aiModeSchema.statics.addToHistory = async function (groupJid, role, content, senderName = 'User') {
    const config = await this.findOne({ groupJid });
    if (!config) return;

    const maxHistory = config.maxHistory || 20;

    // Push message and trim to max
    config.chatHistory.push({ role, content, senderName, timestamp: new Date() });
    if (config.chatHistory.length > maxHistory) {
        config.chatHistory = config.chatHistory.slice(-maxHistory);
    }

    config.updatedAt = new Date();
    await config.save();
};

/**
 * Clear chat history for a group
 */
aiModeSchema.statics.clearHistory = async function (groupJid) {
    return await this.findOneAndUpdate(
        { groupJid },
        {
            $set: {
                chatHistory: [],
                updatedAt: new Date(),
            },
        }
    );
};

/**
 * Get all enabled AI Mode groups
 */
aiModeSchema.statics.getEnabledGroups = async function () {
    return await this.find({ enabled: true }).select('groupJid model').lean();
};

const AIMode = mongoose.model('AIMode', aiModeSchema);

module.exports = AIMode;
