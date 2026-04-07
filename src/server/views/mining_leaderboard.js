function getMiningLeaderboardPage(topRebirth) {

    const maskPhone = (phone) => {
        const s = String(phone || '???');
        if (s.length <= 4) return s;
        return s.slice(0, 2) + '****' + s.slice(-4);
    };

    const medal = (i) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;

    const tierLabels = ['Rookie', 'Explorer', 'Veteran', 'Elite', 'Master', 'Legend', 'Divine'];
    const tierColors = ['#6b7280', '#4ade80', '#60a5fa', '#c084fc', '#fbbf24', '#f87171', '#22d3ee'];

    const fmt = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M'
                   : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K'
                   : (n || 0).toLocaleString();

    const rows = topRebirth.length === 0
        ? `<tr><td colspan="5" style="text-align:center;color:var(--text-secondary);padding:48px 16px;">
               <div style="font-size:36px;margin-bottom:12px;opacity:0.3;">⛏️</div>
               <div>Belum ada data rebirth</div>
           </td></tr>`
        : topRebirth.map((p, i) => {
            const rebirth  = p.rebirthCount || 0;
            const pickLv   = p.pickaxeLevel || 1;
            const totalMined = (p.stats && p.stats.totalMined) || 0;
            const ti       = Math.min(rebirth, tierLabels.length - 1);
            const color    = tierColors[ti];
            const tier     = tierLabels[ti];
            const isTop3   = i < 3;
            return `
            <tr class="lb-row${isTop3 ? ' lb-top' : ''}">
                <td class="lb-rank">${medal(i)}</td>
                <td class="lb-name">${maskPhone(p.phoneNumber)}</td>
                <td class="lb-pick">⛏️ Lv.${pickLv}</td>
                <td class="lb-tier">
                    <span class="lb-tier-badge" style="background:${color}18;color:${color};border:1px solid ${color}33;">
                        ${tier}
                    </span>
                </td>
                <td class="lb-rebirth" style="color:${color};">
                    🔄 ${rebirth}
                    <span class="lb-sub">${fmt(totalMined)} ore</span>
                </td>
            </tr>`;
        }).join('');

    return `
    <header class="header">
        <div>
            <h1 class="header-title">⛏️ Mining Leaderboard</h1>
            <p style="color:var(--text-secondary);font-size:14px;margin-top:4px;">Ranking berdasarkan jumlah Rebirth</p>
        </div>
    </header>

    <div class="content">
        <style>
            .lb-card {
                background: var(--bg-secondary);
                border: 1px solid var(--border);
                border-radius: 16px;
                overflow: hidden;
            }
            .lb-table { width: 100%; border-collapse: collapse; }
            .lb-table th {
                font-size: 11px; text-transform: uppercase; letter-spacing: 1px;
                color: var(--text-muted); font-weight: 700;
                padding: 12px 14px; border-bottom: 1px solid var(--border);
                text-align: left; background: var(--bg-tertiary);
            }
            .lb-row { border-bottom: 1px solid rgba(255,255,255,0.04); transition: background 0.15s; }
            .lb-row:last-child { border-bottom: none; }
            .lb-row:hover { background: rgba(255,255,255,0.03); }
            .lb-row.lb-top { background: rgba(255,255,255,0.02); }
            .lb-row td { padding: 13px 14px; font-size: 14px; vertical-align: middle; }
            .lb-rank { font-size: 18px; font-weight: 800; width: 52px; text-align: center; }
            .lb-name { color: var(--text-primary); font-weight: 600; font-family: monospace; font-size: 12px; }
            .lb-pick { color: var(--text-secondary); font-size: 12px; width: 80px; }
            .lb-tier { width: 100px; }
            .lb-tier-badge {
                display: inline-block;
                padding: 3px 10px; border-radius: 20px;
                font-size: 11px; font-weight: 700; letter-spacing: 0.5px;
                white-space: nowrap;
            }
            .lb-rebirth {
                text-align: right; font-weight: 900;
                font-size: 16px; font-family: monospace;
            }
            .lb-sub {
                display: block;
                font-size: 10px; color: var(--text-muted);
                font-weight: 400; font-family: inherit;
                margin-top: 2px;
            }
            .lb-meta {
                display: flex; justify-content: space-between; align-items: center;
                margin-bottom: 16px;
            }
            .lb-count { font-size: 13px; color: var(--text-secondary); }
            .lb-refresh { font-size: 11px; color: var(--text-muted); }

            @media (max-width: 600px) {
                .lb-pick  { display: none; }
                .lb-tier  { display: none; }
                .lb-row td { padding: 11px 10px; }
                .lb-name  { font-size: 11px; }
                .lb-rebirth { font-size: 14px; }
            }
        </style>

        <div class="lb-meta">
            <span class="lb-count">${topRebirth.length} penambang terdaftar</span>
            <span class="lb-refresh">🕐 Data diperbarui saat halaman dibuka</span>
        </div>

        <div class="lb-card">
            <table class="lb-table">
                <thead>
                    <tr>
                        <th style="text-align:center">#</th>
                        <th>Penambang</th>
                        <th>Pickaxe</th>
                        <th>Tier</th>
                        <th style="text-align:right">Rebirth</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>

    </div>
    `;
}

module.exports = { getMiningLeaderboardPage };
