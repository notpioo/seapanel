/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                    BOT SETTINGS MODEL                        ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

const mongoose = require('mongoose');

const botSettingsSchema = new mongoose.Schema({
    // Bot identity
    botName: {
        type: String,
        default: 'Sanka Bot',
    },
    prefix: {
        type: String,
        default: '.',
    },
    ownerNumber: {
        type: String,
        default: '',
    },

    // Features
    maintenanceMode: {
        type: Boolean,
        default: false,
    },
    autoRead: {
        type: Boolean,
        default: false,
    },
    autoTyping: {
        type: Boolean,
        default: false,
    },
    enableGroupCommands: {
        type: Boolean,
        default: true,
    },
    enablePrivateCommands: {
        type: Boolean,
        default: true,
    },

    // Welcome/Goodbye
    welcomeEnabled: {
        type: Boolean,
        default: true,
    },
    welcomeMessage: {
        type: String,
        default: 'Selamat datang di grup, @{user}! 🎉',
    },
    goodbyeEnabled: {
        type: Boolean,
        default: true,
    },
    goodbyeMessage: {
        type: String,
        default: 'Sampai jumpa, @{user}! 👋',
    },

    // Mining Web Toggle
    miningWebEnabled: {
        type: Boolean,
        default: false,
    },

    // Auto Response
    autoResponseEnabled: {
        type: Boolean,
        default: false,
    },
    autoResponses: {
        type: Map,
        of: String,
        default: new Map([
            ['halo', 'Halo juga! 👋'],
            ['hai', 'Hai! Ada yang bisa dibantu? 😊'],
        ]),
    },

    // Timestamps
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

// Only one settings document
botSettingsSchema.statics.getSettings = async function () {
    let settings = await this.findOne();
    if (!settings) {
        settings = await this.create({});
    }
    return settings;
};

botSettingsSchema.statics.updateSettings = async function (data) {
    let settings = await this.findOne();
    if (!settings) {
        settings = await this.create(data);
    } else {
        Object.assign(settings, data);
        settings.updatedAt = new Date();
        await settings.save();
    }
    return settings;
};

const BotSettings = mongoose.model('BotSettings', botSettingsSchema);

module.exports = BotSettings;
