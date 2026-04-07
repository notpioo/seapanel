
const { RPGPlayer, RPGHero } = require('../../../models');

const fmt = (n) => new Intl.NumberFormat('en-US').format(n);

module.exports = {
    name: 'heroes',
    description: 'Lihat koleksi hero RPG kamu',
    category: 'games',
    usage: '.heroes',
    aliases: ['collection', 'myheroes'],

    execute: async ({ reply, sender, message }) => {
        try {
            const player = await RPGPlayer.findOne({ phoneNumber: sender });
            if (!player || player.heroes.length === 0) {
                return reply('Kamu belum punya hero. Ketik *.rpg* untuk mulai atau *.gacha* untuk mencari hero.');
            }

            const heroesMap = await RPGHero.getHeroesMap();

            // Group heroes by rarity
            const groups = {
                UR: [],
                SSR: [],
                SR: [],
                R: [],
                C: []
            };

            let totalHp = 0;
            let totalAtk = 0;

            // Sort logic: UR > SSR > SR > R > C
            // Dalam setiap rarity, sort by Name

            for (const heroId of player.heroes) {
                const h = heroesMap[heroId];
                if (h) {
                    if (groups[h.rarity]) {
                        groups[h.rarity].push(h);
                    } else {
                        // Fallback for unknown rarity
                        if (!groups['C']) groups['C'] = [];
                        groups['C'].push(h);
                    }
                    totalHp += h.hp;
                    totalAtk += h.atk;
                }
            }

            // Headers & Stickers
            const headers = {
                UR: '👑 *UR (Ultra Rare)*',
                SSR: '🟡 *SSR (Legendary)*',
                SR: '🟣 *SR (Super Rare)*',
                R: '🔵 *R (Rare)*',
                C: '⚪ *C (Common)*'
            };

            let txt = `🏰 *KOLEKSI HERO* (Total: ${player.heroes.length})\n`;
            txt += `Stats Bonus: ❤️+${fmt(totalHp)}  ⚔️+${fmt(totalAtk)}\n`;
            txt += `──────────────────\n`;

            const rarities = ['UR', 'SSR', 'SR', 'R', 'C'];
            let hasContent = false;

            for (const r of rarities) {
                const list = groups[r];
                if (list && list.length > 0) {
                    hasContent = true;
                    // Sort by Name A-Z
                    list.sort((a, b) => a.name.localeCompare(b.name));

                    txt += `\n${headers[r]}\n`;
                    for (const h of list) {
                        txt += `• *${h.name}* (❤️${fmt(h.hp)} ⚔️${fmt(h.atk)})\n`;
                    }
                }
            }

            if (!hasContent) {
                txt += '\n(Tidak ada data hero valid)';
            }

            txt += `\n──────────────────\n`;
            txt += `Ketik *.gacha* untuk summon hero baru!`;

            return reply(txt);

        } catch (error) {
            console.error('HEROES Error:', error);
            return reply('Terjadi kesalahan saat memuat koleksi hero.');
        }
    }
};
