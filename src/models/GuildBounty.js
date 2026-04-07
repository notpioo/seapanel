const mongoose = require('mongoose');

const bountySchema = new mongoose.Schema({
    date: { type: String, required: true, unique: true }, // "2026-03-24"

    bounties: [{
        id: { type: Number, required: true },
        tier: { type: String, enum: ['easy', 'medium', 'hard', 'legendary'], required: true },
        resource: { type: String, required: true },
        quantity: { type: Number, required: true },
        rewards: {
            minecon:  { type: Number, default: 0 },
            guildXp:  { type: Number, default: 0 },
            gems:     { type: Number, default: 0 }
        },
        minRank:   { type: String, enum: ['F','E','D','C','B','A','S','SS','SSS'], default: 'F' },
        status:    { type: String, enum: ['available','claimed'], default: 'available' },
        claimedBy: { type: String, default: null },
        claimedAt: { type: Date, default: null }
    }],

    generatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getTodayWIB() {
    const now = new Date();
    const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    return wib.toISOString().split('T')[0];
}

// Pilih resources dari lokasi-lokasi tertentu berdasarkan minRebirth range
function getLocationResources(miningConfig, minRebirth, maxRebirth) {
    const locs = (miningConfig.locations || [])
        .slice()
        .sort((a, b) => a.minRebirth - b.minRebirth);

    let pool = new Set();

    for (const loc of locs) {
        if (loc.minRebirth >= minRebirth && loc.minRebirth <= maxRebirth) {
            if (loc.resources && loc.resources.length > 0) {
                loc.resources.forEach(r => pool.add(r));
            }
        }
    }

    // Fallback: jika pool kosong, pakai semua resource yang ada
    if (pool.size === 0) {
        (miningConfig.resources || []).forEach(r => pool.add(r.name));
    }

    return [...pool];
}

// ─── Generate papan bounty harian ────────────────────────────────────────────

bountySchema.statics.getTodayBoard = async function (miningConfig) {
    const today = getTodayWIB();

    let board = await this.findOne({ date: today });
    if (board) return board;

    const gs = miningConfig.guildSettings;
    const bountyConf = gs.bountySettings || {};
    const allResources = miningConfig.resources || [];

    // Tier config: resource pool diambil dari lokasi sesuai range rebirth
    // Surface(R0), Underground(R3), Deep Cave(R10), Lava Zone(R25), Void(R50)
    const tiers = [
        {
            tier: 'easy', minRank: 'F',
            count:       bountyConf.easyCount       || 4,
            rewardMult:  bountyConf.easyRewardMult  || 1.5,
            qtyMin:      bountyConf.easyQtyMin      || 30,
            qtyMax:      bountyConf.easyQtyMax       || 80,
            xpMin:       bountyConf.easyXpMin       || 20,
            xpMax:       bountyConf.easyXpMax       || 40,
            gemMin:      bountyConf.easyGemMin      || 0,
            gemMax:      bountyConf.easyGemMax      || 2,
            // Surface + Underground
            locMinRebirth: 0, locMaxRebirth: 4
        },
        {
            tier: 'medium', minRank: 'D',
            count:       bountyConf.mediumCount       || 3,
            rewardMult:  bountyConf.mediumRewardMult  || 3,
            qtyMin:      bountyConf.mediumQtyMin      || 50,
            qtyMax:      bountyConf.mediumQtyMax      || 120,
            xpMin:       bountyConf.mediumXpMin      || 40,
            xpMax:       bountyConf.mediumXpMax      || 80,
            gemMin:      bountyConf.mediumGemMin     || 1,
            gemMax:      bountyConf.mediumGemMax     || 3,
            // Underground + Deep Cave
            locMinRebirth: 3, locMaxRebirth: 15
        },
        {
            tier: 'hard', minRank: 'B',
            count:       bountyConf.hardCount       || 2,
            rewardMult:  bountyConf.hardRewardMult  || 6,
            qtyMin:      bountyConf.hardQtyMin      || 30,
            qtyMax:      bountyConf.hardQtyMax      || 80,
            xpMin:       bountyConf.hardXpMin      || 80,
            xpMax:       bountyConf.hardXpMax      || 150,
            gemMin:      bountyConf.hardGemMin     || 3,
            gemMax:      bountyConf.hardGemMax     || 6,
            // Deep Cave + Lava Zone
            locMinRebirth: 10, locMaxRebirth: 30
        },
        {
            tier: 'legendary', minRank: 'S',
            count:       bountyConf.legendaryCount       || 1,
            rewardMult:  bountyConf.legendaryRewardMult  || 12,
            qtyMin:      bountyConf.legendaryQtyMin      || 15,
            qtyMax:      bountyConf.legendaryQtyMax      || 50,
            xpMin:       bountyConf.legendaryXpMin      || 150,
            xpMax:       bountyConf.legendaryXpMax      || 300,
            gemMin:      bountyConf.legendaryGemMin     || 5,
            gemMax:      bountyConf.legendaryGemMax     || 12,
            // Lava Zone + Void
            locMinRebirth: 25, locMaxRebirth: 999
        }
    ];

    const bounties = [];
    let idCounter = 1;

    for (const t of tiers) {
        const pool = getLocationResources(miningConfig, t.locMinRebirth, t.locMaxRebirth);

        for (let i = 0; i < t.count; i++) {
            const resource = pool[Math.floor(Math.random() * pool.length)];
            const quantity = Math.floor(Math.random() * (t.qtyMax - t.qtyMin + 1)) + t.qtyMin;

            const resObj = allResources.find(r => r.name === resource);
            const sellPrice = resObj ? (resObj.sellPrice || 10) : 10;
            const rewardMinecon = Math.floor(quantity * sellPrice * t.rewardMult);

            const guildXp = Math.floor(Math.random() * (t.xpMax - t.xpMin + 1)) + t.xpMin;
            const gems    = Math.floor(Math.random() * (t.gemMax - t.gemMin + 1)) + t.gemMin;

            bounties.push({
                id: idCounter++,
                tier: t.tier,
                resource,
                quantity,
                rewards: { minecon: rewardMinecon, guildXp, gems },
                minRank: t.minRank,
                status: 'available',
                claimedBy: null,
                claimedAt: null
            });
        }
    }

    board = await this.create({ date: today, bounties });
    return board;
};

// ─── Rank comparison ─────────────────────────────────────────────────────────

const RANK_ORDER = ['F','E','D','C','B','A','S','SS','SSS'];
bountySchema.statics.RANK_ORDER = RANK_ORDER;

bountySchema.statics.meetsRankReq = function (playerRank, requiredRank) {
    return RANK_ORDER.indexOf(playerRank) >= RANK_ORDER.indexOf(requiredRank);
};

module.exports = mongoose.model('GuildBounty', bountySchema);
