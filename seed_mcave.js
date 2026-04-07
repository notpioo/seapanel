const db = require('./src/utils/database.js');
const { MiningConfig } = require('./src/models');

async function seed() {
    await db.connect();
    const config = await MiningConfig.getConfig();

    const updates = {
        20: { requiredItems: [{ name: 'Iron', amount: 300 }, { name: 'Diamond', amount: 50 }, { name: 'Emerald', amount: 20 }, { name: 'Ruby', amount: 10 }] },
        22: { requiredItems: [{ name: 'Silver', amount: 400 }, { name: 'Diamond', amount: 100 }, { name: 'Emerald', amount: 40 }, { name: 'Ruby', amount: 20 }] },
        24: { requiredItems: [{ name: 'Gold', amount: 500 }, { name: 'Diamond', amount: 150 }, { name: 'Emerald', amount: 60 }, { name: 'Ruby', amount: 30 }] },
        26: { requiredItems: [{ name: 'Emerald', amount: 200 }, { name: 'Mythril', amount: 50 }, { name: 'Sapphire', amount: 20 }, { name: 'Titanium', amount: 10 }] },
    };

    for (let i = 1; i <= 26; i++) {
        let p = config.pickaxeLevels.find(x => x.level === i);
        if (!p) {
            p = { level: i, name: `Pickaxe Lv.${i}`, upgradeCost: i * 10000, dropMultiplier: 1 + (i * 0.2) };
            config.pickaxeLevels.push(p);
        }
        if (updates[i]) {
            p.requiredItems = updates[i].requiredItems;
            console.log(`Patched requirements for Pickaxe Lv.${i}`);
        } else if (i >= 19 && i <= 26) {
            p.requiredItems = [];
        }
    }

    config.markModified('pickaxeLevels');
    await config.save();
    console.log('Seeding Pickaxe DB Done!');
    process.exit(0);
}

seed();
