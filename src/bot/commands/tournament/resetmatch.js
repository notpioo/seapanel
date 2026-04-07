const { Tournament } = require('../../../models');

module.exports = {
    name: 'resetmatch',
    description: 'Reset a finished match score and revert player stats (Admin Only)',
    category: 'tournament',
    usage: '.resetmatch [MatchID]',
    aliases: ['undo', 'hapusskor'],

    execute: async ({ reply, args, isOwner }) => {
        if (!isOwner) return reply('❌ Khusus Admin!');

        const matchId = args[0]?.toUpperCase();
        if (!matchId) return reply('❌ Masukkan Match ID!\nContoh: .resetmatch M1');

        try {
            const active = await Tournament.getActive();
            if (!active) return reply('❌ Tidak ada turnamen aktif.');

            let match = null;
            let group = null;

            // Cari di Group
            if (active.status === 'group') {
                for (const g of active.groups) {
                    const m = g.matches.find(x => x.matchId === matchId);
                    if (m) {
                        match = m;
                        group = g;
                        break;
                    }
                }
            }
            // Cari di Bracket (Playoff)
            else if (active.status === 'playoff') {
                match = active.bracket.find(x => x.matchId === matchId);
            }

            if (!match) return reply(`❌ Match ID *${matchId}* tidak ditemukan.`);
            if (!match.isFinished) return reply('⚠️ Match ini belum selesai, tidak perlu di-reset.');

            // === LOGIC REVERT STATS (KHUSUS GROUP) ===
            // Kalau Playoff, cuma reset bracket progression manual (agak ribet kalau winner udah lanjut), 
            // tapi minimal status match jadi open lagi.

            if (active.status === 'group' && group) {
                const s1 = match.score[0];
                const s2 = match.score[1];
                const p1Stats = group.players.find(p => p.id === match.p1);
                const p2Stats = group.players.find(p => p.id === match.p2);

                if (p1Stats && p2Stats) {
                    // Revert Matches Played
                    p1Stats.matchesPlayed = Math.max(0, p1Stats.matchesPlayed - 1);
                    p2Stats.matchesPlayed = Math.max(0, p2Stats.matchesPlayed - 1);

                    // Revert Game Stats (Game Win/Lose)
                    // P1: GW -= s1, GL -= s2
                    // P2: GW -= s2, GL -= s1
                    p1Stats.gameWin = Math.max(0, (p1Stats.gameWin || 0) - s1);
                    p1Stats.gameLose = Math.max(0, (p1Stats.gameLose || 0) - s2);

                    p2Stats.gameWin = Math.max(0, (p2Stats.gameWin || 0) - s2);
                    p2Stats.gameLose = Math.max(0, (p2Stats.gameLose || 0) - s1);

                    // Revert Match Result Logic (Points & W/L/D)
                    if (s1 > s2) { // P1 Menang Dulu
                        p1Stats.win = Math.max(0, p1Stats.win - 1);
                        p1Stats.points = Math.max(0, p1Stats.points - active.config.pointsWin);

                        p2Stats.lose = Math.max(0, p2Stats.lose - 1);
                        p2Stats.points = Math.max(0, p2Stats.points - active.config.pointsLose);
                    }
                    else if (s2 > s1) { // P2 Menang Dulu
                        p2Stats.win = Math.max(0, p2Stats.win - 1);
                        p2Stats.points = Math.max(0, p2Stats.points - active.config.pointsWin);

                        p1Stats.lose = Math.max(0, p1Stats.lose - 1);
                        p1Stats.points = Math.max(0, p1Stats.points - active.config.pointsLose);
                    }
                    else { // Draw Dulu
                        p1Stats.draw = Math.max(0, p1Stats.draw - 1);
                        p2Stats.draw = Math.max(0, p2Stats.draw - 1);
                        p1Stats.points = Math.max(0, p1Stats.points - active.config.pointsDraw);
                        p2Stats.points = Math.max(0, p2Stats.points - active.config.pointsDraw);
                    }
                }
            }

            // === RESET MATCH DATA ===
            match.score = [0, 0];
            match.winner = null;
            match.isFinished = false;

            // Warning for Bracket: Resetting bracket match DOES NOT undo next match progression automatically
            // Admin must reset next match manually if needed.

            await active.save();
            return reply(`✅ Match *${matchId}* berhasil di-reset!\nStatus: Belum Selesai.\nSilakan input ulang skor yang benar.`);

        } catch (error) {
            console.error('ResetMatch error:', error);
            reply('❌ Gagal reset match.');
        }
    }
};
