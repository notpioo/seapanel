const mongoose = require('mongoose');

const rpgEnemySchema = new mongoose.Schema({
    enemyId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    hp: { type: Number, required: true },
    atk: { type: Number, required: true },
    exp: { type: Number, default: 0 },
    gold: { type: Number, default: 0 },
    drop: { type: String, default: '' }, // Default drop pattern "item:rate"
    isBoss: { type: Boolean, default: false }
}, { timestamps: true });

rpgEnemySchema.statics.getEnemiesMap = async function () {
    const enemies = await this.find().lean();
    const map = {};
    enemies.forEach(e => map[e.enemyId] = e);
    return map;
};

module.exports = mongoose.model('RPGEnemy', rpgEnemySchema);
