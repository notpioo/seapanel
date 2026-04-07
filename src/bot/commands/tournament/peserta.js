const { Tournament } = require('../../../models');

module.exports = {
    name: 'peserta',
    description: 'List tournament participants',
    category: 'tournament',
    usage: '.peserta',
    aliases: ['participants', 'listplayer'],

    execute: async ({ reply }) => {
        try {
            const active = await Tournament.getActive();

            if (!active) {
                return reply('❌ Tidak ada turnamen aktif.');
            }

            if (active.participants.length === 0) {
                return reply('Belum ada peserta yang daftar. Jadilah yang pertama! Ketik *.join*');
            }

            const list = active.participants.map((p, i) => {
                return `${i + 1}. ${p.name}`; // Format: 1. Budi
            }).join('\n');

            const domain = 'https://nomercy.my.id';
            const webLink = `${domain}/tournament/live`;

            return reply(`
👥 *LIST PESERTA (${active.participants.length})*
🏆 ${active.name}
━━━━━━━━━━━━━━━━━━━━
${list}

Ketik *.join* untuk ikutan!
🔗 Live: ${webLink}
            `.trim());

        } catch (error) {
            console.error('Peserta error:', error);
            reply('❌ Gagal memuat data.');
        }
    }
};
