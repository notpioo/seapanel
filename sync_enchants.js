const mongoose = require('mongoose');
const dbConfig = require('./config/database.config');
const MiningConfig = require('./src/models/MiningConfig');

async function syncEnchants() {
    try {
        await mongoose.connect(dbConfig.mongoUri, dbConfig.options);
        console.log('Connected to DB');

        const config = await MiningConfig.findOne({ configId: 'main' });
        if (!config) {
            console.log('No config found, it will be created on next load.');
            process.exit(0);
        }

        const newEnchants = [
            // --- SINGLE EFFECTS (35 Base Abilities) ---
            // 1. Sell Price Bonus: "Wealth" (💰)
            { id: 'wealth_1', name: 'Wealth I', emoji: '💰', rarity: 'common', dropWeight: 500, effects: { sellPriceBonus: 5 } },
            { id: 'wealth_2', name: 'Wealth II', emoji: '💰', rarity: 'uncommon', dropWeight: 200, effects: { sellPriceBonus: 10 } },
            { id: 'wealth_3', name: 'Wealth III', emoji: '💰', rarity: 'rare', dropWeight: 80, effects: { sellPriceBonus: 20 } },
            { id: 'wealth_4', name: 'Wealth IV', emoji: '💰', rarity: 'epic', dropWeight: 25, effects: { sellPriceBonus: 40 } },
            { id: 'wealth_5', name: 'Wealth V', emoji: '💰', rarity: 'legendary', dropWeight: 1, effects: { sellPriceBonus: 80 } },

            // 2. XP Gain Bonus: "Wisdom" (✨)
            { id: 'wisdom_1', name: 'Wisdom I', emoji: '✨', rarity: 'common', dropWeight: 500, effects: { xpGainBonus: 5 } },
            { id: 'wisdom_2', name: 'Wisdom II', emoji: '✨', rarity: 'uncommon', dropWeight: 200, effects: { xpGainBonus: 10 } },
            { id: 'wisdom_3', name: 'Wisdom III', emoji: '✨', rarity: 'rare', dropWeight: 80, effects: { xpGainBonus: 20 } },
            { id: 'wisdom_4', name: 'Wisdom IV', emoji: '✨', rarity: 'epic', dropWeight: 25, effects: { xpGainBonus: 40 } },
            { id: 'wisdom_5', name: 'Wisdom V', emoji: '✨', rarity: 'legendary', dropWeight: 1, effects: { xpGainBonus: 80 } },

            // 3. Extra Drop: "Abundance" (📦)
            { id: 'abundance_1', name: 'Abundance I', emoji: '📦', rarity: 'common', dropWeight: 500, effects: { extraDrop: 1 } },
            { id: 'abundance_2', name: 'Abundance II', emoji: '📦', rarity: 'uncommon', dropWeight: 200, effects: { extraDrop: 2 } },
            { id: 'abundance_3', name: 'Abundance III', emoji: '📦', rarity: 'rare', dropWeight: 80, effects: { extraDrop: 3 } },
            { id: 'abundance_4', name: 'Abundance IV', emoji: '📦', rarity: 'epic', dropWeight: 25, effects: { extraDrop: 4 } },
            { id: 'abundance_5', name: 'Abundance V', emoji: '📦', rarity: 'legendary', dropWeight: 1, effects: { extraDrop: 5 } },

            // 4. Rare Drop Chance: "Fortune" (🍀)
            { id: 'fortune_1', name: 'Fortune I', emoji: '🍀', rarity: 'common', dropWeight: 500, effects: { rareDropChance: 3 } },
            { id: 'fortune_2', name: 'Fortune II', emoji: '🍀', rarity: 'uncommon', dropWeight: 200, effects: { rareDropChance: 5 } },
            { id: 'fortune_3', name: 'Fortune III', emoji: '🍀', rarity: 'rare', dropWeight: 80, effects: { rareDropChance: 10 } },
            { id: 'fortune_4', name: 'Fortune IV', emoji: '🍀', rarity: 'epic', dropWeight: 25, effects: { rareDropChance: 15 } },
            { id: 'fortune_5', name: 'Fortune V', emoji: '🍀', rarity: 'legendary', dropWeight: 1, effects: { rareDropChance: 25 } },

            // 5. Gem Chance: "Shimmering" (💎)
            { id: 'shimmering_1', name: 'Shimmering I', emoji: '💎', rarity: 'common', dropWeight: 500, effects: { gemChance: 2 } },
            { id: 'shimmering_2', name: 'Shimmering II', emoji: '💎', rarity: 'uncommon', dropWeight: 200, effects: { gemChance: 4 } },
            { id: 'shimmering_3', name: 'Shimmering III', emoji: '💎', rarity: 'rare', dropWeight: 80, effects: { gemChance: 7 } },
            { id: 'shimmering_4', name: 'Shimmering IV', emoji: '💎', rarity: 'epic', dropWeight: 25, effects: { gemChance: 12 } },
            { id: 'shimmering_5', name: 'Shimmering V', emoji: '💎', rarity: 'legendary', dropWeight: 1, effects: { gemChance: 20 } },

            // 6. E-Stone Chance: "Mystic" (🔮)
            { id: 'mystic_1', name: 'Mystic I', emoji: '🔮', rarity: 'common', dropWeight: 500, effects: { enchantStoneChance: 1 } },
            { id: 'mystic_2', name: 'Mystic II', emoji: '🔮', rarity: 'uncommon', dropWeight: 200, effects: { enchantStoneChance: 2 } },
            { id: 'mystic_3', name: 'Mystic III', emoji: '🔮', rarity: 'rare', dropWeight: 80, effects: { enchantStoneChance: 4 } },
            { id: 'mystic_4', name: 'Mystic IV', emoji: '🔮', rarity: 'epic', dropWeight: 25, effects: { enchantStoneChance: 7 } },
            { id: 'mystic_5', name: 'Mystic V', emoji: '🔮', rarity: 'legendary', dropWeight: 1, effects: { enchantStoneChance: 12 } },

            // 7. Double Drop: "Duplication" (⚔️)
            { id: 'duplication_1', name: 'Duplication I', emoji: '⚔️', rarity: 'common', dropWeight: 500, effects: { doubleDrop: 5 } },
            { id: 'duplication_2', name: 'Duplication II', emoji: '⚔️', rarity: 'uncommon', dropWeight: 200, effects: { doubleDrop: 10 } },
            { id: 'duplication_3', name: 'Duplication III', emoji: '⚔️', rarity: 'rare', dropWeight: 80, effects: { doubleDrop: 15 } },
            { id: 'duplication_4', name: 'Duplication IV', emoji: '⚔️', rarity: 'epic', dropWeight: 25, effects: { doubleDrop: 25 } },
            { id: 'duplication_5', name: 'Duplication V', emoji: '⚔️', rarity: 'legendary', dropWeight: 1, effects: { doubleDrop: 40 } },

            // --- 10 NEW SINGLE EFFECTS ---
            { id: 'pack_rat', name: 'Pack Rat', emoji: '🎒', rarity: 'common', dropWeight: 500, effects: { extraDrop: 1 } },
            { id: 'foresight', name: 'Foresight', emoji: '👁️', rarity: 'common', dropWeight: 500, effects: { gemChance: 3 } },

            { id: 'hoarder', name: 'Hoarder', emoji: '📥', rarity: 'uncommon', dropWeight: 200, effects: { extraDrop: 2 } },
            { id: 'echo', name: 'Echo', emoji: '🔊', rarity: 'uncommon', dropWeight: 200, effects: { doubleDrop: 10 } },

            { id: 'scholar', name: 'Scholar', emoji: '📖', rarity: 'rare', dropWeight: 80, effects: { xpGainBonus: 25 } },
            { id: 'sixth_sense', name: 'Sixth Sense', emoji: '🧠', rarity: 'rare', dropWeight: 80, effects: { enchantStoneChance: 5 } },

            { id: 'greed', name: 'Greed', emoji: '🤤', rarity: 'epic', dropWeight: 25, effects: { sellPriceBonus: 50 } },
            { id: 'miracle', name: 'Miracle', emoji: '👼', rarity: 'epic', dropWeight: 25, effects: { rareDropChance: 20 } },

            { id: 'avarice', name: 'Avarice', emoji: '🐲', rarity: 'legendary', dropWeight: 1, effects: { sellPriceBonus: 100 } },
            { id: 'enlightenment', name: 'Enlightenment', emoji: '🧘', rarity: 'legendary', dropWeight: 1, effects: { xpGainBonus: 100 } },


            // --- MULTI EFFECTS (17 Abilities) ---
            // 10 abilities dengan 2 efek (Maks 2)
            { id: 'dual_strike_1', name: 'Dual Strike I', emoji: '⚔️', rarity: 'uncommon', dropWeight: 200, effects: { extraDrop: 1, xpGainBonus: 5 } },
            { id: 'dual_strike_2', name: 'Dual Strike II', emoji: '⚔️', rarity: 'rare', dropWeight: 80, effects: { extraDrop: 2, xpGainBonus: 10 } },
            { id: 'dual_strike_3', name: 'Dual Strike III', emoji: '⚔️', rarity: 'epic', dropWeight: 25, effects: { extraDrop: 3, xpGainBonus: 20 } },

            { id: 'treasure_hunter_1', name: 'Treasure Hunter I', emoji: '👑', rarity: 'uncommon', dropWeight: 200, effects: { gemChance: 5, enchantStoneChance: 3 } },
            { id: 'treasure_hunter_2', name: 'Treasure Hunter II', emoji: '👑', rarity: 'rare', dropWeight: 80, effects: { gemChance: 10, enchantStoneChance: 5 } },
            { id: 'treasure_hunter_3', name: 'Treasure Hunter III', emoji: '👑', rarity: 'epic', dropWeight: 25, effects: { gemChance: 15, enchantStoneChance: 8 } },

            { id: 'midas_touch_1', name: 'Midas Touch I', emoji: '🪙', rarity: 'uncommon', dropWeight: 200, effects: { sellPriceBonus: 15, doubleDrop: 5 } },
            { id: 'midas_touch_2', name: 'Midas Touch II', emoji: '🪙', rarity: 'rare', dropWeight: 80, effects: { sellPriceBonus: 30, doubleDrop: 10 } },
            { id: 'midas_touch_3', name: 'Midas Touch III', emoji: '🪙', rarity: 'epic', dropWeight: 25, effects: { sellPriceBonus: 50, doubleDrop: 15 } },
            { id: 'midas_touch_4', name: 'Midas Touch IV', emoji: '🪙', rarity: 'legendary', dropWeight: 1, effects: { sellPriceBonus: 80, doubleDrop: 25 } },

            // 4 abilities dengan 3 efek (Maks 3)
            { id: 'miners_dream_1', name: 'Miner\'s Dream I', emoji: '⛏️', rarity: 'rare', dropWeight: 80, effects: { sellPriceBonus: 10, xpGainBonus: 10, rareDropChance: 5 } },
            { id: 'miners_dream_2', name: 'Miner\'s Dream II', emoji: '⛏️', rarity: 'epic', dropWeight: 25, effects: { sellPriceBonus: 25, xpGainBonus: 25, rareDropChance: 10 } },
            { id: 'miners_dream_3', name: 'Miner\'s Dream III', emoji: '⛏️', rarity: 'legendary', dropWeight: 1, effects: { sellPriceBonus: 50, xpGainBonus: 50, rareDropChance: 20 } },
            { id: 'star_collector', name: 'Star Collector', emoji: '🌟', rarity: 'legendary', dropWeight: 1, effects: { gemChance: 20, enchantStoneChance: 15, extraDrop: 3 } },

            // 3 abilities dengan 4 efek (Maks 4)
            { id: 'god_of_mining', name: 'God of Mining', emoji: '💥', rarity: 'legendary', dropWeight: 1, effects: { extraDrop: 3, doubleDrop: 20, gemChance: 10, rareDropChance: 15 } },
            { id: 'eldritch_power', name: 'Eldritch Power', emoji: '🌌', rarity: 'legendary', dropWeight: 1, effects: { enchantStoneChance: 20, xpGainBonus: 50, rareDropChance: 20, sellPriceBonus: 30 } },
            { id: 'ancient_relic', name: 'Ancient Relic', emoji: '🏺', rarity: 'legendary', dropWeight: 1, effects: { extraDrop: 5, xpGainBonus: 100, sellPriceBonus: 100, gemChance: 25 } }
        ];

        config.enchantAbilities = newEnchants;
        await config.save();
        console.log('Successfully updated 62 enchant abilities in database!');
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
syncEnchants();
