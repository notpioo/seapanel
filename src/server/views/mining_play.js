const getMiningGamePage = (player, config, isEnabled = false, identifier = '') => {
    const pickaxe = config.pickaxeLevels?.find(p => p.level === (player.pickaxeLevel || 1))
                 || { name: 'Wooden Pickaxe', dropMultiplier: 1 };

    const rebirthCount = player.rebirthCount || 0;
    const rp           = player.rebirthPoints || 0;
    const bpLvl        = player.backpackLevel || 1;
    const bpCap        = player.getBackpackCapacity ? player.getBackpackCapacity(config) : (50 + (bpLvl - 1) * 20);
    const minecon      = player.minecon || 0;
    const gems         = player.gems || 0;
    const shards       = player.quest?.shards || 0;
    const questRank    = player.quest?.rank || 'F';
    const totalMined   = player.stats?.totalMined  || 0;
    const totalEarned  = player.stats?.totalEarned || 0;
    const cooldownSec  = Math.max(2, config.cooldownSeconds || 15);

    // Location
    const locs = (config.locations || []).slice().sort((a, b) => a.minRebirth - b.minRebirth);
    let location = locs[0] || { minRebirth: 0, name: 'Surface', emoji: '🌄' };
    for (const loc of locs) { if (rebirthCount >= loc.minRebirth) location = loc; }

    // Inventory builder (shared with socket updater)
    const rc = {
        common:'#9ca3af', uncommon:'#4ade80', rare:'#60a5fa', epic:'#c084fc',
        legendary:'#fbbf24', mythical:'#f87171', divine:'#22d3ee',
        ultimate:'#a3e635', exclusive:'#fb923c'
    };

    let invRows = '', totalItems = 0, invValue = 0;
    if (player.inventory?.size > 0) {
        const items = [];
        for (const [resName, qty] of player.inventory.entries()) {
            const r = config.resources?.find(x => x.name.toLowerCase() === resName.toLowerCase());
            if (r && qty > 0) {
                totalItems += qty;
                invValue   += r.sellPrice * qty;
                items.push({ name: r.name, rarity: r.rarity, qty, sellPrice: r.sellPrice });
            }
        }
        items.sort((a, b) => b.sellPrice - a.sellPrice);
        invRows = items.map(it => `
            <div class="dash-info-row">
                <div class="dash-info-label" style="min-width:0;overflow:hidden;">
                    <span style="width:8px;height:8px;border-radius:50%;display:inline-block;background:${rc[it.rarity]||'#6b7280'};flex-shrink:0;"></span>
                    <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${it.name}</span>
                    <span style="font-size:10px;color:var(--text-muted);font-weight:400;flex-shrink:0;">${it.rarity}</span>
                </div>
                <div class="mg-inv-row-right" style="display:flex;align-items:center;gap:16px;flex-shrink:0;">
                    <span class="mg-inv-qty" style="font-size:13px;color:var(--text-muted);white-space:nowrap;">×${it.qty.toLocaleString()}</span>
                    <div class="dash-info-value mg-inv-price" style="color:var(--warning);min-width:80px;text-align:right;white-space:nowrap;">🪙 ${it.sellPrice.toLocaleString()}</div>
                </div>
            </div>`).join('');
    }
    if (!invRows) invRows = `
        <div style="text-align:center;padding:40px 20px;color:var(--text-muted);">
            <div style="font-size:40px;margin-bottom:12px;opacity:0.4;">📦</div>
            <div style="font-size:14px;">Bag kosong — ketik <code style="background:var(--bg-tertiary);padding:2px 8px;border-radius:4px;">.mine</code> di bot</div>
        </div>`;

    const bpFill  = bpCap > 0 ? Math.min(100, Math.round(totalItems / bpCap * 100)) : 0;
    const bpColor = bpFill >= 90 ? 'var(--error)' : bpFill >= 60 ? 'var(--warning)' : 'var(--success)';
    const fmt     = n => n >= 1e6 ? (n/1e6).toFixed(1)+'M' : n >= 1e3 ? (n/1e3).toFixed(1)+'K' : n.toLocaleString();

    const tierLabels = ['Rookie','Explorer','Veteran','Elite','Master','Legend','Divine'];
    const ti = Math.min(rebirthCount, tierLabels.length - 1);
    const isPremiumTier = rebirthCount >= 4;

    return `
        <style>
            /* ── Mining page mobile overrides ── */
            @media (max-width: 768px) {
                .mg-hero-inner   { flex-direction: column !important; gap: 14px !important; }
                .mg-hero-badge   { align-self: flex-start !important; }
                .mg-hero-stats   { gap: 14px !important; }
                .mg-hero-stat-val { font-size: 14px !important; }
                .mg-inv-row-right { gap: 8px !important; }
                .mg-inv-price    { min-width: 0 !important; font-size: 11px !important; }
                .mg-inv-qty      { font-size: 11px !important; }
                .mg-content      { padding: 16px !important; }
                .dash-hero       { padding: 20px 18px !important; }
            }
            @media (max-width: 480px) {
                .dash-hero-name  { font-size: 20px !important; }
                .mg-hero-stats   { flex-direction: column !important; gap: 10px !important; }
                .stat-card       { padding: 14px !important; }
                .stat-card-value { font-size: 20px !important; }
            }
            /* Live indicator */
            .mn-live { display:inline-flex; align-items:center; gap:6px; font-size:11px; color:var(--text-muted); }
            .mn-live-dot { width:7px; height:7px; border-radius:50%; background:#2a2a2a; transition:background 0.3s; flex-shrink:0; }
            .mn-live-dot.on { background:#4ade80; }
            @keyframes mnpulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        </style>

        <div class="content mg-content" style="padding: 32px 40px;">

            <!-- ═══ HERO ═══ -->
            <div class="dash-hero mg-hero-inner" style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:20px;padding:32px;">
                <div style="position:relative;z-index:10;min-width:0;flex:1;">
                    <div class="dash-hero-greeting">Mining Dashboard</div>
                    <div id="mn-pick-lv" class="dash-hero-name" style="margin-bottom:12px;">⛏️ Pickaxe Lv.${player.pickaxeLevel || 1}</div>
                    <div class="mg-hero-stats" style="display:flex;align-items:flex-start;gap:24px;flex-wrap:wrap;">
                        <div style="display:flex;flex-direction:column;gap:2px;">
                            <div style="font-size:10px;color:rgba(255,255,255,0.5);font-weight:700;letter-spacing:1px;">LOKASI</div>
                            <div class="mg-hero-stat-val" style="font-size:16px;font-weight:700;color:#fff;">${location.emoji} ${location.name}</div>
                        </div>
                        <div style="display:flex;flex-direction:column;gap:2px;">
                            <div style="font-size:10px;color:rgba(255,255,255,0.5);font-weight:700;letter-spacing:1px;">BACKPACK</div>
                            <div id="mn-bp-hero" class="mg-hero-stat-val" style="font-size:16px;font-weight:700;color:${bpColor};">Lv.${bpLvl} — ${bpFill}%</div>
                        </div>
                        <div style="display:flex;flex-direction:column;gap:2px;">
                            <div style="font-size:10px;color:rgba(255,255,255,0.5);font-weight:700;letter-spacing:1px;">QUEST</div>
                            <div id="mn-quest" class="mg-hero-stat-val" style="font-size:16px;font-weight:700;color:#fff;">Rank ${questRank}</div>
                        </div>
                    </div>
                </div>
                <div class="mg-hero-badge" style="position:relative;z-index:10;display:flex;flex-direction:column;align-items:flex-end;gap:10px;flex-shrink:0;">
                    <div class="dash-hero-badge ${isPremiumTier ? 'premium' : 'basic'}" style="position:static;white-space:nowrap;">
                        ${isPremiumTier ? `⭐ REBIRTH ${rebirthCount}` : rebirthCount > 0 ? `🔄 REBIRTH ${rebirthCount}` : '● ROOKIE'}
                    </div>
                    <div style="font-size:12px;color:rgba(255,255,255,0.35);text-align:right;">${tierLabels[ti]}</div>
                    <div class="mn-live"><div id="mn-live-dot" class="mn-live-dot"></div><span id="mn-live-txt">–</span></div>
                </div>
            </div>

            <!-- ═══ CURRENCY ═══ -->
            <div class="dash-section-title" style="margin-top:28px;">Currency</div>
            <div class="grid grid-3">
                <div class="stat-card">
                    <div class="stat-card-icon" style="background:rgba(245,158,11,0.12);color:var(--orange);font-size:22px;">🪙</div>
                    <div class="stat-card-body">
                        <div class="stat-card-label">Minecon</div>
                        <div id="mn-minecon" class="stat-card-value" style="color:var(--orange);">${fmt(minecon)}</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-icon" style="background:rgba(34,211,238,0.12);color:var(--cyan);font-size:22px;">💎</div>
                    <div class="stat-card-body">
                        <div class="stat-card-label">Gems</div>
                        <div id="mn-gems" class="stat-card-value" style="color:var(--cyan);">${fmt(gems)}</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-icon" style="background:rgba(168,85,247,0.12);color:var(--purple);font-size:22px;">🔮</div>
                    <div class="stat-card-body">
                        <div class="stat-card-label">Shards</div>
                        <div id="mn-shards" class="stat-card-value" style="color:var(--purple);">${fmt(shards)}</div>
                    </div>
                </div>
            </div>

            <!-- ═══ MENU ═══ -->
            <div class="dash-section-title" style="margin-top:28px;">Menu</div>
            <div class="quick-menu-grid" style="margin-bottom:8px;">
                <a href="/mining/leaderboard" class="quick-menu-item">
                    <div class="quick-menu-box" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.05);">
                        <div class="quick-menu-icon" style="filter:grayscale(1) contrast(5) brightness(1.5);font-size:24px;">🏆</div>
                    </div>
                    <div class="quick-menu-label" style="color:var(--text-primary);">Leaderboard</div>
                </a>
                <a href="/mining-pass" class="quick-menu-item">
                    <div class="quick-menu-box" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.05);">
                        <div class="quick-menu-icon" style="filter:grayscale(1) contrast(5) brightness(1.5);font-size:24px;">⛏️</div>
                    </div>
                    <div class="quick-menu-label" style="color:var(--text-primary);">Mining Pass</div>
                </a>
                <a href="#" class="quick-menu-item">
                    <div class="quick-menu-box" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.05);">
                        <div class="quick-menu-icon" style="filter:grayscale(1) contrast(5) brightness(1.5);font-size:24px;">⛏️</div>
                    </div>
                    <div class="quick-menu-label" style="color:var(--text-primary);">Pickaxe</div>
                </a>
                <a href="#" class="quick-menu-item">
                    <div class="quick-menu-box" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.05);">
                        <div class="quick-menu-icon" style="filter:grayscale(1) contrast(5) brightness(1.5);font-size:24px;">📦</div>
                    </div>
                    <div class="quick-menu-label" style="color:var(--text-primary);">Backpack</div>
                </a>
            </div>

            <!-- ═══ DETAIL INFO ═══ -->
            <div class="dash-section-title" style="margin-top:28px;">Mining Info</div>
            <div class="grid grid-2">
                <div class="dash-info-card">
                    <div class="dash-info-header">
                        <div class="dash-info-title"><span style="margin-right:8px;opacity:0.6;">⛏️</span>Pickaxe</div>
                    </div>
                    <div class="dash-info-row">
                        <div class="dash-info-label"><span>📛</span> Nama</div>
                        <div id="mn-pick-name" class="dash-info-value">${pickaxe.name}</div>
                    </div>
                    <div class="dash-info-row">
                        <div class="dash-info-label"><span>⚡</span> Drop Rate</div>
                        <div id="mn-drop-rate" class="dash-info-value" style="color:var(--orange);">×${pickaxe.dropMultiplier}</div>
                    </div>
                    <div class="dash-info-row">
                        <div class="dash-info-label"><span>🎚️</span> Level</div>
                        <div id="mn-pick-lv2" class="dash-info-value">${player.pickaxeLevel || 1} <span style="color:var(--text-muted);font-size:12px;">/ 250</span></div>
                    </div>
                    <div class="dash-info-row">
                        <div class="dash-info-label"><span>⏱️</span> Cooldown</div>
                        <div class="dash-info-value">${cooldownSec}s / sesi</div>
                    </div>
                </div>
                <div class="dash-info-card">
                    <div class="dash-info-header">
                        <div class="dash-info-title"><span style="margin-right:8px;opacity:0.6;">📊</span>Statistics</div>
                    </div>
                    <div class="dash-info-row">
                        <div class="dash-info-label"><span>📦</span> Backpack</div>
                        <div id="mn-bp-lv-stat" class="dash-info-value">Lv.${bpLvl} <span style="color:var(--text-muted);font-size:12px;">/ 250</span></div>
                    </div>
                    <div class="dash-info-row">
                        <div class="dash-info-label"><span>🗜️</span> Kapasitas</div>
                        <div id="mn-bp-cap-text" class="dash-info-value" style="color:${bpColor};">${totalItems.toLocaleString()} / ${bpCap} (${bpFill}%)</div>
                    </div>
                    <div class="dash-info-row">
                        <div class="dash-info-label"><span>⛏️</span> Total Mining</div>
                        <div id="mn-total-mined" class="dash-info-value" style="color:var(--warning);">${fmt(totalMined)}</div>
                    </div>
                    <div class="dash-info-row">
                        <div class="dash-info-label"><span>💰</span> Total Earned</div>
                        <div id="mn-total-earned" class="dash-info-value" style="color:var(--success);">${fmt(totalEarned)} MC</div>
                    </div>
                </div>
            </div>

            <!-- ═══ BAG ═══ -->
            <div class="dash-section-title" style="margin-top:28px;">
                Bag
                <span id="mn-bag-meta" style="font-weight:400;color:var(--text-muted);font-size:12px;letter-spacing:0;text-transform:none;margin-left:8px;">${totalItems > 0 ? `${totalItems.toLocaleString()} items · 🪙 ${invValue.toLocaleString()} MC` : ''}</span>
            </div>
            <div class="dash-info-card">
                <div id="mn-bag-body" style="max-height:300px;overflow-y:auto;scrollbar-width:thin;scrollbar-color:var(--bg-hover) transparent;">
                    ${invRows}
                </div>
            </div>

        </div>

        <script>
        (function() {
            var identifier = ${JSON.stringify(identifier)};
            if (!identifier) return;

            // Reuse the global socket created by the page template
            var sock = window._mnSocket;
            if (!sock) {
                if (typeof io === 'undefined') return;
                sock = io();
                window._mnSocket = sock;
            }

            var fmt = function(n) {
                n = Number(n) || 0;
                return n >= 1e6 ? (n/1e6).toFixed(1)+'M' : n >= 1e3 ? (n/1e3).toFixed(1)+'K' : n.toLocaleString();
            };
            var rc = {common:'#9ca3af',uncommon:'#4ade80',rare:'#60a5fa',epic:'#c084fc',legendary:'#fbbf24',mythical:'#f87171',divine:'#22d3ee',ultimate:'#a3e635',exclusive:'#fb923c'};

            function el(id) { return document.getElementById(id); }
            function set(id, html, isHtml) {
                var e = el(id);
                if (e) { if (isHtml) e.innerHTML = html; else e.textContent = html; }
            }

            // Subscribe
            sock.emit('mining-subscribe', { identifier: identifier });

            var dot  = el('mn-live-dot');
            var txt  = el('mn-live-txt');

            function flash() {
                if (dot) { dot.classList.add('on'); setTimeout(function(){ dot.classList.remove('on'); }, 600); }
                if (txt) {
                    var now = new Date();
                    txt.textContent = 'Update ' + now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0') + ':' + now.getSeconds().toString().padStart(2,'0');
                }
            }

            sock.on('mining-update', function(d) {
                flash();

                // Hero
                set('mn-pick-lv', '⛏️ Pickaxe Lv.' + d.pickaxeLevel);
                var bpColor = d.bpFill >= 90 ? 'var(--error)' : d.bpFill >= 60 ? 'var(--warning)' : 'var(--success)';
                var bpHero = el('mn-bp-hero');
                if (bpHero) { bpHero.textContent = 'Lv.' + d.bpLvl + ' \u2014 ' + d.bpFill + '%'; bpHero.style.color = bpColor; }
                set('mn-quest', 'Rank ' + d.questRank);

                // Currency
                set('mn-minecon', fmt(d.minecon));
                set('mn-gems', fmt(d.gems));
                set('mn-shards', fmt(d.shards));

                // Pickaxe info
                set('mn-pick-name', d.pickaxeName);
                set('mn-drop-rate', '\u00d7' + d.dropMultiplier);
                set('mn-pick-lv2', d.pickaxeLevel + ' / 250', true);

                // Stats
                var bpCapEl = el('mn-bp-cap-text');
                if (bpCapEl) { bpCapEl.textContent = d.totalItems.toLocaleString() + ' / ' + d.bpCap + ' (' + d.bpFill + '%)'; bpCapEl.style.color = bpColor; }
                var bpLvEl = el('mn-bp-lv-stat');
                if (bpLvEl) bpLvEl.innerHTML = 'Lv.' + d.bpLvl + ' <span style="color:var(--text-muted);font-size:12px;">/ 250</span>';

                set('mn-total-mined', fmt(d.totalMined));
                set('mn-total-earned', fmt(d.totalEarned) + ' MC');

                // Bag meta
                set('mn-bag-meta', d.totalItems > 0 ? d.totalItems.toLocaleString() + ' items \u00b7 \uD83E\uDEA9' + d.invValue.toLocaleString() + ' MC' : '');

                // Bag rows
                var bagEl = el('mn-bag-body');
                if (!bagEl) return;
                if (!d.inventory || d.inventory.length === 0) {
                    bagEl.innerHTML = '<div style="text-align:center;padding:40px 20px;color:var(--text-muted);"><div style="font-size:40px;margin-bottom:12px;opacity:0.4;">\uD83D\uDCE6</div><div style="font-size:14px;">Bag kosong</div></div>';
                } else {
                    bagEl.innerHTML = d.inventory.map(function(it) {
                        var c = rc[it.rarity] || '#6b7280';
                        return '<div class="dash-info-row">' +
                            '<div class="dash-info-label" style="min-width:0;overflow:hidden;">' +
                                '<span style="width:8px;height:8px;border-radius:50%;display:inline-block;background:'+c+';flex-shrink:0;"></span>' +
                                '<span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+it.name+'</span>' +
                                '<span style="font-size:10px;color:var(--text-muted);font-weight:400;flex-shrink:0;">'+it.rarity+'</span>' +
                            '</div>' +
                            '<div class="mg-inv-row-right" style="display:flex;align-items:center;gap:16px;flex-shrink:0;">' +
                                '<span class="mg-inv-qty" style="font-size:13px;color:var(--text-muted);white-space:nowrap;">\u00d7'+it.qty.toLocaleString()+'</span>' +
                                '<div class="dash-info-value mg-inv-price" style="color:var(--warning);min-width:80px;text-align:right;white-space:nowrap;">\uD83E\uDEA9 '+it.sellPrice.toLocaleString()+'</div>' +
                            '</div>' +
                            '</div>';
                    }).join('');
                }
            });
        })();
        </script>
    `;
};

module.exports = { getMiningGamePage };
