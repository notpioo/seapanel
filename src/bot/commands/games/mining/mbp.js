/**
 * .mbp - Lihat isi Backpack (inventory ore) + auto-collect pending
 */

const { PlayerMining, MiningConfig } = require('../../../../models');
const { getPetBonuses } = require('../../../utils/petHelper');
const { collectPending } = require('../../../utils/mineHelper');

const RARITY_ICON = {
    common:    '⚪',
    uncommon:  '🟢',
    rare:      '🔵',
    epic:      '🟣',
    mythical:  '🟠',
    legendary: '🟡'
};

module.exports = {
    name: 'mbp',
    description: 'Lihat isi Backpack (inventory ore)',
    category: 'games',
    usage: '.mbp',
    aliases: ['backpack', 'inv', 'minv'],

    execute: async ({ reply, sender, socket, message }) => {
        try {
            const phoneNumber = sender.replace('@s.whatsapp.net', '').replace('@c.us', '');
            const player = await PlayerMining.getPlayer(phoneNumber);
            const config = await MiningConfig.getConfig();

            const jid        = message.key.remoteJid;
            const rebirthBonus = player.getRebirthBonuses();
            const petBonuses   = getPetBonuses(player);
            const activeGlobal = (config.globalBoosts || []).filter(b => new Date(b.expiresAt) > new Date());
            const pickaxe      = config.pickaxeLevels?.find(p => p.level === (player.pickaxeLevel || 1))
                              || { dropMultiplier: 1 };
            const capacity   = Math.floor(
                (player.getBackpackCapacity(config) + petBonuses.bpFlat)
                * (1 + petBonuses.bpPercent / 100)
            );

            // ── Auto-collect pending ore ──────────────────────
            const pending = collectPending(player, config, rebirthBonus, petBonuses, pickaxe, activeGlobal);
            let autoCollectMsg = '';
            if (pending.sessions > 0) {
                const { added } = player.addToInventoryWithCap(pending.drops, capacity);
                const addedTotal = Object.values(added).reduce((s, v) => s + v, 0);
                player.lastCollect = pending.newLastCollect;
                if (addedTotal > 0) {
                    player.stats.totalMined = (player.stats.totalMined || 0) + addedTotal;
                    autoCollectMsg = `\n⛏️ _Auto-collect: +${addedTotal} ore (${pending.sessions} sesi)_\n`;
                }
                await player.save();
            }

            const bpLvl     = player.backpackLevel || 1;
            const inventory = player.inventory || new Map();

            // Hitung total isi
            let totalOre = 0;
            for (const qty of inventory.values()) totalOre += qty;

            const fillPct = capacity > 0 ? Math.min(100, Math.round((totalOre / capacity) * 100)) : 0;
            const fillBar = (() => {
                const filled = Math.min(10, Math.max(0, Math.round(fillPct / 10)));
                return '█'.repeat(filled) + '░'.repeat(10 - filled);
            })();

            let text = `🎒 *ISI BACKPACK* 🎒\n━━━━━━━━━━━━━━━━━\n`;
            text += `📦 BP Level: *${bpLvl}* | Kapasitas: *${capacity} item*\n`;
            text += `📊 Isi: *${totalOre}/${capacity}* | [${fillBar}] ${fillPct}%${autoCollectMsg}\n`;

            if (totalOre === 0) {
                text += `_Backpack kosong. Pergi tambang dulu!_`;
            } else {
                // Kelompokkan per rarity lalu tampilkan
                const resources = config.resources || [];
                const byRarity = {};

                for (const [ore, qty] of inventory.entries()) {
                    if (!qty || qty <= 0) continue;
                    const res    = resources.find(r => r.name?.toLowerCase() === ore.toLowerCase()) || {};
                    const rarity = res.rarity || 'common';
                    if (!byRarity[rarity]) byRarity[rarity] = [];
                    byRarity[rarity].push({ ore, qty, sellPrice: res.sellPrice || 0 });
                }

                const rarityOrder = ['legendary', 'mythical', 'epic', 'rare', 'uncommon', 'common'];
                for (const r of rarityOrder) {
                    if (!byRarity[r]) continue;
                    const icon = RARITY_ICON[r] || '⚪';
                    const label = r.charAt(0).toUpperCase() + r.slice(1);
                    text += `${icon} *${label}*\n`;
                    for (const { ore, qty, sellPrice } of byRarity[r]) {
                        const total = qty * sellPrice;
                        text += `  • ${ore}: *${qty}* (💰 ${total.toLocaleString()} MC)\n`;
                    }
                }
            }

            text += `\n━━━━━━━━━━━━━━━━━`;

            const buttons = totalOre > 0
                ? [
                    { buttonId: '.msell', buttonText: { displayText: '💰 JUAL SEMUA' } },
                    { buttonId: '.mine',  buttonText: { displayText: '⛏️ MINE LAGI' } }
                  ]
                : [
                    { buttonId: '.mine',  buttonText: { displayText: '⛏️ MULAI TAMBANG' } },
                    { buttonId: '.mpack', buttonText: { displayText: '📦 UPGRADE BP' } }
                  ];

            return socket.sendMessage(jid, {
                text: text.trim(),
                footer: 'Seana Mining',
                buttons
            }, { quoted: message });

        } catch (error) {
            console.error('mbp error:', error);
            await reply('❌ Gagal memuat isi backpack.');
        }
    }
};
