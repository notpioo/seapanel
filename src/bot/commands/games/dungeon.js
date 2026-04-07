
const { RPGPlayer, RPGHero, RPGConfig, RPGDungeon, RPGEnemy, RPGItem } = require('../../../models');

const fmt = (n) => new Intl.NumberFormat('en-US').format(n);
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
    name: 'dungeon',
    description: 'Masuk ke dungeon spesial',
    category: 'games',
    usage: '.dungeon [id]',
    aliases: ['dg', 'raid'],

    execute: async ({ reply, sender, args }) => {
        try {
            const player = await RPGPlayer.findOne({ phoneNumber: sender });
            if (!player) return reply('Kamu belum main RPG. Ketik *.rpg*');

            const dungeonId = args[0];

            // 1. LIST DUNGEONS
            if (!dungeonId) {
                const dungeons = await RPGDungeon.find({ isActive: true }).sort({ minLevel: 1 });
                if (dungeons.length === 0) return reply('Belum ada dungeon yang tersedia saat ini.');

                let txt = `🏰 *SPECIAL DUNGEONS*\n\n`;
                for (const d of dungeons) {
                    const price = d.ticketItemId ? `🎫 ${d.ticketItemId} x${d.ticketCount}` : (d.goldCost > 0 ? `💰 ${d.goldCost} G` : 'GRATIS');
                    txt += `🔻 *${d.name}* (ID: ${d.dungeonId})\n`;
                    txt += `   └─ Min Lvl: ${d.minLevel} | Biaya: ${price}\n`;
                }
                txt += `\nKetik *.dungeon <id>* untuk masuk!`;
                return reply(txt);
            }

            // 2. ENTER DUNGEON
            const dungeon = await RPGDungeon.findOne({ dungeonId });
            if (!dungeon) return reply('Dungeon tidak ditemukan.');

            // Check Level
            if (player.level < dungeon.minLevel) return reply(`Level kamu belum cukup! (Min: ${dungeon.minLevel})`);

            // Check Cost & Deduct
            if (dungeon.goldCost > 0) {
                if (player.gold < dungeon.goldCost) return reply(`Gold tidak cukup! Butuh ${dungeon.goldCost} G.`);
                player.gold -= dungeon.goldCost;
            }

            if (dungeon.ticketItemId && dungeon.ticketCount > 0) {
                const qty = player.inventory.get(dungeon.ticketItemId) || 0;
                if (qty < dungeon.ticketCount) return reply(`Kamu butuh item 🎫 *${dungeon.ticketItemId}* sebanyak ${dungeon.ticketCount}!`);

                // Deduct Item
                const newQty = qty - dungeon.ticketCount;
                if (newQty <= 0) player.inventory.delete(dungeon.ticketItemId);
                else player.inventory.set(dungeon.ticketItemId, newQty);
            }

            await player.save();

            // 3. PREPARE BATTLE
            const config = await RPGConfig.getConfig();
            const heroesMap = await RPGHero.getHeroesMap();
            const enemiesList = await RPGEnemy.find();
            const enemyData = enemiesList.find(e => e.enemyId === dungeon.bossId);

            if (!enemyData) return reply('Error: Boss dungeon ini tidak ditemukan di database.');

            // Items for stat calculation
            const items = await RPGItem.find();
            const itemsMap = {};
            items.forEach(i => itemsMap[i.itemId] = i);

            const userStats = player.calcStats(heroesMap, config, itemsMap);

            // Scaling Boss Stat? For now use Base Stat form DB
            let enHp = enemyData.hp;
            let enAtk = enemyData.atk;
            let myHp = userStats.hp;

            let turn = 1;
            let log = [`⚔️ *DUNGEON STARTED: ${dungeon.name}*`, `VS 😈 *${enemyData.name}*`];

            // Battle Loop (Simplified)
            while (myHp > 0 && enHp > 0 && turn <= 20) {
                // Player Attack
                const dmgToEnemy = Math.floor(userStats.atk * (0.9 + Math.random() * 0.2));
                // Crit Chance 10%
                const isCrit = Math.random() < 0.1;
                const finalDmg = isCrit ? Math.floor(dmgToEnemy * 1.5) : dmgToEnemy;

                enHp -= finalDmg;
                // log.push(`Turn ${turn}: Kamu deal ${finalDmg}${isCrit ? ' 💥CRIT!' : ''}`);

                if (enHp <= 0) break;

                // Enemy Attack
                const dmgToPlayer = Math.floor(enAtk * (0.8 + Math.random() * 0.4));
                // Defense calculation? (Simplified: no defense yet)
                myHp -= dmgToPlayer;
                // log.push(`Turn ${turn}: Musuh deal ${dmgToPlayer}`);

                turn++;
            }

            // 4. RESULT
            const win = enHp <= 0;
            let resultTxt = `🏁 *BATTLE RESULT*\n`;
            resultTxt += `Health Kamu: ${myHp > 0 ? Math.floor(myHp) : 0}/${userStats.hp}\n`;
            resultTxt += `Musuh: ${enemyData.name} (${enHp <= 0 ? 'Dead' : Math.floor(enHp) + ' HP left'})\n\n`;

            if (win) {
                // Calculation Rewards
                const baseExp = (enemyData.exp || 0) + (dungeon.expReward || 0);
                const baseGold = (enemyData.gold || 0) + (dungeon.goldReward || 0);

                // Random variation
                const finalExp = Math.floor(baseExp * (0.9 + Math.random() * 0.2));
                const finalGold = Math.floor(baseGold * (0.9 + Math.random() * 0.2));

                const { leveledUp, level } = await player.addExp(finalExp, config);
                player.gold += finalGold;

                resultTxt += `🎉 *VICTORY!* Kamu menang!\n`;
                resultTxt += `🎁 Rewards:\n`;
                resultTxt += `XP: +${finalExp}\n`;
                resultTxt += `Gold: +${finalGold}\n`;

                if (leveledUp) resultTxt += `🆙 *LEVEL UP!* Kamu sekarang Level ${level}!\n`;

                // Item Drop Logic
                if (enemyData.drop) {
                    const drops = enemyData.drop.split(',').map(s => {
                        const [id, r] = s.split(':');
                        return { id: id.trim(), rate: parseInt(r) || 100 };
                    });

                    let gotDrops = [];
                    for (const d of drops) {
                        const roll = Math.random() * 100;
                        if (roll <= d.rate) {
                            const currentQty = player.inventory.get(d.id) || 0;
                            player.inventory.set(d.id, currentQty + 1);
                            gotDrops.push(d.id);
                        }
                    }
                    if (gotDrops.length > 0) resultTxt += `📦 Loot: ${gotDrops.join(', ')}\n`;
                }

                await player.save();
            } else {
                resultTxt += `💀 *DEFEAT* Kamu kalah telak...\nJangan menyerah, coba upgrade hero atau weapon!`;
            }

            return reply(resultTxt);

        } catch (error) {
            console.error('DUNGEON Error:', error);
            return reply('Terjadi kesalahan sistem dungeon.');
        }
    }
};
