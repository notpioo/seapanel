const mongoose = require('mongoose');
const fs = require('fs');

const MiningConfig = require('../src/models/MiningConfig');

const uri = 'mongodb+srv://sea:Avionika27@seapanel.smo7cqy.mongodb.net/sankabot?retryWrites=true&w=majority';

async function dump() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(uri);
        console.log('Fetching MiningConfig...');
        const config = await MiningConfig.findOne({ configId: 'main' });
        if (!config) {
            console.error('Config not found!');
            process.exit(1);
        }

        const result = {
            resources: config.resources.map(r => r.name),
            floors: config.floors.map(f => ({ number: f.number, name: f.name, resources: f.resources })),
            caves: config.caves.map(c => ({ number: c.number, name: c.name, resources: c.resources })),
            pickaxeLevels: config.pickaxeLevels.map(p => ({
                level: p.level,
                name: p.name,
                upgradeCost: p.upgradeCost,
                requiredItems: p.requiredItems
            }))
        };

        fs.writeFileSync('tmp/mining_config_dump.json', JSON.stringify(result, null, 2));
        console.log('Dump successful to tmp/mining_config_dump.json');
        process.exit(0);
    } catch (err) {
        console.error('Dump error:', err);
        process.exit(1);
    }
}

dump();
