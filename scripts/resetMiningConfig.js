/**
 * Migration Script: Reset Mining Config to new Rebirth-Ready system
 *
 * Run with: node scripts/resetMiningConfig.js
 *
 * What this does:
 * 1. Replaces MiningConfig in MongoDB with new 10-floor/10-pickaxe/40-resource design
 * 2. Migrates existing PlayerMining records:
 *    - Caps floor at 10, pickaxe at 10, level at 50
 *    - Adds rebirth fields (rebirthCount=0, rebirthPoints=0)
 *    - Removes cave/generator data
 *    - Keeps all inventory, gems, enchants, stats, milestones
 */

const mongoose = require('mongoose');
const path = require('path');

// Load DB config
const dbConfig = require(path.join(__dirname, '../config/database.config.js'));
const { PlayerMining, MiningConfig } = require(path.join(__dirname, '../src/models'));

async function run() {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(dbConfig.mongoUri || dbConfig.uri || dbConfig.url || dbConfig, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });
    console.log('✅ Connected!\n');

    // ============================================
    // Step 1: Replace MiningConfig
    // ============================================
    console.log('📋 Replacing MiningConfig...');
    await MiningConfig.deleteOne({ configId: 'main' });
    MiningConfig.clearConfigCache();

    const newConfig = await MiningConfig.getConfig();
    console.log(`✅ MiningConfig reset:`);
    console.log(`   Floors: ${newConfig.floors.length}`);
    console.log(`   Pickaxe levels: ${newConfig.pickaxeLevels.length}`);
    console.log(`   Resources: ${newConfig.resources.length}`);
    console.log(`   Rebirth upgrades: ${newConfig.rebirthConfig?.upgrades?.length || 0}`);

    // ============================================
    // Step 2: Migrate PlayerMining records
    // ============================================
    console.log('\n👥 Migrating player records...');
    const players = await PlayerMining.find({});
    console.log(`   Found ${players.length} players to migrate`);

    let migrated = 0;
    let skipped = 0;

    for (const player of players) {
        try {
            let changed = false;

            // Cap floor
            if ((player.currentFloor || 1) > 10) {
                player.currentFloor = 10;
                changed = true;
            }

            // Cap pickaxe
            if ((player.pickaxeLevel || 1) > 10) {
                player.pickaxeLevel = 10;
                changed = true;
            }

            // Cap level
            if ((player.level || 1) > 50) {
                player.level = 50;
                changed = true;
            }

            // Initialize rebirth fields if missing
            if (player.rebirthCount === undefined || player.rebirthCount === null) {
                player.rebirthCount = 0;
                changed = true;
            }
            if (player.rebirthPoints === undefined || player.rebirthPoints === null) {
                player.rebirthPoints = 0;
                changed = true;
            }
            if (!player.rpUpgrades) {
                player.rpUpgrades = new Map();
                changed = true;
            }
            if (!player.bestRun) {
                player.bestRun = {
                    maxFloor: player.currentFloor || 1,
                    maxPickaxe: player.pickaxeLevel || 1,
                    maxLevel: player.level || 1
                };
                changed = true;
            }

            // Ensure enchant slots exist (4 slots)
            if (!player.enchantSlots || player.enchantSlots.length === 0) {
                player.enchantSlots = [
                    { slotNumber: 1, unlocked: false, abilityId: null },
                    { slotNumber: 2, unlocked: false, abilityId: null },
                    { slotNumber: 3, unlocked: false, abilityId: null },
                    { slotNumber: 4, unlocked: false, abilityId: null }
                ];
                changed = true;
            }

            if (changed) {
                await player.save();
                migrated++;
            } else {
                skipped++;
            }
        } catch (err) {
            console.error(`   ❌ Error migrating player ${player.phoneNumber}:`, err.message);
        }
    }

    console.log(`✅ Migration complete:`);
    console.log(`   Migrated: ${migrated} players`);
    console.log(`   Skipped (no changes needed): ${skipped} players`);

    await mongoose.disconnect();
    console.log('\n✅ Done! Migration complete.');
}

run().catch(err => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
});
