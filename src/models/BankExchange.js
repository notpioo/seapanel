const mongoose = require('mongoose');

const bankExchangeSchema = new mongoose.Schema({
    singletonId: { type: String, default: 'exchange', unique: true }, // Ensure only one document exists
    currentRate: { type: Number, required: true, default: 350 }, // 1 Balance = X Minecon
    lastUpdate: { type: Date, default: Date.now }, // When the rate was last changed
    history: [{
        rate: { type: Number, required: true },
        time: { type: Date, default: Date.now }
    }]
});

// Helper static method to get the singleton document
bankExchangeSchema.statics.getExchange = async function () {
    let exchange = await this.findOne({ singletonId: 'exchange' });
    if (!exchange) {
        exchange = await this.create({
            singletonId: 'exchange',
            currentRate: 350,
            history: [{ rate: 350, time: new Date() }]
        });
    }

    // Check if 5 minutes have passed since last update
    const now = new Date();
    const fiveMinutesInMillis = 5 * 60 * 1000;

    if (now.getTime() - exchange.lastUpdate.getTime() >= fiveMinutesInMillis) {
        // Generate new rate between 100 and 600
        const minRate = 100;
        const maxRate = 600;

        // Random walk logic to make it look like a market
        // Max change per interval is 150
        const maxDelta = 150;
        const change = Math.floor(Math.random() * (maxDelta * 2 + 1)) - maxDelta;

        let newRate = exchange.currentRate + change;

        // Clamp the new rate between min and max
        if (newRate < minRate) newRate = minRate;
        if (newRate > maxRate) newRate = maxRate;

        exchange.currentRate = newRate;
        exchange.lastUpdate = now;

        exchange.history.push({
            rate: newRate,
            time: now
        });

        // Keep only the last 50 historical data points to prevent unbounded array growth
        if (exchange.history.length > 50) {
            exchange.history.shift();
        }

        await exchange.save();
    }

    return exchange;
};

const BankExchange = mongoose.model('BankExchange', bankExchangeSchema);
module.exports = BankExchange;
