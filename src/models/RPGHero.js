const mongoose = require('mongoose');

const rpgHeroSchema = new mongoose.Schema({
    heroId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    rarity: { type: String, enum: ['C', 'R', 'SR', 'SSR', 'UR'], required: true },
    hp: { type: Number, required: true },
    atk: { type: Number, required: true },
    desc: { type: String, default: '' }
}, { timestamps: true });

// Ambil semua hero sebagai Map { heroId: data }
rpgHeroSchema.statics.getHeroesMap = async function () {
    const heroes = await this.find().lean();
    const map = {};
    heroes.forEach(h => { map[h.heroId] = h; });
    return map;
};

// Ambil hero per rarity
rpgHeroSchema.statics.getByRarity = async function (rarity) {
    return this.find({ rarity }).lean();
};

module.exports = mongoose.model('RPGHero', rpgHeroSchema);
