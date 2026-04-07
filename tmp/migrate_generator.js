const mongoose = require('mongoose');
const path = require('path');
const MiningConfig = require('../src/models/MiningConfig');
const uri = 'mongodb+srv://sea:Avionika27@seapanel.smo7cqy.mongodb.net/sankabot?retryWrites=true&w=majority';

async function migrateGenerator() {
    try {
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        const config = await MiningConfig.getConfig();

        if (config.generatorUpgrades && config.generatorUpgrades.length > 0) {
            console.log('Generator upgrades already configured.');
        } else {
            console.log('Inserting default generator upgrades...');

            const defaultUpgrades = [
                {
                    level: 1, // Unlock at Rank E
                    capacityItems: 50,
                    speedMinutes: 10,
                    requirements: { minecon: 0, gems: 0, items: [] }
                },
                {
                    level: 2,
                    capacityItems: 120,
                    speedMinutes: 5,
                    requirements: {
                        minecon: 50000,
                        gems: 0,
                        items: [
                            { name: 'Iron', amount: 500 },
                            { name: 'Coal', amount: 1000 }
                        ]
                    }
                },
                {
                    level: 3,
                    capacityItems: 300,
                    speedMinutes: 2,
                    requirements: {
                        minecon: 150000,
                        gems: 5,
                        items: [
                            { name: 'Gold', amount: 800 },
                            { name: 'Coal', amount: 2000 }
                        ]
                    }
                },
                {
                    level: 4,
                    capacityItems: 600,
                    speedMinutes: 1, // 1 ore per minute
                    requirements: {
                        minecon: 500000,
                        gems: 25,
                        items: [
                            { name: 'Titanium', amount: 1000 },
                            { name: 'Uranium', amount: 500 }
                        ]
                    }
                },
                {
                    level: 5,
                    capacityItems: 1200,
                    speedMinutes: 0.5, // 2 ore per minute
                    requirements: {
                        minecon: 1000000,
                        gems: 100,
                        items: [
                            { name: 'Diamond', amount: 500 },
                            { name: 'Uranium', amount: 1000 }
                        ]
                    }
                }
            ];

            config.generatorUpgrades = defaultUpgrades;
            await config.save();
            console.log('Successfully inserted default generator config.');
        }

        mongoose.connection.close();
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrateGenerator();
