const mongoose = require('mongoose');

const rpgItemSchema = new mongoose.Schema({
    itemId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    price: { type: Number, default: 0 }, // Sell price
    type: {
        type: String,
        enum: ['material', 'junk', 'weapon', 'relic', 'consumable'],
        default: 'material'
    },
    // Stats Bonus (For Weapons/Relics)
    atk: { type: Number, default: 0 },
    hp: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('RPGItem', rpgItemSchema);
