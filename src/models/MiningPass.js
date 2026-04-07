/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                  MINING PASS MODEL                           ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

const mongoose = require('mongoose');

const miningPassConfigSchema = new mongoose.Schema({
    configId: { type: String, default: 'main', unique: true },
    isEnabled: { type: Boolean, default: true },
    passPrice: { type: Number, default: 5000 },
    passDuration: { type: Number, default: 30 },
    rewards: [{
        day: { type: Number, required: true },
        freeType: { type: String, enum: ['chips', 'balance', 'limit', 'premium', 'seashells'], default: 'chips' },
        freeAmount: { type: Number, default: 100 },
        premiumType: { type: String, enum: ['chips', 'balance', 'limit', 'premium', 'seashells'], default: 'chips' },
        premiumAmount: { type: Number, default: 1000 },
        label: { type: String, default: '' },
    }],
});

miningPassConfigSchema.statics.getConfig = async function () {
    let config = await this.findOne({ configId: 'main' });
    if (!config || !config.rewards[0] || config.rewards[0].freeAmount === undefined) {
        if (config) await this.deleteOne({ configId: 'main' });
        config = await this.create({
            configId: 'main',
            rewards: [
                { day: 1,  freeType: 'chips',     freeAmount: 100,  premiumType: 'chips',     premiumAmount: 1000,  label: '' },
                { day: 2,  freeType: 'chips',     freeAmount: 150,  premiumType: 'chips',     premiumAmount: 1500,  label: '' },
                { day: 3,  freeType: 'balance',   freeAmount: 50,   premiumType: 'balance',   premiumAmount: 500,   label: '' },
                { day: 4,  freeType: 'chips',     freeAmount: 200,  premiumType: 'chips',     premiumAmount: 2000,  label: '' },
                { day: 5,  freeType: 'limit',     freeAmount: 5,    premiumType: 'limit',     premiumAmount: 25,    label: 'Bonus!' },
                { day: 6,  freeType: 'chips',     freeAmount: 250,  premiumType: 'chips',     premiumAmount: 2500,  label: '' },
                { day: 7,  freeType: 'seashells', freeAmount: 1,    premiumType: 'seashells', premiumAmount: 5,     label: 'Bonus Kerang!' },
                { day: 8,  freeType: 'balance',   freeAmount: 100,  premiumType: 'balance',   premiumAmount: 1000,  label: '' },
                { day: 9,  freeType: 'chips',     freeAmount: 300,  premiumType: 'chips',     premiumAmount: 3000,  label: '' },
                { day: 10, freeType: 'chips',     freeAmount: 350,  premiumType: 'chips',     premiumAmount: 3500,  label: '' },
                { day: 11, freeType: 'chips',     freeAmount: 400,  premiumType: 'chips',     premiumAmount: 4000,  label: '' },
                { day: 12, freeType: 'balance',   freeAmount: 150,  premiumType: 'balance',   premiumAmount: 1500,  label: '' },
                { day: 13, freeType: 'chips',     freeAmount: 450,  premiumType: 'chips',     premiumAmount: 4500,  label: '' },
                { day: 14, freeType: 'seashells', freeAmount: 2,    premiumType: 'seashells', premiumAmount: 10,    label: 'Bonus Kerang!' },
                { day: 15, freeType: 'limit',     freeAmount: 10,   premiumType: 'limit',     premiumAmount: 50,    label: 'Half Way!' },
                { day: 16, freeType: 'chips',     freeAmount: 500,  premiumType: 'chips',     premiumAmount: 5000,  label: '' },
                { day: 17, freeType: 'balance',   freeAmount: 200,  premiumType: 'balance',   premiumAmount: 2000,  label: '' },
                { day: 18, freeType: 'chips',     freeAmount: 550,  premiumType: 'chips',     premiumAmount: 5500,  label: '' },
                { day: 19, freeType: 'chips',     freeAmount: 600,  premiumType: 'chips',     premiumAmount: 6000,  label: '' },
                { day: 20, freeType: 'chips',     freeAmount: 650,  premiumType: 'chips',     premiumAmount: 6500,  label: '' },
                { day: 21, freeType: 'seashells', freeAmount: 3,    premiumType: 'seashells', premiumAmount: 15,    label: 'Bonus Kerang!' },
                { day: 22, freeType: 'balance',   freeAmount: 250,  premiumType: 'balance',   premiumAmount: 2500,  label: '' },
                { day: 23, freeType: 'chips',     freeAmount: 700,  premiumType: 'chips',     premiumAmount: 7000,  label: '' },
                { day: 24, freeType: 'chips',     freeAmount: 750,  premiumType: 'chips',     premiumAmount: 7500,  label: '' },
                { day: 25, freeType: 'limit',     freeAmount: 15,   premiumType: 'limit',     premiumAmount: 100,   label: '' },
                { day: 26, freeType: 'chips',     freeAmount: 800,  premiumType: 'chips',     premiumAmount: 8000,  label: '' },
                { day: 27, freeType: 'balance',   freeAmount: 300,  premiumType: 'balance',   premiumAmount: 3000,  label: '' },
                { day: 28, freeType: 'seashells', freeAmount: 5,    premiumType: 'seashells', premiumAmount: 25,    label: 'Bonus Kerang!' },
                { day: 29, freeType: 'chips',     freeAmount: 1000, premiumType: 'chips',     premiumAmount: 10000, label: '' },
                { day: 30, freeType: 'seashells', freeAmount: 10,   premiumType: 'seashells', premiumAmount: 50,    label: 'GRAND REWARD!' },
            ],
        });
    }
    return config;
};

const MiningPassConfig = mongoose.model('MiningPassConfig', miningPassConfigSchema);

const miningPassPlayerSchema = new mongoose.Schema({
    phoneNumber:   { type: String, required: true, index: true },
    purchasedAt:   { type: Date,   required: true },
    expiresAt:     { type: Date,   required: true },
    currentDay:    { type: Number, default: 0 },
    lastClaimDate: { type: String, default: '' },
    claimedDates:  { type: [String], default: [] },
    isActive:      { type: Boolean, default: true },
    hasPremium:    { type: Boolean, default: false },
});

const MiningPassPlayer = mongoose.model('MiningPassPlayer', miningPassPlayerSchema);

module.exports = { MiningPassConfig, MiningPassPlayer };
