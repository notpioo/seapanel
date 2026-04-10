const mongoose = require('mongoose');

const tierSchema = new mongoose.Schema({
    startFloor: { type: Number, required: true },
    enemyName:  { type: String, required: true },
    bossName:   { type: String, required: true },
}, { _id: false });

const rpgDungeonSchema = new mongoose.Schema({
    dungeonId:    { type: String, required: true, unique: true },
    name:         { type: String, required: true },
    description:  { type: String, default: '' },
    minLevel:     { type: Number, default: 1 },

    // Enemy flavor per tier (sorted ascending by startFloor)
    tiers: [tierSchema],

    // Linear stat scaling per floor
    baseHP:      { type: Number, default: 120 },
    baseATK:     { type: Number, default: 10  },
    hpPerFloor:  { type: Number, default: 22  },
    atkPerFloor: { type: Number, default: 2   },

    // Boss multiplier (every 5th floor)
    bossHPMult:  { type: Number, default: 2.5 },
    bossATKMult: { type: Number, default: 1.8 },

    // Reward per floor
    baseExp:      { type: Number, default: 50 },
    baseGold:     { type: Number, default: 30 },
    expPerFloor:  { type: Number, default: 15 },
    goldPerFloor: { type: Number, default: 8  },
    bossExpMult:  { type: Number, default: 3  },
    bossGoldMult: { type: Number, default: 3  },

    // Drop format: "itemId:rate" — rate 0-100
    normalDrop: { type: String, default: '' },
    bossDrop:   { type: String, default: '' },

    isActive: { type: Boolean, default: true },
}, { timestamps: true });

// Helper: get tier name for a given floor
rpgDungeonSchema.methods.getTierForFloor = function(floor) {
    const sorted = [...this.tiers].sort((a, b) => b.startFloor - a.startFloor);
    return sorted.find(t => floor >= t.startFloor) || this.tiers[0];
};

// Helper: compute enemy stats for a given floor
rpgDungeonSchema.methods.getFloorStats = function(floor) {
    const isBoss = floor % 5 === 0;
    const tier   = this.getTierForFloor(floor);

    let hp  = Math.round(this.baseHP  + (floor - 1) * this.hpPerFloor);
    let atk = Math.round(this.baseATK + (floor - 1) * this.atkPerFloor);
    if (isBoss) {
        hp  = Math.round(hp  * this.bossHPMult);
        atk = Math.round(atk * this.bossATKMult);
    }

    const exp  = Math.round((this.baseExp  + (floor - 1) * this.expPerFloor)  * (isBoss ? this.bossExpMult  : 1));
    const gold = Math.round((this.baseGold + (floor - 1) * this.goldPerFloor) * (isBoss ? this.bossGoldMult : 1));

    return {
        floor, isBoss,
        enemyName: isBoss ? tier.bossName : tier.enemyName,
        hp, atk, exp, gold,
        drop: isBoss ? this.bossDrop : this.normalDrop,
    };
};

module.exports = mongoose.model('RPGDungeon', rpgDungeonSchema);
