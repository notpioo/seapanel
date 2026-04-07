const mongoose = require('mongoose');
const path = require('path');
const MiningConfig = require('../src/models/MiningConfig');

const uri = 'mongodb+srv://sea:Avionika27@seapanel.smo7cqy.mongodb.net/sankabot?retryWrites=true&w=majority';

const newResources = [
    // CAVE 1 (8) - XP: 1, Sell: 10 - 60
    { name: "Petrified Root", rarity: "uncommon", sellPrice: 10, xpGain: 1, dropWeight: 50 },
    { name: "Iron-Enriched Silex", rarity: "uncommon", sellPrice: 15, xpGain: 1, dropWeight: 45 },
    { name: "Mossy Quartz", rarity: "uncommon", sellPrice: 20, xpGain: 1, dropWeight: 40 },
    { name: "Cavernous Marl", rarity: "uncommon", sellPrice: 25, xpGain: 1, dropWeight: 40 },
    { name: "Shimmering Mica", rarity: "rare", sellPrice: 35, xpGain: 1, dropWeight: 30 },
    { name: "Hardened Resin", rarity: "rare", sellPrice: 40, xpGain: 1, dropWeight: 25 },
    { name: "Sulphur Glaze", rarity: "rare", sellPrice: 50, xpGain: 1, dropWeight: 20 },
    { name: "Vitreous Schist", rarity: "epic", sellPrice: 60, xpGain: 1, dropWeight: 10 },

    // CAVE 2 (8) - XP: 1-2, Sell: 80 - 280
    { name: "Fluorescent Spinel", rarity: "rare", sellPrice: 80, xpGain: 1, dropWeight: 35 },
    { name: "Paleite Fragment", rarity: "rare", sellPrice: 100, xpGain: 1, dropWeight: 33 },
    { name: "Prismatic Calcite", rarity: "rare", sellPrice: 120, xpGain: 1, dropWeight: 30 },
    { name: "Azureite Shard", rarity: "epic", sellPrice: 150, xpGain: 2, dropWeight: 20 },
    { name: "Veridian Garnet", rarity: "epic", sellPrice: 180, xpGain: 2, dropWeight: 18 },
    { name: "Stellar Corundum", rarity: "epic", sellPrice: 210, xpGain: 2, dropWeight: 15 },
    { name: "Indigo Zircon", rarity: "legendary", sellPrice: 240, xpGain: 2, dropWeight: 8 },
    { name: "Rose Beryl", rarity: "legendary", sellPrice: 280, xpGain: 2, dropWeight: 5 },

    // CAVE 3 (8) - XP: 2, Sell: 320 - 900
    { name: "Void-Infused Slate", rarity: "epic", sellPrice: 320, xpGain: 2, dropWeight: 25 },
    { name: "Ethereal Pyrite", rarity: "epic", sellPrice: 380, xpGain: 2, dropWeight: 22 },
    { name: "Dimensional Nickel", rarity: "epic", sellPrice: 420, xpGain: 2, dropWeight: 20 },
    { name: "Shadow Graphite", rarity: "legendary", sellPrice: 550, xpGain: 2, dropWeight: 10 },
    { name: "Abyssal Geode", rarity: "legendary", sellPrice: 650, xpGain: 2, dropWeight: 8 },
    { name: "Noxious Cobalt", rarity: "legendary", sellPrice: 750, xpGain: 2, dropWeight: 7 },
    { name: "Phasing Chromium", rarity: "mythical", sellPrice: 850, xpGain: 2, dropWeight: 4 },
    { name: "Glinting Obsidian", rarity: "mythical", sellPrice: 900, xpGain: 2, dropWeight: 3 },

    // CAVE 4 (8) - XP: 2-3, Sell: 1000 - 2500
    { name: "Solarite Ore", rarity: "legendary", sellPrice: 1000, xpGain: 2, dropWeight: 12 },
    { name: "Lunar Silver", rarity: "legendary", sellPrice: 1200, xpGain: 2, dropWeight: 11 },
    { name: "Aetheric Brass", rarity: "legendary", sellPrice: 1400, xpGain: 2, dropWeight: 10 },
    { name: "Radiant Tungsten", rarity: "mythical", sellPrice: 1700, xpGain: 3, dropWeight: 5 },
    { name: "Nebula Palladium", rarity: "mythical", sellPrice: 1900, xpGain: 3, dropWeight: 4 },
    { name: "Star-Forged Titanium", rarity: "mythical", sellPrice: 2100, xpGain: 3, dropWeight: 3 },
    { name: "Astral Platinum", rarity: "divine", sellPrice: 2300, xpGain: 3, dropWeight: 1.5 },
    { name: "Celestial Mercury", rarity: "divine", sellPrice: 2500, xpGain: 3, dropWeight: 1 },

    // CAVE 5 (8) - XP: 3-5, Sell: 2800 - 5000
    { name: "Zenithite Alloy", rarity: "mythical", sellPrice: 2800, xpGain: 3, dropWeight: 6 },
    { name: "Chrono-Steel", rarity: "mythical", sellPrice: 3100, xpGain: 3, dropWeight: 5 },
    { name: "Infinity Core Shard", rarity: "mythical", sellPrice: 3400, xpGain: 3, dropWeight: 4 },
    { name: "Singularity Dust", rarity: "divine", sellPrice: 3800, xpGain: 4, dropWeight: 2 },
    { name: "Galactic Orichalcum", rarity: "divine", sellPrice: 4200, xpGain: 4, dropWeight: 1.8 },
    { name: "Phoenix Cinder", rarity: "divine", sellPrice: 4500, xpGain: 4, dropWeight: 1.5 },
    { name: "Temporal Adamantium", rarity: "ultimate", sellPrice: 4800, xpGain: 5, dropWeight: 0.8 },
    { name: "God-Metal Essence", rarity: "ultimate", sellPrice: 5000, xpGain: 5, dropWeight: 0.5 }
];

const caves = [
    { number: 1, name: "Goblin Cavern", requiredRank: "F", passPrice: 15, passCurrency: "gems", staminaGiven: 50, resources: ["Petrified Root", "Iron-Enriched Silex", "Mossy Quartz", "Cavernous Marl", "Shimmering Mica", "Hardened Resin", "Sulphur Glaze", "Vitreous Schist"] },
    { number: 2, name: "Crystal Depths", requiredRank: "C", passPrice: 20, passCurrency: "gems", staminaGiven: 50, resources: ["Fluorescent Spinel", "Paleite Fragment", "Prismatic Calcite", "Azureite Shard", "Veridian Garnet", "Stellar Corundum", "Indigo Zircon", "Rose Beryl"] },
    { number: 3, name: "Void Descent", requiredRank: "A", passPrice: 30, passCurrency: "gems", staminaGiven: 50, resources: ["Void-Infused Slate", "Ethereal Pyrite", "Dimensional Nickel", "Shadow Graphite", "Abyssal Geode", "Noxious Cobalt", "Phasing Chromium", "Glinting Obsidian"] },
    { number: 4, name: "Celestial Sanctum", requiredRank: "S", passPrice: 50, passCurrency: "gems", staminaGiven: 50, resources: ["Solarite Ore", "Lunar Silver", "Aetheric Brass", "Radiant Tungsten", "Nebula Palladium", "Star-Forged Titanium", "Astral Platinum", "Celestial Mercury"] },
    { number: 5, name: "Eternity Forge", requiredRank: "SS", passPrice: 100, passCurrency: "gems", staminaGiven: 50, resources: ["Zenithite Alloy", "Chrono-Steel", "Infinity Core Shard", "Singularity Dust", "Galactic Orichalcum", "Phoenix Cinder", "Temporal Adamantium", "God-Metal Essence"] }
];

async function migrate() {
    try {
        await mongoose.connect(uri);
        const config = await MiningConfig.findOne({ configId: 'main' });

        // 1. Add/Update resources
        for (const res of newResources) {
            const index = config.resources.findIndex(r => r.name === res.name);
            if (index !== -1) {
                // Update existing
                config.resources[index].rarity = res.rarity;
                config.resources[index].sellPrice = res.sellPrice;
                config.resources[index].xpGain = res.xpGain;
                config.resources[index].dropWeight = res.dropWeight;
            } else {
                // Add new
                config.resources.push(res);
            }
        }

        // 2. Update/Add Caves
        config.caves = caves;

        // 3. Update Pickaxe Levels (19 to Max)
        // Pola: 2 Surface + 2 Cave
        const pickaxeMaps = [
            { level: 19, surface: ["Gold", "Platinum"], cave: ["Petrified Root", "Hardened Resin"], amounts: [400, 250, 120, 80] },
            { level: 20, surface: ["Titanium", "Bismuth"], cave: ["Iron-Enriched Silex", "Sulphur Glaze"], amounts: [450, 300, 130, 90] },
            { level: 21, surface: ["Amethyst", "Diamond"], cave: ["Mossy Quartz", "Vitreous Schist"], amounts: [500, 40, 150, 15] },
            { level: 22, surface: ["Osmium", "Jade"], cave: ["Petrified Root", "Shimmering Mica"], amounts: [550, 350, 160, 50] },
            { level: 23, surface: ["Emerald", "Diamond"], cave: ["Cavernous Marl", "Vitreous Schist"], amounts: [600, 80, 180, 20] },
            { level: 24, surface: ["Platinum", "Titanium"], cave: ["Fluorescent Spinel", "Azureite Shard"], amounts: [650, 400, 120, 40] },
            { level: 25, surface: ["Osmium", "Amethyst"], cave: ["Paleite Fragment", "Stellar Corundum"], amounts: [700, 450, 130, 45] },
            { level: 26, surface: ["Diamond", "Emerald"], cave: ["Prismatic Calcite", "Indigo Zircon"], amounts: [750, 200, 150, 25] },
            { level: 27, surface: ["Painite", "Alexandrite"], cave: ["Veridian Garnet", "Rose Beryl"], amounts: [800, 250, 160, 20] },
            { level: 28, surface: ["Taaffeite", "Alexandrite"], cave: ["Fluorescent Spinel", "Indigo Zircon"], amounts: [850, 300, 180, 30] },
            { level: 29, surface: ["Mythril", "Neutronium"], cave: ["Void-Infused Slate", "Shadow Graphite"], amounts: [900, 500, 150, 45] },
            { level: 30, surface: ["Luminite", "Adamantium"], cave: ["Ethereal Pyrite", "Abyssal Geode"], amounts: [950, 550, 160, 50] },
            { level: 31, surface: ["Antimatter", "Orichalcum"], cave: ["Dimensional Nickel", "Noxious Cobalt"], amounts: [1000, 600, 180, 60] },
            { level: 32, surface: ["Voidstone", "Dragonite"], cave: ["Shadow Graphite", "Phasing Chromium"], amounts: [1050, 650, 200, 20] },
            { level: 33, surface: ["Vibranium", "Zenith Shard"], cave: ["Abyssal Geode", "Glinting Obsidian"], amounts: [1100, 700, 220, 15] },
            { level: 34, surface: ["Solarium", "Phoenix Tear"], cave: ["Solarite Ore", "Radiant Tungsten"], amounts: [1120, 750, 130, 35] },
            { level: 35, surface: ["Leviathan Scale", "Darkmatter"], cave: ["Lunar Silver", "Nebula Palladium"], amounts: [1140, 800, 150, 45] },
            { level: 36, surface: ["Omnium", "Galactium"], cave: ["Aetheric Brass", "Star-Forged Titanium"], amounts: [1160, 850, 160, 55] },
            { level: 37, surface: ["Philosopher Stone", "Celestium"], cave: ["Nebula Palladium", "Astral Platinum"], amounts: [1180, 900, 170, 12] },
            { level: 38, surface: ["Cosmic String", "Chronium"], cave: ["Star-Forged Titanium", "Celestial Mercury"], amounts: [1200, 950, 180, 8] },
            { level: 39, surface: ["Singularity Dust", "God Particle"], cave: ["Zenithite Alloy", "Singularity Dust"], amounts: [1220, 980, 90, 15] },
            { level: 40, surface: ["Infinity Core", "God Particle"], cave: ["God-Metal Essence", "Temporal Adamantium"], amounts: [1250, 1000, 10, 30] }
        ];

        pickaxeMaps.forEach(map => {
            const pLevel = config.pickaxeLevels.find(p => p.level === map.level);
            if (pLevel) {
                pLevel.requiredItems = [
                    { name: map.surface[0], amount: map.amounts[0] },
                    { name: map.surface[1], amount: map.amounts[1] },
                    { name: map.cave[0], amount: map.amounts[2] },
                    { name: map.cave[1], amount: map.amounts[3] }
                ];
            }
        });

        await config.save();
        console.log('Migration successful: 40 materials added, 5 caves updated, pickaxe recipes level 19-40 revised.');
        process.exit(0);
    } catch (err) {
        console.error('Migration error:', err);
        process.exit(1);
    }
}

migrate();
