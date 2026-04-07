const mongoose = require('mongoose');
const path = require('path');
const MiningConfig = require('../src/models/MiningConfig');
const uri = 'mongodb+srv://sea:Avionika27@seapanel.smo7cqy.mongodb.net/sankabot?retryWrites=true&w=majority';

async function run() {
    try {
        await mongoose.connect(uri);
        const config = await MiningConfig.getConfig();

        if (config.shopItems) {
            config.shopItems = config.shopItems.filter(item => item.id !== 'battery');
            await config.save();
            console.log('Removed Battery from Shop.');
        } else {
            console.log('No shop items found.');
        }

        mongoose.connection.close();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
