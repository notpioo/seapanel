/**
 * .mevent - View current drop event status & player's collected items
 */

const { PlayerMining, MiningConfig } = require('../../../../models');

module.exports = {
    name: 'mevent',
    description: 'Lihat event drop yang sedang berjalan & koleksi item kamu',
    category: 'games',
    usage: '.mevent',
    aliases: ['eventcheck', 'cekevent'],

    execute: async ({ reply, sender }) => {
        try {
            const phoneNumber = sender.replace('@s.whatsapp.net', '').replace('@c.us', '');
            const config = await MiningConfig.getConfig();
            const player = await PlayerMining.getPlayer(phoneNumber);

            const ev = config.activeDropEvent;
            const isExpired = ev?.expiresAt && new Date(ev.expiresAt) < new Date();
            const isActive = ev?.active && !isExpired && ev.remainingStock > 0;

            let msg = `🎪 *SEANA EVENT DROP*\n`;
            msg += `━━━━━━━━━━━━━━━━━━━━\n\n`;

            // ── Event Status ────────────────────────────────────────────────
            if (!ev || !ev.active || isExpired || ev.remainingStock <= 0) {
                msg += `❌ *Tidak ada event yang berjalan saat ini.*\n`;
                msg += `_Pantau pengumuman dari Admin untuk event berikutnya!_\n`;
            } else {
                const now = new Date();
                const expires = new Date(ev.expiresAt);
                const tRem = Math.max(0, expires - now);
                const mRem = Math.floor(tRem / 60000);
                const sRem = Math.floor((tRem % 60000) / 1000);

                // Progress bar stok
                const pct = Math.min(100, Math.floor(((ev.totalStock - ev.remainingStock) / ev.totalStock) * 100));
                const filled = Math.floor(pct / 10);
                const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);

                msg += `${ev.emoji} *EVENT: ${ev.name.toUpperCase()}*\n\n`;
                msg += `⏳ *Sisa Waktu:* ${mRem}m ${sRem}s\n`;
                msg += `📦 *Stok Tersisa:* ${ev.remainingStock} / ${ev.totalStock}\n`;
                msg += `${bar} ${pct}% terdistribusi\n`;
                msg += `💧 *Drop Chance:* ${ev.dropChance}% tiap *.mine*\n\n`;
                msg += `_Nambang di floor mana saja untuk dapat ${ev.emoji} ${ev.name}!_\n`;
            }

            // ── Player's Collection ─────────────────────────────────────────
            msg += `\n━━━━━━━━━━━━━━━━━━━━\n`;
            msg += `🎒 *KOLEKSI EVENT ITEM KAMU:*\n\n`;

            if (!player.eventItems || player.eventItems.size === 0) {
                msg += `_Kamu belum punya item event. Mulai nambang saat event aktif!_\n`;
            } else {
                let total = 0;
                for (const [itemName, qty] of player.eventItems.entries()) {
                    if (qty > 0) {
                        // Try to find emoji from current or past event config
                        const emoji = (ev?.name?.toLowerCase() === itemName.toLowerCase()) ? ev.emoji
                            : (config.dropEventConfig?.name?.toLowerCase() === itemName.toLowerCase()) ? config.dropEventConfig.emoji
                            : '🎁';
                        const dispName = itemName.charAt(0).toUpperCase() + itemName.slice(1);
                        msg += `> ${emoji} *${dispName}:* ${qty} pcs\n`;
                        total += qty;
                    }
                }
                msg += `\n📊 Total koleksi: *${total} item*\n`;
                msg += `_Item ini bisa ditukar saat event penukaran dibuka!_\n`;
            }

            return reply(msg.trim());

        } catch (error) {
            console.error('[mevent] Error:', error);
            return reply('❌ Gagal membaca info event. Coba lagi.');
        }
    }
};
