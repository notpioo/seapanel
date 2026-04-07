/**
 * Pet System Helper
 * Shared data and bonus calculator for the pet system
 */

const PET_LIST = [
    // ─── COMMON (18%, 5 pets = 3.6% each) ───────────────────────────────
    { id: 'bat',             name: 'Bat',            shortcode: 'bat', rarity: 'common',    emoji: '🦇', statType: 'bp',                   statPerLevel: 5   },
    { id: 'cow',             name: 'Cow',            shortcode: 'co',  rarity: 'common',    emoji: '🐄', statType: 'bp',                   statPerLevel: 5   },
    { id: 'pig',             name: 'Pig',            shortcode: 'pi',  rarity: 'common',    emoji: '🐷', statType: 'bp',                   statPerLevel: 5   },
    { id: 'sheep',           name: 'Sheep',          shortcode: 'sh',  rarity: 'common',    emoji: '🐑', statType: 'bp',                   statPerLevel: 5   },
    { id: 'squid',           name: 'Squid',          shortcode: 'sq',  rarity: 'common',    emoji: '🦑', statType: 'bp',                   statPerLevel: 5   },
    // ─── UNCOMMON (12%, 5 pets = 2.4% each) ─────────────────────────────
    { id: 'chicken',         name: 'Chicken',        shortcode: 'ch',  rarity: 'uncommon',  emoji: '🐔', statType: 'speed',                statPerLevel: 10  },
    { id: 'creeper',         name: 'Creeper',        shortcode: 'cr',  rarity: 'uncommon',  emoji: '💚', statType: 'speed',                statPerLevel: 10  },
    { id: 'ocelot',          name: 'Ocelot',         shortcode: 'oc',  rarity: 'uncommon',  emoji: '🐆', statType: 'speed',                statPerLevel: 10  },
    { id: 'pufferfish',      name: 'Pufferfish',     shortcode: 'pu',  rarity: 'uncommon',  emoji: '🐡', statType: 'speed',                statPerLevel: 10  },
    { id: 'wolf',            name: 'Wolf',           shortcode: 'wo',  rarity: 'uncommon',  emoji: '🐺', statType: 'speed',                statPerLevel: 10  },
    // ─── RARE (6%, 5 pets = 1.2% each) ──────────────────────────────────
    { id: 'dolphin',         name: 'Dolphin',        shortcode: 'do',  rarity: 'rare',      emoji: '🐬', statType: 'sell',                 statPerLevel: 5   },
    { id: 'enderman',        name: 'Enderman',       shortcode: 'en',  rarity: 'rare',      emoji: '🖤', statType: 'sell',                 statPerLevel: 5   },
    { id: 'guardian',        name: 'Guardian',       shortcode: 'gu',  rarity: 'rare',      emoji: '🔱', statType: 'sell',                 statPerLevel: 5   },
    { id: 'parrot',          name: 'Parrot',         shortcode: 'par', rarity: 'rare',      emoji: '🦜', statType: 'sell',                 statPerLevel: 5   },
    { id: 'turtle',          name: 'Turtle',         shortcode: 'tu',  rarity: 'rare',      emoji: '🐢', statType: 'sell',                 statPerLevel: 5   },
    // ─── EPIC (3.6%, 5 pets = 0.72% each) ───────────────────────────────
    { id: 'warden',          name: 'Warden',         shortcode: 'wa',  rarity: 'epic',      emoji: '🔮', statType: 'boost',                statPerLevel: 2   },
    { id: 'golem',           name: 'Golem',          shortcode: 'go',  rarity: 'epic',      emoji: '🤖', statType: 'boost',                statPerLevel: 2   },
    { id: 'snowman',         name: 'Snowman',        shortcode: 'sn',  rarity: 'epic',      emoji: '⛄', statType: 'boost',                statPerLevel: 2   },
    { id: 'villager',        name: 'Villager',       shortcode: 'vi',  rarity: 'epic',      emoji: '👨‍🌾', statType: 'boost',               statPerLevel: 2   },
    { id: 'reaper',          name: 'Reaper',         shortcode: 're',  rarity: 'epic',      emoji: '💀', statType: 'boost',                statPerLevel: 2   },
    // ─── MYTHICAL (1.2%, 4 pets = 0.3% each) ────────────────────────────
    { id: 'nightmare',       name: 'Nightmare',      shortcode: 'nm',  rarity: 'mythical',  emoji: '🐴', statType: 'upgrade_discount',     statPerLevel: 6   },
    { id: 'wraith',          name: 'Wraith',         shortcode: 'wr',  rarity: 'mythical',  emoji: '🦴', statType: 'shard_bonus',          statPerLevel: 4   },
    { id: 'arachne',         name: 'Arachne',        shortcode: 'ar',  rarity: 'mythical',  emoji: '🕷️', statType: 'shard_cost_percent',   statPerLevel: 4   },
    { id: 'evoker',          name: 'Evoker',         shortcode: 'ev',  rarity: 'mythical',  emoji: '🧙', statType: 'quest_reward_bonus',   statPerLevel: 8   },
    // ─── LEGENDARY (0.36%, 4 pets = 0.09% each) ─────────────────────────
    { id: 'dragon',          name: 'Dragon',         shortcode: 'dr',  rarity: 'legendary', emoji: '🐲', statType: 'hunt_cooldown',        statPerLevel: 60  },
    { id: 'wither',          name: 'Wither',         shortcode: 'wi',  rarity: 'legendary', emoji: '💨', statType: 'double_drop_chance',   statPerLevel: 2   },
    { id: 'giant',           name: 'Giant',          shortcode: 'gi',  rarity: 'legendary', emoji: '🗿', statType: 'boost_duration',       statPerLevel: 5   },
    { id: 'phantom',         name: 'Phantom',        shortcode: 'ph',  rarity: 'legendary', emoji: '👻', statType: 'failed_hunt_shards',   statPerLevel: 3   },
];

const RARITY_CONFIG = {
    common:    { chance: 22,   badge: '⬜ Common',    color: '#888888', shards: 4,   upgradeCost: 20  },
    uncommon:  { chance: 15,   badge: '🟩 Uncommon',  color: '#22c55e', shards: 8,   upgradeCost: 30  },
    rare:      { chance: 7,    badge: '🟦 Rare',      color: '#3b82f6', shards: 16,  upgradeCost: 55  },
    epic:      { chance: 3.6,  badge: '🟣 Epic',      color: '#a855f7', shards: 32,  upgradeCost: 100 },
    mythical:  { chance: 1.2,  badge: '🟡 Mythical',  color: '#f59e0b', shards: 60,  upgradeCost: 150 },
    legendary: { chance: 0.36, badge: '🔴 Legendary', color: '#ef4444', shards: 120, upgradeCost: 300 },
};

const PET_MAX_LEVEL = 10;
const HUNT_COOLDOWN_SEC = 480;
const HUNT_COOLDOWN_MIN_SEC = 30;

function getPetByCode(code) {
    const lower = (code || '').toLowerCase();
    return PET_LIST.find(p => p.shortcode === lower || p.id === lower || p.name.toLowerCase() === lower);
}

function getPetById(id) {
    return PET_LIST.find(p => p.id === id);
}

function getStatDescription(petDef, level) {
    const val = petDef.statPerLevel * level;
    switch (petDef.statType) {
        case 'bp':                   return `📦 +${val}% Kapasitas BP`;
        case 'flat_bp':              return `📦 +${val.toLocaleString()} flat BP cap`;
        case 'boost_duration':       return `⏳ +${val}% durasi Global Boost saat kamu beli`;
        case 'speed':                return `⚡ +${val}% Mining Speed (sesi lebih cepat)`;
        case 'double_drop_chance':   return `⚡ +${val}% chance double drop per session`;
        case 'sell':                 return `💰 +${val}% Harga Jual`;
        case 'boost':                return `✨ +${val}% boost semua pet tier bawah`;
        case 'upgrade_discount':     return `💸 -${val}% biaya upgrade Pick & BP`;
        case 'shard_bonus':          return `💠 +${val}% shard dari duplikat & gagal hunt`;
        case 'shard_cost_percent':   return `💠 -${val}% biaya shard upgrade pet`;
        case 'quest_reward_bonus':   return `📜 +${val}% semua reward Quest`;
        case 'hunt_cooldown':        return `🏹 -${val}s cooldown .mhunt`;
        case 'failed_hunt_shards':   return `👻 +${val} shard ekstra setiap hunt gagal`;
        default:                     return `+${val}`;
    }
}

function getPetBonuses(player) {
    const owned = player.pets || [];

    let rawBpPercent = 0;
    let rawBpFlat = 0;
    let rawSpeedPercent = 0;
    let rawSpeedFlat = 0;
    let doubleDropChance = 0;
    let rawSellPercent = 0;
    let epicBoostPercent = 0;
    let upgradeDiscountPct = 0;
    let shardBonusPct = 0;
    let shardCostPercent = 0;
    let huntCooldownReductionSec = 0;
    let failedHuntShards = 0;
    let boostDurationPct = 0;
    let questRewardBonus = 0;

    for (const ownedPet of owned) {
        const def = getPetById(ownedPet.id);
        if (!def) continue;
        const lvl = ownedPet.level || 1;

        switch (def.statType) {
            case 'bp':                 rawBpPercent += def.statPerLevel * lvl; break;
            case 'flat_bp':            rawBpFlat += def.statPerLevel * lvl; break;
            case 'speed':              rawSpeedPercent += def.statPerLevel * lvl; break;
            case 'mine_cooldown':        rawSpeedFlat += def.statPerLevel * lvl; break;
            case 'double_drop_chance':   doubleDropChance += def.statPerLevel * lvl; break;
            case 'sell':               rawSellPercent += def.statPerLevel * lvl; break;
            case 'boost':              epicBoostPercent += def.statPerLevel * lvl; break;
            case 'upgrade_discount':   upgradeDiscountPct += def.statPerLevel * lvl; break;
            case 'shard_bonus':        shardBonusPct += def.statPerLevel * lvl; break;
            case 'shard_cost_percent': shardCostPercent += def.statPerLevel * lvl; break;
            case 'hunt_cooldown':      huntCooldownReductionSec += def.statPerLevel * lvl; break;
            case 'failed_hunt_shards': failedHuntShards += def.statPerLevel * lvl; break;
            case 'boost_duration':     boostDurationPct += def.statPerLevel * lvl; break;
            case 'quest_reward_bonus': questRewardBonus += def.statPerLevel * lvl; break;
        }
    }

    const epicMult = 1 + (epicBoostPercent / 100);
    return {
        bpPercent:             rawBpPercent * epicMult,
        bpFlat:                rawBpFlat,
        speedPercent:          rawSpeedPercent * epicMult,
        speedFlat:             rawSpeedFlat,
        doubleDropChance:      Math.min(90, doubleDropChance),
        sellPercent:           rawSellPercent * epicMult,
        upgradeDiscount:       upgradeDiscountPct / 100,
        shardBonusPct,
        shardCostPercent,
        huntCooldownReductionSec,
        failedHuntShards,
        boostDurationPct,
        questRewardBonus,
        huntCooldownMs:        Math.max(HUNT_COOLDOWN_MIN_SEC, HUNT_COOLDOWN_SEC - huntCooldownReductionSec) * 1000,
    };
}

function rollHunt() {
    const rand = Math.random() * 100;
    let cumulative = 0;
    const tierOrder = ['legendary', 'mythical', 'epic', 'rare', 'uncommon', 'common'];
    for (const rarity of tierOrder) {
        cumulative += RARITY_CONFIG[rarity].chance;
        if (rand < cumulative) {
            const pool = PET_LIST.filter(p => p.rarity === rarity);
            return { success: true, pet: pool[Math.floor(Math.random() * pool.length)] };
        }
    }
    return { success: false, pet: null };
}

module.exports = {
    PET_LIST,
    RARITY_CONFIG,
    PET_MAX_LEVEL,
    HUNT_COOLDOWN_SEC,
    HUNT_COOLDOWN_MIN_SEC,
    getPetByCode,
    getPetById,
    getStatDescription,
    getPetBonuses,
    rollHunt,
};
