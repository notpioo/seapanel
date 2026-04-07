require('dotenv').config();
const mongoose = require('mongoose');
const { MiningConfig } = require('./src/models');

async function patch() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    let config = await MiningConfig.findOne({ configId: 'main' });
    if (!config) {
        console.log('No config found');
        process.exit(0);
    }

    // Add Shop Items
    if (!config.shopItems.find(i => i.id === 'cave1_pass')) {
        config.shopItems.push({
            id: 'cave1_pass',
            name: 'Cave 1 Pass',
            emoji: '🎟️',
            description: 'Akses Cave 1 untuk cari Ruby',
            price: 15,
            currency: 'gems',
            boostType: 'cave1_pass',
            multiplier: 50, // 50 Stamina
            durationMinutes: 0,
            isGlobal: false
        });
        console.log('Added cave1_pass');
    }

    if (!config.shopItems.find(i => i.id === 'cave2_pass')) {
        config.shopItems.push({
            id: 'cave2_pass',
            name: 'Cave 2 Pass',
            emoji: '🎟️',
            description: 'Akses Cave 2 untuk cari Sapphire & Titanium',
            price: 20,
            currency: 'gems',
            boostType: 'cave2_pass',
            multiplier: 50, // 50 Stamina
            durationMinutes: 0,
            isGlobal: false
        });
        console.log('Added cave2_pass');
    }

    // Add Resources
    const newRes = [
        { name: 'Ruby', rarity: 'rare', sellPrice: 500, xpGain: 100, dropWeight: 10 },
        { name: 'Sapphire', rarity: 'epic', sellPrice: 1500, xpGain: 250, dropWeight: 8 },
        { name: 'Titanium', rarity: 'legendary', sellPrice: 3000, xpGain: 500, dropWeight: 5 }
    ];

    for (const res of newRes) {
        if (!config.resources.find(r => r.name.toLowerCase() === res.name.toLowerCase())) {
            config.resources.push(res);
            console.log(`Added resource: ${res.name}`);
        }
    }

    // Add required pickaxe layers for level 19-25
    // Ensure we have levels up to 25
    // Usually admin sets these up in Web Panel. But we will seed them if missing.
    // The user explicitly stated:
    /*
    19 -> 20: 3 surface mats + 1 cave 1 mat
    21 -> 22: 3 surface mats + 1 cave 1 mat
    23 -> 24: 3 surface mats + 1 cave 1 mat
    25 -> 26: 2 surface mats + 2 cave 2 mat
    Wait: 
    "level 20 tetap sseperti skrng"
    "level 21 sama kek yg di level 19 butuh 1 material di cave 1"
    "level 22 tetap sama seperti sekarang"
    let's just inject the requiredItems for levels 20, 22, 24, 26 (which means reaching that level)
    Wait, level 20 pickaxe means upgrading FROM 19 TO 20.
    In mupgrade, current = player.level, next = player.level + 1. So if player is 19, next is 20. Thus level 20 is the target.
    Target Lv 20: 100 Iron, 50 Diamond, 50 Emerald + 10 Ruby
    Target Lv 21: only minecon.
    Target Lv 22: 200 Iron, 100 Diamond, 100 Emerald + 20 Ruby
    Target Lv 23: only minecon
    Target Lv 24: 300 Iron, 150 Diamond, 150 Emerald + 30 Ruby
    Target Lv 25: only minecon
    Target Lv 26: 150 Emerald, 50 Mythril + 20 Sapphire, 10 Titanium
    */

    const updates = {
        20: { requiredItems: [{ name: 'Iron', amount: 300 }, { name: 'Diamond', amount: 50 }, { name: 'Emerald', amount: 20 }, { name: 'Ruby', amount: 10 }] },
        22: { requiredItems: [{ name: 'Silver', amount: 400 }, { name: 'Diamond', amount: 100 }, { name: 'Emerald', amount: 40 }, { name: 'Ruby', amount: 20 }] },
        24: { requiredItems: [{ name: 'Gold', amount: 500 }, { name: 'Diamond', amount: 150 }, { name: 'Emerald', amount: 60 }, { name: 'Ruby', amount: 30 }] },
        26: { requiredItems: [{ name: 'Emerald', amount: 200 }, { name: 'Mythril', amount: 50 }, { name: 'Sapphire', amount: 20 }, { name: 'Titanium', amount: 10 }] },
    };

    for (let i = 1; i <= 26; i++) {
        let p = config.pickaxeLevels.find(x => x.level === i);
        if (!p) {
            // Create dummy level
            p = { level: i, name: `Pickaxe Lv.${i}`, upgradeCost: i * 10000, dropMultiplier: 1 + (i * 0.2) };
            config.pickaxeLevels.push(p);
        }
        if (updates[i]) {
            p.requiredItems = updates[i].requiredItems;
            console.log(`Patched requirements for Pickaxe Lv.${i}`);
        } else if (i >= 19 && i <= 26) {
            // Keep empty required items for others
            p.requiredItems = [];
        }
    }

    await config.save();
    console.log('Done!');
    process.exit(0);
}

patch();
