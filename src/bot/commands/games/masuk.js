const { RPGPlayer, RPGHero, RPGConfig, RPGDungeon, RPGItem } = require('../../../models');

module.exports = {
    name: 'masuk',
    description: 'Bertarung di floor dungeon saat ini',
    category: 'games',
    usage: '.masuk',
    aliases: [],

    execute: async ({ reply, sender }) => {
        try {
            const player = await RPGPlayer.findOne({ phoneNumber: sender });
            if (!player) return reply('Kamu belum punya akun RPG!\nKetik *.rpg* untuk mendaftar.');

            const dungeon = await RPGDungeon.findOne({ isActive: true });
            if (!dungeon) return reply('Belum ada dungeon yang aktif saat ini.');

            if (player.level < dungeon.minLevel) {
                return reply(`⚠️ Butuh Level ${dungeon.minLevel} untuk masuk dungeon!\nLevel kamu: ${player.level}`);
            }

            const floor    = player.dungeonFloor;
            const floorStats = dungeon.getFloorStats(floor);

            // Load player stats
            const config    = await RPGConfig.getConfig();
            const heroesMap = await RPGHero.getHeroesMap();
            const items     = await RPGItem.find();
            const itemsMap  = {};
            items.forEach(i => itemsMap[i.itemId] = i);
            const userStats = player.calcStats(heroesMap, config, itemsMap);

            // Battle simulation (same logic as battle.js)
            let myHp  = userStats.hp;
            let enHp  = floorStats.hp;
            const enemyAtk = floorStats.atk;
            let turn  = 1;
            let win   = false;

            while (turn <= 20) {
                const myDmg = Math.floor(userStats.atk * (0.9 + Math.random() * 0.2));
                enHp -= myDmg;
                if (enHp <= 0) { win = true; break; }

                myHp -= Math.floor(enemyAtk * (0.9 + Math.random() * 0.2));
                if (myHp <= 0) { win = false; break; }
                turn++;
            }

            const header = floorStats.isBoss
                ? `🗼 *${dungeon.name} — Floor ${floor}*\n⚔️ *BOSS BATTLE!*\n👹 ${floorStats.enemyName}\n\n`
                : `🗼 *${dungeon.name} — Floor ${floor}*\n👹 ${floorStats.enemyName}\n\n`;

            if (win) {
                player.gold += floorStats.gold;
                const levelUp = player.addExp(floorStats.exp);

                let txt = header;
                txt += `*MENANG!* 🎉\n`;
                txt += `${floorStats.enemyName} dikalahkan! Sisa HP: ${Math.max(0, myHp)}\n\n`;
                txt += `+${floorStats.gold} Gold | +${floorStats.exp} EXP\n`;
                if (levelUp) txt += `*LEVEL UP!* Sekarang Level ${player.level}! 🆙\n`;

                // Handle drops
                if (floorStats.drop) {
                    const drops = floorStats.drop.split(',');
                    const received = [];
                    for (const dropStr of drops) {
                        const [itemId, rateStr] = dropStr.trim().split(':');
                        const rate = parseInt(rateStr) || 100;
                        if (Math.random() * 100 < rate) {
                            player.inventory.set(itemId, (player.inventory.get(itemId) || 0) + 1);
                            received.push(itemId);
                        }
                    }
                    if (received.length > 0) txt += `\n🎁 *DROP:* ${received.join(', ')}\n`;
                }

                // Scroll reward on boss floors (every 5th floor)
                if (floorStats.isBoss) {
                    player.scrolls = (player.scrolls || 0) + 1;
                    txt += `📜 *+1 Scroll* dari boss dungeon!\n`;
                }

                // Advance floor
                player.dungeonFloor = floor + 1;
                await player.save();

                const nextFloor = dungeon.getFloorStats(floor + 1);
                txt += `\n⬆️ *Naik ke Floor ${floor + 1}!*\n`;
                if (nextFloor.isBoss) {
                    txt += `⚠️ *Floor berikutnya adalah BOSS!*\n`;
                    txt += `${nextFloor.enemyName} | HP: ${nextFloor.hp} | ATK: ${nextFloor.atk}`;
                } else {
                    txt += `Musuh: ${nextFloor.enemyName} | HP: ${nextFloor.hp} | ATK: ${nextFloor.atk}`;
                }
                txt += `\nKetik *.masuk* untuk lanjut!`;
                return reply(txt);

            } else {
                let txt = header;
                txt += `*KALAH...* 💀\n\n`;
                txt += `${floorStats.enemyName} terlalu kuat di turn ${turn}.\n`;
                txt += `CP kamu: ${userStats.cp}\n\n`;
                txt += `💡 *Tips:* Tingkatkan CP dengan gacha hero (*.gacha*) atau craft item (*.craft*)!\n`;
                txt += `Ketik *.dungeon* untuk lihat detail floor ini.`;
                return reply(txt);
            }

        } catch (error) {
            console.error('Masuk error:', error);
            return reply('Terjadi error. Coba lagi nanti.');
        }
    }
};
