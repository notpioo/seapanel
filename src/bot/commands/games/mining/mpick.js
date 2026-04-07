/**
 * .mpick - Upgrade Pickaxe
 * Supports single, bulk (N), and max upgrades
 */

const { PlayerMining, MiningConfig } = require('../../../../models');
const { getPetBonuses } = require('../../../utils/petHelper');
const { trackQuestProgress, applyQuestRewards } = require('../../../utils/questHelper');

function applyDiscount(cost, discount) {
    return Math.max(1, Math.floor(cost * (1 - discount)));
}

function calcBulkPickaxe(config, startLvl, maxLvl, minecon, wantN, discount = 0) {
    let totalCost = 0;
    let lvl = startLvl;
    let count = 0;
    while (count < wantN && lvl < maxLvl) {
        const next = config.pickaxeLevels.find(p => p.level === lvl + 1);
        if (!next) break;
        const cost = applyDiscount(next.upgradeCost, discount);
        if (totalCost + cost > minecon) break;
        totalCost += cost;
        lvl++;
        count++;
    }
    return { count, totalCost, finalLevel: startLvl + count };
}

module.exports = {
    name: 'mpick',
    description: 'Upgrade Pickaxe dengan Minecon',
    category: 'games',
    usage: '.mpick | .mpick <jumlah|max>',
    aliases: ['mup', 'pickaxe'],

    execute: async ({ reply, sender, args, socket, message }) => {
        try {
            const phoneNumber = sender.replace('@s.whatsapp.net', '').replace('@c.us', '');
            const player  = await PlayerMining.getPlayer(phoneNumber);
            const config  = await MiningConfig.getConfig();

            const MAX_LEVEL  = config.pickaxeConfig?.maxLevel || 250;
            const currentLvl = player.pickaxeLevel || 1;
            const minecon    = player.minecon || 0;
            const jid        = message.key.remoteJid;

            const bonuses    = player.getRebirthBonuses();
            const petBonuses = getPetBonuses(player);
            const discount   = (bonuses.upgradeDiscount || 0) + petBonuses.upgradeDiscount;

            const currentPick = config.pickaxeLevels.find(p => p.level === currentLvl) || { name: 'Wooden Pickaxe', dropMultiplier: 1.0 };
            const nextPick    = config.pickaxeLevels.find(p => p.level === currentLvl + 1);

            // ─── View (no args) ─────────────────────────────
            if (!args[0] || args[0] === 'info') {
                let text = `⛏️ *PICKAXE UPGRADE* ⛏️\n━━━━━━━━━━━━━━━━━\n\n`;
                text += `*Pickaxe:* ${currentPick.name}\n`;
                text += `*Level:* ${currentLvl} / ${MAX_LEVEL}\n`;
                text += `*Drop Bonus:* x${currentPick.dropMultiplier}\n`;
                text += `🪙 *Minecon:* ${minecon.toLocaleString()} MC\n`;
                if (discount > 0) text += `💸 *Upgrade Discount:* -${Math.round(discount * 100)}% biaya\n`;
                text += `\n`;

                let buttons = [];

                if (!nextPick || currentLvl >= MAX_LEVEL) {
                    text += `🎉 *MAX LEVEL!* Pickaxe sudah Lv.${MAX_LEVEL}.`;
                    buttons = [{ buttonId: '.mine', buttonText: { displayText: '⛏️ MINE' } }];
                } else {
                    const next1Cost   = applyDiscount(nextPick.upgradeCost, discount);
                    const canAfford1  = minecon >= next1Cost;
                    const bulk10      = calcBulkPickaxe(config, currentLvl, MAX_LEVEL, minecon, 10, discount);
                    const bulkMax     = calcBulkPickaxe(config, currentLvl, MAX_LEVEL, minecon, MAX_LEVEL, discount);

                    text += `*Next:* ${nextPick.name} (Lv.${nextPick.level})\n`;
                    text += `*Drop Bonus:* x${nextPick.dropMultiplier}\n\n`;
                    text += `📋 *Biaya:*\n`;
                    text += `  ${canAfford1 ? '✅' : '❌'} +1 lvl → ${next1Cost.toLocaleString()} MC\n`;
                    if (bulk10.count > 0) text += `  ✅ +${bulk10.count} lvl → ${bulk10.totalCost.toLocaleString()} MC\n`;
                    if (bulkMax.count > 0) text += `  ✅ Max (${bulkMax.count} lvl) → ${bulkMax.totalCost.toLocaleString()} MC\n`;

                    if (!canAfford1) {
                        text += `\n❌ Minecon tidak cukup. Jual ore dulu!`;
                        buttons = [
                            { buttonId: '.msell', buttonText: { displayText: '💰 JUAL ORE' } },
                            { buttonId: '.mine',  buttonText: { displayText: '⛏️ MINE LAGI' } }
                        ];
                    } else {
                        text += `\n✅ Siap upgrade! Pilih jumlah level:`;
                        buttons = [
                            { buttonId: '.mpick 1',   buttonText: { displayText: '⛏️ +1 Level' } },
                            { buttonId: '.mpick 10',  buttonText: { displayText: `⛏️ +${Math.min(bulk10.count, 10)} Level` } },
                            { buttonId: '.mpick max', buttonText: { displayText: `⛏️ MAX (+${bulkMax.count})` } }
                        ];
                    }
                }

                return socket.sendMessage(jid, { text: text.trim(), footer: 'Seana Mining', buttons }, { quoted: message });
            }

            // ─── Upgrade ────────────────────────────────────
            const arg = args[0].toLowerCase();
            const isMax = arg === 'max';
            const isYes = arg === 'yes' || arg === 'confirm';
            const wantN = isMax ? MAX_LEVEL : (isYes ? 1 : (parseInt(arg) || 1));

            if (currentLvl >= MAX_LEVEL || !nextPick) {
                return reply('⛏️ Pickaxe sudah level maksimal!');
            }

            const { count, totalCost, finalLevel } = calcBulkPickaxe(config, currentLvl, MAX_LEVEL, minecon, wantN, discount);

            if (count === 0) {
                const need = applyDiscount(nextPick.upgradeCost, discount);
                return reply(`❌ Minecon tidak cukup!\nButuh: *${need.toLocaleString()} MC*\nKamu punya: *${minecon.toLocaleString()} MC*`);
            }

            const finalPick = config.pickaxeLevels.find(p => p.level === finalLevel) || nextPick;

            player.minecon      -= totalCost;
            player.pickaxeLevel  = finalLevel;

            // Quest tracking — upgrade
            const upgCompleted = trackQuestProgress(player, 'upgrade', '', count);
            let upgQuestNotif = '';
            if (upgCompleted.length > 0) {
                const reward = applyQuestRewards(player, upgCompleted);
                upgQuestNotif = `\n\n✅ *Quest Selesai!*\n${reward}`;
            }

            await player.save();

            const jid2 = message.key.remoteJid;
            const text = (`🎉 *PICKAXE UPGRADE BERHASIL!* 🎉
━━━━━━━━━━━━━━━━━━━━

⛏️ ${currentPick.name} → *${finalPick.name}* (Lv.${finalLevel})
📊 *Drop Bonus:* x${finalPick.dropMultiplier}
🔼 *Naik:* ${count} level

🪙 Biaya: -${totalCost.toLocaleString()} MC
🪙 Sisa: ${player.minecon.toLocaleString()} MC` + upgQuestNotif).trim();

            return socket.sendMessage(jid2, {
                text,
                footer: 'Seana Mining',
                buttons: [
                    { buttonId: '.mpick', buttonText: { displayText: '⛏️ UPGRADE LAGI' } },
                    { buttonId: '.mine',  buttonText: { displayText: '⛏️ MINE SEKARANG' } }
                ]
            }, { quoted: message });

        } catch (error) {
            console.error('mpick error:', error);
            await reply('❌ Gagal upgrade pickaxe.');
        }
    }
};
