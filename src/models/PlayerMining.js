/**
 * Player Mining Model
 */

const mongoose = require('mongoose');

const playerMiningSchema = new mongoose.Schema({
    phoneNumber: { type: String, required: true, unique: true, index: true },

    // Currency
    minecon: { type: Number, default: 0, index: -1 },
    gems:    { type: Number, default: 0 },

    // Per-run equipment (reset on rebirth)
    pickaxeLevel:  { type: Number, default: 1 },
    backpackLevel: { type: Number, default: 1 },

    // Inventory (reset on rebirth)
    inventory:  { type: Map, of: Number, default: new Map() },

    // Vault & Event items (never reset)
    vault:      { type: Map, of: Number, default: new Map() },
    eventItems: { type: Map, of: Number, default: new Map() },

    // Boosts
    activeBoosts: [{
        type:       { type: String },
        multiplier: { type: Number },
        expiresAt:  { type: Date }
    }],

    // Generator mining timestamps
    lastMineTime:  { type: Date, default: null }, // kept for backward compat
    lastCollect:   { type: Date, default: null }, // generator: last collect time

    // Lifetime stats
    stats: {
        totalMined:       { type: Number, default: 0 },
        totalSold:        { type: Number, default: 0 },
        totalEarned:      { type: Number, default: 0 },
        totalGemsEarned:  { type: Number, default: 0 },
        totalBoostDonated:{ type: Number, default: 0 },
        boostsActivated:  { type: Number, default: 0 }
    },

    // Quest system (solo, rank-based)
    quest: {
        rank:             { type: String, enum: ['F','E','D','C','B','A','S','SS','SSS'], default: 'F' },
        xp:               { type: Number, default: 0 },
        completedTotal:   { type: Number, default: 0 },
        lastQuestRefresh: { type: Date, default: null },
        activeQuests: [{
            id:        { type: String },
            questType: { type: String }, // sell_ore | collect_ore | hunt | upgrade
            resource:  { type: String, default: '' },
            target:    { type: Number, default: 0 },
            progress:  { type: Number, default: 0 },
            reward: {
                minecon: { type: Number, default: 0 },
                gems:    { type: Number, default: 0 },
                xp:      { type: Number, default: 0 },
                shards:  { type: Number, default: 0 }
            },
            status:      { type: String, enum: ['active','completed'], default: 'active' },
            generatedAt: { type: Date, default: Date.now }
        }]
    },

    // Guild (kept for future use)
    guild: {
        joined:           { type: Boolean, default: false },
        rank:             { type: String, default: 'F' },
        xp:               { type: Number, default: 0 },
        completedQuests:  { type: Number, default: 0 },
        lastQuestRefresh: { type: Date, default: null },
        activeQuests:     [{ type: Object }]
    },

    // Rebirth system (permanent)
    rebirthCount:  { type: Number, default: 0, index: -1 },
    rebirthPoints: { type: Number, default: 0 },
    rpUpgrades:    { type: Map, of: Number, default: new Map() },

    // Pet system (permanent — survive rebirth)
    lastHunt:  { type: Date, default: null },
    petShards: { type: Number, default: 0 },
    pets: [{
        id:    { type: String, required: true },
        level: { type: Number, default: 1, min: 1, max: 10 }
    }]

}, { timestamps: true });

// ─────────────────────────────────────────────
// Location helper
// ─────────────────────────────────────────────

playerMiningSchema.methods.getLocation = function (config) {
    const r = this.rebirthCount || 0;
    const locs = (config.locations || []).slice().sort((a, b) => a.minRebirth - b.minRebirth);
    let current = locs[0] || { minRebirth: 0, name: 'Surface', emoji: '🌄', resources: [] };
    for (const loc of locs) {
        if (r >= loc.minRebirth) current = loc;
    }
    return current;
};

// ─────────────────────────────────────────────
// Backpack helpers
// ─────────────────────────────────────────────

// Per-item-type capacity (optionally uses config.bpConfig for formula)
playerMiningSchema.methods.getBackpackCapacity = function (config) {
    const lvl = this.backpackLevel || 1;
    const bp = config?.bpConfig || {};
    const base = bp.baseCapacity ?? 50;
    const perLvl = bp.capacityPerLevel ?? 20;
    return base + (lvl - 1) * perLvl;
};

// Backpack upgrade cost for going FROM current level to next
playerMiningSchema.methods.getBackpackUpgradeCost = function (config) {
    const lvl = this.backpackLevel || 1;
    const bp = config?.bpConfig || {};
    const maxLvl = bp.maxLevel ?? 250;
    if (lvl >= maxLvl) return null;
    const baseCost = bp.baseCost ?? 500;
    const costExp  = bp.costExp  ?? 1.5;
    return Math.floor(baseCost * Math.pow(lvl, costExp));
};

// Add items respecting TOTAL BP cap — returns { added, lost }
playerMiningSchema.methods.addToInventoryWithCap = function (items, capacity) {
    const added = {};
    const lost  = {};
    let remaining = Math.max(0, capacity - this.getTotalItems());
    for (const [item, qty] of Object.entries(items)) {
        const actualAdd = Math.min(qty, remaining);
        const lostQty   = qty - actualAdd;
        if (actualAdd > 0) {
            this.inventory.set(item, (this.inventory.get(item) || 0) + actualAdd);
            added[item] = actualAdd;
            remaining  -= actualAdd;
        }
        if (lostQty > 0) lost[item] = lostQty;
    }
    return { added, lost };
};

// ─────────────────────────────────────────────
// Rebirth helpers
// ─────────────────────────────────────────────

playerMiningSchema.methods.getRebirthBonuses = function () {
    const ups = this.rpUpgrades || new Map();
    const get = (id) => (typeof ups.get === 'function' ? ups.get(id) : ups[id]) || 0;
    return {
        dropMultiplier:   1 + get('drop_rate')   * 0.05,  // +5% per level
        sellMultiplier:   1 + get('sell_price')  * 0.03,  // +3% per level
        gemChanceBonus:   get('gem_chance')       * 2,    // +2% per level
        cooldownReduction:get('cooldown')         * 1,    // -1s per level
        headStartLevel:   get('head_start')       * 2,    // +2 starting level per level
        upgradeDiscount:  get('ore_discount')     * 0.02, // -2% cost per level (as decimal)
        extraRpPerRebirth:get('rebirth_bonus')    * 1     // +1 RP extra per rebirth per level
    };
};

playerMiningSchema.methods.getRebirthTier = function () {
    const r = this.rebirthCount || 0;
    if (r === 0)   return { label: 'Mortal',       emoji: '⚫' };
    if (r < 5)     return { label: 'Bronze',       emoji: '🟤' };
    if (r < 10)    return { label: 'Silver',       emoji: '⚪' };
    if (r < 25)    return { label: 'Gold',         emoji: '🟡' };
    if (r < 50)    return { label: 'Platinum',     emoji: '🔵' };
    if (r < 100)   return { label: 'Diamond',      emoji: '💎' };
    if (r < 250)   return { label: 'Mythril',      emoji: '🟣' };
    if (r < 500)   return { label: 'Void',         emoji: '🌑' };
    if (r < 750)   return { label: 'God',          emoji: '👑' };
    if (r < 1000)  return { label: 'Transcendent', emoji: '✨' };
    if (r < 1500)  return { label: 'Celestial',    emoji: '🌌' };
    if (r < 1800)  return { label: 'Omnipotent',   emoji: '⚡' };
    return           { label: 'Absolute',      emoji: '🌟' };
};

// ─────────────────────────────────────────────
// Inventory helpers (no-cap version, used by sell/trade)
// ─────────────────────────────────────────────

playerMiningSchema.methods.addToInventory = function (items) {
    for (const [item, qty] of Object.entries(items)) {
        this.inventory.set(item, (this.inventory.get(item) || 0) + qty);
    }
};

playerMiningSchema.methods.getTotalItems = function () {
    let total = 0;
    for (const qty of this.inventory.values()) total += qty;
    return total;
};

playerMiningSchema.methods.clearInventory = function () {
    this.inventory = new Map();
};

// ─────────────────────────────────────────────
// Boost helpers
// ─────────────────────────────────────────────

playerMiningSchema.methods.getBoostMultiplier = function (boostType) {
    const now = new Date();
    this.activeBoosts = this.activeBoosts.filter(b => new Date(b.expiresAt) > now);
    const b = this.activeBoosts.find(b => b.type === boostType);
    return b ? b.multiplier : 1;
};

playerMiningSchema.methods.addBoost = function (boostType, multiplier, durationMinutes) {
    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);
    this.activeBoosts = this.activeBoosts.filter(b => b.type !== boostType);
    this.activeBoosts.push({ type: boostType, multiplier, expiresAt });
};

playerMiningSchema.methods.getActiveBoosts = function () {
    const now = new Date();
    this.activeBoosts = this.activeBoosts.filter(b => new Date(b.expiresAt) > now);
    return this.activeBoosts;
};

// ─────────────────────────────────────────────
// Static: get or create player
// ─────────────────────────────────────────────

playerMiningSchema.statics.getPlayer = async function (phoneNumber) {
    let player = await this.findOne({ phoneNumber });
    if (!player) player = await this.create({ phoneNumber });
    return player;
};

module.exports = mongoose.model('PlayerMining', playerMiningSchema);
