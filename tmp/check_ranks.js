const mongoose = require('mongoose');
const { MiningConfig } = require('../src/models');
const dbConfig = require('../config/database.config');

async function main() {
    try {
        await mongoose.connect(dbConfig.mongoUri || process.env.MONGODB_URI);
        const config = await MiningConfig.getConfig();
        console.log(JSON.stringify(config.guildSettings.ranks, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
main();
