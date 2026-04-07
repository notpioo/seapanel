/**
 * .mine - Generator Mining: Collect accumulated ore
 * Ore generates passively at a rate based on cooldownSeconds config.
 * Run .mine to collect; run .msell to collect + sell at once.
 */

const { PlayerMining, MiningConfig } = require('../../../../models');
const { getPetBonuses } = require('../../../utils/petHelper');
const { collectPending, getDisplayRate, getEffectiveCooldownSec } = require('../../../utils/mineHelper');
const { trackQuestProgress, applyQuestRewards } = require('../../../utils/questHelper');

if (!global.activeMinersLock) {
    global.activeMinersLock = new Set();
}

module.exports = {
    name: 'mine',
    description: 'Collect accumulated ore from your passive generator',
    category: 'games',
    usage: '.mine',
    aliases: ['dig', 'tambang'],

    execute: async ({ reply, sender, socket, message }) => {
        const phoneNumber = sender.replace('@s.whatsapp.net', '').replace('@c.us', '');

        if (global.activeMinersLock.has(phoneNumber)) {
            return reply('⏳ Sedang memproses, tunggu sebentar...');
        }
        global.activeMinersLock.add(phoneNumber);

        try {
            const jid    = message.key.remoteJid;
            const player = await PlayerMining.getPlayer(phoneNumber);
            const config = await MiningConfig.getConfig();

            const rebirthBonus    = player.getRebirthBonuses();
            const petBonuses      = getPetBonuses(player);
            const activeBoosts    = (config.globalBoosts || []).filter(b => new Date(b.expiresAt) > new Date());
            const globalBpMulti   = activeBoosts.reduce((m, b) => m * (b.bpMultiplier || 1), 1);

            const location = player.getLocation(config);
            if (!location || !location.resources || location.resources.length === 0) {
                return reply('❌ Lokasi mining tidak ditemukan. Hubungi admin.');
            }

            const pickaxe = config.pickaxeLevels.find(p => p.level === (player.pickaxeLevel || 1))
                         || { dropMultiplier: 1 };

            // ── BP capacity ──────────────────────────────────
            const bpCapacity = Math.floor(
                (player.getBackpackCapacity(config) + petBonuses.bpFlat)
                * globalBpMulti
                * (1 + petBonuses.bpPercent / 100)
            );

            const cooldownSec  = getEffectiveCooldownSec(
                config, rebirthBonus, petBonuses,
                activeBoosts.reduce((m, b) => m * (b.speedMultiplier || 1), 1)
            );
            const ratePerMin   = getDisplayRate(config, pickaxe, rebirthBonus, petBonuses, cooldownSec);

            // ── Check if BP already completely full ────────────
            const totalItems = player.getTotalItems();
            const bpAllFull  = totalItems >= bpCapacity;
            const bpFillPct  = Math.min(100, Math.round(totalItems / bpCapacity * 100));

            // ── Helper: BP status line ────────────────────────
            function bpStatusLine(fillPct, currentTotal) {
                if (fillPct >= 100) return `📦 *BP Lv.${player.backpackLevel}* | PENUH ✅ — *.msell* untuk jual!`;
                const remaining = Math.max(0, bpCapacity - currentTotal);
                const rateNum   = parseFloat(ratePerMin) || 1;
                const minsLeft  = Math.ceil(remaining / rateNum);
                const timeStr   = minsLeft < 60
                    ? `${minsLeft} menit lagi`
                    : `${(minsLeft / 60).toFixed(1)} jam lagi`;
                return `📦 *BP Lv.${player.backpackLevel}* | ${fillPct}% terisi (penuh dalam ~${timeStr})`;
            }

            if (bpAllFull) {
                return socket.sendMessage(jid, {
                    text: `⚠️ *BP PENUH!*\n━━━━━━━━━━━━━━━\n\n📦 Generator berhenti — inventory sudah penuh.\nJual ore dulu dengan *.msell* baru generator jalan lagi.\n\n${bpStatusLine(100, totalItems)}`,
                    footer: 'Seana Mining',
                    buttons: [{ buttonId: '.msell', buttonText: { displayText: '💰 JUAL ORE' } }]
                }, { quoted: message });
            }

            // ── Collect pending ore ────────────────────────────
            const result = collectPending(player, config, rebirthBonus, petBonuses, pickaxe, activeBoosts);

            if (result.sessions === 0) {
                const statusText =
                    `⛏️ *GENERATOR MINING*\n━━━━━━━━━━━━━━━\n` +
                    `${location.emoji} *${location.name}* (R${player.rebirthCount || 0}+)\n` +
                    `⚡ Rate: *~${ratePerMin} ore/menit*\n\n` +
                    `${bpStatusLine(bpFillPct, totalItems)}\n\n` +
                    `_Generator otomatis! *.msell* untuk collect+jual sekaligus._`;

                return socket.sendMessage(jid, {
                    text: statusText,
                    footer: 'Seana Mining',
                    buttons: [
                        { buttonId: '.msell', buttonText: { displayText: '💰 CEK & JUAL' } },
                        { buttonId: '.mpack',   buttonText: { displayText: '📦 UPGRADE BP' } }
                    ]
                }, { quoted: message });
            }

            // ── Apply drops to inventory (capped, no ore lost) ─
            const { added } = player.addToInventoryWithCap(result.drops, bpCapacity);
            const totalAdded = Object.values(added).reduce((s, v) => s + v, 0);

            // ── Quest tracking — collect_ore ──────────────────
            let mineQuestNotif = '';
            const mineCompleted = [];
            for (const [oreName, qty] of Object.entries(added)) {
                const properName = oreName.charAt(0).toUpperCase() + oreName.slice(1);
                const done = trackQuestProgress(player, 'collect_ore', properName, qty);
                mineCompleted.push(...done);
            }
            if (mineCompleted.length > 0) {
                const reward = applyQuestRewards(player, mineCompleted);
                mineQuestNotif = `\n\n✅ *Quest Selesai!*\n${reward}`;
            }

            // ── Save ──────────────────────────────────────────
            player.lastCollect = result.newLastCollect;
            player.stats.totalMined = (player.stats.totalMined || 0) + totalAdded;
            await player.save();

            // ── Build response ────────────────────────────────
            const dropLines = Object.entries(added).map(([item, qty]) =>
                `• ${item.charAt(0).toUpperCase() + item.slice(1)} x${qty.toLocaleString()}`
            );

            const newTotal   = player.getTotalItems();
            const newFillPct = Math.min(100, Math.round(newTotal / bpCapacity * 100));
            const boostStr   = player.rebirthCount > 0 ? ` 🔄R${player.rebirthCount}` : '';

            let text = `⛏️ *MINING COLLECT!*${boostStr}\n━━━━━━━━━━━━━━━\n`;
            text += `${location.emoji} *${location.name}*\n\n`;
            text += `*Hasil:*\n`;
            text += dropLines.length > 0 ? dropLines.join('\n') : '• Tidak ada drop';
            text += `\n\n${bpStatusLine(newFillPct, newTotal)}`;

            text += mineQuestNotif;

            // Rebirth reminder
            const rbMinPickaxe = config.rebirthConfig?.minPickaxe || 200;
            const rbMinBP      = config.rebirthConfig?.minBP || 200;
            if ((player.pickaxeLevel || 1) >= rbMinPickaxe && (player.backpackLevel || 1) >= rbMinBP) {
                text += `\n\n🔄 *Semua syarat rebirth terpenuhi!* _.mrebirth_`;
            }

            const buttons = newFillPct >= 75
                ? [{ buttonId: '.msell', buttonText: { displayText: '💰 JUAL ORE' } }]
                : [
                    { buttonId: '.msell', buttonText: { displayText: '💰 JUAL ORE' } },
                    { buttonId: '.mpack',   buttonText: { displayText: '📦 UPGRADE BP' } }
                ];

            await socket.sendMessage(jid, {
                text: text.trim(),
                footer: 'Seana Mining',
                buttons
            }, { quoted: message });

        } catch (error) {
            console.error('Mine collect error:', error);
            await reply('❌ Gagal collect. Coba lagi nanti.');
        } finally {
            global.activeMinersLock.delete(phoneNumber);
        }
    }
};
