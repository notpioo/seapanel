const mongoose = require('mongoose');

const miningMarketSchema = new mongoose.Schema({
    sellerId: { type: String, required: true }, // The phone number of the seller
    sellerName: { type: String, default: 'Unknown Miner' }, // Snapshot of seller name
    itemName: { type: String, required: true }, // Lowercase normalized item name
    amount: { type: Number, required: true, min: 1 }, // Quantity
    price: { type: Number, required: true, min: 1 }, // Total price for the stack
    currency: { type: String, enum: ['minecon', 'gems'], default: 'minecon' },
    listedAt: { type: Date, default: Date.now },
});

// Create model
const MiningMarket = mongoose.model('MiningMarket', miningMarketSchema);

module.exports = MiningMarket;
