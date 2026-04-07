const { Tournament } = require('../../../models');

module.exports = {
    name: 'endgroup',
    description: 'Akhiri fase grup dan generate bracket playoff',
    category: 'tournament',
    usage: '.endgroup',

    execute: async ({ reply, isOwner, args, socket }) => {
        if (!isOwner) return reply('❌ Khusus Admin!');

        try {
            const active = await Tournament.getActive();
            // Socket is now from args
            const domain = 'https://nomercy.my.id';
            const webLink = `${domain}/tournament/live`;

            if (!active) return reply('❌ Tidak ada turnamen aktif.');

            // Allow override with --force
            const isForce = args.includes('--force');
            if (active.status !== 'group' && !isForce) return reply('❌ Turnamen bukan dalam fase grup. Gunakan .endgroup --force untuk reset bracket.');

            // Kumpulkan semua player dari semua grup
            let allPlayers = [];
            active.groups.forEach(g => {
                allPlayers.push(...g.players);
            });

            // Sorting Logic: Points -> (Match Win - Lose) -> (Game Win - Lose) -> Buchholz (Random for now) -> ID
            const sorted = allPlayers.sort((a, b) => {
                if (b.points !== a.points) return b.points - a.points;
                const winDiffA = a.win - a.lose;
                const winDiffB = b.win - b.lose;
                if (winDiffB !== winDiffA) return winDiffB - winDiffA;

                // Game diff Check (MPL Rules)
                const gameDiffA = (a.gameWin || 0) - (a.gameLose || 0);
                const gameDiffB = (b.gameWin || 0) - (b.gameLose || 0);
                if (gameDiffB !== gameDiffA) return gameDiffB - gameDiffA;

                return 0; // Draw
            });

            // Clear existing bracket just in case
            active.bracket = [];

            // Enable Double Elimination via flag
            if (args.includes('--double')) {
                active.config.playoffType = 'double';
                await active.save(); // Save config changes immediately
            }
            const isDoubleElim = active.config.playoffType === 'double';

            // Helper to broadcast
            const broadcastToLobby = async (msg, participants) => {
                if (active.lobbyGroupId && socket) {
                    try {
                        const mentions = participants.map(p => (p.id.includes('@') ? p.id : `${p.id}@s.whatsapp.net`));
                        await socket.sendMessage(active.lobbyGroupId, { text: msg, mentions });
                        reply('✅ Berhasil broadcast ke grup lobby.');
                    } catch (e) {
                        console.error('Broadcast failed:', e);
                        reply('⚠️ Gagal broadcast ke grup (cek bot admin).');
                    }
                } else {
                    reply(msg);
                }
            };

            // === SCENARIO 1: TOP 8 (HYBRID MPL STYLE) ===
            // Revised: Only trigger Top 8 if we have enough players for a proper large bracket (e.g., >= 12)
            // If we have 8-11 players, we prefer Top 6 (MPL Style) to ensure some elimination happens.
            if (sorted.length >= 10) {
                const topVal = sorted.slice(0, 8); // Top 8 Qualified

                if (isDoubleElim) {
                    // --- HYBRID DOUBLE ELIMINATION (Top 8) ---
                    // QF: Single Elim (Loser Out)
                    active.bracket.push(
                        { matchId: 'WB_QF1', p1: topVal[0].id, p1Name: topVal[0].name + " (#1)", p2: topVal[7].id, p2Name: topVal[7].name + " (#8)", format: active.config.playoffFormat, nextMatchId: 'WB_SF1', nextMatchSlot: 1, bracketType: 'upper' },
                        { matchId: 'WB_QF2', p1: topVal[3].id, p1Name: topVal[3].name + " (#4)", p2: topVal[4].id, p2Name: topVal[4].name + " (#5)", format: active.config.playoffFormat, nextMatchId: 'WB_SF1', nextMatchSlot: 2, bracketType: 'upper' },
                        { matchId: 'WB_QF3', p1: topVal[1].id, p1Name: topVal[1].name + " (#2)", p2: topVal[6].id, p2Name: topVal[6].name + " (#7)", format: active.config.playoffFormat, nextMatchId: 'WB_SF2', nextMatchSlot: 1, bracketType: 'upper' },
                        { matchId: 'WB_QF4', p1: topVal[2].id, p1Name: topVal[2].name + " (#3)", p2: topVal[5].id, p2Name: topVal[5].name + " (#6)", format: active.config.playoffFormat, nextMatchId: 'WB_SF2', nextMatchSlot: 2, bracketType: 'upper' }
                    );

                    // SF: Double Elim Start (Loser to LB_Semis)
                    // Note: Loser SF1 and SF2 drop to Lower Bracket Semis
                    active.bracket.push(
                        { matchId: 'WB_SF1', p1: null, p1Name: 'Winner QF1', p2: null, p2Name: 'Winner QF2', format: active.config.playoffFormat, nextMatchId: 'WB_Final', nextMatchSlot: 1, nextLoserMatchId: 'LB_Semis', nextLoserMatchSlot: 1, bracketType: 'upper' },
                        { matchId: 'WB_SF2', p1: null, p1Name: 'Winner QF3', p2: null, p2Name: 'Winner QF4', format: active.config.playoffFormat, nextMatchId: 'WB_Final', nextMatchSlot: 2, nextLoserMatchId: 'LB_Semis', nextLoserMatchSlot: 2, bracketType: 'upper' }
                    );

                    // LB Semis (Loser SF1 vs Loser SF2)
                    active.bracket.push(
                        { matchId: 'LB_Semis', p1: null, p1Name: 'Loser SF1', p2: null, p2Name: 'Loser SF2', format: active.config.playoffFormat, nextMatchId: 'LB_Final', nextMatchSlot: 1, bracketType: 'lower' }
                    );

                    // Finals
                    active.bracket.push(
                        { matchId: 'WB_Final', p1: null, p1Name: 'Winner SF1', p2: null, p2Name: 'Winner SF2', format: active.config.finalFormat, nextMatchId: 'GRAND_FINAL', nextMatchSlot: 1, nextLoserMatchId: 'LB_Final', nextLoserMatchSlot: 2, bracketType: 'upper' },
                        { matchId: 'LB_Final', p1: null, p1Name: 'Winner LB Semis', p2: null, p2Name: 'Loser WB Final', format: active.config.finalFormat, nextMatchId: 'GRAND_FINAL', nextMatchSlot: 2, bracketType: 'lower' },
                        { matchId: 'GRAND_FINAL', p1: null, p1Name: 'Winner WB', p2: null, p2Name: 'Winner LB', format: active.config.finalFormat, bracketType: 'final' }
                    );

                } else {
                    // --- SINGLE ELIMINATION ---
                    active.bracket.push(
                        { matchId: 'QF1', p1: topVal[0].id, p1Name: topVal[0].name + " (#1)", p2: topVal[7].id, p2Name: topVal[7].name + " (#8)", format: active.config.playoffFormat, nextMatchId: 'SF1', nextMatchSlot: 1 },
                        { matchId: 'QF2', p1: topVal[3].id, p1Name: topVal[3].name + " (#4)", p2: topVal[4].id, p2Name: topVal[4].name + " (#5)", format: active.config.playoffFormat, nextMatchId: 'SF1', nextMatchSlot: 2 },
                        { matchId: 'QF3', p1: topVal[1].id, p1Name: topVal[1].name + " (#2)", p2: topVal[6].id, p2Name: topVal[6].name + " (#7)", format: active.config.playoffFormat, nextMatchId: 'SF2', nextMatchSlot: 1 },
                        { matchId: 'QF4', p1: topVal[2].id, p1Name: topVal[2].name + " (#3)", p2: topVal[5].id, p2Name: topVal[5].name + " (#6)", format: active.config.playoffFormat, nextMatchId: 'SF2', nextMatchSlot: 2 }
                    );
                    active.bracket.push(
                        { matchId: 'SF1', p1: null, p1Name: 'Winner QF1', p2: null, p2Name: 'Winner QF2', format: active.config.playoffFormat, nextMatchId: 'FINAL', nextMatchSlot: 1 },
                        { matchId: 'SF2', p1: null, p1Name: 'Winner QF3', p2: null, p2Name: 'Winner QF4', format: active.config.playoffFormat, nextMatchId: 'FINAL', nextMatchSlot: 2 }
                    );
                    active.bracket.push(
                        { matchId: 'FINAL', p1: null, p1Name: 'Winner SF1', p2: null, p2Name: 'Winner SF2', format: active.config.finalFormat, nextMatchId: null }
                    );
                }

                // SAVE & BROADCAST
                active.status = 'playoff';
                await active.save();
                const mode = isDoubleElim ? 'Hybrid Double Elimination' : 'Single Elimination';
                let msg = `⚔️ *PLAYOFF BRACKET GENERATED (Top 8)* ⚔️\nMode: *${mode}*\nRank 5-8 Gugur di QF.\n\n`;
                msg += `Qualified:\n`;
                topVal.forEach((p, i) => msg += `${i + 1}. ${p.name} (${p.points} pts)\n`);
                msg += `\n🔴 Cek Bracket: ${webLink}`;

                await broadcastToLobby(msg, topVal);
                return;
            }

            // === SCENARIO 2: TOP 6 (Hybrid / Compact Double Elim) ===
            else if (sorted.length >= 6) {
                const top6 = sorted.slice(0, 6);

                if (isDoubleElim) {
                    // --- COMPACT DOUBLE ELIMINATION (Hybrid) ---
                    // QF is Single Elim (Loser Out). SF introduces Double Elim.

                    // 1. UPPER BRACKET QF (Single Elim step)
                    active.bracket.push(
                        // WB QF1: Rank 4 vs Rank 5 -> Winner to SF1, Loser OUT
                        { matchId: 'WB_QF1', p1: top6[3].id, p1Name: top6[3].name + " (#4)", p2: top6[4].id, p2Name: top6[4].name + " (#5)", format: active.config.playoffFormat, nextMatchId: 'WB_SF1', nextMatchSlot: 2, bracketType: 'upper' },

                        // WB QF2: Rank 3 vs Rank 6 -> Winner to SF2, Loser OUT
                        { matchId: 'WB_QF2', p1: top6[2].id, p1Name: top6[2].name + " (#3)", p2: top6[5].id, p2Name: top6[5].name + " (#6)", format: active.config.playoffFormat, nextMatchId: 'WB_SF2', nextMatchSlot: 2, bracketType: 'upper' }
                    );

                    // 2. UPPER BRACKET SF (Double Elim starts)
                    active.bracket.push(
                        // WB SF1: Rank 1 vs Winner QF1 -> Winner WB Final, Loser LB Semis
                        { matchId: 'WB_SF1', p1: top6[0].id, p1Name: top6[0].name + " (#1)", p2: null, p2Name: 'Winner QF1', format: active.config.playoffFormat, nextMatchId: 'WB_Final', nextMatchSlot: 1, nextLoserMatchId: 'LB_Semis', nextLoserMatchSlot: 1, bracketType: 'upper' },

                        // WB SF2: Rank 2 vs Winner QF2 -> Winner WB Final, Loser LB Semis
                        { matchId: 'WB_SF2', p1: top6[1].id, p1Name: top6[1].name + " (#2)", p2: null, p2Name: 'Winner QF2', format: active.config.playoffFormat, nextMatchId: 'WB_Final', nextMatchSlot: 2, nextLoserMatchId: 'LB_Semis', nextLoserMatchSlot: 2, bracketType: 'upper' }
                    );

                    // 3. LOWER BRACKET (Compact)
                    active.bracket.push(
                        // LB Semis: Loser SF1 vs Loser SF2
                        { matchId: 'LB_Semis', p1: null, p1Name: 'Loser SF1', p2: null, p2Name: 'Loser SF2', format: active.config.playoffFormat, nextMatchId: 'LB_Final', nextMatchSlot: 1, bracketType: 'lower' }
                    );

                    // 4. FINALS
                    active.bracket.push(
                        // WB Final: Winner SF1 vs Winner SF2 -> Winner GF, Loser LB Final
                        { matchId: 'WB_Final', p1: null, p1Name: 'Winner SF1', p2: null, p2Name: 'Winner SF2', format: active.config.finalFormat, nextMatchId: 'GRAND_FINAL', nextMatchSlot: 1, nextLoserMatchId: 'LB_Final', nextLoserMatchSlot: 2, bracketType: 'upper' },

                        // LB Final: Winner LB Semis vs Loser WB Final -> Winner GF
                        { matchId: 'LB_Final', p1: null, p1Name: 'Winner LB Semis', p2: null, p2Name: 'Loser WB Final', format: active.config.finalFormat, nextMatchId: 'GRAND_FINAL', nextMatchSlot: 2, bracketType: 'lower' },

                        // GRAND FINAL
                        { matchId: 'GRAND_FINAL', p1: null, p1Name: 'Winner WB', p2: null, p2Name: 'Winner LB', format: active.config.finalFormat, bracketType: 'final' }
                    );

                } else {
                    // --- SINGLE ELIMINATION TOP 6 (Existing Logic) ---
                    active.bracket.push(
                        { matchId: 'QF1', p1: top6[3].id, p1Name: top6[3].name, p2: top6[4].id, p2Name: top6[4].name, format: active.config.playoffFormat, nextMatchId: 'SF1', nextMatchSlot: 2 },
                        { matchId: 'QF2', p1: top6[2].id, p1Name: top6[2].name, p2: top6[5].id, p2Name: top6[5].name, format: active.config.playoffFormat, nextMatchId: 'SF2', nextMatchSlot: 2 }
                    );
                    active.bracket.push(
                        { matchId: 'SF1', p1: top6[0].id, p1Name: top6[0].name, p2: null, p2Name: 'Winner QF1', format: active.config.playoffFormat, nextMatchId: 'FINAL', nextMatchSlot: 1 },
                        { matchId: 'SF2', p1: top6[1].id, p1Name: top6[1].name, p2: null, p2Name: 'Winner QF2', format: active.config.playoffFormat, nextMatchId: 'FINAL', nextMatchSlot: 2 }
                    );
                    active.bracket.push(
                        { matchId: 'FINAL', p1: null, p1Name: 'Winner SF1', p2: null, p2Name: 'Winner SF2', format: active.config.finalFormat, nextMatchId: null }
                    );
                }

                active.status = 'playoff';
                await active.save();

                const mode = isDoubleElim ? 'Top 6 Double Elimination' : 'Top 6 Bye System (Single)';
                const msg = `⚔️ *PLAYOFF BRACKET GENERATED (Top 6)* ⚔️\nMode: ${mode}\nRank 1&2 lolos ke SF.\n\n🔴 Cek Bracket: ${webLink}`;

                await broadcastToLobby(msg, top6); // Correctly mention top 6 only
                return;
            }

            // === SCENARIO 3: TOP 4 (Single Elim) ===
            else if (sorted.length >= 4) {
                const top4 = sorted.slice(0, 4);
                active.bracket.push(
                    { matchId: 'SF1', p1: top4[0].id, p1Name: top4[0].name, p2: top4[3].id, p2Name: top4[3].name, format: active.config.playoffFormat, nextMatchId: 'FINAL', nextMatchSlot: 1 },
                    { matchId: 'SF2', p1: top4[1].id, p1Name: top4[1].name, p2: top4[2].id, p2Name: top4[2].name, format: active.config.playoffFormat, nextMatchId: 'FINAL', nextMatchSlot: 2 }
                );
                active.bracket.push(
                    { matchId: 'FINAL', p1: null, p1Name: 'Winner SF1', p2: null, p2Name: 'Winner SF2', format: active.config.finalFormat, nextMatchId: null }
                );

                active.status = 'playoff';
                await active.save();
                const msg = `⚔️ *PLAYOFF BRACKET GENERATED (Top 4)* ⚔️\n🔴 Cek Bracket: ${webLink}`;
                await broadcastToLobby(msg, sorted.slice(0, 4));
                return;
            }

            else {
                return reply('❌ Peserta kurang dari 4. Tidak bisa Playoff.');
            }

        } catch (error) {
            console.error('EndGroup Error:', error);
            return reply('❌ Terjadi error saat generate bracket.');
        }
    }
};
