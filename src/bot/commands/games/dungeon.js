const { RPGPlayer, RPGHero, RPGConfig, RPGDungeon, RPGItem } = require('../../../models');

module.exports = {
    name: 'dungeon',
    description: 'Lihat info dungeon dan floor kamu saat ini',
    category: 'games',
    usage: '.dungeon',
    aliases: ['dg'],

    execute: async ({ reply, sender }) => {
        try {
            const player = await RPGPlayer.findOne({ phoneNumber: sender });
            if (!player) return reply('Kamu belum punya akun RPG!\nKetik *.rpg* untuk mendaftar.');

            const dungeon = await RPGDungeon.findOne({ isActive: true });
            if (!dungeon) return reply('Belum ada dungeon yang aktif saat ini.');

            if (player.level < dungeon.minLevel) {
                return reply(
                    `🗼 *${dungeon.name}*\n\n` +
                    `⚠️ Butuh minimal *Level ${dungeon.minLevel}* untuk masuk!\n` +
                    `Level kamu: *${player.level}*\n\n` +
                    `Lanjutkan story mode dulu ya!`
                );
            }

            const floor  = player.dungeonFloor;
            const stats  = dungeon.getFloorStats(floor);
            const isBoss = stats.isBoss;

            const config    = await RPGConfig.getConfig();
            const heroesMap = await RPGHero.getHeroesMap();
            const items     = await RPGItem.find();
            const itemsMap  = {};
            items.forEach(i => itemsMap[i.itemId] = i);
            const userStats = player.calcStats(heroesMap, config, itemsMap);

            const floorsToNextBoss = isBoss ? 5 : (5 - (floor % 5));

            let txt = `🗼 *${dungeon.name}*\n`;
            txt += `━━━━━━━━━━━━━━━━━━\n`;
            txt += `${dungeon.description}\n\n`;

            txt += `👤 *Status Kamu:*\n`;
            txt += `Level ${player.level} | CP: ${userStats.cp} | HP: ${userStats.hp} | ATK: ${userStats.atk}\n\n`;

            txt += `🏆 *Floor: ${floor}*`;
            if (!isBoss) txt += ` (Boss ${floorsToNextBoss} floor lagi)`;
            txt += `\n\n`;

            if (isBoss) {
                txt += `⚔️ *BOSS FLOOR!*\n`;
                txt += `👹 ${stats.enemyName}\n`;
            } else {
                txt += `👹 Musuh: ${stats.enemyName}\n`;
            }

            txt += `📊 HP: ${stats.hp} | ATK: ${stats.atk}\n\n`;

            txt += `🎁 *Reward:*\n`;
            txt += `+${stats.exp} EXP | +${stats.gold} Gold\n`;
            if (stats.drop) {
                const drops = stats.drop.split(',').map(d => d.split(':')[0]);
                txt += `Drop: ${drops.join(', ')}\n`;
            }

            txt += `\nKetik *.masuk* untuk bertarung!`;
            return reply(txt);

        } catch (error) {
            console.error('Dungeon error:', error);
            return reply('Terjadi error. Coba lagi nanti.');
        }
    }
};
