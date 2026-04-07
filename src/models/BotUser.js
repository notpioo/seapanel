/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                    BOT USER MODEL                            ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

const mongoose = require('mongoose');

const botUserSchema = new mongoose.Schema({
    phoneNumber: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    lid: {
        type: String,
        default: null,
        index: true,
    },
    pushName: {
        type: String,
        default: 'User',
    },
    isPremium: {
        type: Boolean,
        default: false,
    },
    limit: {
        type: Number,
        default: 30, // Daily limit
    },
    maxLimit: {
        type: Number,
        default: 30,
    },
    balance: {
        type: Number,
        default: 0,
    },
    seaShells: {
        type: Number,
        default: 0,
    },
    casinoChips: {
        type: Number,
        default: 0,
    },
    pinjolDebt: {
        type: Number,
        default: 0,
    },
    pinjolLimit: {
        type: Number,
        default: 0, // 0 means default config limit
    },
    lastDailyCsn: {
        type: Date,
        default: null,
    },
    diceStats: {
        games: { type: Number, default: 0 },
        wins: { type: Number, default: 0 },
        losses: { type: Number, default: 0 },
        profit: { type: Number, default: 0 },
    },
    flipStats: {
        games: { type: Number, default: 0 },
        wins: { type: Number, default: 0 },
        losses: { type: Number, default: 0 },
        profit: { type: Number, default: 0 },
    },
    role: {
        type: String,
        enum: ['user', 'owner'],
        default: 'user',
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

// Update timestamp on save
botUserSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

const BotUser = mongoose.model('BotUser', botUserSchema);

module.exports = BotUser;
