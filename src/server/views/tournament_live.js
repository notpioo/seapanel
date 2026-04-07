const { Tournament } = require('../../models');

async function getTournamentLivePage() {
    const t = await Tournament.getActive();

    const noTournament = `
                    <!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
                        <title>Tournament Live</title>
                        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
                            <style>
                                * {margin:0; padding:0; box-sizing:border-box; }
                                body {font - family:'Inter',sans-serif; background:#0a0a0a; color:#e5e5e5; min-height:100vh; display:flex; align-items:center; justify-content:center; text-align:center; padding:20px; }
                                .empty {max - width:400px; }
                                .empty-icon {font - size:48px; margin-bottom:16px; opacity:0.5; }
                                .empty-title {font - size:20px; font-weight:700; margin-bottom:8px; }
                                .empty-desc {font - size:13px; color:#737373; line-height:1.5; }
                            </style></head><body>
                            <div class="empty">
                                <div class="empty-icon">🏆</div>
                                <div class="empty-title">No Active Tournament</div>
                                <div class="empty-desc">There's no tournament running right now.</div>
                            </div></body></html>`;

    if (!t) return noTournament;

    const statusLabels = { registration: 'Registration', group: 'Group Stage', playoff: 'Playoff', finished: 'Finished' };
    const statusLabel = statusLabels[t.status] || t.status;

    // Build group standings HTML
    let groupsHTML = '';
    if (t.groups && t.groups.length > 0) {
        groupsHTML = t.groups.map(g => {
            const sorted = [...g.players].sort((a, b) => {
                if (b.points !== a.points) return b.points - a.points;
                const aGD = (a.gameWin || 0) - (a.gameLose || 0);
                const bGD = (b.gameWin || 0) - (b.gameLose || 0);
                return bGD - aGD;
            });
            const rows = sorted.map((p, i) => {
                return '<tr>' +
                    '<td class="rank">' + (i + 1) + '</td>' +
                    '<td class="name">' + p.name + '</td>' +
                    '<td>' + (p.win || 0) + '</td>' +
                    '<td>' + (p.draw || 0) + '</td>' +
                    '<td>' + (p.lose || 0) + '</td>' +
                    '<td>' + ((p.gameWin || 0) - (p.gameLose || 0)) + '</td>' +
                    '<td class="pts">' + (p.points || 0) + '</td>' +
                    '</tr>';
            }).join('');

            return '<div class="group-card">' +
                '<div class="group-name">' + g.name + '</div>' +
                '<table><thead><tr><th>#</th><th>Player</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr></thead>' +
                '<tbody>' + rows + '</tbody></table>' +
                '</div>';
        }).join('');

        groupsHTML = '<div class="section-title">Group Standings</div><div class="groups-grid">' + groupsHTML + '</div>';
    }

    // Build bracket HTML
    let bracketHTML = '';
    if (t.bracket && t.bracket.length > 0) {
        const matchCards = t.bracket.map(m => {
            const isFinished = m.isFinished;
            const p1Win = m.winner && m.winner === m.p1;
            const p2Win = m.winner && m.winner === m.p2;
            return '<div class="match-card' + (isFinished ? ' finished' : '') + '">' +
                '<div class="match-id">' + m.matchId + (m.format ? ' · ' + m.format.toUpperCase() : '') + '</div>' +
                '<div class="match-row' + (p1Win ? ' winner' : '') + '">' +
                '<span class="match-name">' + (m.p1Name || 'TBD') + '</span>' +
                '<span class="match-score">' + (m.score ? m.score[0] : 0) + '</span>' +
                '</div>' +
                '<div class="match-row' + (p2Win ? ' winner' : '') + '">' +
                '<span class="match-name">' + (m.p2Name || 'TBD') + '</span>' +
                '<span class="match-score">' + (m.score ? m.score[1] : 0) + '</span>' +
                '</div>' +
                '</div>';
        }).join('');

        bracketHTML = '<div class="section-title">Bracket</div><div class="bracket-grid">' + matchCards + '</div>';
    }

    // Participants list for registration phase
    let regHTML = '';
    if (t.status === 'registration' && t.participants && t.participants.length > 0) {
        const list = t.participants.map((p, i) => '<div class="reg-item">' + (i + 1) + '. ' + p.name + '</div>').join('');
        regHTML = '<div class="section-title">Registered (' + t.participants.length + ')</div><div class="reg-list">' + list + '</div>';
    }

    return `<!DOCTYPE html>
                        <html lang="en">
                            <head>
                                <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
                                    <title>${t.name} — Live</title>
                                    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
                                        <style>
                                            * {margin:0; padding:0; box-sizing:border-box; }
                                            body {font - family:'Inter',sans-serif; background:#0a0a0a; color:#e5e5e5; min-height:100vh; padding:0; }
                                            .container {max - width:900px; margin:0 auto; padding:24px 16px 40px; }
                                            .header {text - align:center; padding:32px 16px 24px; border-bottom:1px solid #1a1a1a; margin-bottom:24px; }
                                            .header h1 {font - size:22px; font-weight:700; margin-bottom:8px; }
                                            .status {display:inline-block; padding:4px 14px; border-radius:20px; font-size:11px; font-weight:700; letter-spacing:0.5px; text-transform:uppercase; }
                                            .status.active {background:rgba(74,222,128,0.12); color:#4ade80; }
                                            .status.done {background:rgba(255,255,255,0.06); color:#737373; }
                                            .meta {margin - top:10px; font-size:12px; color:#525252; }
                                            .section-title {font - size:13px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#525252; margin-bottom:12px; margin-top:28px; }
                                            .groups-grid {display:grid; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); gap:12px; }
                                            .group-card {background:#111; border:1px solid #1a1a1a; border-radius:10px; overflow:hidden; }
                                            .group-name {padding:10px 14px; font-size:13px; font-weight:700; border-bottom:1px solid #1a1a1a; }
                                            table {width:100%; border-collapse:collapse; font-size:12px; }
                                            th {padding:8px 10px; text-align:left; color:#525252; font-weight:600; font-size:10px; text-transform:uppercase; letter-spacing:0.5px; }
                                            td {padding:8px 10px; border-top:1px solid #1a1a1a; }
                                            td.rank {color:#525252; width:30px; }
                                            td.name {font - weight:600; }
                                            td.pts {color:#eab308; font-weight:700; }
                                            .bracket-grid {display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:10px; }
                                            .match-card {background:#111; border:1px solid #1a1a1a; border-radius:8px; overflow:hidden; }
                                            .match-card.finished {opacity:0.6; }
                                            .match-id {padding:6px 12px; font-size:10px; font-weight:700; color:#525252; text-transform:uppercase; letter-spacing:0.5px; border-bottom:1px solid #1a1a1a; }
                                            .match-row {display:flex; justify-content:space-between; padding:10px 12px; font-size:13px; border-bottom:1px solid #0d0d0d; }
                                            .match-row:last-child {border - bottom:none; }
                                            .match-row.winner .match-name {color:#4ade80; font-weight:600; }
                                            .match-row.winner .match-score {color:#4ade80; font-weight:700; }
                                            .match-name {flex:1; }
                                            .match-score {font - weight:600; min-width:20px; text-align:right; }
                                            .reg-list {background:#111; border:1px solid #1a1a1a; border-radius:10px; padding:12px 16px; }
                                            .reg-item {padding:6px 0; font-size:13px; border-bottom:1px solid #0d0d0d; }
                                            .reg-item:last-child {border - bottom:none; }
                                            .refresh-note {text - align:center; margin-top:32px; font-size:11px; color:#373737; }
                                            @media(max-width:500px) {
    .container {padding:16px 12px 32px; }
                                            .header h1 {font - size:18px; }
                                            .groups-grid {grid - template - columns:1fr; }
                                            .bracket-grid {grid - template - columns:1fr; }
}
                                        </style>
                                    </head>
                                    <body>
                                        <div class="container">
                                            <div class="header">
                                                <h1>${t.name}</h1>
                                                <span class="status ${t.status === 'finished' ? 'done' : 'active'}">${statusLabel}</span>
                                                <div class="meta">${t.participants ? t.participants.length : 0} participants</div>
                                            </div>
                                            ${regHTML}
                                            ${groupsHTML}
                                            ${bracketHTML}
                                            <div class="refresh-note">Auto-refreshes every 30s</div>
                                        </div>
                                        <script>setTimeout(()=>location.reload(),30000);</script>
                                    </body>
                                </html>`;
}

module.exports = { getTournamentLivePage };
