const mongoose = require('mongoose');

const rpgDungeonSchema = new mongoose.Schema({
    dungeonId: { type: String, required: true, unique: true }, // ID unik, misal: 'daily_gold'
    name: { type: String, required: true }, // Nama Dungeon
    description: { type: String, default: '' },

    // Requirement
    minLevel: { type: Number, default: 1 },

    // Entry Cost (Tiket Masuk)
    ticketItemId: { type: String, default: null }, // Item ID tiket (misal: 'dungeon_key'). Null = Gak butuh item.
    ticketCount: { type: Number, default: 0 }, // Jumlah tiket yg dibutuhkan
    goldCost: { type: Number, default: 0 }, // Atau bayar pake Gold

    // Battle Config
    bossId: { type: String, required: true }, // ID Musuh/Boss yang dilawan

    // Clear Rewards (Hadiah Tambahan selain drop boss)
    expReward: { type: Number, default: 0 },
    goldReward: { type: Number, default: 0 },

    // Status
    isActive: { type: Boolean, default: true }

}, { timestamps: true });

module.exports = mongoose.model('RPGDungeon', rpgDungeonSchema);
