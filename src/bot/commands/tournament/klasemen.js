const { Tournament } = require('../../../models');

module.exports = {
    name: 'klasemen',
    description: 'View group standings',
    category: 'tournament',
    usage: '.klasemen',
    aliases: ['standings', 'rank'],

    execute: async ({ reply }) => {
        try {
            const active = await Tournament.getActive();
            if (!active) return reply('❌ Tidak ada turnamen aktif.');

            if (active.status !== 'group') {
                return reply(`⚠️ Turnamen sedang ada di fase: ${active.status} (Bukan Grup)`);
            }

            let msg = `🏆 *KLASEMEN GRUP* 🏆\nTurnamen: ${active.name}\n`;

            for (const g of active.groups) {
                // Determine Cutoff Rank (Same logic info)
                const totalP = g.players.length;
                let cutoffIndex = 3;
                if (totalP >= 10) cutoffIndex = 7;
                else if (totalP >= 8) cutoffIndex = 5;
                else if (totalP < 4) cutoffIndex = 99;

                // Sort stats: Points -> Game Difference (GD) -> Win -> HeadToHead (Skip)
                const sorted = [...g.players].sort((a, b) => {
                    if (b.points !== a.points) return b.points - a.points;

                    // Game Diff Logic
                    const gdA = (a.gameWin || 0) - (a.gameLose || 0);
                    const gdB = (b.gameWin || 0) - (b.gameLose || 0);
                    if (gdA !== gdB) return gdB - gdA; // Higher GD first

                    return b.win - a.win;
                });

                // Header Adjusted (Remove M and GD for Mobile Ultra Friendly)
                msg += `\n📌 *${g.name}*`;
                msg += `\n\`\`\`RK NAME     W-L  PTS`;
                msg += `\n-- -------- ----- ---`;

                sorted.forEach((p, index) => {
                    // Nama: Max 8 chars (biar makin muat)
                    let name = p.name;
                    if (name.length > 8) name = name.substring(0, 7) + '.';
                    const padName = name.padEnd(8, ' ');

                    const rank = (index + 1).toString().padEnd(2, ' ');
                    // Remove M column
                    // const m = p.matchesPlayed.toString().padEnd(3, ' '); 
                    const wl = `${p.win}-${p.lose}`.padEnd(5, ' ');

                    const pts = p.points.toString().padStart(3, ' ');

                    // Format: RANK NAME W-L PTS
                    msg += `\n${rank} ${padName} ${wl} ${pts}`;

                    // Garis batas lolos
                    if (index === cutoffIndex && index < sorted.length - 1) {
                        msg += `\n-- ------------------`;
                    }
                });
                msg += `\`\`\``; // End Monospace
            }

            const domain = 'https://nomercy.my.id';
            const webLink = `${domain}/tournament/live`;

            msg += `\n\n_Semangat bertanding!_\n🔗 Live: ${webLink}`;

            return reply(msg);

        } catch (error) {
            console.error('Klasemen error:', error);
            reply('❌ Gagal memuat klasemen.');
        }
    }
};
