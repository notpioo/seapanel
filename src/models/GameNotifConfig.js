const mongoose = require('mongoose');

const gameNotifConfigSchema = new mongoose.Schema({
    groupId: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: true },
    intervalMinutes: { type: Number, default: 60 },
    lastCheck: { type: Date, default: null },
    notifiedTitles: [{ type: String }],
}, { timestamps: true });

module.exports = mongoose.model('GameNotifConfig', gameNotifConfigSchema);
