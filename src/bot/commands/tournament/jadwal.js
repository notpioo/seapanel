const { Tournament } = require('../../../models');

module.exports = {
    name: 'jadwal',
    description: 'View upcoming matches',
    category: 'tournament',
    usage: '.jadwal',
    aliases: ['schedule', 'matches'],

    execute: async ({ reply }) => {
        try {
            const active = await Tournament.getActive();
            if (!active) return reply('❌ Tidak ada turnamen aktif.');

            let msg = `📅 *JADWAL PERTANDINGAN*\n🏆 ${active.name}\n━━━━━━━━━━━━━━━━━━━━\n\n`;

            if (active.status === 'group') {
                let hasMatch = false;
                for (const g of active.groups) {
                    const pending = g.matches.filter(m => !m.isFinished);
                    if (pending.length > 0) {
                        hasMatch = true;
                        msg += `*${g.name}*\n`;
                        pending.forEach(m => {
                            msg += `🆔 *${m.matchId}*: ${m.p1Name} 🆚 ${m.p2Name}\n`;
                            // Show current score if game started
                            if (m.score[0] > 0 || m.score[1] > 0) {
                                msg += `   Score: ${m.score[0]} - ${m.score[1]} (Live)\n`;
                            }
                        });
                        msg += '\n';
                    }
                }
                if (!hasMatch) msg += "✅ Semua pertandingan grup selesai! Admin bisa lanjut ke Playoff.";
            }
            else if (active.status === 'playoff') {
                const pending = active.bracket.filter(m => !m.isFinished && m.p1 && m.p2);
                if (pending.length > 0) {
                    msg += `⚔️ *PLAYOFF*\n`;
                    pending.forEach(m => {
                        msg += `🆔 *${m.matchId}*: ${m.p1Name} 🆚 ${m.p2Name} (${m.format.toUpperCase()})\n`;
                        if (m.score[0] > 0 || m.score[1] > 0) {
                            msg += `   Score: ${m.score[0]} - ${m.score[1]}\n`;
                        }
                    });
                } else {
                    msg += "✅ Menunggu jadwal bracket selanjutnya / Selesai.";
                }
            }
            else {
                msg += "Belum ada jadwal. Fase: " + active.status;
            }

            const domain = 'https://nomercy.my.id';
            const webLink = `${domain}/tournament/live`;

            msg += `\n━━━━━━━━━━━━━━━━━━━━\n🔴 *LIVE BRACKET WEB:*\n${webLink}`;

            return reply(msg.trim());

        } catch (error) {
            console.error('Jadwal error:', error);
            reply('❌ Error.');
        }
    }
};
