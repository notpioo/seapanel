const mongoose = require('mongoose');

const rpgPlayerSchema = new mongoose.Schema({
    phoneNumber: { type: String, required: true, unique: true },

    // Progress
    level: { type: Number, default: 1 },
    exp: { type: Number, default: 0 },
    gold: { type: Number, default: 50 },

    // Story Progress
    currentChapter: { type: Number, default: 1 },
    currentStage: { type: Number, default: 1 },

    // Collection
    heroes: [{ type: String }],
    relics: [{ type: String }],

    // Inventory
    inventory: { type: Map, of: Number, default: {} }

}, { timestamps: true });

// Hitung stats berdasarkan data hero dan item dari DB
rpgPlayerSchema.methods.calcStats = function (heroesMap, gameConfig, itemsMap) {
    let totalHP = gameConfig.baseHP + (this.level * gameConfig.hpPerLevel);
    let totalATK = gameConfig.baseATK + (this.level * gameConfig.atkPerLevel);
    let heroBonusHP = 0;
    let heroBonusATK = 0;
    let itemBonusHP = 0;
    let itemBonusATK = 0;

    // Bonus Hero
    for (const heroId of this.heroes) {
        const heroData = heroesMap[heroId];
        if (heroData) {
            heroBonusHP += heroData.hp;
            heroBonusATK += heroData.atk;
        }
    }

    // Bonus Item (Unique Collection)
    if (itemsMap && this.inventory) {
        // Handle Mongoose Map vs Object
        const entries = this.inventory instanceof Map ? this.inventory.entries() : Object.entries(this.inventory);

        for (const [itemId, amount] of entries) {
            if (amount > 0) {
                const item = itemsMap[itemId];
                // Type check optional, assuming only weapon/relic has stats > 0
                if (item && (item.atk > 0 || item.hp > 0)) {
                    itemBonusATK += (item.atk || 0);
                    itemBonusHP += (item.hp || 0);
                }
            }
        }
    }

    totalHP += heroBonusHP + itemBonusHP;
    totalATK += heroBonusATK + itemBonusATK;
    const cp = Math.floor((totalHP / 10) + totalATK);

    return {
        hp: totalHP,
        atk: totalATK,
        cp,
        bonus: {
            heroHp: heroBonusHP,
            heroAtk: heroBonusATK,
            itemHp: itemBonusHP,
            itemAtk: itemBonusATK
        }
    };
};

// Tambah EXP dan cek level up
rpgPlayerSchema.methods.addExp = function (amount) {
    this.exp += amount;
    const reqExp = this.level * 100;

    let leveledUp = false;
    if (this.exp >= reqExp) {
        this.level += 1;
        this.exp -= reqExp;
        leveledUp = true;
    }
    return leveledUp;
};

module.exports = mongoose.model('RPGPlayer', rpgPlayerSchema);
