/**
 * Mining Config Model
 * Admin-editable configuration for the mining game
 */

const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
    name:       { type: String, required: true },
    rarity:     { type: String, enum: ['common','uncommon','rare','epic','legendary','mythical','divine','ultimate','exclusive'], default: 'common' },
    sellPrice:  { type: Number, default: 10 },
    dropWeight: { type: Number, default: 50 }
});

const locationSchema = new mongoose.Schema({
    minRebirth: { type: Number, required: true },
    name:       { type: String, required: true },
    emoji:      { type: String, default: '🏔️' },
    resources:  [String]
});

const pickaxeLevelSchema = new mongoose.Schema({
    level:          { type: Number, required: true },
    name:           { type: String, required: true },
    upgradeCost:    { type: Number, default: 0 },
    dropMultiplier: { type: Number, default: 1 }
});

const rpUpgradeSchema = new mongoose.Schema({
    id:             { type: String, required: true },
    name:           { type: String, required: true },
    emoji:          { type: String, default: '⬆️' },
    description:    { type: String, default: '' },
    maxLevel:       { type: Number, default: 20 },
    effectPerLevel: { type: Number, default: 5 },
    effectType:     { type: String, default: 'drop_rate' },
    costs:          [Number]
});

const miningConfigSchema = new mongoose.Schema({
    configId: { type: String, default: 'main', unique: true },

    // General
    cooldownSeconds: { type: Number, default: 30 },
    baseDropMin:     { type: Number, default: 1 },
    baseDropMax:     { type: Number, default: 3 },

    // mfind prices
    findPrices: {
        type: Map, of: Number,
        default: new Map([
            ['common', 5], ['uncommon', 25], ['rare', 75], ['epic', 150], ['legendary', 300]
        ])
    },

    // Gems
    gemChance:   { type: Number, default: 12 },
    gemDropMin:  { type: Number, default: 1 },
    gemDropMax:  { type: Number, default: 3 },

    // Shop Items
    shopItems: [{
        id: String, name: String, emoji: String, description: String,
        price: Number,
        currency:        { type: String, enum: ['minecon','gems'], default: 'gems' },
        boostType:       String,
        multiplier:      Number,
        durationMinutes: Number,
        isGlobal:        { type: Boolean, default: false }
    }],

    // Active Global Boosts
    globalBoosts: [{
        type:           { type: String },
        dropMultiplier: { type: Number, default: 1 },
        speedMultiplier:{ type: Number, default: 1 },
        sellMultiplier: { type: Number, default: 1 },
        bpMultiplier:   { type: Number, default: 1 },
        expiresAt:      Date,
        activatedBy:    String,
        contributors:   [{ phoneNumber: String, amount: Number }]
    }],

    // Active Boost Pool
    activePool: {
        active:       { type: Boolean, default: false },
        boostId:      String,
        boostName:    String,
        targetGems:   { type: Number, default: 0 },
        collectedGems:{ type: Number, default: 0 },
        contributors: [{ phoneNumber: String, amount: Number }],
        startedBy:    String,
        startedAt:    Date,
        expiresAt:    Date,
        status:       { type: String, enum: ['active','completed','expired','cancelled'], default: 'active' }
    },

    // Drop Event
    dropEventConfig: {
        name:        { type: String, default: 'Cookies' },
        emoji:       { type: String, default: '🍪' },
        description: { type: String, default: 'Event item spesial — kumpulkan sebanyak mungkin!' },
        dropChance:  { type: Number, default: 5 }
    },
    activeDropEvent: {
        active:        { type: Boolean, default: false },
        name:          { type: String, default: '' },
        emoji:         { type: String, default: '🍪' },
        totalStock:    { type: Number, default: 0 },
        remainingStock:{ type: Number, default: 0 },
        dropChance:    { type: Number, default: 5 },
        startedAt:     { type: Date, default: null },
        expiresAt:     { type: Date, default: null },
        startedBy:     { type: String, default: '' }
    },

    // Game Data
    resources:     [resourceSchema],
    locations:     [locationSchema],
    pickaxeLevels: [pickaxeLevelSchema],

    // Pickaxe formula config
    pickaxeConfig: {
        maxLevel:      { type: Number, default: 250 },
        baseCost:      { type: Number, default: 2 },
        costExp:       { type: Number, default: 1.4 },
        baseMult:      { type: Number, default: 1.0 },
        multPerLevel:  { type: Number, default: 0.03 }
    },

    // BP formula config
    bpConfig: {
        maxLevel:         { type: Number, default: 250 },
        baseCapacity:     { type: Number, default: 50 },
        capacityPerLevel: { type: Number, default: 20 },
        baseCost:         { type: Number, default: 4 },
        costExp:          { type: Number, default: 1.3 }
    },

    // Rebirth Config
    rebirthConfig: {
        minPickaxe: { type: Number, default: 200 },
        minBP:      { type: Number, default: 200 },
        upgrades:   [rpUpgradeSchema]
    },

    // Guild Settings
    guildSettings: {
        questRefreshHours: { type: Number, default: 24 },
        ranks: [{
            name:              { type: String, enum: ['F','E','D','C','B','A','S','SS','SSS'] },
            requiredXp:        { type: Number, default: 0 },
            questCount:        { type: Number, default: 3 },
            allowedResources:  [{ type: String }],
            minQuantity:       { type: Number, default: 10 },
            maxQuantity:       { type: Number, default: 100 },
            rewardMultiplier:  { type: Number, default: 1 },
            gemRewardMin:       { type: Number, default: 0 },
            gemRewardMax:       { type: Number, default: 2 },
            xpRewardMin:        { type: Number, default: 10 },
            xpRewardMax:        { type: Number, default: 50 },
            shardRewardMin:     { type: Number, default: 0 },
            shardRewardMax:     { type: Number, default: 0 },
            promoteCostMinecon: { type: Number, default: 0 },
            promoteCostGems:    { type: Number, default: 0 }
        }],
        bountySettings: {
            easyCount:       { type: Number, default: 4 },
            easyQtyMin:      { type: Number, default: 30 },
            easyQtyMax:      { type: Number, default: 80 },
            easyRewardMult:  { type: Number, default: 1.5 },
            easyXpMin:       { type: Number, default: 20 },
            easyXpMax:       { type: Number, default: 40 },
            easyGemMin:      { type: Number, default: 0 },
            easyGemMax:      { type: Number, default: 2 },

            mediumCount:     { type: Number, default: 3 },
            mediumQtyMin:    { type: Number, default: 50 },
            mediumQtyMax:    { type: Number, default: 120 },
            mediumRewardMult:{ type: Number, default: 3 },
            mediumXpMin:     { type: Number, default: 40 },
            mediumXpMax:     { type: Number, default: 80 },
            mediumGemMin:    { type: Number, default: 1 },
            mediumGemMax:    { type: Number, default: 3 },

            hardCount:       { type: Number, default: 2 },
            hardQtyMin:      { type: Number, default: 30 },
            hardQtyMax:      { type: Number, default: 80 },
            hardRewardMult:  { type: Number, default: 6 },
            hardXpMin:       { type: Number, default: 80 },
            hardXpMax:       { type: Number, default: 150 },
            hardGemMin:      { type: Number, default: 3 },
            hardGemMax:      { type: Number, default: 6 },

            legendaryCount:     { type: Number, default: 1 },
            legendaryQtyMin:    { type: Number, default: 15 },
            legendaryQtyMax:    { type: Number, default: 50 },
            legendaryRewardMult:{ type: Number, default: 12 },
            legendaryXpMin:     { type: Number, default: 150 },
            legendaryXpMax:     { type: Number, default: 300 },
            legendaryGemMin:    { type: Number, default: 5 },
            legendaryGemMax:    { type: Number, default: 12 }
        }
    }

}, { timestamps: true });

// ─────────────────────────────────────────────
// Cache
// ─────────────────────────────────────────────

let _cachedConfig = null;
let _cacheTimestamp = 0;
const CACHE_TTL_MS = 60 * 1000;

miningConfigSchema.statics.getConfig = async function () {
    const now = Date.now();
    if (_cachedConfig && (now - _cacheTimestamp) < CACHE_TTL_MS) return _cachedConfig;
    let config = await this.findOne({ configId: 'main' });
    if (!config) config = await this.create(getDefaultConfig());

    // ── Auto-sync: tambahkan zona & ore baru yang ada di code tapi belum di DB ──
    const defaults = getDefaultConfig();
    let dirty = false;

    // Sync locations — jika jumlahnya lebih sedikit dari defaults, pakai defaults
    if (!config.locations || config.locations.length < defaults.locations.length) {
        config.locations = defaults.locations;
        dirty = true;
    }

    // Sync rebirthConfig.upgrades — hanya simpan upgrade yang ada di defaults (hapus legacy)
    const defaultUpgradeIds = new Set(defaults.rebirthConfig.upgrades.map(u => u.id));
    const dbUpgradeIds      = new Set((config.rebirthConfig?.upgrades || []).map(u => u.id));
    const hasLegacy  = [...dbUpgradeIds].some(id => !defaultUpgradeIds.has(id));
    const hasMissing = [...defaultUpgradeIds].some(id => !dbUpgradeIds.has(id));
    if (hasLegacy || hasMissing) {
        config.rebirthConfig.upgrades = defaults.rebirthConfig.upgrades;
        config.markModified('rebirthConfig');
        dirty = true;
    }

    // Sync resources — update harga & weight dari defaults, tambahkan ore yang belum ada
    const defaultResourceMap = new Map(defaults.resources.map(r => [r.name, r]));
    const existingNames = new Set((config.resources || []).map(r => r.name));
    (config.resources || []).forEach(r => {
        const def = defaultResourceMap.get(r.name);
        if (def) {
            if (r.sellPrice  !== def.sellPrice)  { r.sellPrice  = def.sellPrice;  dirty = true; }
            if (r.dropWeight !== def.dropWeight)  { r.dropWeight = def.dropWeight; dirty = true; }
        }
    });
    const missingResources = defaults.resources.filter(r => !existingNames.has(r.name));
    if (missingResources.length > 0) {
        config.resources.push(...missingResources);
        dirty = true;
    }

    // Sync core drop & cooldown settings from defaults
    const coreFields = ['cooldownSeconds', 'baseDropMin', 'baseDropMax', 'gemChance', 'gemDropMin', 'gemDropMax'];
    for (const field of coreFields) {
        if (config[field] !== defaults[field]) { config[field] = defaults[field]; dirty = true; }
    }

    // Sync pickaxeConfig + regenerate pickaxeLevels if multPerLevel changed
    const dbPickCfg = config.pickaxeConfig || {};
    if (dbPickCfg.multPerLevel !== defaults.pickaxeConfig.multPerLevel ||
        !config.pickaxeLevels || config.pickaxeLevels.length !== defaults.pickaxeConfig.maxLevel) {
        config.pickaxeConfig  = defaults.pickaxeConfig;
        config.pickaxeLevels  = generatePickaxeLevels();
        config.markModified('pickaxeConfig');
        config.markModified('pickaxeLevels');
        dirty = true;
    }

    // Sync shopItems — tambahkan yang belum ada & update nama/deskripsi yang berubah
    if (!config.shopItems) config.shopItems = [];
    const defaultShopMap = new Map(defaults.shopItems.map(i => [i.id, i]));
    let shopDirty = false;
    const existingShopIds = new Set(config.shopItems.map(i => i.id));
    // Update existing items (name, description, emoji)
    config.shopItems.forEach(item => {
        const def = defaultShopMap.get(item.id);
        if (def) {
            if (item.name        !== def.name)        { item.name        = def.name;        shopDirty = true; }
            if (item.description !== def.description) { item.description = def.description; shopDirty = true; }
            if (item.emoji       !== def.emoji)       { item.emoji       = def.emoji;       shopDirty = true; }
        }
    });
    // Add missing items
    const missingShopItems = defaults.shopItems.filter(i => !existingShopIds.has(i.id));
    if (missingShopItems.length > 0) { config.shopItems.push(...missingShopItems); shopDirty = true; }
    if (shopDirty) { config.markModified('shopItems'); dirty = true; }

    if (dirty) {
        config.markModified('locations');
        config.markModified('resources');
        await config.save();
    }

    _cachedConfig = config;
    _cacheTimestamp = now;
    return config;
};

miningConfigSchema.statics.clearConfigCache = function () {
    _cachedConfig = null;
    _cacheTimestamp = 0;
};

miningConfigSchema.post('save', () => { _cachedConfig = null; _cacheTimestamp = 0; });
miningConfigSchema.post('findOneAndUpdate', () => { _cachedConfig = null; _cacheTimestamp = 0; });

// ─────────────────────────────────────────────
// Pickaxe level generator (Lv 1–250)
// Cost = floor(2 * level^1.4)  | starts at 0 for Lv1
// Drop multiplier = 1.00 + (level-1) * 0.03  (max 8.47x at Lv250)
// ─────────────────────────────────────────────

const PICKAXE_TIERS = [
    { max: 1,   prefix: 'Wooden' },
    { max: 5,   prefix: 'Stone' },
    { max: 10,  prefix: 'Iron' },
    { max: 20,  prefix: 'Steel' },
    { max: 30,  prefix: 'Bronze' },
    { max: 40,  prefix: 'Silver' },
    { max: 50,  prefix: 'Gold' },
    { max: 75,  prefix: 'Diamond' },
    { max: 100, prefix: 'Emerald' },
    { max: 125, prefix: 'Ruby' },
    { max: 150, prefix: 'Mythril' },
    { max: 175, prefix: 'Dragonite' },
    { max: 200, prefix: 'Voidite' },
    { max: 225, prefix: 'Nebulite' },
    { max: 250, prefix: 'Infinity' }
];

function getPickaxeName(level) {
    for (const t of PICKAXE_TIERS) {
        if (level <= t.max) return `${t.prefix} Pickaxe Lv.${level}`;
    }
    return `Infinity Pickaxe Lv.${level}`;
}

// Generate pickaxe levels from formula parameters
function generatePickaxeLevelsWith({ maxLevel = 250, baseCost = 2, costExp = 1.4, baseMult = 1.0, multPerLevel = 0.03 } = {}) {
    const levels = [];
    for (let i = 1; i <= maxLevel; i++) {
        const cost = i === 1 ? 0 : Math.floor(baseCost * Math.pow(i, costExp));
        const mult = Math.round((baseMult + (i - 1) * multPerLevel) * 100) / 100;
        levels.push({ level: i, name: getPickaxeName(i), upgradeCost: cost, dropMultiplier: mult });
    }
    return levels;
}

function generatePickaxeLevels() {
    return generatePickaxeLevelsWith();
}

// ─────────────────────────────────────────────
// Default RP upgrades
// ─────────────────────────────────────────────

function generateRpCosts(base, factor, maxLevel) {
    const costs = [];
    for (let i = 1; i <= maxLevel; i++) {
        costs.push(Math.floor(base * Math.pow(factor, i - 1)));
    }
    return costs;
}

// ─────────────────────────────────────────────
// Default Config
// ─────────────────────────────────────────────

function getDefaultConfig() {
    return {
        configId:        'main',
        cooldownSeconds: 30,
        baseDropMin:     10,
        baseDropMax:     18,

        gemChance:  12,
        gemDropMin: 1,
        gemDropMax: 3,

        pickaxeConfig: {
            maxLevel: 250, baseCost: 2, costExp: 1.4, baseMult: 1.0, multPerLevel: 0.05
        },
        bpConfig: {
            maxLevel: 250, baseCapacity: 100, capacityPerLevel: 20, baseCost: 4, costExp: 1.3
        },

        shopItems: [
            { id: 'speed_x2',  name: 'Mining Speed x2',   emoji: '⚡',   description: 'Mining Speed 2× lebih cepat untuk semua pemain',   price: 50,  currency: 'gems', boostType: 'speed',      multiplier: 2, durationMinutes: 30, isGlobal: true },
            { id: 'sell_x2',   name: 'Sell Boost x2',     emoji: '💰',   description: 'Harga jual 2× lipat untuk semua pemain',           price: 50,  currency: 'gems', boostType: 'sell_price', multiplier: 2, durationMinutes: 30, isGlobal: true },
            { id: 'bp_x2',     name: 'Backpack Boost x2', emoji: '📦',   description: 'Kapasitas Backpack 2× lipat untuk semua pemain',   price: 50,  currency: 'gems', boostType: 'backpack',   multiplier: 2, durationMinutes: 30, isGlobal: true },
            { id: 'speed_x3',  name: 'Mining Speed x3',   emoji: '⚡⚡', description: 'Mining Speed 3× lebih cepat untuk semua pemain',   price: 150, currency: 'gems', boostType: 'speed',      multiplier: 3, durationMinutes: 30, isGlobal: true },
            { id: 'sell_x3',   name: 'Sell Boost x3',     emoji: '💰💰', description: 'Harga jual 3× lipat untuk semua pemain',           price: 150, currency: 'gems', boostType: 'sell_price', multiplier: 3, durationMinutes: 30, isGlobal: true },
            { id: 'bp_x3',     name: 'Backpack Boost x3', emoji: '📦📦', description: 'Kapasitas Backpack 3× lipat untuk semua pemain',   price: 150, currency: 'gems', boostType: 'backpack',   multiplier: 3, durationMinutes: 30, isGlobal: true }
        ],

        globalBoosts: [],

        // 218+ resources — 30 zona, min 7 ore per zona. Z6-Z25 harga ~50% lebih rendah dari sebelumnya.
        resources: [
            // ── Z1: Surface (R0) — 11 ore ──
            { name: 'Stone',           rarity: 'common',    sellPrice: 10,       dropWeight: 80 },
            { name: 'Coal',            rarity: 'common',    sellPrice: 10,       dropWeight: 70 },
            { name: 'Ash',             rarity: 'common',    sellPrice: 10,       dropWeight: 60 },
            { name: 'Gravel',          rarity: 'common',    sellPrice: 10,        dropWeight: 50 },
            { name: 'Salt',            rarity: 'common',    sellPrice: 10,       dropWeight: 60 },
            { name: 'Limestone',       rarity: 'common',    sellPrice: 10,       dropWeight: 55 },
            { name: 'Fossil',          rarity: 'uncommon',  sellPrice: 13,       dropWeight: 20 },
            { name: 'Copper',          rarity: 'uncommon',  sellPrice: 13,       dropWeight: 40 },
            { name: 'Flint',           rarity: 'common',    sellPrice: 10,       dropWeight: 45 },
            { name: 'Chalk',           rarity: 'common',    sellPrice: 10,       dropWeight: 50 },
            { name: 'Borax',           rarity: 'uncommon',  sellPrice: 13,       dropWeight: 30 },

            // ── Z2: Underground (R3) — 9 ore ──
            { name: 'Iron',            rarity: 'uncommon',  sellPrice: 13,       dropWeight: 35 },
            { name: 'Bronze',          rarity: 'uncommon',  sellPrice: 13,       dropWeight: 30 },
            { name: 'Lead',            rarity: 'uncommon',  sellPrice: 13,       dropWeight: 35 },
            { name: 'Obsidian',        rarity: 'uncommon',  sellPrice: 13,       dropWeight: 20 },
            { name: 'Magnetite',       rarity: 'rare',      sellPrice: 16,       dropWeight: 12 },
            { name: 'Quartz',          rarity: 'uncommon',  sellPrice: 13,       dropWeight: 30 },
            { name: 'Silver',          rarity: 'rare',      sellPrice: 16,       dropWeight: 18 },
            { name: 'Crystal Shard',   rarity: 'rare',      sellPrice: 16,       dropWeight: 14 },
            { name: 'Beryllite',       rarity: 'rare',      sellPrice: 16,       dropWeight: 10 },

            // ── Z3: Deep Cave (R10) — 8 ore ──
            { name: 'Gold',            rarity: 'rare',      sellPrice: 16,       dropWeight: 18 },
            { name: 'Titanium',        rarity: 'rare',      sellPrice: 16,       dropWeight: 14 },
            { name: 'Cinnabar',        rarity: 'rare',      sellPrice: 16,       dropWeight: 16 },
            { name: 'Platinum',        rarity: 'epic',      sellPrice: 20,       dropWeight: 8  },
            { name: 'Diamond',         rarity: 'epic',      sellPrice: 20,      dropWeight: 8  },
            { name: 'Ruby',            rarity: 'epic',      sellPrice: 20,      dropWeight: 10 },
            { name: 'Sapphire',        rarity: 'epic',      sellPrice: 20,      dropWeight: 6  },
            { name: 'Emerald',         rarity: 'epic',      sellPrice: 20,      dropWeight: 8  },

            // ── Z4: Lava Zone (R25) — 8 ore ──
            { name: 'Mythril',         rarity: 'legendary', sellPrice: 23,       dropWeight: 5  },
            { name: 'Painite',         rarity: 'legendary', sellPrice: 23,      dropWeight: 3  },
            { name: 'Alexandrite',     rarity: 'legendary', sellPrice: 23,       dropWeight: 4  },
            { name: 'Voidite',         rarity: 'legendary', sellPrice: 23,      dropWeight: 2  },
            { name: 'Voidstone',       rarity: 'mythical',  sellPrice: 26,      dropWeight: 4  },
            { name: 'Antimatter',      rarity: 'mythical',  sellPrice: 26,      dropWeight: 3  },
            { name: 'Dragonite',       rarity: 'mythical',  sellPrice: 26,      dropWeight: 2  },
            { name: 'Nebulite',        rarity: 'mythical',  sellPrice: 26,      dropWeight: 3  },

            // ── Z5: Void (R50) — 7 ore (+3 baru) ──
            { name: 'Ethereal Mist',   rarity: 'legendary', sellPrice: 23,      dropWeight: 12 },
            { name: 'Ethereal Shard',  rarity: 'mythical',  sellPrice: 26,      dropWeight: 8  },
            { name: 'Ethereal Crystal',rarity: 'divine',    sellPrice: 28,      dropWeight: 5  },
            { name: 'Cosmic String',   rarity: 'divine',    sellPrice: 28,      dropWeight: 3  },
            { name: 'God Particle',    rarity: 'divine',    sellPrice: 28,      dropWeight: 2  },
            { name: 'Chronium',        rarity: 'divine',    sellPrice: 28,      dropWeight: 2  },
            { name: 'Infinity Core',   rarity: 'ultimate',  sellPrice: 29,      dropWeight: 1  },

            // ── Z6: Astral Realm (R75) — 7 ore (+2 baru, harga ~50% turun) ──
            { name: 'Cosmic Dust',     rarity: 'common',    sellPrice: 10,       dropWeight: 60 },
            { name: 'Starlight Shard', rarity: 'uncommon',  sellPrice: 13,      dropWeight: 40 },
            { name: 'Stardust',        rarity: 'common',    sellPrice: 10,      dropWeight: 40 },
            { name: 'Meteor Fragment', rarity: 'uncommon',  sellPrice: 13,      dropWeight: 28 },
            { name: 'Nebula Shard',    rarity: 'rare',      sellPrice: 16,      dropWeight: 18 },
            { name: 'Star Sapphire',   rarity: 'epic',      sellPrice: 20,      dropWeight: 9  },
            { name: 'Astralite',       rarity: 'legendary', sellPrice: 23,      dropWeight: 4  },

            // ── Z7: Solar Core (R100) — 7 ore (+2 baru, harga ~50% turun) ──
            { name: 'Solar Ash',       rarity: 'common',    sellPrice: 10,      dropWeight: 55 },
            { name: 'Solar Shard',     rarity: 'uncommon',  sellPrice: 13,      dropWeight: 35 },
            { name: 'Solarium',        rarity: 'uncommon',  sellPrice: 13,      dropWeight: 35 },
            { name: 'Heliodor',        rarity: 'rare',      sellPrice: 16,      dropWeight: 24 },
            { name: 'Sunstone',        rarity: 'rare',      sellPrice: 16,      dropWeight: 16 },
            { name: 'Photonite',       rarity: 'epic',      sellPrice: 20,      dropWeight: 8  },
            { name: 'Stellarium',      rarity: 'legendary', sellPrice: 23,     dropWeight: 3  },

            // ── Z8: Shadow Abyss (R125) — 7 ore (+2 baru, harga ~50% turun) ──
            { name: 'Dark Ash',        rarity: 'common',    sellPrice: 10,      dropWeight: 50 },
            { name: 'Shadow Mist',     rarity: 'uncommon',  sellPrice: 13,      dropWeight: 34 },
            { name: 'Shadowite',       rarity: 'uncommon',  sellPrice: 13,      dropWeight: 30 },
            { name: 'Darkstone',       rarity: 'rare',      sellPrice: 16,     dropWeight: 22 },
            { name: 'Nightshade Ore',  rarity: 'rare',      sellPrice: 16,     dropWeight: 14 },
            { name: 'Obsidian Core',   rarity: 'epic',      sellPrice: 20,     dropWeight: 7  },
            { name: 'Void Shadow',     rarity: 'legendary', sellPrice: 23,     dropWeight: 3  },

            // ── Z9: Storm Peak (R150) — 7 ore (+2 baru, harga ~50% turun) ──
            { name: 'Thunder Ash',     rarity: 'common',    sellPrice: 10,      dropWeight: 46 },
            { name: 'Storm Shard',     rarity: 'uncommon',  sellPrice: 13,      dropWeight: 30 },
            { name: 'Stormite',        rarity: 'uncommon',  sellPrice: 13,     dropWeight: 26 },
            { name: 'Thunderstone',    rarity: 'rare',      sellPrice: 16,     dropWeight: 18 },
            { name: 'Lightning Ore',   rarity: 'rare',      sellPrice: 16,     dropWeight: 12 },
            { name: 'Galvanic Shard',  rarity: 'epic',      sellPrice: 20,     dropWeight: 6  },
            { name: 'Tempest Core',    rarity: 'legendary', sellPrice: 23,     dropWeight: 2  },

            // ── Z10: Crystal Sanctum (R175) — 7 ore (+2 baru, harga ~50% turun) ──
            { name: 'Crystal Ash',     rarity: 'common',    sellPrice: 10,     dropWeight: 42 },
            { name: 'Arcane Mist',     rarity: 'uncommon',  sellPrice: 13,     dropWeight: 28 },
            { name: 'Mysticite',       rarity: 'uncommon',  sellPrice: 13,     dropWeight: 22 },
            { name: 'Arcane Shard',    rarity: 'rare',      sellPrice: 16,     dropWeight: 16 },
            { name: 'Ether Crystal',   rarity: 'rare',      sellPrice: 16,     dropWeight: 10 },
            { name: 'Prisma',          rarity: 'epic',      sellPrice: 20,     dropWeight: 5  },
            { name: 'Soulcrystal',     rarity: 'legendary', sellPrice: 23,    dropWeight: 2  },

            // ── Z11: Abyssal Trench (R200) — 7 ore (+2 baru, harga ~50% turun) ──
            { name: 'Abyss Silt',      rarity: 'common',    sellPrice: 10,     dropWeight: 38 },
            { name: 'Deep Mist',       rarity: 'uncommon',  sellPrice: 13,     dropWeight: 26 },
            { name: 'Abyssalite',      rarity: 'rare',      sellPrice: 16,     dropWeight: 20 },
            { name: 'Tidalite',        rarity: 'rare',      sellPrice: 16,     dropWeight: 14 },
            { name: 'Deep Coral',      rarity: 'epic',      sellPrice: 20,    dropWeight: 8  },
            { name: 'Kraken Gem',      rarity: 'legendary', sellPrice: 23,    dropWeight: 4  },
            { name: 'Leviathan Core',  rarity: 'mythical',  sellPrice: 26,    dropWeight: 2  },

            // ── Z12: Ancient Forest (R230) — 7 ore (+2 baru, harga ~50% turun) ──
            { name: 'Forest Sap',      rarity: 'common',    sellPrice: 10,     dropWeight: 36 },
            { name: 'Grove Dust',      rarity: 'uncommon',  sellPrice: 13,     dropWeight: 24 },
            { name: 'Lifebloom',       rarity: 'rare',      sellPrice: 16,    dropWeight: 18 },
            { name: 'Thornite',        rarity: 'epic',      sellPrice: 20,    dropWeight: 12 },
            { name: 'World Seed',      rarity: 'epic',      sellPrice: 20,    dropWeight: 7  },
            { name: 'Ancient Amber',   rarity: 'legendary', sellPrice: 23,    dropWeight: 3  },
            { name: 'Yggdrasite',      rarity: 'mythical',  sellPrice: 26,    dropWeight: 1  },

            // ── Z13: Frozen Tundra (R265) — 7 ore (+2 baru, harga ~50% turun) ──
            { name: 'Ice Ash',         rarity: 'common',    sellPrice: 10,    dropWeight: 34 },
            { name: 'Frost Mist',      rarity: 'uncommon',  sellPrice: 13,    dropWeight: 22 },
            { name: 'Glacierite',      rarity: 'rare',      sellPrice: 16,    dropWeight: 16 },
            { name: 'Frostcore',       rarity: 'epic',      sellPrice: 20,    dropWeight: 11 },
            { name: 'Blizzardite',     rarity: 'epic',      sellPrice: 20,    dropWeight: 6  },
            { name: 'Eternal Ice',     rarity: 'legendary', sellPrice: 23,    dropWeight: 3  },
            { name: 'Absolute Zero',   rarity: 'mythical',  sellPrice: 26,    dropWeight: 1  },

            // ── Z14: Infernal Core (R305) — 7 ore (+2 baru, harga ~50% turun) ──
            { name: 'Lava Ash',        rarity: 'common',    sellPrice: 10,    dropWeight: 32 },
            { name: 'Hellfire Dust',   rarity: 'uncommon',  sellPrice: 13,    dropWeight: 20 },
            { name: 'Hellstone',       rarity: 'epic',      sellPrice: 20,    dropWeight: 14 },
            { name: 'Demonite',        rarity: 'epic',      sellPrice: 20,    dropWeight: 9  },
            { name: 'Infernite',       rarity: 'legendary', sellPrice: 23,    dropWeight: 5  },
            { name: 'Brimstone Core',  rarity: 'mythical',  sellPrice: 26,   dropWeight: 2  },
            { name: 'Devil\'s Heart',  rarity: 'divine',    sellPrice: 28,       dropWeight: 1  },

            // ── Z15: Chaos Realm (R350) — 7 ore (+2 baru, harga ~50% turun) ──
            { name: 'Chaos Ash',       rarity: 'common',    sellPrice: 10,    dropWeight: 30 },
            { name: 'Discord Mist',    rarity: 'uncommon',  sellPrice: 13,    dropWeight: 18 },
            { name: 'Chaosweave',      rarity: 'epic',      sellPrice: 20,   dropWeight: 12 },
            { name: 'Entropite',       rarity: 'legendary', sellPrice: 23,   dropWeight: 8  },
            { name: 'Discord Shard',   rarity: 'legendary', sellPrice: 23,   dropWeight: 4  },
            { name: 'Anarchite',       rarity: 'mythical',  sellPrice: 26,   dropWeight: 2  },
            { name: 'Pure Chaos',      rarity: 'divine',    sellPrice: 28,   dropWeight: 1  },

            // ── Z16: Prismatic Realm (R400) — 7 ore (+2 baru, harga ~50% turun) ──
            { name: 'Prism Ash',       rarity: 'common',    sellPrice: 10,    dropWeight: 30 },
            { name: 'Rainbow Shard',   rarity: 'uncommon',  sellPrice: 13,   dropWeight: 18 },
            { name: 'Prismite',        rarity: 'legendary', sellPrice: 23,   dropWeight: 10 },
            { name: 'Chromastone',     rarity: 'legendary', sellPrice: 23,   dropWeight: 7  },
            { name: 'Spectralit',      rarity: 'mythical',  sellPrice: 26,   dropWeight: 4  },
            { name: 'Radiant Core',    rarity: 'divine',    sellPrice: 28,   dropWeight: 2  },
            { name: 'Absolute Light',  rarity: 'ultimate',  sellPrice: 29,   dropWeight: 1  },

            // ── Z17: Divine Temple (R455) — 7 ore (+2 baru, harga ~50% turun) ──
            { name: 'Divine Ash',      rarity: 'common',    sellPrice: 10,    dropWeight: 28 },
            { name: 'Sacred Shard',    rarity: 'uncommon',  sellPrice: 13,   dropWeight: 16 },
            { name: 'Divinium',        rarity: 'legendary', sellPrice: 23,   dropWeight: 9  },
            { name: 'Godstone',        rarity: 'mythical',  sellPrice: 26,   dropWeight: 6  },
            { name: 'Sanctite',        rarity: 'divine',    sellPrice: 28,   dropWeight: 3  },
            { name: 'Holy Ember',      rarity: 'ultimate',  sellPrice: 29,   dropWeight: 2  },
            { name: 'Divine Core',     rarity: 'exclusive', sellPrice: 30,   dropWeight: 1  },

            // ── Z18: Temporal Rift (R515) — 8 ore (+3 baru, harga ~50% turun) ──
            { name: 'Time Ash',        rarity: 'common',    sellPrice: 10,   dropWeight: 26 },
            { name: 'Rift Shard',      rarity: 'uncommon',  sellPrice: 13,   dropWeight: 14 },
            { name: 'Temporal Mist',   rarity: 'rare',      sellPrice: 16,   dropWeight: 6  },
            { name: 'Chronosite',      rarity: 'mythical',  sellPrice: 26,   dropWeight: 8  },
            { name: 'Timestone',       rarity: 'divine',    sellPrice: 28,   dropWeight: 5  },
            { name: 'Aeonite',         rarity: 'divine',    sellPrice: 28,   dropWeight: 3  },
            { name: 'Paradox Shard',   rarity: 'ultimate',  sellPrice: 29,   dropWeight: 2  },
            { name: 'Temporal Core',   rarity: 'exclusive', sellPrice: 30,   dropWeight: 1  },

            // ── Z19: Titan's Forge (R580) — 7 ore (+2 baru, harga ~50% turun) ──
            { name: 'Forge Ash',       rarity: 'common',    sellPrice: 10,   dropWeight: 24 },
            { name: 'Titan Dust',      rarity: 'uncommon',  sellPrice: 13,   dropWeight: 13 },
            { name: 'Titanforge',      rarity: 'divine',    sellPrice: 28,   dropWeight: 7  },
            { name: 'Colossalite',     rarity: 'divine',    sellPrice: 28,   dropWeight: 4  },
            { name: 'Giant\'s Core',   rarity: 'ultimate',  sellPrice: 29,       dropWeight: 3  },
            { name: 'Primeval Stone',  rarity: 'ultimate',  sellPrice: 29,   dropWeight: 2  },
            { name: 'Titan Heart',     rarity: 'exclusive', sellPrice: 30,   dropWeight: 1  },

            // ── Z20: Celestial War (R650) — 7 ore (+3 baru, harga ~50% turun) ──
            { name: 'War Dust',        rarity: 'uncommon',  sellPrice: 13,   dropWeight: 22 },
            { name: 'Battle Ash',      rarity: 'rare',      sellPrice: 16,   dropWeight: 14 },
            { name: 'Victory Mist',    rarity: 'epic',      sellPrice: 20,   dropWeight: 6  },
            { name: 'War Remnant',     rarity: 'divine',    sellPrice: 28,   dropWeight: 6  },
            { name: 'Battle Shard',    rarity: 'ultimate',  sellPrice: 29,   dropWeight: 4  },
            { name: 'Victory Core',    rarity: 'ultimate',  sellPrice: 29,   dropWeight: 2  },
            { name: 'Commander\'s Gem',rarity: 'exclusive', sellPrice: 30,       dropWeight: 1  },

            // ── Z21: Bio Nexus (R725) — 7 ore (+3 baru, harga ~50% turun) ──
            { name: 'Bio Ash',         rarity: 'uncommon',  sellPrice: 13,   dropWeight: 20 },
            { name: 'Gene Shard',      rarity: 'rare',      sellPrice: 16,   dropWeight: 12 },
            { name: 'Life Mist',       rarity: 'epic',      sellPrice: 20,  dropWeight: 5  },
            { name: 'Genomite',        rarity: 'divine',    sellPrice: 28,   dropWeight: 6  },
            { name: 'Lifeforce Crystal',rarity:'ultimate',  sellPrice: 29,   dropWeight: 4  },
            { name: 'Mutagenite',      rarity: 'ultimate',  sellPrice: 29,   dropWeight: 2  },
            { name: 'Origin Core',     rarity: 'exclusive', sellPrice: 30,  dropWeight: 1  },

            // ── Z22: Ether Web (R805) — 7 ore (+3 baru, harga ~50% turun) ──
            { name: 'Ether Ash',       rarity: 'uncommon',  sellPrice: 13,   dropWeight: 18 },
            { name: 'Web Shard',       rarity: 'rare',      sellPrice: 16,   dropWeight: 10 },
            { name: 'Ether Mist',      rarity: 'epic',      sellPrice: 20,  dropWeight: 4  },
            { name: 'Ethereum',        rarity: 'ultimate',  sellPrice: 29,   dropWeight: 5  },
            { name: 'Voidether',       rarity: 'ultimate',  sellPrice: 29,   dropWeight: 3  },
            { name: 'Webcore',         rarity: 'exclusive', sellPrice: 30,  dropWeight: 2  },
            { name: 'Ethereal Heart',  rarity: 'exclusive', sellPrice: 30,  dropWeight: 1  },

            // ── Z23: Singularity (R890) — 7 ore (+3 baru, harga ~50% turun) ──
            { name: 'Singularity Ash', rarity: 'uncommon',  sellPrice: 13,   dropWeight: 16 },
            { name: 'Singular Dust',   rarity: 'rare',      sellPrice: 16,  dropWeight: 9  },
            { name: 'Collapse Mist',   rarity: 'epic',      sellPrice: 20,  dropWeight: 3  },
            { name: 'Singularite',     rarity: 'ultimate',  sellPrice: 29,   dropWeight: 5  },
            { name: 'Eventhorite',     rarity: 'exclusive', sellPrice: 30,  dropWeight: 3  },
            { name: 'Collapse Core',   rarity: 'exclusive', sellPrice: 30,  dropWeight: 2  },
            { name: 'Horizon Shard',   rarity: 'exclusive', sellPrice: 30,  dropWeight: 1  },

            // ── Z24: Cosmic Observatory (R980) — 7 ore (+3 baru, harga ~50% turun) ──
            { name: 'Cosmic Ash',      rarity: 'uncommon',  sellPrice: 13,   dropWeight: 14 },
            { name: 'Universe Dust',   rarity: 'rare',      sellPrice: 16,  dropWeight: 8  },
            { name: 'Star Mist',       rarity: 'epic',      sellPrice: 20,  dropWeight: 3  },
            { name: 'Cosmium',         rarity: 'ultimate',  sellPrice: 29,  dropWeight: 4  },
            { name: 'Universalite',    rarity: 'exclusive', sellPrice: 30,  dropWeight: 3  },
            { name: 'Star Fragment',   rarity: 'exclusive', sellPrice: 30,  dropWeight: 2  },
            { name: 'Observable Core', rarity: 'exclusive', sellPrice: 30,  dropWeight: 1  },

            // ── Z25: Infinite Plane (R999) — 7 ore (+3 baru, harga ~50% turun) ──
            { name: 'Infinite Ash',    rarity: 'uncommon',  sellPrice: 13,   dropWeight: 12 },
            { name: 'Absolute Dust',   rarity: 'rare',      sellPrice: 16,  dropWeight: 7  },
            { name: 'Plane Mist',      rarity: 'epic',      sellPrice: 20,  dropWeight: 2  },
            { name: 'Infinitum',       rarity: 'exclusive', sellPrice: 30,  dropWeight: 4  },
            { name: 'Absolutite',      rarity: 'exclusive', sellPrice: 30,  dropWeight: 3  },
            { name: 'Omnium',          rarity: 'exclusive', sellPrice: 30,  dropWeight: 2  },
            { name: 'Eternal Core',    rarity: 'exclusive', sellPrice: 30,  dropWeight: 1  },

            // ── Z26: Quantum Realm (R1100) — 7 ore baru ──
            { name: 'Quantum Dust',    rarity: 'common',    sellPrice: 10,   dropWeight: 9  },
            { name: 'Quantum Shard',   rarity: 'uncommon',  sellPrice: 13,   dropWeight: 7  },
            { name: 'Quasar Fragment', rarity: 'rare',      sellPrice: 16,  dropWeight: 5  },
            { name: 'Quantum Core',    rarity: 'epic',      sellPrice: 20,  dropWeight: 3  },
            { name: 'Particle Heart',  rarity: 'legendary', sellPrice: 23,  dropWeight: 2  },
            { name: 'Wave Collapse',   rarity: 'mythical',  sellPrice: 26,  dropWeight: 1  },
            { name: 'Quantum Absolute',rarity: 'divine',    sellPrice: 28,  dropWeight: 1  },

            // ── Z27: Dark Matter (R1250) — 7 ore baru ──
            { name: 'Dark Quantum Dust',rarity:'common',    sellPrice: 10,   dropWeight: 8  },
            { name: 'Dark Matter Shard',rarity:'uncommon',  sellPrice: 13,  dropWeight: 6  },
            { name: 'Null Fragment',   rarity: 'rare',      sellPrice: 16,  dropWeight: 4  },
            { name: 'Null Core',       rarity: 'epic',      sellPrice: 20,  dropWeight: 3  },
            { name: 'Null Stone',      rarity: 'legendary', sellPrice: 23,  dropWeight: 2  },
            { name: 'Dark Sovereign',  rarity: 'mythical',  sellPrice: 26,  dropWeight: 1  },
            { name: 'Darkness Absolute',rarity:'divine',    sellPrice: 28,  dropWeight: 1  },

            // ── Z28: Plasma Nexus (R1400) — 7 ore baru ──
            { name: 'Plasma Ash',      rarity: 'common',    sellPrice: 10,   dropWeight: 7  },
            { name: 'Plasma Shard',    rarity: 'uncommon',  sellPrice: 13,  dropWeight: 5  },
            { name: 'Fusion Fragment', rarity: 'rare',      sellPrice: 16,  dropWeight: 4  },
            { name: 'Plasma Core',     rarity: 'epic',      sellPrice: 20,  dropWeight: 3  },
            { name: 'Fusion Heart',    rarity: 'legendary', sellPrice: 23,  dropWeight: 2  },
            { name: 'Plasma Sovereign',rarity: 'mythical',  sellPrice: 26,  dropWeight: 1  },
            { name: 'Plasma Absolute', rarity: 'divine',    sellPrice: 28,  dropWeight: 1  },

            // ── Z29: Void Transcendence (R1600) — 7 ore baru ──
            { name: 'Transcendence Ash',rarity:'common',    sellPrice: 10,  dropWeight: 6  },
            { name: 'Transcendite',    rarity: 'uncommon',  sellPrice: 13,  dropWeight: 5  },
            { name: 'Void Pinnacle',   rarity: 'rare',      sellPrice: 16,  dropWeight: 4  },
            { name: 'Transcendence Core',rarity:'epic',     sellPrice: 20,  dropWeight: 3  },
            { name: 'Void Sovereign',  rarity: 'legendary', sellPrice: 23,  dropWeight: 2  },
            { name: 'Pinnacle Heart',  rarity: 'mythical',  sellPrice: 26,  dropWeight: 1  },
            { name: 'Transcendence Absolute',rarity:'divine',sellPrice:10060000, dropWeight: 1  },

            // ── Z30: The Absolute (R1800) — 7 ore baru ──
            { name: 'Absolute Ash',    rarity: 'common',    sellPrice: 10,  dropWeight: 5  },
            { name: 'Omnipotence Shard',rarity:'uncommon',  sellPrice: 13,  dropWeight: 4  },
            { name: 'Absolute Fragment',rarity:'rare',      sellPrice: 16,  dropWeight: 3  },
            { name: 'Omnipotence Core',rarity: 'epic',      sellPrice: 20,  dropWeight: 3  },
            { name: 'The Sovereign',   rarity: 'legendary', sellPrice: 23,  dropWeight: 2  },
            { name: 'Absolute Heart',  rarity: 'mythical',  sellPrice: 26, dropWeight: 1  },
            { name: 'Omega Absolute',  rarity: 'divine',    sellPrice: 28, dropWeight: 1  }
        ],

        // 30 auto-locations keyed by rebirth milestone (min 7 ore per zona)
        locations: [
            { minRebirth: 0,    name: 'Surface',               emoji: '🌄', resources: ['Stone','Coal','Ash','Gravel','Salt','Limestone','Fossil','Copper','Flint','Chalk','Borax'] },
            { minRebirth: 3,    name: 'Underground',            emoji: '🪨', resources: ['Iron','Bronze','Lead','Obsidian','Magnetite','Quartz','Silver','Crystal Shard','Beryllite'] },
            { minRebirth: 10,   name: 'Deep Cave',              emoji: '🕳️', resources: ['Gold','Titanium','Cinnabar','Platinum','Diamond','Ruby','Sapphire','Emerald'] },
            { minRebirth: 25,   name: 'Lava Zone',              emoji: '🌋', resources: ['Mythril','Painite','Alexandrite','Voidite','Voidstone','Antimatter','Dragonite','Nebulite'] },
            { minRebirth: 50,   name: 'Void',                   emoji: '🌌', resources: ['Ethereal Mist','Ethereal Shard','Ethereal Crystal','Cosmic String','God Particle','Chronium','Infinity Core'] },
            { minRebirth: 75,   name: 'Astral Realm',           emoji: '🌠', resources: ['Cosmic Dust','Starlight Shard','Stardust','Meteor Fragment','Nebula Shard','Star Sapphire','Astralite'] },
            { minRebirth: 100,  name: 'Solar Core',             emoji: '☀️', resources: ['Solar Ash','Solar Shard','Solarium','Heliodor','Sunstone','Photonite','Stellarium'] },
            { minRebirth: 125,  name: 'Shadow Abyss',           emoji: '🌑', resources: ['Dark Ash','Shadow Mist','Shadowite','Darkstone','Nightshade Ore','Obsidian Core','Void Shadow'] },
            { minRebirth: 150,  name: 'Storm Peak',             emoji: '⚡', resources: ['Thunder Ash','Storm Shard','Stormite','Thunderstone','Lightning Ore','Galvanic Shard','Tempest Core'] },
            { minRebirth: 175,  name: 'Crystal Sanctum',        emoji: '🔮', resources: ['Crystal Ash','Arcane Mist','Mysticite','Arcane Shard','Ether Crystal','Prisma','Soulcrystal'] },
            { minRebirth: 200,  name: 'Abyssal Trench',         emoji: '🌊', resources: ['Abyss Silt','Deep Mist','Abyssalite','Tidalite','Deep Coral','Kraken Gem','Leviathan Core'] },
            { minRebirth: 230,  name: 'Ancient Forest',         emoji: '🌿', resources: ['Forest Sap','Grove Dust','Lifebloom','Thornite','World Seed','Ancient Amber','Yggdrasite'] },
            { minRebirth: 265,  name: 'Frozen Tundra',          emoji: '🧊', resources: ['Ice Ash','Frost Mist','Glacierite','Frostcore','Blizzardite','Eternal Ice','Absolute Zero'] },
            { minRebirth: 305,  name: 'Infernal Core',          emoji: '🔥', resources: ['Lava Ash','Hellfire Dust','Hellstone','Demonite','Infernite','Brimstone Core','Devil\'s Heart'] },
            { minRebirth: 350,  name: 'Chaos Realm',            emoji: '🌀', resources: ['Chaos Ash','Discord Mist','Chaosweave','Entropite','Discord Shard','Anarchite','Pure Chaos'] },
            { minRebirth: 400,  name: 'Prismatic Realm',        emoji: '🌈', resources: ['Prism Ash','Rainbow Shard','Prismite','Chromastone','Spectralit','Radiant Core','Absolute Light'] },
            { minRebirth: 455,  name: 'Divine Temple',          emoji: '🏛️', resources: ['Divine Ash','Sacred Shard','Divinium','Godstone','Sanctite','Holy Ember','Divine Core'] },
            { minRebirth: 515,  name: 'Temporal Rift',          emoji: '⏳', resources: ['Time Ash','Rift Shard','Temporal Mist','Chronosite','Timestone','Aeonite','Paradox Shard','Temporal Core'] },
            { minRebirth: 580,  name: 'Titan\'s Forge',         emoji: '🔱', resources: ['Forge Ash','Titan Dust','Titanforge','Colossalite','Giant\'s Core','Primeval Stone','Titan Heart'] },
            { minRebirth: 650,  name: 'Celestial War',          emoji: '⚔️', resources: ['War Dust','Battle Ash','Victory Mist','War Remnant','Battle Shard','Victory Core','Commander\'s Gem'] },
            { minRebirth: 725,  name: 'Bio Nexus',              emoji: '🧬', resources: ['Bio Ash','Gene Shard','Life Mist','Genomite','Lifeforce Crystal','Mutagenite','Origin Core'] },
            { minRebirth: 805,  name: 'Ether Web',              emoji: '🌐', resources: ['Ether Ash','Web Shard','Ether Mist','Ethereum','Voidether','Webcore','Ethereal Heart'] },
            { minRebirth: 890,  name: 'Singularity',            emoji: '💫', resources: ['Singularity Ash','Singular Dust','Collapse Mist','Singularite','Eventhorite','Collapse Core','Horizon Shard'] },
            { minRebirth: 980,  name: 'Cosmic Observatory',     emoji: '🔭', resources: ['Cosmic Ash','Universe Dust','Star Mist','Cosmium','Universalite','Star Fragment','Observable Core'] },
            { minRebirth: 999,  name: 'Infinite Plane',         emoji: '♾️', resources: ['Infinite Ash','Absolute Dust','Plane Mist','Infinitum','Absolutite','Omnium','Eternal Core'] },
            { minRebirth: 1100, name: 'Quantum Realm',          emoji: '⚛️', resources: ['Quantum Dust','Quantum Shard','Quasar Fragment','Quantum Core','Particle Heart','Wave Collapse','Quantum Absolute'] },
            { minRebirth: 1250, name: 'Dark Matter',            emoji: '🌑', resources: ['Dark Quantum Dust','Dark Matter Shard','Null Fragment','Null Core','Null Stone','Dark Sovereign','Darkness Absolute'] },
            { minRebirth: 1400, name: 'Plasma Nexus',           emoji: '🔴', resources: ['Plasma Ash','Plasma Shard','Fusion Fragment','Plasma Core','Fusion Heart','Plasma Sovereign','Plasma Absolute'] },
            { minRebirth: 1600, name: 'Void Transcendence',     emoji: '💠', resources: ['Transcendence Ash','Transcendite','Void Pinnacle','Transcendence Core','Void Sovereign','Pinnacle Heart','Transcendence Absolute'] },
            { minRebirth: 1800, name: 'The Absolute',           emoji: '🌟', resources: ['Absolute Ash','Omnipotence Shard','Absolute Fragment','Omnipotence Core','The Sovereign','Absolute Heart','Omega Absolute'] }
        ],

        pickaxeLevels: generatePickaxeLevels(),

        rebirthConfig: {
            minPickaxe: 200,
            minBP: 200,
            upgrades: [
                {
                    id: 'drop_rate', name: 'Fortune', emoji: '🍀',
                    description: '+5% drop multiplier per level',
                    maxLevel: 20, effectPerLevel: 5, effectType: 'drop_rate',
                    costs: generateRpCosts(1, 1.3, 20)
                },
                {
                    id: 'sell_price', name: 'Merchant', emoji: '💰',
                    description: '+3% sell price per level',
                    maxLevel: 20, effectPerLevel: 3, effectType: 'sell_price',
                    costs: generateRpCosts(1, 1.3, 20)
                },
                {
                    id: 'gem_chance', name: 'Gemstone', emoji: '💎',
                    description: '+2% gem drop chance per level (max +50%)',
                    maxLevel: 25, effectPerLevel: 2, effectType: 'gem_chance',
                    costs: generateRpCosts(1, 1.25, 25)
                },
                {
                    id: 'cooldown', name: 'Swiftness', emoji: '⚡',
                    description: '-1s cooldown per level (max -25s)',
                    maxLevel: 25, effectPerLevel: 1, effectType: 'cooldown',
                    costs: generateRpCosts(1, 1.25, 25)
                },
                {
                    id: 'head_start', name: 'Head Start', emoji: '🎁',
                    description: '+2 starting level (Pickaxe & BP) per level setelah rebirth',
                    maxLevel: 15, effectPerLevel: 2, effectType: 'head_start',
                    costs: generateRpCosts(1, 1.3, 15)
                },
                {
                    id: 'ore_discount', name: 'Ore Discount', emoji: '💸',
                    description: '-2% biaya upgrade Pickaxe & BP per level',
                    maxLevel: 15, effectPerLevel: 2, effectType: 'ore_discount',
                    costs: generateRpCosts(1, 1.3, 15)
                },
                {
                    id: 'rebirth_bonus', name: 'Rebirth Mastery', emoji: '🔮',
                    description: '+1 RP ekstra per rebirth per level',
                    maxLevel: 5, effectPerLevel: 1, effectType: 'rebirth_bonus',
                    costs: [3, 8, 20, 50, 120]
                }
            ]
        },

        guildSettings: {
            questRefreshHours: 24,
            ranks: [
                { name: 'F',   requiredXp: 0,     questCount: 1, allowedResources: ['Stone','Coal','Ash','Gravel','Salt','Limestone','Fossil','Copper','Flint','Chalk','Borax'],         minQuantity: 10, maxQuantity: 50,  rewardMultiplier: 1,   gemRewardMin: 0,  gemRewardMax: 0,  xpRewardMin: 10,  xpRewardMax: 30,  shardRewardMin: 0,  shardRewardMax: 0,  promoteCostMinecon: 0,      promoteCostGems: 0   },
                { name: 'E',   requiredXp: 100,   questCount: 2, allowedResources: ['Stone','Coal','Fossil','Copper','Iron','Bronze','Lead'],                                                        minQuantity: 20, maxQuantity: 80,  rewardMultiplier: 1.2, gemRewardMin: 0,  gemRewardMax: 0,  xpRewardMin: 20,  xpRewardMax: 50,  shardRewardMin: 0,  shardRewardMax: 0,  promoteCostMinecon: 500,    promoteCostGems: 0   },
                { name: 'D',   requiredXp: 300,   questCount: 2, allowedResources: ['Iron','Bronze','Obsidian','Magnetite','Quartz','Silver'],                                                       minQuantity: 20, maxQuantity: 100, rewardMultiplier: 1.5, gemRewardMin: 0,  gemRewardMax: 1,  xpRewardMin: 30,  xpRewardMax: 70,  shardRewardMin: 1,  shardRewardMax: 2,  promoteCostMinecon: 1500,   promoteCostGems: 0   },
                { name: 'C',   requiredXp: 700,   questCount: 2, allowedResources: ['Silver','Crystal Shard','Beryllite','Gold','Titanium'],                                                        minQuantity: 15, maxQuantity: 80,  rewardMultiplier: 2,   gemRewardMin: 1,  gemRewardMax: 1,  xpRewardMin: 40,  xpRewardMax: 100, shardRewardMin: 2,  shardRewardMax: 4,  promoteCostMinecon: 3000,   promoteCostGems: 5   },
                { name: 'B',   requiredXp: 1500,  questCount: 3, allowedResources: ['Gold','Platinum','Diamond','Ruby','Sapphire','Emerald'],                                                       minQuantity: 10, maxQuantity: 60,  rewardMultiplier: 2.5, gemRewardMin: 1,  gemRewardMax: 2,  xpRewardMin: 60,  xpRewardMax: 130, shardRewardMin: 3,  shardRewardMax: 6,  promoteCostMinecon: 6000,   promoteCostGems: 10  },
                { name: 'A',   requiredXp: 3000,  questCount: 3, allowedResources: ['Mythril','Painite','Alexandrite','Voidite'],                                                                   minQuantity: 8,  maxQuantity: 40,  rewardMultiplier: 3,   gemRewardMin: 2,  gemRewardMax: 3,  xpRewardMin: 80,  xpRewardMax: 180, shardRewardMin: 5,  shardRewardMax: 8,  promoteCostMinecon: 12000,  promoteCostGems: 20  },
                { name: 'S',   requiredXp: 6000,  questCount: 3, allowedResources: ['Voidstone','Antimatter','Dragonite','Nebulite'],                                                               minQuantity: 5,  maxQuantity: 30,  rewardMultiplier: 4,   gemRewardMin: 2,  gemRewardMax: 4,  xpRewardMin: 100, xpRewardMax: 250, shardRewardMin: 6,  shardRewardMax: 10, promoteCostMinecon: 25000,  promoteCostGems: 40  },
                { name: 'SS',  requiredXp: 12000, questCount: 3, allowedResources: ['Cosmic String','God Particle','Chronium'],                                                                     minQuantity: 3,  maxQuantity: 20,  rewardMultiplier: 5,   gemRewardMin: 3,  gemRewardMax: 5,  xpRewardMin: 150, xpRewardMax: 400, shardRewardMin: 8,  shardRewardMax: 15, promoteCostMinecon: 50000,  promoteCostGems: 80  },
                { name: 'SSS', requiredXp: 25000, questCount: 3, allowedResources: ['Cosmic String','God Particle','Chronium','Infinity Core'],                                                     minQuantity: 2,  maxQuantity: 15,  rewardMultiplier: 7,   gemRewardMin: 4,  gemRewardMax: 7,  xpRewardMin: 200, xpRewardMax: 600, shardRewardMin: 12, shardRewardMax: 20, promoteCostMinecon: 100000, promoteCostGems: 150 }
            ],
            bountySettings: {
                easyCount: 4, easyQtyMin: 30, easyQtyMax: 80, easyRewardMult: 1.5,
                easyXpMin: 20, easyXpMax: 40, easyGemMin: 0, easyGemMax: 2,
                mediumCount: 3, mediumQtyMin: 50, mediumQtyMax: 120, mediumRewardMult: 3,
                mediumXpMin: 40, mediumXpMax: 80, mediumGemMin: 1, mediumGemMax: 3,
                hardCount: 2, hardQtyMin: 30, hardQtyMax: 80, hardRewardMult: 6,
                hardXpMin: 80, hardXpMax: 150, hardGemMin: 3, hardGemMax: 6,
                legendaryCount: 1, legendaryQtyMin: 15, legendaryQtyMax: 50, legendaryRewardMult: 12,
                legendaryXpMin: 150, legendaryXpMax: 300, legendaryGemMin: 5, legendaryGemMax: 12
            }
        }
    };
}

const MiningConfigModel = mongoose.model('MiningConfig', miningConfigSchema);
MiningConfigModel.generatePickaxeLevelsWith = generatePickaxeLevelsWith;
module.exports = MiningConfigModel;
