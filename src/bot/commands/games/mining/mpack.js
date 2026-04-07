/**
 * .mpack - Upgrade Backpack (BP)
 * Supports single, bulk (N), and max upgrades
 */

const { PlayerMining, MiningConfig } = require('../../../../models');
const { getPetBonuses } = require('../../../utils/petHelper');
const { trackQuestProgress, applyQuestRewards } = require('../../../utils/questHelper');

function applyDiscount(cost, discount) {
    return Math.max(1, Math.floor(cost * (1 - discount)));
}

function calcBulkBP(config, startLvl, maxLvl, minecon, wantN, discount = 0) {
    const bp       = config.bpConfig || {};
    const baseCost = bp.baseCost ?? 500;
    const costExp  = bp.costExp  ?? 1.5;

    let totalCost = 0;
    let lvl   = startLvl;
    let count = 0;
    while (count < wantN && lvl < maxLvl) {
        const rawCost = Math.floor(baseCost * Math.pow(lvl, costExp));
        const cost    = applyDiscount(rawCost, discount);
        if (totalCost + cost > minecon) break;
        totalCost += cost;
        lvl++;
        count++;
    }
    return { count, totalCost, finalLevel: startLvl + count };
}

module.exports = {
    name: 'mpack',
    description: 'Upgrade Backpack dengan Minecon',
    category: 'games',
    usage: '.mpack | .mpack <jumlah|max>',
    aliases: ['mbackpack'],

    execute: async ({ reply, sender, args, socket, message }) => {
        try {
            const phoneNumber = sender.replace('@s.whatsapp.net', '').replace('@c.us', '');
            const player = await PlayerMining.getPlayer(phoneNumber);
            const config = await MiningConfig.getConfig();

            const bp         = config.bpConfig || {};
            const MAX_LEVEL  = bp.maxLevel ?? 250;
            const currentLvl = player.backpackLevel || 1;
            const minecon    = player.minecon || 0;
            const capacity   = player.getBackpackCapacity(config);
            const jid        = message.key.remoteJid;

            const bonuses    = player.getRebirthBonuses();
            const petBonuses = getPetBonuses(player);
            const discount   = (bonuses.upgradeDiscount || 0) + petBonuses.upgradeDiscount;

            const baseCost  = bp.baseCost ?? 500;
            const costExp   = bp.costExp  ?? 1.5;
            const nextCost  = currentLvl < MAX_LEVEL
                ? applyDiscount(Math.floor(baseCost * Math.pow(currentLvl, costExp)), discount)
                : null;

            // ─── View (no args) ─────────────────────────────
            if (!args[0] || args[0] === 'info') {
                let text = `📦 *BACKPACK UPGRADE* 📦\n━━━━━━━━━━━━━━━━━\n\n`;
                text += `*Level:* ${currentLvl} / ${MAX_LEVEL}\n`;
                text += `*Kapasitas BP:* ${capacity} item\n`;
                text += `🪙 *Minecon:* ${minecon.toLocaleString()} MC\n`;
                if (discount > 0) text += `💸 *Upgrade Discount:* -${Math.round(discount * 100)}% biaya\n`;
                text += `\n`;

                let buttons = [];

                if (currentLvl >= MAX_LEVEL || !nextCost) {
                    text += `🎉 *MAX LEVEL!* BP sudah Lv.${MAX_LEVEL}.\nKapasitas: *${capacity} item*`;
                    buttons = [{ buttonId: '.mine', buttonText: { displayText: '⛏️ MINE' } }];
                } else {
                    const nextCapacity = (bp.baseCapacity ?? 50) + currentLvl * (bp.capacityPerLevel ?? 20); // total items
                    const canAfford1   = minecon >= nextCost;
                    const bulk10       = calcBulkBP(config, currentLvl, MAX_LEVEL, minecon, 10, discount);
                    const bulkMax      = calcBulkBP(config, currentLvl, MAX_LEVEL, minecon, MAX_LEVEL, discount);

                    text += `*Next:* Lv.${currentLvl + 1} | Kapasitas: ${nextCapacity} item\n\n`;
                    text += `📋 *Biaya:*\n`;
                    text += `  ${canAfford1 ? '✅' : '❌'} +1 lvl → ${nextCost.toLocaleString()} MC\n`;
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
                            { buttonId: '.mpack 1',   buttonText: { displayText: '📦 +1 Level' } },
                            { buttonId: '.mpack 10',  buttonText: { displayText: `📦 +${Math.min(bulk10.count, 10)} Level` } },
                            { buttonId: '.mpack max', buttonText: { displayText: `📦 MAX (+${bulkMax.count})` } }
                        ];
                    }
                }

                return socket.sendMessage(jid, { text: text.trim(), footer: 'Seana Mining', buttons }, { quoted: message });
            }

            // ─── Upgrade ────────────────────────────────────
            const arg  = args[0].toLowerCase();
            const isMax = arg === 'max';
            const isYes = arg === 'yes' || arg === 'confirm';
            const wantN = isMax ? MAX_LEVEL : (isYes ? 1 : (parseInt(arg) || 1));

            if (currentLvl >= MAX_LEVEL || !nextCost) {
                return reply('📦 Backpack sudah level maksimal!');
            }

            const { count, totalCost, finalLevel } = calcBulkBP(config, currentLvl, MAX_LEVEL, minecon, wantN, discount);

            if (count === 0) {
                return reply(`❌ Minecon tidak cukup!\nButuh: *${nextCost.toLocaleString()} MC*\nKamu punya: *${minecon.toLocaleString()} MC*`);
            }

            const newCapacity = (bp.baseCapacity ?? 50) + (finalLevel - 1) * (bp.capacityPerLevel ?? 20);

            player.minecon       -= totalCost;
            player.backpackLevel  = finalLevel;

            // Quest tracking — upgrade
            const bpQuestCompleted = trackQuestProgress(player, 'upgrade', '', count);
            let bpQuestNotif = '';
            if (bpQuestCompleted.length > 0) {
                const reward = applyQuestRewards(player, bpQuestCompleted);
                bpQuestNotif = `\n\n✅ *Quest Selesai!*\n${reward}`;
            }

            await player.save();

            const jid2 = message.key.remoteJid;
            const text = (`🎉 *BP UPGRADE BERHASIL!* 🎉
━━━━━━━━━━━━━━━━━━━━

📦 BP Lv.${currentLvl} → *Lv.${finalLevel}*
📊 *Kapasitas:* ${newCapacity} item
🔼 *Naik:* ${count} level

🪙 Biaya: -${totalCost.toLocaleString()} MC
🪙 Sisa: ${player.minecon.toLocaleString()} MC` + bpQuestNotif).trim();

            return socket.sendMessage(jid2, {
                text,
                footer: 'Seana Mining',
                buttons: [
                    { buttonId: '.mpack', buttonText: { displayText: '📦 UPGRADE LAGI' } },
                    { buttonId: '.mine',  buttonText: { displayText: '⛏️ MINE SEKARANG' } }
                ]
            }, { quoted: message });

        } catch (error) {
            console.error('mpack error:', error);
            await reply('❌ Gagal upgrade backpack.');
        }
    }
};
