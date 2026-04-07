/**
 * MiningWeb Command - Toggle Mining Web Panel (Owner only)
 * Usage: .miningweb open | .miningweb close | .miningweb status
 */

const BotSettings = require('../../../models/BotSettings');

module.exports = {
    name: 'miningweb',
    aliases: ['mweb'],
    category: 'owner',
    description: 'Toggle tombol Mine Now di web panel (Owner only)',
    usage: '.miningweb open | .miningweb close | .miningweb status',
    ownerOnly: true,

    async execute({ reply, text }) {
        const arg = (text || '').trim().toLowerCase();

        if (!arg || !['open', 'close', 'status'].includes(arg)) {
            return reply(
                `⛏️ *Mining Web Panel Toggle*\n\n` +
                `Penggunaan:\n` +
                `• *.miningweb open* — Aktifkan tombol Mine Now di web\n` +
                `• *.miningweb close* — Nonaktifkan tombol Mine Now di web\n` +
                `• *.miningweb status* — Cek status saat ini`
            );
        }

        try {
            const settings = await BotSettings.getSettings();

            if (arg === 'status') {
                const statusText = settings.miningWebEnabled ? '🟢 *OPEN* (Aktif)' : '🔴 *CLOSED* (Nonaktif)';
                return reply(`⛏️ *Mining Web Panel Status*\n\nStatus saat ini: ${statusText}`);
            }

            const newValue = arg === 'open';

            if (settings.miningWebEnabled === newValue) {
                const already = newValue ? 'sudah *OPEN*' : 'sudah *CLOSED*';
                return reply(`⚠️ Mining Web Panel ${already}, tidak ada perubahan.`);
            }

            await BotSettings.updateSettings({ miningWebEnabled: newValue });

            if (newValue) {
                return reply(
                    `✅ *Mining Web Panel DIBUKA!*\n\n` +
                    `Tombol "Mine Now" di halaman /mining sekarang *aktif*.\n` +
                    `User bisa tambang via web panel.\n\n` +
                    `⚡ Untuk menutup kembali: *.miningweb close*`
                );
            } else {
                return reply(
                    `🔒 *Mining Web Panel DITUTUP!*\n\n` +
                    `Tombol "Mine Now" di halaman /mining sekarang *dinonaktifkan*.\n` +
                    `User harus gunakan bot (.mine) untuk tambang.\n\n` +
                    `⚡ Untuk membuka kembali: *.miningweb open*`
                );
            }
        } catch (error) {
            console.error('[miningweb] Error:', error);
            return reply('❌ Gagal mengubah status Mining Web Panel. Cek log untuk detail.');
        }
    },
};
