const { RPGPlayer, RPGHero, RPGConfig, RPGChapter, RPGItem } = require('../../../models');

const fmt = (n) => new Intl.NumberFormat('en-US').format(n);

module.exports = {
    name: 'rpg',
    description: 'Lihat profil RPG kamu',
    category: 'games',
    usage: '.rpg',

    execute: async ({ reply, sender, message }) => {
        try {
            const config = await RPGConfig.getConfig();
            const heroesMap = await RPGHero.getHeroesMap();

            // Fetch Items for Stats Calculation
            const items = await RPGItem.find();
            const itemsMap = {};
            items.forEach(i => itemsMap[i.itemId] = i);

            let player = await RPGPlayer.findOne({ phoneNumber: sender });

            if (!player) {
                // Cek apakah ada hero untuk starter
                const starterHeroes = Object.keys(heroesMap);
                if (starterHeroes.length === 0) {
                    return reply('RPG belum tersedia. Admin belum menambahkan data hero.');
                }

                // Ambil hero C pertama sebagai starter, atau hero pertama yang ada
                const cHeroes = starterHeroes.filter(id => heroesMap[id].rarity === 'C');
                const starterId = cHeroes.length > 0 ? cHeroes[0] : starterHeroes[0];
                const starterHero = heroesMap[starterId];

                player = new RPGPlayer({ phoneNumber: sender });
                player.heroes.push(starterId);
                await player.save();
                return reply(`*Selamat Datang di Sanka Chronicles!*\n\nKamu memulai petualangan dengan *${starterHero.name}*!\nKetik *.battle* untuk mulai!\n\n*Commands:*\n.rpg - Profil & Stats\n.battle - Lawan monster\n.gacha - Summon hero (1 Scroll)\n.daily - Klaim Scroll harian\n.heroes - Koleksi hero`);
            }

            const stats = player.calcStats(heroesMap, config, itemsMap);
            const nextExp = player.level * 100;
            const chapter = await RPGChapter.getChapter(player.currentChapter);
            const chapterName = chapter ? chapter.name : 'Unknown';

            let txt = `╔═══════════════════╗\n`;
            txt += `║ *${message.pushName || 'Player'}* (Lv. ${player.level})\n`;
            txt += `╠═══════════════════╣\n`;
            txt += `║ CP    : *${fmt(stats.cp)}*\n`;

            const itemHpText = stats.bonus.itemHp > 0 ? ` (+${stats.bonus.itemHp}🛡️)` : '';
            const itemAtkText = stats.bonus.itemAtk > 0 ? ` (+${stats.bonus.itemAtk}⚔️)` : '';

            txt += `║ HP    : ${fmt(stats.hp)}${itemHpText}\n`;
            txt += `║ ATK   : ${fmt(stats.atk)}${itemAtkText}\n`;
            txt += `╠═══════════════════╣\n`;
            txt += `║ Gold  : ${fmt(player.gold)}\n`;
            txt += `║ Scroll: ${player.scrolls || 0} 📜\n`;
            txt += `║ EXP   : ${player.exp} / ${nextExp}\n`;
            txt += `║ Stage : ${player.currentChapter}-${player.currentStage}\n`;
            txt += `║ Chapter: ${chapterName}\n`;
            const urCount = player.heroes.filter(id => heroesMap[id]?.rarity === 'UR').length;
            const urBadge = urCount > 0 ? ` (${urCount} 👑)` : '';
            txt += `║ Heroes: ${player.heroes.length}${urBadge}\n`;
            txt += `╚═══════════════════╝\n\n`;
            txt += `*.battle* - Lawan monster\n`;
            txt += `*.daily* - Klaim Scroll harian\n`;
            txt += `*.gacha* - Summon hero (1 Scroll)\n`;
            txt += `*.rbag* - Inventory\n`;
            txt += `*.recipe* - Crafting`;

            return reply(txt);
        } catch (error) {
            console.error('RPG error:', error);
            return reply('Terjadi error. Coba lagi nanti.');
        }
    }
};
