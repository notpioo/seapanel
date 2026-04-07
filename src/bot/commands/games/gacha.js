const { RPGPlayer, RPGHero, RPGConfig } = require('../../../models');

module.exports = {
    name: 'gacha',
    description: 'Summon hero baru',
    category: 'games',
    usage: '.gacha',
    aliases: ['summon'],

    execute: async ({ reply, sender }) => {
        try {
            const player = await RPGPlayer.findOne({ phoneNumber: sender });
            if (!player) return reply('Kamu belum punya akun RPG!\nKetik *.rpg* untuk mendaftar.');

            const config = await RPGConfig.getConfig();
            const cost = config.gachaPrice;

            if (player.gold < cost) {
                return reply(`Gold tidak cukup! Butuh ${cost} Gold.\nKamu punya: ${player.gold} Gold.\nKetik *.battle* untuk farming.`);
            }

            // RNG Rarity (UR -> SSR -> SR -> R -> C)
            const rates = config.gachaRates;
            const rand = Math.random() * 100;
            let rarity = 'C';
            let cumulative = 0;

            const rarityOrder = ['UR', 'SSR', 'SR', 'R']; // C is fallback

            for (const r of rarityOrder) {
                cumulative += (rates[r] || 0);
                if (rand < cumulative) {
                    rarity = r;
                    break;
                }
            }

            // Ambil pool hero dari DB
            const pool = await RPGHero.getByRarity(rarity);
            if (!pool || pool.length === 0) {
                // Fallback ke rarity yg ada
                const allHeroes = await RPGHero.find().lean();
                if (allHeroes.length === 0) {
                    return reply('Gacha belum tersedia. Admin belum menambahkan hero.');
                }
                // Pick random dari semua hero
                const gotHero = allHeroes[Math.floor(Math.random() * allHeroes.length)];
                player.gold -= cost;
                player.heroes.push(gotHero.heroId);
                await player.save();

                const heroesMap = await RPGHero.getHeroesMap();
                const newStats = player.calcStats(heroesMap, config);

                return reply(`*SUMMON RESULT*\n\n[${gotHero.rarity}] *${gotHero.name}*\n${gotHero.desc}\n\nBonus: HP +${gotHero.hp} | ATK +${gotHero.atk}\nCP sekarang: *${newStats.cp}*\n\n_Sisa Gold: ${player.gold}_`);
            }

            player.gold -= cost;
            const gotHero = pool[Math.floor(Math.random() * pool.length)];
            player.heroes.push(gotHero.heroId);
            await player.save();

            const heroesMap = await RPGHero.getHeroesMap();
            const newStats = player.calcStats(heroesMap, config);

            let txt = `*SUMMON RESULT*\n\n`;
            txt += `[${rarity}] *${gotHero.name}*\n`;
            txt += `${gotHero.desc}\n\n`;
            txt += `Bonus: HP +${gotHero.hp} | ATK +${gotHero.atk}\n`;
            txt += `CP sekarang: *${newStats.cp}*\n\n`;
            txt += `_Sisa Gold: ${player.gold}_`;

            return reply(txt);
        } catch (error) {
            console.error('Gacha error:', error);
            return reply('Terjadi error. Coba lagi nanti.');
        }
    }
};
