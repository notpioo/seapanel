/**
 * .mdrop - Owner command to start/stop seasonal drop events
 * Usage: .mdrop start [jumlah] [menit] | .mdrop stop
 */

const { MiningConfig } = require('../../../models');

module.exports = {
    name: 'mdrop',
    description: 'Kelola event drop item spesial (Owner only)',
    category: 'owner',
    usage: '.mdrop start [jumlah] [menit] | .mdrop stop',
    ownerOnly: true,

    execute: async ({ reply, sender, args }) => {
        try {
            const sub = args[0]?.toLowerCase();
            const config = await MiningConfig.getConfig();

            // ── STATUS CHECK ────────────────────────────────────────────────
            if (!sub || sub === 'status') {
                const ev = config.activeDropEvent;
                if (!ev || !ev.active) {
                    const cfg = config.dropEventConfig || {};
                    return reply(
                        `🎪 *EVENT DROP — Panel Owner*\n` +
                        `━━━━━━━━━━━━━━━━━━━━\n\n` +
                        `❌ Tidak ada event yang sedang berjalan.\n\n` +
                        `⚙️ *Config saat ini (dari Web Panel):*\n` +
                        `> Nama: ${cfg.emoji || '🍪'} ${cfg.name || 'Cookies'}\n` +
                        `> Drop Chance: ${cfg.dropChance || 5}%\n\n` +
                        `▶️ Start: *.mdrop start [jumlah] [menit]*\n` +
                        `📝 Ubah nama/emoji di Web Panel → Mining → Drop Event Config`
                    );
                }

                const now = new Date();
                const expires = new Date(ev.expiresAt);
                const tRem = Math.max(0, expires - now);
                const mRem = Math.floor(tRem / 60000);
                const sRem = Math.floor((tRem % 60000) / 1000);

                return reply(
                    `🎪 *EVENT AKTIF: ${ev.emoji} ${ev.name}*\n` +
                    `━━━━━━━━━━━━━━━━━━━━\n` +
                    `📦 Stok: ${ev.remainingStock} / ${ev.totalStock} tersisa\n` +
                    `⏳ Sisa waktu: ${mRem}m ${sRem}s\n` +
                    `💧 Drop Chance: ${ev.dropChance}%\n\n` +
                    `🛑 Hentikan: *.mdrop stop*`
                );
            }

            // ── START ────────────────────────────────────────────────────────
            if (sub === 'start') {
                if (config.activeDropEvent?.active) {
                    return reply(`❌ Sudah ada event yang berjalan!\nHentikan dulu dengan *.mdrop stop*`);
                }

                const jumlah = parseInt(args[1]);
                const menit = parseInt(args[2]);

                if (!jumlah || jumlah < 1 || !menit || menit < 1) {
                    return reply(`❌ Format salah!\n\nContoh: *.mdrop start 50 30*\n(50 item, berlangsung 30 menit)`);
                }

                // Snapshot config at time of start
                const cfg = config.dropEventConfig || {};
                const eventName = cfg.name || 'Cookies';
                const eventEmoji = cfg.emoji || '🍪';
                const dropChance = cfg.dropChance || 5;
                const now = new Date();
                const expiresAt = new Date(now.getTime() + menit * 60 * 1000);

                config.activeDropEvent = {
                    active: true,
                    name: eventName,
                    emoji: eventEmoji,
                    totalStock: jumlah,
                    remainingStock: jumlah,
                    dropChance: dropChance,
                    startedAt: now,
                    expiresAt: expiresAt,
                    startedBy: sender.replace('@s.whatsapp.net', '').replace('@c.us', '')
                };

                // Invalidate cache
                MiningConfig.clearConfigCache?.();
                await config.save();

                return reply(
                    `✅ *EVENT DROP DIMULAI!*\n` +
                    `━━━━━━━━━━━━━━━━━━━━\n\n` +
                    `${eventEmoji} *Nama Event:* ${eventName}\n` +
                    `📦 *Total Stok:* ${jumlah} item\n` +
                    `⏱️ *Durasi:* ${menit} menit\n` +
                    `💧 *Drop Chance:* ${dropChance}% per mining\n\n` +
                    `_Semua player bisa dapat ${eventEmoji} ${eventName} saat nambang di floor manapun!_\n\n` +
                    `🛑 Hentikan kapanpun: *.mdrop stop*`
                );
            }

            // ── STOP ─────────────────────────────────────────────────────────
            if (sub === 'stop') {
                if (!config.activeDropEvent?.active) {
                    return reply(`❌ Tidak ada event yang sedang berjalan.`);
                }

                const ev = config.activeDropEvent;
                const distributed = ev.totalStock - ev.remainingStock;

                config.activeDropEvent.active = false;
                MiningConfig.clearConfigCache?.();
                await config.save();

                return reply(
                    `🛑 *EVENT DROP DIHENTIKAN!*\n\n` +
                    `${ev.emoji} *${ev.name}* sudah berakhir.\n` +
                    `📊 Item yang terdistribusi: *${distributed} / ${ev.totalStock}*\n` +
                    `${ev.remainingStock > 0 ? `♻️ Sisa ${ev.remainingStock} item hangus.` : '🎉 Semua item habis terdistribusi!'}`
                );
            }

            return reply(`❓ Sub-command tidak dikenal.\nGunakan: *.mdrop start [jumlah] [menit]* atau *.mdrop stop*`);

        } catch (error) {
            console.error('[mdrop] Error:', error);
            return reply('❌ Gagal mengelola event drop. Cek log untuk detail.');
        }
    }
};
