/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                  CASINO CONFIG MODEL                         ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

const mongoose = require('mongoose');

const casinoConfigSchema = new mongoose.Schema({
    configId: { type: String, default: 'main', unique: true },

    // Daily Claim Settings
    dailyClaimMin: { type: Number, default: 100 },
    dailyClaimMax: { type: Number, default: 400 },
    dailyCooldownHours: { type: Number, default: 2 },

    // Slot Machine Settings
    slotMinBet: { type: Number, default: 10 },
    slotMaxBet: { type: Number, default: 10000 },

    // Dice Settings
    diceWinRate: { type: Number, default: 40 },       // % chance to win (the "licik" part)
    diceMultiplier: { type: Number, default: 2 },      // Payout multiplier
    diceMinBet: { type: Number, default: 10 },
    diceMaxBet: { type: Number, default: 5000 },
    slotSymbols: [{
        emoji: { type: String, required: true },
        name: { type: String, required: true },
        weight: { type: Number, default: 10 },   // Higher = more common
        multiplier: { type: Number, default: 3 }, // Payout on 3-match
    }],

    // Pinjaman (Pinjol) Settings
    pinjolEnabled: { type: Boolean, default: true },
    pinjolMaxAmount: { type: Number, default: 2500 },
    pinjolInterestRate: { type: Number, default: 20 }, // 20%
    pinjolMinBalance: { type: Number, default: 500 }, // Harus <= 500 baru bisa minjam
    pinjolDeductionRate: { type: Number, default: 50 }, // 50% potong kemenangan

    // General Casino Settings
    isEnabled: { type: Boolean, default: true },
    maintenanceMsg: { type: String, default: 'Kasino sedang dalam pemeliharaan.' },
});

// Static: Get or create config
casinoConfigSchema.statics.getConfig = async function () {
    let config = await this.findOne({ configId: 'main' });
    if (!config) {
        config = await this.create({
            configId: 'main',
            slotSymbols: [
                { emoji: '🍒', name: 'Cherry', weight: 20, multiplier: 3 },
                { emoji: '🍋', name: 'Lemon', weight: 18, multiplier: 5 },
                { emoji: '🍇', name: 'Grape', weight: 16, multiplier: 5 },
                { emoji: '🍉', name: 'Watermelon', weight: 14, multiplier: 5 },
                { emoji: '🔔', name: 'Bell', weight: 10, multiplier: 10 },
                { emoji: '⭐', name: 'Star', weight: 6, multiplier: 15 },
                { emoji: '💎', name: 'Diamond', weight: 3, multiplier: 25 },
                { emoji: '7️⃣', name: 'Seven', weight: 1, multiplier: 50 },
            ],
        });
    }
    return config;
};

const CasinoConfig = mongoose.model('CasinoConfig', casinoConfigSchema);

module.exports = CasinoConfig;
