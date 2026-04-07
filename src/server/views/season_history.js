const { TournamentHistory } = require('../../models');

function renderHistoryMatchBox(m) {
        if (!m) return '';
                    return `
                    <div style="background:#1a1a1a;border:1px solid #333;border-radius:8px;width:220px;box-shadow:0 4px 6px rgba(0,0,0,0.3);">
                        <div style="font-size:10px;color:#666;padding:4px 8px;border-bottom:1px solid #333;display:flex;justify-content:space-between;">
                            <span>${m.matchId}</span>
                            <span>${m.format ? m.format.toUpperCase() : 'BO1'}</span>
                        </div>
                        <div style="padding:8px 12px;display:flex;justify-content:space-between;align-items:center;${m.winner && m.winner === m.p1 ? 'background:rgba(255,215,0,0.1);color:#ffd700;' : ''}">
                            <span style="font-weight:500;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:140px;">${m.p1Name || 'TBD'}</span>
                            <span style="background:#333;padding:2px 6px;border-radius:4px;font-size:12px;">${m.score ? m.score[0] : '-'}</span>
                        </div>
                        <div style="padding:8px 12px;display:flex;justify-content:space-between;align-items:center;border-top:1px solid #333;${m.winner && m.winner === m.p2 ? 'background:rgba(255,215,0,0.1);color:#ffd700;' : ''}">
                            <span style="font-weight:500;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:140px;">${m.p2Name || 'TBD'}</span>
                            <span style="background:#333;padding:2px 6px;border-radius:4px;font-size:12px;">${m.score ? m.score[1] : '-'}</span>
                        </div>
                    </div>`;
    }
async function getSeasonHistoryPage(season) {
        const data = await TournamentHistory.getBySeason(season);

                    if (!data) {
            return `
                    <header class="header">
                        <h1 class="header-title">Season Not Found</h1>
                    </header>
                    <div class="content">
                        <div class="hof-empty">
                            <div class="hof-empty-icon">❌</div>
                            <div class="hof-empty-text">Season ${season} tidak ditemukan.</div>
                            <a href="/hall-of-fame" style="color: var(--accent); text-decoration: none; margin-top: 16px; display: inline-block;">← Back to Hall of Fame</a>
                        </div>
                    </div>
                    `;
        }

        const formatDate = (d) => {
            if (!d) return '-';
                    return new Date(d).toLocaleDateString('en-US', {year: 'numeric', month: 'short', day: 'numeric' });
        };

        // Helper
        const MatchBox = (m) => renderHistoryMatchBox(m);

                    // === STANDINGS TABLE ===
                    let standingsHTML = '';
        if (data.groupStandings && data.groupStandings.length > 0) {
                        data.groupStandings.forEach(g => {
                            const sorted = [...g.players].sort((a, b) => {
                                if (b.points !== a.points) return b.points - a.points;
                                const gdA = (a.gameWin || 0) - (a.gameLose || 0);
                                const gdB = (b.gameWin || 0) - (b.gameLose || 0);
                                if (gdB !== gdA) return gdB - gdA;
                                return b.win - a.win;
                            });

                            standingsHTML += '<div class="sh-group-title">' + g.groupName + '</div>';
                            standingsHTML += '<div class="sh-table-wrap no-scrollbar"><table class="sh-table">';
                            standingsHTML += '<thead><tr><th>#</th><th>Player</th><th>W</th><th>L</th><th>D</th><th>GW</th><th>GL</th><th>GD</th><th>PTS</th></tr></thead>';
                            standingsHTML += '<tbody>';

                            sorted.forEach((p, i) => {
                                const gd = (p.gameWin || 0) - (p.gameLose || 0);
                                const gdStr = gd > 0 ? '+' + gd : '' + gd;
                                const isChampion = data.champion && p.id === data.champion.id;
                                const rowClass = i < 4 ? 'sh-qualified' : '';
                                standingsHTML += '<tr class="' + rowClass + '">';
                                standingsHTML += '<td>' + (i + 1) + '</td>';
                                standingsHTML += '<td class="sh-player-name">' + p.name + (isChampion ? ' 🏆' : '') + '</td>';
                                standingsHTML += '<td>' + (p.win || 0) + '</td>';
                                standingsHTML += '<td>' + (p.lose || 0) + '</td>';
                                standingsHTML += '<td>' + (p.draw || 0) + '</td>';
                                standingsHTML += '<td>' + (p.gameWin || 0) + '</td>';
                                standingsHTML += '<td>' + (p.gameLose || 0) + '</td>';
                                standingsHTML += '<td class="' + (gd > 0 ? 'sh-gd-pos' : gd < 0 ? 'sh-gd-neg' : '') + '">' + gdStr + '</td>';
                                standingsHTML += '<td class="sh-pts">' + p.points + '</td>';
                                standingsHTML += '</tr>';
                            });

                            standingsHTML += '</tbody></table></div>';

                            // Match results
                            if (g.matches && g.matches.length > 0) {
                                standingsHTML += '<div class="sh-matches-title">Match Results</div>';
                                standingsHTML += '<div class="sh-matches-grid">';
                                g.matches.forEach(m => {
                                    const scoreText = m.score ? m.score[0] + ' - ' + m.score[1] : '- -';
                                    standingsHTML += '<div class="sh-match">';
                                    standingsHTML += '<span class="sh-match-id">' + m.matchId + '</span>';
                                    standingsHTML += '<span class="sh-match-p1">' + (m.p1Name || '?') + '</span>';
                                    standingsHTML += '<span class="sh-match-score">' + scoreText + '</span>';
                                    standingsHTML += '<span class="sh-match-p2">' + (m.p2Name || '?') + '</span>';
                                    standingsHTML += '</div>';
                                });
                                standingsHTML += '</div>';
                            }
                        });
        } else {
                        standingsHTML = '<div class="hof-empty"><div class="hof-empty-text">No group stage data available.</div></div>';
        }

                    // === BRACKET (Same style as /tournament/live) ===
                    let bracketHTML = '';
        if (data.bracket && data.bracket.length > 0) {
            const isDoubleElim = data.bracket.some(m => m.matchId.startsWith('WB_QF'));
            const isPagePlayoff = data.bracket.some(m => m.matchId === 'UB_Final');

            // Champion box
            let finalMatch = data.bracket.find(m => m.matchId === 'FINAL');
            if (isPagePlayoff || isDoubleElim) finalMatch = data.bracket.find(m => m.matchId === 'GRAND_FINAL');
                    const champName = data.champion ? data.champion.name : (
                    (finalMatch && finalMatch.isFinished) ? (finalMatch.winner === finalMatch.p1 ? finalMatch.p1Name : finalMatch.p2Name) : null
                    );
                    const ChampionBox = champName ? `
                    <div style="margin-top:20px;text-align:center;">
                        <div style="font-size:3rem;">👑</div>
                        <div style="font-size:1.5rem;font-weight:bold;color:#ffd700;text-shadow:0 0 20px rgba(255,215,0,0.5);">${champName}</div>
                        <div style="color:#666;font-size:12px;letter-spacing:1px;">CHAMPION</div>
                    </div>
                    ` : '';

                    if (isDoubleElim) {
                const wb_qf = data.bracket.filter(m => m.matchId.startsWith('WB_QF'));
                const wb_sf = data.bracket.filter(m => m.matchId.startsWith('WB_SF'));
                const wb_final = data.bracket.find(m => m.matchId === 'WB_Final');
                let lb_semis = data.bracket.find(m => m.matchId === 'LB_R3');
                if (!lb_semis) lb_semis = data.bracket.find(m => m.matchId === 'LB_Semis');
                const lb_r1 = data.bracket.filter(m => m.matchId.startsWith('LB_R1'));
                const lb_r2 = data.bracket.filter(m => m.matchId.startsWith('LB_R2'));
                const lb_final = data.bracket.find(m => m.matchId === 'LB_Final');
                const g_final = data.bracket.find(m => m.matchId === 'GRAND_FINAL');

                    bracketHTML = `
                    <div class="no-scrollbar" style="overflow-x:auto;padding:20px;">
                        <div style="display:flex;flex-direction:row;align-items:center;gap:60px;width:max-content;">
                            <div style="display:flex;flex-direction:column;gap:80px;">
                                <div>
                                    <div style="font-size:18px;font-weight:800;letter-spacing:2px;margin-bottom:20px;padding-left:20px;border-left:4px solid #ffd700;color:#ffd700;opacity:0.8;text-transform:uppercase;">UPPER BRACKET</div>
                                    <div style="display:flex;flex-direction:row;gap:40px;align-items:center;">
                                        ${wb_qf.length ? `
                                        <div style="display:flex;flex-direction:column;align-items:center;gap:30px;min-width:240px;">
                                            <div style="text-align:center;color:#666;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Quarter Finals</div>
                                            <div style="display:flex;flex-direction:column;gap:30px;">${wb_qf.map(MatchBox).join('')}</div>
                                        </div>
                                        <div style="color:#333;font-size:2rem;">👉</div>
                                    ` : ''}
                                        <div style="display:flex;flex-direction:column;align-items:center;gap:30px;min-width:240px;">
                                            <div style="text-align:center;color:#666;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Semifinals</div>
                                            <div style="display:flex;flex-direction:column;gap:30px;">${wb_sf.map(MatchBox).join('')}</div>
                                        </div>
                                        <div style="color:#333;font-size:2rem;">👉</div>
                                        <div style="display:flex;flex-direction:column;align-items:center;gap:30px;min-width:240px;">
                                            <div style="text-align:center;color:#666;font-size:12px;text-transform:uppercase;letter-spacing:1px;">UB Final</div>
                                            <div style="display:flex;flex-direction:column;gap:30px;">${MatchBox(wb_final)}</div>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <div style="font-size:18px;font-weight:800;letter-spacing:2px;margin-bottom:20px;padding-left:20px;border-left:4px solid #ef4444;color:#ef4444;opacity:0.8;text-transform:uppercase;">LOWER BRACKET</div>
                                    <div style="display:flex;flex-direction:row;gap:40px;align-items:center;">
                                        ${lb_r1.length ? `
                                        <div style="display:flex;flex-direction:column;align-items:center;gap:30px;min-width:240px;">
                                            <div style="text-align:center;color:#666;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Round 1</div>
                                            <div style="display:flex;flex-direction:column;gap:30px;">${lb_r1.map(MatchBox).join('')}</div>
                                        </div>
                                        <div style="color:#333;font-size:2rem;">👉</div>
                                    ` : ''}
                                        ${lb_r2.length ? `
                                        <div style="display:flex;flex-direction:column;align-items:center;gap:30px;min-width:240px;">
                                            <div style="text-align:center;color:#666;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Round 2</div>
                                            <div style="display:flex;flex-direction:column;gap:30px;">${lb_r2.map(MatchBox).join('')}</div>
                                        </div>
                                        <div style="color:#333;font-size:2rem;">👉</div>
                                    ` : ''}
                                        ${lb_semis ? `
                                        <div style="display:flex;flex-direction:column;align-items:center;gap:30px;min-width:240px;">
                                            <div style="text-align:center;color:#666;font-size:12px;text-transform:uppercase;letter-spacing:1px;">LB Semis</div>
                                            <div style="display:flex;flex-direction:column;gap:30px;">${MatchBox(lb_semis)}</div>
                                        </div>
                                        <div style="color:#333;font-size:2rem;">👉</div>
                                    ` : ''}
                                        <div style="display:flex;flex-direction:column;align-items:center;gap:30px;min-width:240px;">
                                            <div style="text-align:center;color:#666;font-size:12px;text-transform:uppercase;letter-spacing:1px;">LB Final</div>
                                            <div style="display:flex;flex-direction:column;gap:30px;">${MatchBox(lb_final)}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div style="display:flex;flex-direction:column;align-items:center;padding-left:40px;border-left:1px dashed #333;align-self:stretch;justify-content:center;">
                                <div style="font-size:18px;font-weight:800;letter-spacing:2px;color:#ffd700;margin-bottom:30px;">🏆 GRAND FINAL</div>
                                ${MatchBox(g_final)}
                                ${ChampionBox}
                            </div>
                        </div>
                    </div>
                    <div style="text-align:center;color:#666;font-size:10px;margin-top:10px;">(Geser ke kanan untuk melihat Grand Final 👉)</div>`;

            } else {
                // Single Elimination
                const qfs = data.bracket.filter(m => m.matchId.startsWith('QF'));
                const semis = data.bracket.filter(m => m.matchId.startsWith('SF'));
                const final_ = data.bracket.find(m => m.matchId === 'FINAL');

                    bracketHTML = `
                    <div class="no-scrollbar" style="overflow-x:auto;padding:20px;">
                        <div style="display:flex;flex-direction:row;align-items:center;gap:60px;width:max-content;margin:0 auto;">
                            ${qfs.length > 0 ? `
                            <div style="display:flex;flex-direction:column;align-items:center;gap:30px;min-width:240px;">
                                <div style="text-align:center;color:#666;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Quarter Finals</div>
                                <div style="display:flex;flex-direction:column;gap:30px;">${qfs.map(MatchBox).join('')}</div>
                            </div>
                            <div style="color:#333;font-size:2rem;">👉</div>
                        ` : ''}
                            <div style="display:flex;flex-direction:column;align-items:center;gap:30px;min-width:240px;">
                                <div style="text-align:center;color:#666;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Semifinals</div>
                                <div style="display:flex;flex-direction:column;gap:30px;">${semis.map(MatchBox).join('')}</div>
                            </div>
                            <div style="color:#333;font-size:2rem;">👉</div>
                            <div style="display:flex;flex-direction:column;align-items:center;gap:30px;min-width:240px;">
                                <div style="text-align:center;color:#ffd700;font-size:12px;text-transform:uppercase;letter-spacing:2px;">🏆 Grand Final</div>
                                ${MatchBox(final_)}
                                ${ChampionBox}
                            </div>
                        </div>
                    </div>`;
            }
        } else {
                        bracketHTML = '<div class="hof-empty"><div class="hof-empty-text">No bracket data available.</div></div>';
        }

                    const champName = data.champion ? data.champion.name : '-';
                    const ruName = data.runnerUp ? data.runnerUp.name : '-';
                    const finalScoreText = (data.finalScore && data.finalScore.length === 2) ? Math.max(data.finalScore[0], data.finalScore[1]) + ' - ' + Math.min(data.finalScore[0], data.finalScore[1]) : '-';

                    return `
                    <header class="header">
                        <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
                            <a href="/hall-of-fame" style="color: var(--text-secondary); text-decoration: none; font-size: 20px;">←</a>
                            <h1 class="header-title" style="margin: 0;">Season ${data.season} — ${data.name}</h1>
                        </div>
                        <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px; margin-left: 32px;">
                            🏆 ${champName} | 🥈 ${ruName} | Final: ${finalScoreText} | 👥 ${data.totalParticipants || 0} players | 📅 ${formatDate(data.finishedAt)}
                        </div>
                    </header>
                    <div class="content">
                        <div class="sh-tabs">
                            <button class="sh-tab active" onclick="showTab('standings')">📊 Regular Season</button>
                            <button class="sh-tab" onclick="showTab('bracket')">⚔️ Playoff Bracket</button>
                        </div>

                        <div id="tab-standings" class="sh-tab-content active">
                            ${standingsHTML}
                        </div>

                        <div id="tab-bracket" class="sh-tab-content" style="display:none;">
                            ${bracketHTML}
                        </div>
                    </div>

                    <script>
                        function showTab(name) {
                            document.querySelectorAll('.sh-tab-content').forEach(el => el.style.display = 'none');
                document.querySelectorAll('.sh-tab').forEach(el => el.classList.remove('active'));
                        document.getElementById('tab-' + name).style.display = 'block';
                        event.target.classList.add('active');
            }
                    </script>
                    `;
    }

module.exports = { getSeasonHistoryPage, renderHistoryMatchBox };
