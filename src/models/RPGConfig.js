const mongoose = require('mongoose');

const rpgConfigSchema = new mongoose.Schema({
    gachaPrice: { type: Number, default: 500 },
    baseHP: { type: Number, default: 100 },
    baseATK: { type: Number, default: 10 },
    hpPerLevel: { type: Number, default: 20 },
    atkPerLevel: { type: Number, default: 2 },
    gachaRates: {
        UR: { type: Number, default: 0.5 },
        SSR: { type: Number, default: 1.5 },
        SR: { type: Number, default: 8 },
        R: { type: Number, default: 40 },
        C: { type: Number, default: 50 }
    }
}, { timestamps: true });

// Singleton: selalu ambil 1 dokumen
rpgConfigSchema.statics.getConfig = async function () {
    let config = await this.findOne();
    if (!config) {
        config = await this.create({});
        console.log('[RPG] Created default config.');
    }
    return config;
};

module.exports = mongoose.model('RPGConfig', rpgConfigSchema);
