const { Tournament } = require('../../../models');

module.exports = {
    name: 'setscore',
    description: 'Set match score (Admin)',
    category: 'tournament',
    usage: '.setscore [MatchID] [ScoreP1] [ScoreP2]',
    aliases: ['inputscore', 'skor'],

    execute: async ({ reply, args, isOwner, socket }) => {
        if (!isOwner) return reply('❌ Khusus Admin!');

        const matchId = args[0];
        const s1 = parseInt(args[1]);
        const s2 = parseInt(args[2]);

        if (!matchId || isNaN(s1) || isNaN(s2)) {
            return reply('❌ Format salah!\nContoh: *.setscore A1 1 0*');
        }

        try {
            const active = await Tournament.getActive();
            if (!active) return reply('❌ Tidak ada turnamen aktif.');

            let match = null;
            let group = null;

            // Cari match (Group / Bracket)
            if (active.status === 'group') {
                for (const g of active.groups) {
                    const m = g.matches.find(x => x.matchId === matchId);
                    if (m) { match = m; group = g; break; }
                }
            } else if (active.status === 'playoff') {
                match = active.bracket.find(x => x.matchId === matchId);
            }

            if (!match) return reply(`❌ Match ID *${matchId}* tidak ditemukan.`);
            if (match.isFinished) return reply('⚠️ Match ini sudah selesai.');
            if (s1 < 0 || s2 < 0) return reply('❌ Skor tidak bisa negatif.');

            // Update Score & Status
            match.score = [s1, s2];
            match.isFinished = true;

            // Determine Winner
            let winnerId = null;
            if (s1 > s2) winnerId = match.p1;
            else if (s2 > s1) winnerId = match.p2;

            if (!winnerId && active.status === 'playoff') {
                // Playoff wajib ada pemenang
                match.isFinished = false; // rollback
                return reply('❌ Playoff tidak boleh Draw!');
            }

            match.winner = winnerId;
            const winnerName = winnerId ? (winnerId === match.p1 ? match.p1Name : match.p2Name) : 'Draw';

            // === UPDATE KLASEMEN (GROUP ONLY) ===
            if (active.status === 'group' && group) {
                const p1Stats = group.players.find(p => p.id === match.p1);
                const p2Stats = group.players.find(p => p.id === match.p2);

                if (p1Stats && p2Stats) {
                    p1Stats.matchesPlayed++; p2Stats.matchesPlayed++;
                    p1Stats.gameWin = (p1Stats.gameWin || 0) + s1;
                    p1Stats.gameLose = (p1Stats.gameLose || 0) + s2;
                    p2Stats.gameWin = (p2Stats.gameWin || 0) + s2;
                    p2Stats.gameLose = (p2Stats.gameLose || 0) + s1;

                    if (s1 > s2) {
                        p1Stats.win++;

                        // Menang 2-0: +3, Menang 2-1: +2
                        if (s2 === 0) p1Stats.points += 3;
                        else p1Stats.points += 2;

                        p2Stats.lose++;
                        // Kalah 1-2: +1, Kalah 0-2: +0
                        if (s2 > 0) p2Stats.points += 1;
                        else p2Stats.points += 0;

                    } else if (s2 > s1) {
                        p2Stats.win++;

                        // Menang 2-0: +3, Menang 2-1: +2
                        if (s1 === 0) p2Stats.points += 3;
                        else p2Stats.points += 2;

                        p1Stats.lose++;
                        // Kalah 1-2: +1, Kalah 0-2: +0
                        if (s1 > 0) p1Stats.points += 1;
                        else p1Stats.points += 0;

                    } else {
                        // Draw (BO2)
                        p1Stats.draw++; p1Stats.points += 1;
                        p2Stats.draw++; p2Stats.points += 1;
                    }
                }
            }

            // === UPDATE BRACKET (PLAYOFF ONLY) ===
            let championMsg = null;
            if (active.status === 'playoff' && winnerId) {
                const loserId = match.winner === match.p1 ? match.p2 : match.p1;
                const loserName = match.winner === match.p1 ? match.p2Name : match.p1Name;

                // 1. Advance WINNER
                if (match.nextMatchId) {
                    const nextMatch = active.bracket.find(m => m.matchId === match.nextMatchId);
                    if (nextMatch) {
                        if (match.nextMatchSlot === 1) { nextMatch.p1 = winnerId; nextMatch.p1Name = winnerName; }
                        else if (match.nextMatchSlot === 2) { nextMatch.p2 = winnerId; nextMatch.p2Name = winnerName; }
                        // Reset next match if it was finished (re-play scenario)
                        nextMatch.isFinished = false;
                        nextMatch.score = [0, 0];
                        nextMatch.winner = null;
                    }
                }

                // 2. Drop LOSER (Double Elim)
                if (match.nextLoserMatchId) {
                    const loserMatch = active.bracket.find(m => m.matchId === match.nextLoserMatchId);
                    if (loserMatch) {
                        if (match.nextLoserMatchSlot === 1) { loserMatch.p1 = loserId; loserMatch.p1Name = loserName; }
                        else if (match.nextLoserMatchSlot === 2) { loserMatch.p2 = loserId; loserMatch.p2Name = loserName; }
                        loserMatch.isFinished = false;
                        loserMatch.score = [0, 0];
                        loserMatch.winner = null;
                    }
                }

                // 3. Declare Champion
                // Condition: Winning FINAL (Single Elim) OR Winning GRAND_FINAL (Double Elim)
                // And no more next matches
                const isChampion = !match.nextMatchId && (match.matchId === 'FINAL' || match.matchId === 'GRAND_FINAL');

                if (isChampion) {
                    active.champion = winnerName;
                    active.status = 'finished';
                    // Auto Archive
                    const { TournamentHistory } = require('../../../models');
                    await TournamentHistory.archiveTournament(active, match);
                    championMsg = `🏆 *CHAMPION!!*\nSelamat kepada *${winnerName}* telah menjuarai turnamen *${active.name}*!`;
                }
            }

            await active.save();

            // Broadcast Result to Lobby
            if (active.lobbyGroupId && socket) {
                let msg = '';
                let mentions = [];
                const loserId = match.winner === match.p1 ? match.p2 : match.p1;

                // Helper to clean names (remove seed like " (#1)")
                const cleanName = (name) => name ? name.replace(/\s\(\#\d+\)/g, '') : 'Unknown';

                const p1Clean = cleanName(match.p1Name);
                const p2Clean = cleanName(match.p2Name);
                const winnerClean = cleanName(winnerName);
                const loserClean = cleanName(match.winner === match.p1 ? match.p2Name : match.p1Name);

                if (championMsg) {
                    msg = `🏆 *TOURNAMENT FINISHED*\n\n`;
                    msg += `Selamat kepada *${winnerClean}* 👑\n`;
                    msg += `Telah menjadi JUARA turnamen *${active.name}*! 🥳\n\n`;
                    msg += `Runner Up: *${loserClean}*\n\n`;
                    msg += `🔥 Terima kasih kepada seluruh peserta yang telah berpartisipasi!`;

                    // --- HIDDEN TAG ALL PARTICIPANTS ---
                    // Tag semua peserta agar mendapatkan notifikasi kemenangan
                    if (active.participants && active.participants.length > 0) {
                        mentions = active.participants
                            .map(p => p.id)
                            .filter(id => id && id.includes('@s.whatsapp.net'));
                    }
                } else {
                    msg = `✅ *MATCH RESULT*\n`;
                    msg += `🆔 Match: *${match.matchId}*\n\n`;
                    msg += `${p1Clean} *${s1} - ${s2}* ${p2Clean}\n`;
                    msg += `🏅 Winner: *${winnerClean}*\n`;

                    // --- ELIMINATION LOGIC ---
                    let isEliminated = false;

                    if (active.status === 'playoff') {
                        if (active.config.playoffType === 'single') {
                            isEliminated = true;
                        } else if (active.config.playoffType === 'double') {
                            if (match.bracketType === 'lower' || match.matchId.includes('LB')) {
                                isEliminated = true;
                            }
                        }
                    }

                    if (active.status === 'playoff') {
                        if (match.nextMatchId) {
                            msg += `\n➡️ Next: *${match.nextMatchId}*`;
                        } else if (!isEliminated && active.config.playoffType === 'double') {
                            msg += `\n⚠️ Turun ke *Lower Bracket*`;
                        }
                    }

                    if (isEliminated) {
                        let rankText = '';
                        if (match.matchId.includes('Final')) rankText = ' (3rd Place)';
                        else if (match.matchId.includes('Semis') || match.matchId.includes('SF')) rankText = ' (Top 4)';
                        else if (match.matchId.includes('QF')) rankText = ' (Top 8)';

                        if (loserId && loserId.includes('@s.whatsapp.net')) {
                            mentions.push(loserId);
                            msg += `\n\n🥀 Nice Try @${loserId.split('@')[0]}${rankText}`;
                        } else {
                            msg += `\n\n🥀 Nice Try ${loserClean}${rankText}`;
                        }
                    }



                    // Add Link
                    const domain = 'https://nomercy.my.id';
                    const liveUrl = `${domain}/tournament/live`;
                    msg += `\n\nCek: ${liveUrl}`;

                    try {
                        await socket.sendMessage(active.lobbyGroupId, {
                            text: msg,
                            mentions: mentions,
                            contextInfo: {
                                externalAdReply: {
                                    title: '⚽ MATCH RESULT',
                                    body: active.name,
                                    mediaType: 1,
                                    renderLargerThumbnail: true,
                                    thumbnailUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(active.name)}&background=0D8ABC&color=fff&size=512`,
                                    sourceUrl: liveUrl
                                }
                            }
                        });
                    } catch (e) {
                        console.error('Broadcast failed:', e);
                    }
                } // End if (championMsg) / else

                if (championMsg) return reply(championMsg);
                return reply(`✅ Skor diupdate: *${match.p1Name} ${s1} - ${s2} ${match.p2Name}*`);

            } // End if (active.lobbyGroupId && socket)

        } catch (error) {
            console.error('SetScore error:', error);
            return reply('❌ Gagal update skor.');
        }
    }
};
