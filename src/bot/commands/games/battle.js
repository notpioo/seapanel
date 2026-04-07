const { RPGPlayer, RPGHero, RPGConfig, RPGChapter, RPGItem } = require('../../../models');

module.exports = {
    name: 'battle',
    description: 'Lawan monster di stage saat ini',
    category: 'games',
    usage: '.battle',
    aliases: ['adv', 'adventure'],

    execute: async ({ reply, sender }) => {
        try {
            const player = await RPGPlayer.findOne({ phoneNumber: sender });
            if (!player) return reply('Kamu belum punya akun RPG!\nKetik *.rpg* untuk mendaftar.');

            const config = await RPGConfig.getConfig();
            const heroesMap = await RPGHero.getHeroesMap();

            // Fetch Items Stats
            const items = await RPGItem.find();
            const itemsMap = {};
            items.forEach(i => itemsMap[i.itemId] = i);

            const chapter = await RPGChapter.getChapter(player.currentChapter);
            if (!chapter) return reply(`Chapter ${player.currentChapter} belum tersedia.`);

            const stageData = chapter.stages.find(s => s.stageNumber === player.currentStage);
            if (!stageData) return reply(`Stage ${player.currentChapter}-${player.currentStage} belum tersedia.`);

            const userStats = player.calcStats(heroesMap, config, itemsMap);
            const enemyAtk = Math.floor(stageData.atk * (0.9 + Math.random() * 0.2));

            let myHp = userStats.hp;
            let enHp = stageData.hp;
            let turn = 1;
            let win = false;

            while (turn <= 20) {
                const myDmg = Math.floor(userStats.atk * (0.9 + Math.random() * 0.2));
                enHp -= myDmg;
                if (enHp <= 0) { win = true; break; }

                myHp -= enemyAtk;
                if (myHp <= 0) { win = false; break; }
                turn++;
            }

            if (win) {
                player.gold += stageData.gold;
                const levelUp = player.addExp(stageData.exp);

                let txt = `*${chapter.name} ${player.currentChapter}-${player.currentStage}*\n`;
                txt += stageData.isBoss ? `*BOSS BATTLE!*\n\n` : `\n`;
                txt += `*VICTORY!*\n`;
                txt += `${stageData.enemy} dikalahkan! Sisa HP: ${myHp}\n\n`;
                txt += `+${stageData.gold} Gold | +${stageData.exp} EXP\n`;

                if (levelUp) txt += `*LEVEL UP!* Sekarang Level ${player.level}!\n`;

                // Handle Drops
                if (stageData.drop) {
                    const drops = stageData.drop.split(',');
                    const receivedDrops = [];

                    for (const dropStr of drops) {
                        const [itemName, rateStr] = dropStr.trim().split(':');
                        const rate = rateStr ? parseInt(rateStr) : 100; // Default 100% if no rate specified

                        // Check chance
                        if (Math.random() * 100 < rate) {
                            const currentQty = player.inventory.get(itemName) || 0;
                            player.inventory.set(itemName, currentQty + 1);
                            receivedDrops.push(itemName);
                        }
                    }

                    if (receivedDrops.length > 0) {
                        txt += `\n🎁 *DROPS:*\n${receivedDrops.map(d => `- ${d}`).join('\n')}\n`;
                    }
                }

                // Check for Level Up again (just in case exp overflow, but current logic handles one level)

                const isLastStage = player.currentStage >= chapter.stages.length;


                if (isLastStage) {
                    txt += `\n*CHAPTER ${player.currentChapter} CLEAR!*\n`;

                    if (chapter.clearRewardHeroId) {
                        const rewardHero = heroesMap[chapter.clearRewardHeroId];
                        if (rewardHero && !player.heroes.includes(chapter.clearRewardHeroId)) {
                            player.heroes.push(chapter.clearRewardHeroId);
                            txt += `Reward: [${rewardHero.rarity}] *${rewardHero.name}*!\n`;
                        }
                    }

                    player.currentChapter += 1;
                    player.currentStage = 1;

                    const nextChapter = await RPGChapter.getChapter(player.currentChapter);
                    if (nextChapter) {
                        txt += `\nChapter ${player.currentChapter}: *${nextChapter.name}* terbuka!`;
                    } else {
                        txt += `\nKamu sudah menyelesaikan semua chapter yang tersedia!`;
                        player.currentChapter -= 1;
                        player.currentStage = chapter.stages.length;
                    }
                } else {
                    player.currentStage += 1;
                    txt += `\nNext: Stage ${player.currentChapter}-${player.currentStage}`;
                }

                await player.save();
                return reply(txt);
            } else {
                return reply(`*${chapter.name} ${player.currentChapter}-${player.currentStage}*\n${stageData.isBoss ? '*BOSS BATTLE!*\n' : ''}\n*DEFEAT...*\n\nKalah dari *${stageData.enemy}* di turn ${turn}.\nCP: ${userStats.cp} | Saran: *.gacha* untuk tambah hero!`);
            }
        } catch (error) {
            console.error('Battle error:', error);
            return reply('Terjadi error. Coba lagi nanti.');
        }
    }
};
