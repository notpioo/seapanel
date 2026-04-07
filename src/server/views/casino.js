/**
 * Casino Page View
 * Displays casino dashboard with game catalog (e-commerce style grid), 
 * chip sources, and quick reference commands.
 */

function getCasinoPage(session, botUser, casinoConfig) {
    const casinoChips = botUser ? (botUser.casinoChips || 0) : 0;
    const cooldownHours = (casinoConfig && casinoConfig.dailyCooldownHours) || 24;
    const isAdmin = session && session.role === 'admin';

    // Maintenance mode check
    if (casinoConfig && !casinoConfig.isEnabled && !isAdmin) {
        return `
        <header class="header"><h1 class="header-title">🎰 Kasino</h1></header>
        <div class="content" style="display:flex;align-items:center;justify-content:center;min-height:60vh;">
            <div style="text-align:center;max-width:400px;">
                <div style="font-size:80px;margin-bottom:16px;">🔧</div>
                <h2 style="color:var(--text-primary);margin-bottom:8px;">Sedang Dalam Pemeliharaan</h2>
                <p style="color:var(--text-secondary);font-size:15px;">${casinoConfig.maintenanceMsg || 'Kasino sedang dalam pemeliharaan.'}</p>
            </div>
        </div>`;
    }
    // Check daily claim availability
    let canClaim = false;
    let timeText = 'Klaim Harian';
    if (botUser) {
        const now = new Date();
        const lastClaim = botUser.lastDailyCsn ? new Date(botUser.lastDailyCsn) : null;
        if (!lastClaim || (now - lastClaim) / (1000 * 60 * 60) >= cooldownHours) {
            canClaim = true;
        } else {
            const hoursPassed = (now - lastClaim) / (1000 * 60 * 60);
            const remainingHours = Math.floor(cooldownHours - hoursPassed);
            const remainingMinutes = Math.floor(((cooldownHours - hoursPassed) * 60) % 60);
            timeText = `${remainingHours}j ${remainingMinutes}m lagi`;
        }
    }
    // Game cards data
    const games = [
        { id: 'slot', name: 'Slot Machine', icon: '🎰', desc: 'Spin the reels and match symbols for big wins!', command: '.slot [bet]', status: 'live', color: '#fbbf24' },
        { id: 'coinflip', name: 'Coinflip', icon: '🪙', desc: 'Double or nothing — heads or tails!', command: '.flip [bet] [h/t]', status: 'soon', color: '#4ade80' },
        { id: 'dice', name: 'Hi-Lo Dice', icon: '🎲', desc: 'Roll the dice — guess high or low.', command: '.dice [bet] [hi/lo]', status: 'live', color: '#f472b6' },
        { id: 'blackjack', name: 'Blackjack', icon: '🃏', desc: 'Classic 21. Beat the dealer!', command: '.bj [bet]', status: 'soon', color: '#a855f7' },
        { id: 'roulette', name: 'Roulette', icon: '🎡', desc: 'Pick your color or number. Spin!', command: '.roulette [bet] [pick]', status: 'soon', color: '#ef4444' },
        { id: 'horserace', name: 'Horse Race', icon: '🏇', desc: 'Pick a horse and watch the race!', command: '.race [bet] [horse]', status: 'soon', color: '#3b82f6' },
    ];

    var gameCardsHtml = '';
    for (var i = 0; i < games.length; i++) {
        var g = games[i];
        var isLive = g.status === 'live';

        var badgeHtml = isLive
            ? '<span class="quick-menu-badge">Baru</span>'
            : '<span class="quick-menu-badge" style="background:#555;color:#ccc;">Soon</span>';

        gameCardsHtml += '<a href="' + (isLive ? '/casino/' + g.id : '#') + '" class="quick-menu-item' + (!isLive ? ' quick-menu-disabled' : '') + '">' +
            '<div class="quick-menu-box" style="background:' + g.color + '22;">' + // 22 is hex for ~13% opacity
            badgeHtml +
            '<div class="quick-menu-icon">' + g.icon + '</div>' +
            '</div>' +
            '<div class="quick-menu-label">' + g.name + '</div>' +
            '</a>';
    }

    // How to get chips section
    var chipsSourcesHtml = '';
    var sources = [
        { icon: '🎁', title: 'Klaim Harian', desc: 'Gunakan .dailycsn untuk klaim koin gratis tiap 24 jam', amount: '100-500' },
        { icon: '🔥', title: 'Bonus Beruntun', desc: 'Klaim tiap hari berturut-turut untuk bonus lebih besar', amount: 'Maks 1,000' },
        { icon: '🆕', title: 'Bonus Pemula', desc: 'Pemain baru mendapat modal tambahan', amount: '1,000' },
        { icon: '🏆', title: 'Hadiah Turnamen', desc: 'Menangkan turnamen untuk hadiah koin masif', amount: '5,000+' },
    ];

    for (var i = 0; i < sources.length; i++) {
        var s = sources[i];
        chipsSourcesHtml += '<div class="casino-source-card">' +
            '<div class="casino-source-icon">' + s.icon + '</div>' +
            '<div style="flex:1;">' +
            '<div style="font-weight:600;font-size:14px;margin-bottom:2px;">' + s.title + '</div>' +
            '<div style="font-size:12px;color:var(--text-secondary);">' + s.desc + '</div>' +
            '</div>' +
            '<div style="font-weight:700;font-size:14px;color:#fbbf24;white-space:nowrap;">' + s.amount + '</div>' +
            '</div>';
    }

    var html = '';
    html += '<header class="header">';
    html += '  <div>';
    html += '    <h1 class="header-title">Kasino</h1>';
    html += '    <p style="color:var(--text-secondary);font-size:14px;margin-top:4px;">Uji keberuntunganmu — mainkan game via WhatsApp atau langsung dari web!</p>';
    html += '  </div>';
    html += '</header>';

    html += '<div class="content">';

    // === Hero Balance & Daily Card ===
    html += '<div style="background: linear-gradient(135deg, rgba(251,191,36,0.08), rgba(245,158,11,0.02)); border: 1px solid rgba(251,191,36,0.15); border-radius: 20px; padding: 24px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px; flex-wrap: wrap; gap: 20px; box-shadow: 0 8px 32px rgba(251,191,36,0.03);">';

    html += '  <div style="display: flex; align-items: center; gap: 16px;">';
    html += '    <div style="font-size: 36px; background: rgba(251,191,36,0.1); width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; border-radius: 16px; box-shadow: inset 0 0 0 1px rgba(251,191,36,0.2), 0 4px 12px rgba(251,191,36,0.1);">';
    html += '      🪙';
    html += '    </div>';
    html += '    <div>';
    html += '      <div style="font-size: 13px; color: var(--text-secondary); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Saldo Anda</div>';
    html += '      <div style="font-size: 28px; font-weight: 800; color: #fbbf24; line-height: 1; display: flex; align-items: center; gap: 10px; font-family: monospace;">';
    html += '        ' + casinoChips.toLocaleString('id-ID');
    html += '        <span style="font-size: 11px; font-weight: 700; padding: 4px 8px; background: rgba(255,255,255,0.06); border-radius: 6px; color: var(--text-muted); font-family: \'Inter\', sans-serif;">KOIN</span>';
    html += '      </div>';
    html += '    </div>';
    html += '  </div>';

    html += '  <form action="/casino/claim" method="POST" style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px; margin: 0;">';

    if (canClaim) {
        html += '    <button type="submit" style="background: linear-gradient(135deg, #fbbf24, #f59e0b); color: #000; border: none; padding: 10px 18px; border-radius: 10px; font-weight: 700; font-size: 13px; cursor: pointer; box-shadow: 0 4px 12px rgba(251,191,36,0.25); transition: all 0.2s ease; display:flex; align-items:center; justify-content:center; gap: 8px;">';
        html += '      <span style="font-size: 16px;">🎁</span> Klaim';
        html += '    </button>';
    } else {
        html += '    <button disabled style="background: rgba(255,255,255,0.05); color: var(--text-muted); border: 1px solid rgba(255,255,255,0.1); padding: 10px 18px; border-radius: 10px; font-weight: 600; font-size: 13px; cursor: not-allowed; display:flex; align-items:center; justify-content:center; gap: 8px;">';
        html += '      <span>⏳</span> ' + timeText;
        html += '    </button>';
    }

    html += '    <div style="font-size: 11px; color: var(--text-muted); font-weight: 500;">Gunakan <code style="color:#fbbf24;background:rgba(251,191,36,0.1);padding:2px 4px;border-radius:4px;font-size:10px;">.dailycsn</code> di bot</div>';
    html += '  </form>';

    html += '</div>';

    // === Games Grid ===
    html += '<div class="dash-section-title">🎮 Daftar Permainan</div>';
    html += '<div class="quick-menu-grid">';
    html += gameCardsHtml;
    html += '</div>';

    // === How to Get Chips ===
    html += '<div class="dash-section-title">💰 Cara Mendapatkan Koin</div>';
    html += '<div style="display:flex;flex-direction:column;gap:10px;margin-bottom:32px;">';
    html += chipsSourcesHtml;
    html += '</div>';

    // === Quick Reference ===
    html += '<div class="dash-section-title">📖 Referensi Perintah</div>';
    html += '<div class="dash-info-card">';
    html += '  <div class="dash-info-header"><div class="dash-info-title">Perintah Kasino</div></div>';

    var commands = [
        ['.dailycsn', 'Klaim koin gratis harian'],
        ['.balance', 'Cek saldo koinmu'],
        ['.richest', 'Lihat 10 pemain terkaya'],
        ['.transfer @user [jml]', 'Kirim koin ke pemain lain'],
        ['.slot [taruhan]', 'Main mesin slot'],
        ['.flip [taruhan] [h/t]', 'Main tebak koin (heads/tails)'],
        ['.dice [taruhan] [hi/lo]', 'Main lempar dadu (high/low)'],
    ];

    for (var j = 0; j < commands.length; j++) {
        html += '<div class="dash-info-row">';
        html += '  <div class="dash-info-label"><code style="background:var(--bg-tertiary);padding:3px 8px;border-radius:4px;font-size:12px;">' + commands[j][0] + '</code></div>';
        html += '  <div style="font-size:13px;color:var(--text-secondary);">' + commands[j][1] + '</div>';
        html += '</div>';
    }

    html += '</div>';
    html += '</div>'; // .content

    return html;
}

module.exports = { getCasinoPage };
