// This is just a helper to build the tournament page HTML via string concatenation.
// It will be called from app.js's getTournamentPage method.

function buildTournamentPage(active, session) {
    if (!active) {
        return '<header class="header"><h1 class="header-title">Tournament</h1></header>'
            + '<div class="content"><div class="coming-soon-wrap">'
            + '<div class="coming-soon-icon">🏆</div>'
            + '<div class="coming-soon-title">No Active Tournament</div>'
            + '<div class="coming-soon-desc">There\'s no tournament running right now. Check back later!</div>'
            + '<div class="coming-soon-badge-lg" style="background:rgba(255,255,255,0.06);border-color:var(--border);color:var(--text-muted);">⏳ Waiting</div>'
            + '</div></div>';
    }

    const statusMap = {
        'registration': { label: 'Registration', icon: '📝' },
        'group': { label: 'Group Stage', icon: '⚔️' },
        'playoff': { label: 'Playoff', icon: '🔥' },
        'finished': { label: 'Finished', icon: '🏆' },
    };
    const status = statusMap[active.status] || { label: active.status, icon: '📋' };

    const totalParticipants = (active.participants || []).length;
    let totalMatches = 0;
    let matchesFinished = 0;

    if (active.status === 'group' && active.groups) {
        active.groups.forEach(g => {
            totalMatches += (g.matches || []).length;
            matchesFinished += (g.matches || []).filter(m => m.isFinished).length;
        });
    }
    if ((active.status === 'playoff' || active.status === 'finished') && active.bracket) {
        totalMatches += active.bracket.length;
        matchesFinished += active.bracket.filter(m => m.isFinished).length;
    }
    const matchesLeft = totalMatches - matchesFinished;
    const format = (active.config && active.config.groupFormat) ? active.config.groupFormat.toUpperCase() : 'BO1';

    // === GROUP STANDINGS ===
    let groupsHtml = '';
    if (active.status === 'group' && active.groups && active.groups.length > 0) {
        let groupCards = '';
        active.groups.forEach(g => {
            const sorted = [...(g.players || [])].sort((a, b) => {
                if (b.points !== a.points) return b.points - a.points;
                return (b.gameWin - b.gameLose) - (a.gameWin - a.gameLose);
            });
            let rows = '';
            sorted.forEach((p, i) => {
                const gd = (p.gameWin || 0) - (p.gameLose || 0);
                const gdStyle = gd > 0 ? 'color:rgba(74,222,128,0.9)' : gd < 0 ? 'color:rgba(239,68,68,0.8)' : 'color:var(--text-muted)';
                const gdText = gd > 0 ? '+' + gd : '' + gd;
                const rowStyle = i < 2 ? 'border-left:2px solid rgba(255,255,255,0.15);' : '';
                rows += '<tr style="' + rowStyle + '">'
                    + '<td style="text-align:center;width:36px;font-weight:700;color:var(--text-muted);">' + (i + 1) + '</td>'
                    + '<td style="font-weight:600;">' + p.name + '</td>'
                    + '<td style="text-align:center;">' + (p.matchesPlayed || 0) + '</td>'
                    + '<td style="text-align:center;">' + (p.win || 0) + '</td>'
                    + '<td style="text-align:center;">' + (p.draw || 0) + '</td>'
                    + '<td style="text-align:center;">' + (p.lose || 0) + '</td>'
                    + '<td style="text-align:center;' + gdStyle + ';font-weight:600;">' + gdText + '</td>'
                    + '<td style="text-align:center;font-weight:700;color:var(--text-primary);">' + (p.points || 0) + '</td>'
                    + '</tr>';
            });
            groupCards += '<div style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:10px;overflow:hidden;margin-bottom:16px;">'
                + '<div style="padding:10px 16px;border-bottom:1px solid var(--border);font-weight:700;font-size:13px;color:var(--text-primary);letter-spacing:0.3px;">' + g.name + '</div>'
                + '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:12px;">'
                + '<thead><tr style="background:rgba(255,255,255,0.02);">'
                + '<th style="padding:8px 10px;text-align:center;color:var(--text-muted);font-size:10px;font-weight:600;text-transform:uppercase;">#</th>'
                + '<th style="padding:8px 10px;text-align:left;color:var(--text-muted);font-size:10px;font-weight:600;text-transform:uppercase;">Player</th>'
                + '<th style="padding:8px 10px;text-align:center;color:var(--text-muted);font-size:10px;font-weight:600;text-transform:uppercase;">MP</th>'
                + '<th style="padding:8px 10px;text-align:center;color:var(--text-muted);font-size:10px;font-weight:600;text-transform:uppercase;">W</th>'
                + '<th style="padding:8px 10px;text-align:center;color:var(--text-muted);font-size:10px;font-weight:600;text-transform:uppercase;">D</th>'
                + '<th style="padding:8px 10px;text-align:center;color:var(--text-muted);font-size:10px;font-weight:600;text-transform:uppercase;">L</th>'
                + '<th style="padding:8px 10px;text-align:center;color:var(--text-muted);font-size:10px;font-weight:600;text-transform:uppercase;">GD</th>'
                + '<th style="padding:8px 10px;text-align:center;color:var(--text-muted);font-size:10px;font-weight:600;text-transform:uppercase;">PTS</th>'
                + '</tr></thead><tbody>' + rows + '</tbody></table></div></div>';
        });
        groupsHtml = '<div style="margin-bottom:28px;">'
            + '<div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);margin-bottom:12px;">Group Standings</div>'
            + groupCards + '</div>';
    }

    // === MATCH RESULTS ===
    let allMatches = [];
    if (active.status === 'group' && active.groups) {
        active.groups.forEach(g => { (g.matches || []).forEach(m => allMatches.push(m)); });
    }
    if ((active.status === 'playoff' || active.status === 'finished') && active.bracket) {
        active.bracket.forEach(m => allMatches.push(m));
    }
    const finishedMatches = allMatches.filter(m => m.isFinished).slice(-6).reverse();
    const upcomingMatches = allMatches.filter(m => !m.isFinished && m.p1 && m.p2).slice(0, 4);

    let matchResultsHtml = '';
    if (finishedMatches.length > 0) {
        let cards = '';
        finishedMatches.forEach(m => {
            const isP1W = m.winner === m.p1;
            const isP2W = m.winner === m.p2;
            cards += '<div style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:8px;padding:12px 14px;">'
                + '<div style="font-size:10px;color:var(--text-muted);font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">' + m.matchId + '</div>'
                + '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">'
                + '<div style="flex:1;text-align:right;font-size:13px;font-weight:' + (isP1W ? '700' : '400') + ';color:' + (isP1W ? 'var(--text-primary)' : 'var(--text-muted)') + ';overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + (m.p1Name || 'TBD') + '</div>'
                + '<div style="padding:3px 10px;border-radius:4px;background:rgba(255,255,255,0.04);font-size:14px;font-weight:700;color:var(--text-primary);letter-spacing:2px;flex-shrink:0;">' + m.score[0] + ' - ' + m.score[1] + '</div>'
                + '<div style="flex:1;text-align:left;font-size:13px;font-weight:' + (isP2W ? '700' : '400') + ';color:' + (isP2W ? 'var(--text-primary)' : 'var(--text-muted)') + ';overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + (m.p2Name || 'TBD') + '</div>'
                + '</div></div>';
        });
        matchResultsHtml = '<div style="margin-bottom:28px;">'
            + '<div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);margin-bottom:12px;">Recent Results</div>'
            + '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:8px;">' + cards + '</div></div>';
    }

    let upcomingHtml = '';
    if (upcomingMatches.length > 0) {
        let cards = '';
        upcomingMatches.forEach(m => {
            cards += '<div style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:8px;padding:12px 14px;">'
                + '<div style="font-size:10px;color:var(--text-muted);font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">' + m.matchId + '</div>'
                + '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">'
                + '<div style="flex:1;text-align:right;font-size:13px;font-weight:600;color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + (m.p1Name || 'TBD') + '</div>'
                + '<div style="padding:3px 10px;font-size:11px;color:var(--text-muted);font-weight:600;font-style:italic;flex-shrink:0;">vs</div>'
                + '<div style="flex:1;text-align:left;font-size:13px;font-weight:600;color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + (m.p2Name || 'TBD') + '</div>'
                + '</div></div>';
        });
        upcomingHtml = '<div style="margin-bottom:28px;">'
            + '<div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);margin-bottom:12px;">Upcoming Matches</div>'
            + '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:8px;">' + cards + '</div></div>';
    }

    // === PARTICIPANT LIST ===
    const participantsList = (active.participants || []).map((p, i) => {
        const hasStats = p.wins !== undefined;
        const statsHtml = hasStats ? '<div style="font-size:11px;color:var(--text-muted);font-weight:500;flex-shrink:0;">' + (p.wins || 0) + 'W ' + (p.losses || 0) + 'L</div>' : '';
        return '<div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:var(--bg-secondary);border:1px solid var(--border);border-radius:8px;">'
            + '<div style="width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;background:rgba(255,255,255,0.06);color:var(--text-muted);flex-shrink:0;">' + (i + 1) + '</div>'
            + '<div style="flex:1;min-width:0;"><div style="font-weight:600;font-size:13px;color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + p.name + '</div></div>'
            + statsHtml + '</div>';
    }).join('');

    return '<header class="header"><h1 class="header-title">' + active.name + '</h1></header>'
        + '<div class="content">'
        // Hero Banner
        + '<div style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:12px;padding:24px;margin-bottom:24px;">'
        + '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:20px;">'
        + '<div>'
        + '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:var(--text-muted);margin-bottom:6px;">Active Tournament</div>'
        + '<div style="font-size:22px;font-weight:700;color:var(--text-primary);">' + active.name + '</div>'
        + '</div>'
        + '<div><span style="display:inline-flex;align-items:center;gap:5px;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;background:rgba(255,255,255,0.06);color:var(--text-secondary);border:1px solid var(--border);">' + status.icon + ' ' + status.label + '</span></div>'
        + '</div>'
        // Stat Cards
        + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:8px;">'
        + '<div style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:8px;padding:14px 12px;text-align:center;"><div style="font-size:20px;font-weight:700;color:var(--text-primary);">' + totalParticipants + '</div><div style="font-size:10px;color:var(--text-muted);font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-top:2px;">Players</div></div>'
        + '<div style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:8px;padding:14px 12px;text-align:center;"><div style="font-size:20px;font-weight:700;color:var(--text-primary);">' + matchesFinished + '</div><div style="font-size:10px;color:var(--text-muted);font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-top:2px;">Played</div></div>'
        + '<div style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:8px;padding:14px 12px;text-align:center;"><div style="font-size:20px;font-weight:700;color:var(--text-primary);">' + matchesLeft + '</div><div style="font-size:10px;color:var(--text-muted);font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-top:2px;">Remaining</div></div>'
        + '<div style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:8px;padding:14px 12px;text-align:center;"><div style="font-size:20px;font-weight:700;color:var(--text-primary);">' + format + '</div><div style="font-size:10px;color:var(--text-muted);font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-top:2px;">Format</div></div>'
        + '</div></div>'
        // Live View
        + '<div style="margin-bottom:24px;"><a href="/tournament/live" target="_blank" style="display:inline-flex;align-items:center;gap:6px;padding:8px 16px;background:rgba(255,255,255,0.04);border:1px solid var(--border);border-radius:8px;color:var(--text-secondary);text-decoration:none;font-size:12px;font-weight:600;">🔴 Open Public Live View</a></div>'
        + groupsHtml
        + matchResultsHtml
        + upcomingHtml
        // Participants
        + '<div style="margin-bottom:28px;">'
        + '<div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);margin-bottom:12px;">Participants (' + totalParticipants + ')</div>'
        + '<div style="display:flex;flex-direction:column;gap:6px;">'
        + (participantsList || '<div style="color:var(--text-muted);padding:20px;text-align:center;font-size:13px;">No participants yet</div>')
        + '</div></div>'
        + '</div>';
}

module.exports = { buildTournamentPage };
