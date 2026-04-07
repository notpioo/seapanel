const { Tournament } = require('../../../models');

module.exports = {
    name: 'stats',
    description: 'Show player tournament statistics',
    category: 'tournament',
    usage: '.stats [User]',
    aliases: ['stat', 'profil', 'profile'],

    execute: async ({ reply, args, sender, mentions }) => {
        try {
            const active = await Tournament.getActive();
            if (!active) return reply('❌ Tidak ada turnamen aktif.');

            // Determine Target User
            let targetId = sender.replace('@s.whatsapp.net', '').replace('@c.us', '');
            let targetName = 'Kamu';

            if (mentions && mentions.length > 0) {
                targetId = mentions[0].replace('@s.whatsapp.net', '').replace('@c.us', '');
                targetName = mentions[0]; // Just use ID for now or fetch name if available
            } else if (args.length > 0) {
                // Search by name (partial)
                const searchName = args.join(' ').toLowerCase();
                const found = active.participants.find(p => p.name.toLowerCase().includes(searchName));
                if (found) {
                    targetId = found.id;
                    targetName = found.name;
                }
            }

            // Find Participant Data
            const participant = active.participants.find(p => p.id === targetId);
            if (!participant) return reply(`❌ User ${targetName} tidak terdaftar di turnamen ini.`);

            // --- 1. RANK & WIN RATE (From Group Stage) ---
            let rankText = '-';
            let wrText = '-';
            let matchStats = '';

            if (active.status === 'group') {
                // Find user's group
                let userGroup = null;
                for (const g of active.groups) {
                    if (g.players.some(p => p.id === targetId)) {
                        userGroup = g;
                        break;
                    }
                }

                if (userGroup) {
                    // Calculate Rank
                    // Sort group players to find rank
                    const sortedPlayers = [...userGroup.players].sort((a, b) => {
                        if (b.points !== a.points) return b.points - a.points;
                        if (b.win !== a.win) return b.win - a.win;
                        const diffA = a.gameWin - a.gameLose;
                        const diffB = b.gameWin - b.gameLose;
                        if (diffB !== diffA) return diffB - diffA;
                        return b.gameWin - a.gameWin;
                    });

                    const rank = sortedPlayers.findIndex(p => p.id === targetId) + 1;
                    rankText = `#${rank} (${userGroup.name})`;

                    // Calculate WR
                    const pStats = userGroup.players.find(p => p.id === targetId);
                    if (pStats.matchesPlayed > 0) {
                        const wr = (pStats.win / pStats.matchesPlayed) * 100;
                        wrText = `${wr.toFixed(0)}%`;
                        matchStats = `(${pStats.win}W - ${pStats.lose}L - ${pStats.draw}D)`;
                    } else {
                        wrText = '-';
                        matchStats = '(0 Match)';
                    }
                }
            } else if (active.status === 'playoff') {
                // Manual check in bracket (simpler version)
                // WR calculation in bracket is harder, maybe just show status
                const inBracket = active.bracket.some(m => !m.isFinished && (m.p1 === targetId || m.p2 === targetId));
                if (inBracket) rankText = 'Active (Playoff)';
                else rankText = 'Eliminated / Waiting';

                // TODO: Calculate advanced playoff stats if needed
            }


            // --- CONSTRUCT REPLY ---
            const replyMsg = `
📊 *PLAYER STATS*
👤 Name: *${participant.name}*
━━━━━━━━━━━━━━━━━━━━
🏆 Rank: *${rankText}*
🔥 Win Rate: *${wrText}* ${matchStats}
━━━━━━━━━━━━━━━━━━━━
            `.trim();

            reply(replyMsg);

        } catch (error) {
            console.error('Stats error:', error);
            reply('❌ Gagal memuat statistik.');
        }
    }
};
