const mongoose = require('mongoose');

const stageSchema = new mongoose.Schema({
    stageNumber: { type: Number, required: true },
    name: { type: String, required: true },
    enemyId: { type: String, default: null }, // Reference to RPGEnemy ID
    level: { type: Number, default: 1 }, // Level multiplier
    enemy: { type: String, required: true }, // Name fallback/display
    hp: { type: Number, default: 0 }, // If 0, calculate from Base * Level
    atk: { type: Number, default: 0 },
    exp: { type: Number, default: 0 },
    gold: { type: Number, default: 0 },
    drop: { type: String, default: '' },
    isBoss: { type: Boolean, default: false }
}, { _id: false });

const rpgChapterSchema = new mongoose.Schema({
    chapterNumber: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    stages: [stageSchema],
    clearRewardHeroId: { type: String, default: null }
}, { timestamps: true });

// Ambil chapter tertentu
rpgChapterSchema.statics.getChapter = async function (chapterNum) {
    return this.findOne({ chapterNumber: chapterNum }).lean();
};

// Ambil semua chapter
rpgChapterSchema.statics.getAllChapters = async function () {
    return this.find().sort({ chapterNumber: 1 }).lean();
};

module.exports = mongoose.model('RPGChapter', rpgChapterSchema);
