const { RPGPlayer, RPGHero, RPGConfig } = require('../../../models');

module.exports = {
    name: 'gacha',
    description: 'Summon hero baru (butuh 1 Scroll)',
    category: 'games',
    usage: '.gacha',
    aliases: ['summon'],

    execute: async ({ reply, sender }) => {
        try {
            const player = await RPGPlayer.findOne({ phoneNumber: sender });
            if (!player) return reply('Kamu belum punya akun RPG!\nKetik *.rpg* untuk mendaftar.');

            if ((player.scrolls || 0) < 1) {
                return reply(
                    `📜 *Scroll tidak cukup!*\n\n` +
                    `Kamu punya: *${player.scrolls || 0} Scroll*\n\n` +
                    `Cara dapat Scroll:\n` +
                    `• *.daily* — 1 Scroll/hari\n` +
                    `• Menang battle — 8% chance\n` +
                    `• Clear boss stage — +2 Scroll\n` +
                    `• Boss dungeon (floor 5,10,...) — +1 Scroll`
                );
            }

            const config = await RPGConfig.getConfig();

            // RNG Rarity (UR -> SSR -> SR -> R -> C)
            const rates = config.gachaRates;
            const rand = Math.random() * 100;
            let rarity = 'C';
            let cumulative = 0;

            const rarityOrder = ['UR', 'SSR', 'SR', 'R'];

            for (const r of rarityOrder) {
                cumulative += (rates[r] || 0);
                if (rand < cumulative) {
                    rarity = r;
                    break;
                }
            }

            const pool = await RPGHero.getByRarity(rarity);
            let gotHero;

            if (!pool || pool.length === 0) {
                const allHeroes = await RPGHero.find().lean();
                if (allHeroes.length === 0) return reply('Gacha belum tersedia.');
                gotHero = allHeroes[Math.floor(Math.random() * allHeroes.length)];
            } else {
                gotHero = pool[Math.floor(Math.random() * pool.length)];
            }

            player.scrolls = (player.scrolls || 0) - 1;
            player.heroes.push(gotHero.heroId);
            await player.save();

            const heroesMap = await RPGHero.getHeroesMap();
            const newStats = player.calcStats(heroesMap, config);

            let txt = `*✨ SUMMON RESULT*\n\n`;
            txt += `[${rarity}] *${gotHero.name}*\n`;
            txt += `${gotHero.desc}\n\n`;
            txt += `Bonus: HP +${gotHero.hp} | ATK +${gotHero.atk}\n`;
            txt += `CP sekarang: *${newStats.cp}*\n\n`;
            txt += `_Sisa Scroll: ${player.scrolls}_`;

            return reply(txt);
        } catch (error) {
            console.error('Gacha error:', error);
            return reply('Terjadi error. Coba lagi nanti.');
        }
    }
};
