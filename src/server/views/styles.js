function getCSS() {
    return `
        :root {
            --bg-primary: #0A0A0A;
            --bg-secondary: #141414;
            --bg-tertiary: #1A1A1A;
            --bg-hover: #1F1F1F;
            --border: #2A2A2A;
            --text-primary: #FFFFFF;
            --text-secondary: #888888;
            --text-muted: #555555;
            --accent: #FFFFFF;
            --success: #4ADE80;
            --warning: #FBBF24;
            --error: #F87171;
            --sidebar-width: 260px;
            --purple: #a855f7;
            --blue: #3b82f6;
            --cyan: #22d3ee;
            --orange: #f59e0b;
            --pink: #ec4899;
        }

        /* ═══ USER DASHBOARD PREMIUM ═══ */
        .dash-hero {
            position: relative;
            padding: 40px;
            border-radius: 16px;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
            border: 1px solid rgba(255,255,255,0.06);
            margin-bottom: 28px;
            overflow: hidden;
        }
        .dash-hero::before {
            content: '';
            position: absolute;
            top: -50%; right: -20%;
            width: 400px; height: 400px;
            background: radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%);
            pointer-events: none;
        }
        .dash-hero-greeting { font-size: 14px; color: rgba(255,255,255,0.5); font-weight: 500; letter-spacing: 0.5px; margin-bottom: 8px; }
        .dash-hero-name { font-size: 28px; font-weight: 700; color: #fff; margin-bottom: 6px; }
        .dash-hero-sub { font-size: 13px; color: rgba(255,255,255,0.4); }
        .dash-hero-badge {
            position: absolute; top: 24px; right: 24px;
            display: inline-flex; align-items: center; gap: 6px;
            padding: 6px 16px; border-radius: 20px;
            font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;
        }
        .dash-hero-badge.premium { background: linear-gradient(135deg, #f59e0b, #f97316); color: #000; box-shadow: 0 0 20px rgba(245,158,11,0.3); }
        .dash-hero-badge.basic { background: rgba(255,255,255,0.08); color: var(--text-secondary); border: 1px solid var(--border); }

        .dash-section-title { font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; color: var(--text-muted); margin-bottom: 16px; padding-left: 2px; }

        .stat-card {
            background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 12px;
            padding: 20px; display: flex; align-items: flex-start; gap: 16px;
            transition: all 0.3s ease; position: relative; overflow: hidden;
        }
        .stat-card:hover { border-color: rgba(255,255,255,0.1); transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.3); }
        .stat-card-icon { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
        .stat-card-body { flex: 1; min-width: 0; }
        .stat-card-label { font-size: 12px; color: var(--text-secondary); font-weight: 500; margin-bottom: 6px; }
        .stat-card-value { font-size: 24px; font-weight: 700; line-height: 1; }

        .dash-info-card { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
        .dash-info-header { padding: 16px 20px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
        .dash-info-title { font-size: 15px; font-weight: 600; }
        .dash-info-row { display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; border-bottom: 1px solid rgba(255,255,255,0.03); transition: background 0.2s; }
        .dash-info-row:last-child { border-bottom: none; }
        .dash-info-row:hover { background: rgba(255,255,255,0.02); }
        .dash-info-label { font-size: 13px; color: var(--text-secondary); display: flex; align-items: center; gap: 8px; }
        .dash-info-value { font-size: 14px; font-weight: 600; font-family: 'JetBrains Mono', monospace; }

        .xp-bar-track { width: 100%; height: 6px; background: var(--bg-tertiary); border-radius: 3px; overflow: hidden; margin-top: 8px; }
        .xp-bar-fill { height: 100%; border-radius: 3px; background: linear-gradient(90deg, var(--blue), var(--cyan)); transition: width 0.6s ease; }

        .dash-actions { display: flex; gap: 10px; margin-top: 28px; }
        .dash-action-btn {
            display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px;
            background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 8px;
            color: var(--text-secondary); font-size: 13px; font-weight: 500; text-decoration: none; transition: all 0.2s; cursor: pointer;
        }
        .dash-action-btn:hover { background: var(--bg-hover); color: var(--text-primary); border-color: rgba(255,255,255,0.15); }

        .dash-alert { display: flex; align-items: center; gap: 12px; padding: 16px 20px; border-radius: 10px; margin-bottom: 24px; font-size: 14px; }
        .dash-alert.warn { background: rgba(234,179,8,0.08); border: 1px solid rgba(234,179,8,0.2); color: #eab308; }

        /* ═══ SIDEBAR ICONS & COMING SOON ═══ */
        .nav-item { display: flex; align-items: center; gap: 10px; }
        .nav-item-icon { font-size: 16px; width: 20px; text-align: center; flex-shrink: 0; }
        .nav-item-disabled { opacity: 0.4; pointer-events: none; cursor: default; }
        .nav-soon-badge {
            margin-left: auto; font-size: 9px; font-weight: 700; letter-spacing: 0.5px;
            padding: 2px 6px; border-radius: 4px;
            background: rgba(168,85,247,0.15); color: var(--purple);
        }

        /* ═══ COMING SOON PAGE ═══ */
        .coming-soon-wrap { display: flex; align-items: center; justify-content: center; min-height: 60vh; flex-direction: column; text-align: center; padding: 40px; }
        .coming-soon-icon { font-size: 64px; margin-bottom: 24px; filter: grayscale(0.3); }
        .coming-soon-title { font-size: 28px; font-weight: 700; margin-bottom: 8px; color: var(--text-primary); }
        .coming-soon-desc { font-size: 14px; color: var(--text-secondary); max-width: 400px; line-height: 1.6; }
        .coming-soon-badge-lg {
            display: inline-flex; align-items: center; gap: 6px;
            margin-top: 20px; padding: 8px 20px; border-radius: 20px;
            background: rgba(168,85,247,0.1); border: 1px solid rgba(168,85,247,0.2);
            color: var(--purple); font-size: 12px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase;
        }

        /* ═══ TOURNAMENT PAGE ═══ */
        .tourney-status-badge {
            display: inline-flex; align-items: center; gap: 6px;
            padding: 4px 14px; border-radius: 20px; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;
        }
        .tourney-status-badge.active { background: rgba(74,222,128,0.12); color: var(--success); }
        .tourney-status-badge.inactive { background: rgba(255,255,255,0.06); color: var(--text-muted); }
        .tourney-participant {
            display: flex; align-items: center; gap: 12px; padding: 12px 16px;
            background: var(--bg-tertiary); border-radius: 8px; border: 1px solid var(--border);
        }
        .tourney-rank { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; background: rgba(255,255,255,0.06); color: var(--text-secondary); flex-shrink: 0; }
        .tourney-rank.top1 { background: linear-gradient(135deg, #ffd700, #f59e0b); color: #000; }
        .tourney-rank.top2 { background: linear-gradient(135deg, #c0c0c0, #9ca3af); color: #000; }
        .tourney-rank.top3 { background: linear-gradient(135deg, #cd7f32, #b45309); color: #000; }

        /* ═══ HALL OF FAME ═══ */
        .hof-season { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 12px; padding: 24px; margin-bottom: 16px; }
        .hof-season-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 8px; }
        .hof-season-title { font-size: 16px; font-weight: 700; }
        .hof-season-meta { font-size: 11px; color: var(--text-muted); display: flex; gap: 12px; align-items: center; }
        .hof-podium { display: flex; align-items: flex-end; justify-content: center; gap: 8px; margin-bottom: 16px; }
        .hof-place { flex: 1; max-width: 200px; border-radius: 10px; text-align: center; background: var(--bg-tertiary); border: 1px solid var(--border); position: relative; }
        .hof-place-rank { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; color: var(--text-muted); }
        .hof-place-name { font-size: 14px; font-weight: 600; }
        .hof-place-trophy { font-size: 28px; margin-bottom: 8px; }
        .hof-place.gold { padding: 28px 12px 24px; border-color: rgba(234,179,8,0.3); }
        .hof-place.gold .hof-place-rank { color: #eab308; }
        .hof-place.gold .hof-place-name { color: #eab308; }
        .hof-place.silver { padding: 20px 12px 20px; }
        .hof-place.silver .hof-place-rank { color: #9ca3af; }
        .hof-place.bronze { padding: 16px 12px 16px; }
        .hof-place.bronze .hof-place-rank { color: #92400e; }
        .hof-final { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 12px; background: var(--bg-tertiary); border-radius: 8px; font-size: 13px; color: var(--text-secondary); }
        .hof-final-score { font-weight: 700; font-size: 15px; color: var(--text-primary); }
        .hof-empty { text-align: center; padding: 60px 20px; color: var(--text-muted); }
        .hof-empty-icon { font-size: 48px; margin-bottom: 16px; opacity: 0.5; }
        .hof-empty-text { font-size: 14px; }
        .hof-history-btn { display: block; text-align: center; margin-top: 12px; padding: 10px; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: 8px; color: var(--text-secondary); text-decoration: none; font-size: 13px; font-weight: 500; transition: all 0.2s; }
        .hof-history-btn:hover { background: var(--bg-hover); color: var(--text-primary); border-color: var(--accent); }

        /* ═══ SEASON HISTORY ═══ */
        .sh-tabs { display: flex; gap: 8px; margin-bottom: 20px; }
        .sh-tab { padding: 10px 20px; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 8px; color: var(--text-secondary); cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s; font-family: inherit; }
        .sh-tab:hover { background: var(--bg-hover); color: var(--text-primary); }
        .sh-tab.active { background: var(--accent); color: #000; border-color: var(--accent); }
        .sh-group-title { font-size: 15px; font-weight: 700; margin-bottom: 12px; color: var(--text-primary); }
        .sh-table-wrap { overflow-x: auto; margin-bottom: 20px; border-radius: 8px; border: 1px solid var(--border); }
        .sh-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .sh-table thead { background: var(--bg-tertiary); }
        .sh-table th { padding: 10px 12px; text-align: center; color: var(--text-muted); font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
        .sh-table th:nth-child(2) { text-align: left; }
        .sh-table td { padding: 10px 12px; text-align: center; border-top: 1px solid var(--border); }
        .sh-table td:nth-child(2) { text-align: left; }
        .sh-table tbody tr:hover { background: var(--bg-hover); }
        .sh-table tbody tr:nth-child(even) { background: rgba(255,255,255,0.02); }
        .sh-qualified { border-left: 3px solid var(--accent); }
        .sh-player-name { font-weight: 600; white-space: nowrap; }
        .sh-pts { font-weight: 700; color: var(--accent); }
        .sh-gd-pos { color: #22c55e; }
        .sh-gd-neg { color: #ef4444; }
        .sh-matches-title { font-size: 13px; font-weight: 600; color: var(--text-muted); margin: 16px 0 10px; }
        .sh-matches-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 8px; margin-bottom: 24px; }
        .sh-match { display: flex; align-items: center; gap: 8px; padding: 10px 12px; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 8px; font-size: 12px; }
        .sh-match-id { font-weight: 700; color: var(--accent); min-width: 32px; }
        .sh-match-p1, .sh-match-p2 { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sh-match-p2 { text-align: right; }
        .sh-match-score { font-weight: 700; color: var(--text-primary); min-width: 40px; text-align: center; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .no-scrollbar::-webkit-scrollbar { display: none; }

        @media (max-width: 600px) {
            .hof-podium { gap: 6px; }
            .hof-place-name { font-size: 12px; }
            .hof-place-trophy { font-size: 22px; }
            .hof-place.gold { padding: 22px 8px 18px; }
            .hof-place.silver { padding: 16px 8px 14px; }
            .hof-place.bronze { padding: 12px 8px 12px; }
            .hof-season { padding: 16px; }
            .hof-season-head { flex-direction: column; align-items: flex-start; }
            .sh-tabs { flex-direction: column; }
            .sh-tab { width: 100%; }
            .sh-matches-grid { grid-template-columns: 1fr; }
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: 'Inter', -apple-system, sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
            min-height: 100vh;
        }

        .app { display: flex; min-height: 100vh; }

        /* Sidebar Desktop Default */
        .sidebar {
            width: var(--sidebar-width);
            background: var(--bg-secondary);
            border-right: 1px solid var(--border);
            display: flex;
            flex-direction: column;
            position: fixed;
            height: 100vh;
            z-index: 100;
            transition: transform 0.3s ease;
        }

        .sidebar-header { padding: 24px; border-bottom: 1px solid var(--border); }
        .sidebar-logo { display: flex; align-items: center; gap: 12px; }
        .sidebar-logo-icon {
            width: 40px; height: 40px; background: var(--text-primary);
            border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px;
            color: var(--bg-primary);
        }
        .sidebar-logo-text { font-size: 18px; font-weight: 700; }
        .sidebar-nav { flex: 1; padding: 16px 12px; overflow-y: auto; scrollbar-width: none; -ms-overflow-style: none; }
        .sidebar-nav::-webkit-scrollbar { display: none; }
        .nav-section { margin-bottom: 24px; }
        .nav-section-title { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); padding: 8px 12px; }
        
        .nav-item {
            display: flex; align-items: center; gap: 12px; padding: 10px 16px;
            border-radius: 8px; color: var(--text-secondary); text-decoration: none;
            font-size: 14px; font-weight: 500; transition: all 0.2s; margin-bottom: 2px;
        }
        .nav-item:hover { background: var(--bg-hover); color: var(--text-primary); }
        .nav-item.active { background: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border); }

        /* Category Styles */
        .nav-category { margin-bottom: 8px; }
        .nav-category-header {
            display: flex; align-items: center; gap: 10px; padding: 10px 12px;
            cursor: pointer; border-radius: 8px; transition: all 0.2s;
            color: var(--text-secondary);
        }
        .nav-category-header:hover { background: var(--bg-hover); color: var(--text-primary); }
        .category-icon { font-size: 16px; }
        .category-title { flex: 1; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
        .category-arrow { font-size: 10px; transition: transform 0.2s; opacity: 0.5; }
        .nav-category.expanded .category-arrow { transform: rotate(180deg); }
        .nav-category-items { display: none; padding-left: 8px; margin-top: 4px; }
        .nav-category.expanded .nav-category-items { display: block; }

        .sidebar-footer { padding: 16px; border-top: 1px solid var(--border); }
        .user-info { display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--bg-tertiary); border-radius: 8px; margin-bottom: 12px; }
        .user-avatar { width: 36px; height: 36px; background: var(--border); border-radius: 50%; display: flex; align-items: center; justify-content: center; }
        .btn-logout { width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 10px; background: transparent; border: 1px solid var(--border); color: var(--text-secondary); border-radius: 6px; cursor: pointer; transition: all 0.2s; }
        .btn-logout:hover { background: rgba(248, 113, 113, 0.1); color: var(--error); border-color: var(--error); }

        /* Main Content */
        .main { margin-left: var(--sidebar-width); flex: 1; min-width: 0; }
        .header { padding: 32px 40px; border-bottom: 1px solid var(--border); background: var(--bg-primary); }
        .header-title { font-size: 32px; font-weight: 700; margin-bottom: 8px; }
        .content { padding: 40px; }

        /* Components */
        .grid { display: grid; gap: 24px; }
        .grid-2 { grid-template-columns: repeat(2, 1fr); }
        .grid-3 { grid-template-columns: repeat(3, 1fr); }
        .grid-4 { grid-template-columns: repeat(4, 1fr); }
        .grid-5 { grid-template-columns: repeat(5, 1fr); }
        .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 10px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            border: none;
            cursor: pointer;
            transition: all 0.2s;
            text-decoration: none;
        }

        /* ═══ TOURNAMENT TABS STYLES ═══ */
        .tourney-tabs {
            display: flex;
            gap: 16px;
            margin-top: 16px;
            border-bottom: 1px solid var(--border);
            padding-bottom: 0px;
        }
        .tourney-tab-btn {
            background: transparent;
            border: none;
            color: var(--text-secondary);
            font-size: 14px;
            font-weight: 600;
            padding: 12px 16px;
            cursor: pointer;
            border-bottom: 2px solid transparent;
            transition: all 0.2s;
        }
        .tourney-tab-btn:hover { color: var(--text-primary); }
        .tourney-tab-btn.active {
            color: var(--accent);
            border-bottom-color: var(--accent);
        }
        .tourney-tab-content {
            display: none;
            padding-top: 24px;
        }
        .tourney-tab-content.active {
            display: block;
        }


        .btn-primary { background: var(--text-primary); color: var(--bg-primary); }
        .btn-primary:hover { opacity: 0.9; }
        .btn-secondary { background: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border); }
        .btn-secondary:hover { background: var(--bg-hover); }

        .table { width: 100%; border-collapse: collapse; }
        .table th, .table td { padding: 14px 16px; text-align: left; border-bottom: 1px solid var(--border); }
        .table th { font-size: 12px; font-weight: 600; text-transform: uppercase; color: var(--text-secondary); }
        .table td { font-size: 14px; }
        .table tr:hover { background: var(--bg-tertiary); }

        .badge { display: inline-flex; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 500; }
        .badge-success { background: rgba(74, 222, 128, 0.1); color: var(--success); }
        .badge-warning { background: rgba(251, 191, 36, 0.1); color: var(--warning); }
        .badge-admin { background: rgba(255, 255, 255, 0.1); color: var(--text-primary); }
        .badge-user { background: rgba(136, 136, 136, 0.1); color: var(--text-secondary); }

        .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: var(--error);
        }
        .status-dot.connected { background: var(--success); box-shadow: 0 0 8px var(--success); }
        .status-dot.waiting { background: var(--warning); animation: pulse 2s infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

        /* QR Styles */
        .qr-wrapper { display: flex; flex-direction: column; align-items: center; padding: 40px 20px; }
        .qr-container { background: white; padding: 16px; border-radius: 16px; margin: 24px 0; }
        .qr-container img { width: 250px; height: 250px; display: block; }
        .qr-placeholder { width: 250px; height: 250px; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #333; }
        .qr-loader { width: 40px; height: 40px; border: 3px solid #ddd; border-top-color: #333; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 16px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .qr-status { margin-bottom: 16px; }
        .qr-status-badge { display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; border-radius: 9999px; font-size: 14px; font-weight: 500; border: 1px solid var(--border); }
        .qr-status-badge.waiting { background: rgba(251, 191, 36, 0.1); border-color: rgba(251, 191, 36, 0.3); color: var(--warning); }
        .qr-status-badge.connected { background: rgba(74, 222, 128, 0.1); border-color: rgba(74, 222, 128, 0.3); color: var(--success); }
        .qr-instructions { text-align: center; color: var(--text-secondary); font-size: 14px; line-height: 2; }
        .connected-view { text-align: center; padding: 40px; }
        .connected-icon { width: 80px; height: 80px; background: var(--bg-tertiary); border: 2px solid var(--success); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 36px; margin: 0 auto 20px; color: var(--success); }
        .connected-title { font-size: 24px; font-weight: 600; color: var(--success); margin-bottom: 8px; }
        .connected-user { color: var(--text-secondary); }

        /* Login Page */
        .login-page {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        .login-card {
            background: var(--bg-secondary);
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 40px;
            width: 100%;
            max-width: 400px;
        }

        .login-header { text-align: center; margin-bottom: 32px; }
        .login-logo {
            width: 64px;
            height: 64px;
            background: var(--text-primary);
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            margin: 0 auto 16px;
        }
        .login-title { font-size: 24px; font-weight: 700; margin-bottom: 8px; }
        .login-subtitle { color: var(--text-secondary); font-size: 14px; }

        .form-group { margin-bottom: 20px; }
        .form-label { display: block; font-size: 13px; font-weight: 500; margin-bottom: 8px; color: var(--text-secondary); }
        .form-input {
            width: 100%;
            padding: 12px 16px;
            background: var(--bg-tertiary);
            border: 1px solid var(--border);
            border-radius: 8px;
            color: var(--text-primary);
            font-size: 14px;
            transition: all 0.2s;
        }
        .form-input:focus { outline: none; border-color: var(--text-primary); }
        .form-input::placeholder { color: var(--text-muted); }

        .login-btn {
            width: 100%;
            padding: 14px;
            background: var(--text-primary);
            color: var(--bg-primary);
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
        }
        .login-btn:hover { opacity: 0.9; }

        .login-error {
            background: rgba(248, 113, 113, 0.1);
            border: 1px solid rgba(248, 113, 113, 0.3);
            color: var(--error);
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 13px;
            margin-bottom: 20px;
            text-align: center;
        }

        /* 403 Page */
        .error-page {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 20px;
        }
        .error-code { font-size: 120px; font-weight: 700; color: var(--border); line-height: 1; }
        .error-title { font-size: 24px; margin: 20px 0 10px; }
        .error-desc { color: var(--text-secondary); margin-bottom: 30px; }

        /* Mobile Header */
        .mobile-header { display: none !important; }
        .sidebar-overlay { display: none !important; }

        /* RESPONSIVE */
        @media (max-width: 1024px) {
            .grid-4 { grid-template-columns: repeat(2, 1fr); }
        }

        @media (max-width: 768px) {
            .sidebar {
                transform: translateX(-100%);
                box-shadow: 4px 0 24px rgba(0,0,0,0.5);
                display: flex !important; /* Override desktop hidden if any */
                z-index: 200;
            }
            .sidebar.active { transform: translateX(0); }
            
            .main { margin-left: 0 !important; width: 100%; }
            .content { padding: 20px; }
            .header { padding: 24px 20px; }
            
            .grid-2, .grid-3, .grid-4 { grid-template-columns: 1fr; }
            
            /* Enable Mobile Header */
            .mobile-header {
                display: flex !important; align-items: center; padding: 16px 20px;
                background: var(--bg-secondary); border-bottom: 1px solid var(--border);
                position: sticky; top: 0; z-index: 90;
            }
            .menu-toggle {
                background: none; border: none; color: var(--text-primary);
                font-size: 24px; margin-right: 16px; cursor: pointer;
            }
            
            /* Overlay */
            .sidebar-overlay {
                display: none; position: fixed; inset: 0;
                background: rgba(0,0,0,0.5); z-index: 150;
                backdrop-filter: blur(2px);
            }
            .sidebar-overlay.active { display: block !important; }

            .table-container { overflow-x: auto; }
        }

        /* ══════════════════════════════════════════════════════════════ */
        /* LOGIN & REGISTER PAGE STYLES */
        /* ══════════════════════════════════════════════════════════════ */
        
        .login-page {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--bg-primary);
            padding: 20px;
        }

        .login-card {
            background: var(--bg-secondary);
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 48px;
            width: 100%;
            max-width: 440px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .login-header {
            text-align: center;
            margin-bottom: 32px;
        }

        .login-logo {
            font-size: 56px;
            margin-bottom: 16px;
        }

        .login-title {
            font-size: 28px;
            font-weight: 700;
            color: var(--text-primary);
            margin-bottom: 8px;
        }

        .login-subtitle {
            font-size: 14px;
            color: var(--text-secondary);
        }

        .login-error {
            background: rgba(248, 113, 113, 0.1);
            border: 1px solid var(--error);
            color: var(--error);
            padding: 12px 16px;
            border-radius: 8px;
            margin-bottom: 24px;
            font-size: 14px;
            text-align: center;
        }

        .login-success {
            background: rgba(74, 222, 128, 0.1);
            border: 1px solid var(--success);
            color: var(--success);
            padding: 12px 16px;
            border-radius: 8px;
            margin-bottom: 24px;
            font-size: 14px;
            text-align: center;
        }

        .form-group {
            margin-bottom: 20px;
        }

        .form-label {
            display: block;
            font-size: 14px;
            font-weight: 500;
            color: var(--text-primary);
            margin-bottom: 8px;
        }

        .form-input {
            width: 100%;
            padding: 12px 16px;
            background: var(--bg-tertiary);
            border: 1px solid var(--border);
            border-radius: 8px;
            color: var(--text-primary);
            font-size: 14px;
            font-family: 'Inter', sans-serif;
            transition: all 0.2s;
        }

        .form-input:focus {
            outline: none;
            border-color: var(--accent);
            background: var(--bg-primary);
        }

        .form-input::placeholder {
            color: var(--text-muted);
        }

        .login-btn {
            width: 100%;
            padding: 14px;
            background: var(--text-primary);
            color: var(--bg-primary);
            border: none;
            border-radius: 8px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            margin-top: 8px;
        }

        .login-btn:hover {
            background: var(--text-secondary);
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(255, 255, 255, 0.2);
        }

        .login-btn:active {
            transform: translateY(0);
        }

        @media (max-width: 480px) {
            .login-card {
                padding: 32px 24px;
            }
            
            .login-logo {
                font-size: 48px;
            }
            
            .login-title {
                font-size: 24px;
            }
        }

        /* ═══ CASINO PAGE ═══ */
        /* ═══ CASINO QUICK MENU ═══ */
        .quick-menu-grid {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            gap: 16px;
            margin-bottom: 32px;
            justify-items: center;
        }
        @media (max-width: 768px) {
            .quick-menu-grid {
                grid-template-columns: repeat(5, 1fr);
                gap: 12px 6px; /* tightly packed for 5 items */
            }
        }
        .quick-menu-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-decoration: none;
            gap: 10px;
            cursor: pointer;
            transition: transform 0.2s ease;
            width: 100%; /* Fill grid cell width */
        }
        .quick-menu-item:hover {
            transform: translateY(-4px);
        }
        .quick-menu-disabled {
            cursor: not-allowed;
            opacity: 0.6;
        }
        .quick-menu-disabled:hover {
            transform: none;
        }
        .quick-menu-box {
            position: relative;
            width: 64px; /* Fixed box size */
            height: 64px;
            border-radius: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: inset 0 0 0 1px rgba(255,255,255,0.05);
            transition: all 0.2s ease;
        }
        .quick-menu-item:hover .quick-menu-box {
            box-shadow: inset 0 0 0 1px rgba(255,255,255,0.1), 0 8px 16px rgba(0,0,0,0.2);
        }
        .quick-menu-disabled:hover .quick-menu-box {
            box-shadow: inset 0 0 0 1px rgba(255,255,255,0.05);
        }
        @media (max-width: 768px) {
            .quick-menu-item { width: 100%; }
            .quick-menu-box { width: 48px; height: 48px; border-radius: 12px; }
        }
        .quick-menu-icon {
            font-size: 28px;
            line-height: 1;
            filter: drop-shadow(0 4px 6px rgba(0,0,0,0.2));
            transition: transform 0.2s ease;
        }
        .quick-menu-item:hover .quick-menu-icon {
            transform: scale(1.1);
        }
        @media (max-width: 768px) {
            .quick-menu-icon { font-size: 20px; }
        }
        .quick-menu-label {
            font-size: 13px;
            color: var(--text-secondary);
            font-weight: 500;
            text-align: center;
            line-height: 1.2;
        }
        @media (max-width: 768px) {
            .quick-menu-label { font-size: 10px; }
        }
        .quick-menu-badge {
            position: absolute;
            top: -6px;
            left: -6px;
            background: #ea580c;
            color: #fff;
            font-size: 10px;
            font-weight: 700;
            padding: 2px 6px;
            border-radius: 6px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            z-index: 2;
        }

        /* Chip source cards */
        .casino-source-card {
            display: flex;
            align-items: center;
            gap: 14px;
            background: var(--bg-secondary);
            border: 1px solid var(--border);
            border-radius: 10px;
            padding: 14px 18px;
            transition: all 0.2s ease;
        }
        .casino-source-card:hover {
            border-color: rgba(251,191,36,0.2);
            background: var(--bg-hover);
        }
        .casino-source-icon {
            font-size: 28px;
            flex-shrink: 0;
            width: 44px;
            height: 44px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255,255,255,0.04);
            border-radius: 10px;
        }

        /* Utility specific */
        .hide-scrollbar {
            -ms-overflow-style: none;  /* IE and Edge */
            scrollbar-width: none;  /* Firefox */
        }
        .hide-scrollbar::-webkit-scrollbar {
            display: none;
        }

        /* ═══ RESPONSIVE TABLE (Card view on mobile) ═══
           Add class "responsive-table" to .table-container to opt-in.
           Each <td> needs a data-label="..." attribute.
        */
        .table-container {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
        }

        @media (max-width: 680px) {
            .responsive-table {
                overflow-x: visible !important;
            }
            .responsive-table .table {
                border: none;
            }
            .responsive-table .table thead {
                display: none;
            }
            .responsive-table .table tbody tr {
                display: block;
                background: var(--bg-tertiary);
                border: 1px solid var(--border);
                border-radius: 10px;
                margin-bottom: 10px;
                padding: 10px 14px;
            }
            .responsive-table .table tbody tr:hover {
                background: var(--bg-tertiary);
            }
            .responsive-table .table td {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 5px 0;
                font-size: 13px;
                border: none;
                min-height: 28px;
            }
            .responsive-table .table td::before {
                content: attr(data-label);
                font-weight: 600;
                color: var(--text-secondary);
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 0.04em;
                flex-shrink: 0;
                margin-right: 12px;
            }
            .responsive-table .table td[data-label="Aksi"],
            .responsive-table .table td[data-label="Actions"] {
                padding-top: 10px;
                margin-top: 4px;
                border-top: 1px solid var(--border);
                justify-content: flex-end;
            }
            .responsive-table .table td[data-label="Aksi"]::before,
            .responsive-table .table td[data-label="Actions"]::before {
                display: none;
            }
        }

        /* ═══ MODAL MOBILE SCROLL FIX ═══
           Applies to ALL modals whose id ends with "Modal"
           (editResModal, editShopModal, editPlayerModal, editSymModal, editItemModal, etc.)
        */
        [id$="Modal"] {
            overflow-y: auto !important;
            align-items: flex-start !important;
            padding: 16px !important;
            box-sizing: border-box;
        }
        [id$="Modal"] > div {
            overflow-y: auto !important;
            max-height: none !important;
            margin: auto !important;
            width: 100% !important;
            box-sizing: border-box;
        }
        @media (max-width: 600px) {
            [id$="Modal"] {
                padding: 10px !important;
            }
            [id$="Modal"] > div {
                padding: 18px !important;
                border-radius: 12px !important;
                max-width: 100% !important;
            }
        }
        `;
}

module.exports = { getCSS };