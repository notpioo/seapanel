const mongoose = require('mongoose');
const path = require('path');
const MiningConfig = require('../src/models/MiningConfig');
const uri = 'mongodb+srv://sea:Avionika27@seapanel.smo7cqy.mongodb.net/sankabot?retryWrites=true&w=majority';

async function run() {
    try {
        await mongoose.connect(uri);
        const config = await MiningConfig.getConfig();

        // Setup 15 levels scaling (Rebalanced)
        const upgrades = [
            // Tier 1 (Free & Cheap)
            { l: 1, c: 100, mins: 10, ores: 5, mcn: 0, gems: 0, items: [] },
            { l: 2, c: 200, mins: 10, ores: 10, mcn: 5000, gems: 0, items: [{ name: 'Coal', amount: 200 }] },
            { l: 3, c: 300, mins: 10, ores: 20, mcn: 10000, gems: 0, items: [{ name: 'Coal', amount: 500 }, { name: 'Iron', amount: 200 }] },
            { l: 4, c: 500, mins: 5, ores: 15, mcn: 20000, gems: 0, items: [{ name: 'Iron', amount: 500 }] },
            // Tier 2 (Mid-tier)
            { l: 5, c: 800, mins: 5, ores: 25, mcn: 35000, gems: 3, items: [{ name: 'Gold', amount: 200 }] },
            { l: 6, c: 1200, mins: 5, ores: 40, mcn: 50000, gems: 5, items: [{ name: 'Gold', amount: 500 }] },
            { l: 7, c: 1800, mins: 2, ores: 20, mcn: 80000, gems: 10, items: [{ name: 'Titanium', amount: 200 }] },
            // Tier 3 (Fast Cycle)
            { l: 8, c: 2500, mins: 2, ores: 35, mcn: 120000, gems: 15, items: [{ name: 'Titanium', amount: 500 }] },
            { l: 9, c: 3500, mins: 2, ores: 60, mcn: 180000, gems: 25, items: [{ name: 'Uranium', amount: 300 }] },
            { l: 10, c: 5000, mins: 1, ores: 40, mcn: 250000, gems: 40, items: [{ name: 'Uranium', amount: 600 }] },
            // Tier 4 (Very Fast / High Capacity)
            { l: 11, c: 8000, mins: 1, ores: 60, mcn: 350000, gems: 60, items: [{ name: 'Diamond', amount: 200 }] },
            { l: 12, c: 12000, mins: 1, ores: 90, mcn: 500000, gems: 80, items: [{ name: 'Diamond', amount: 400 }] },
            { l: 13, c: 18000, mins: 1, ores: 140, mcn: 700000, gems: 120, items: [{ name: 'Diamond', amount: 600 }] },
            // Tier 5 (End Game - Brutal Yields)
            { l: 14, c: 25000, mins: 0.5, ores: 100, mcn: 1000000, gems: 180, items: [{ name: 'Emerald', amount: 300 }] },
            { l: 15, c: 40000, mins: 0.5, ores: 200, mcn: 1500000, gems: 300, items: [{ name: 'Emerald', amount: 600 }] }
        ];

        config.generatorUpgrades = upgrades.map(u => ({
            level: u.l,
            capacityItems: u.c,
            cycleMinutes: u.mins,
            oresPerCycle: u.ores,
            requirements: {
                minecon: u.mcn,
                gems: u.gems,
                items: u.items
            }
        }));

        await config.save();
        console.log('Successfully seeded 15 REBALANCED generator levels!');

        mongoose.connection.close();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
