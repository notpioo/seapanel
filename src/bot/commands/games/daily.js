const { RPGPlayer } = require('../../../models');

module.exports = {
    name: 'daily',
    description: 'Klaim 1 Scroll gratis setiap hari',
    category: 'games',
    usage: '.daily',
    aliases: ['claim'],

    execute: async ({ reply, sender }) => {
        try {
            const player = await RPGPlayer.findOne({ phoneNumber: sender });
            if (!player) return reply('Kamu belum punya akun RPG!\nKetik *.rpg* untuk mendaftar.');

            const now = new Date();
            const last = player.lastDaily;

            if (last) {
                const diff = now - last;
                const hours = diff / (1000 * 60 * 60);

                if (hours < 24) {
                    const remaining = 24 - hours;
                    const hh = Math.floor(remaining);
                    const mm = Math.floor((remaining - hh) * 60);
                    return reply(
                        `⏳ *Daily sudah diklaim!*\n\n` +
                        `Bisa klaim lagi dalam *${hh}j ${mm}m*\n\n` +
                        `Scroll kamu: *${player.scrolls || 0}* 📜`
                    );
                }
            }

            player.scrolls = (player.scrolls || 0) + 1;
            player.lastDaily = now;
            await player.save();

            return reply(
                `📜 *Daily Claim Berhasil!*\n\n` +
                `+1 Scroll diterima!\n` +
                `Total Scroll: *${player.scrolls}*\n\n` +
                `Klaim lagi besok ya!\n` +
                `Ketik *.gacha* untuk summon hero.`
            );
        } catch (error) {
            console.error('Daily error:', error);
            return reply('Terjadi error. Coba lagi nanti.');
        }
    }
};
