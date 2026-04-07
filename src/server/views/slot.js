/**
 * Slot Machine View with Animations
 */

function getSlotPage(session, botUser, casinoConfig) {
    const casinoChips = botUser ? (botUser.casinoChips || 0) : 0;
    const minBet = (casinoConfig && casinoConfig.slotMinBet) || 10;
    const maxBet = (casinoConfig && casinoConfig.slotMaxBet) || 10000;
    const isAdmin = session && session.role === 'admin';

    // Maintenance mode check
    if (casinoConfig && !casinoConfig.isEnabled && !isAdmin) {
        return `
        <header class="header"><h1 class="header-title"><a href="/casino" style="color:var(--text-secondary);text-decoration:none;margin-right:10px;">⬅️</a> Mesin Slot</h1></header>
        <div class="content" style="display:flex;align-items:center;justify-content:center;min-height:60vh;">
            <div style="text-align:center;max-width:400px;">
                <div style="font-size:80px;margin-bottom:16px;">🔧</div>
                <h2 style="color:var(--text-primary);margin-bottom:8px;">Sedang Dalam Pemeliharaan</h2>
                <p style="color:var(--text-secondary);font-size:15px;">${casinoConfig.maintenanceMsg || 'Kasino sedang dalam pemeliharaan.'}</p>
                <a href="/casino" class="btn btn-secondary" style="margin-top:20px;">← Kembali</a>
            </div>
        </div>`;
    }
    // Get symbols from config or use defaults
    const configSymbols = (casinoConfig && casinoConfig.slotSymbols && casinoConfig.slotSymbols.length > 0)
        ? casinoConfig.slotSymbols
        : [
            { emoji: '🍒', name: 'Cherry', weight: 20, multiplier: 3 },
            { emoji: '🍋', name: 'Lemon', weight: 18, multiplier: 5 },
            { emoji: '🍇', name: 'Grape', weight: 16, multiplier: 5 },
            { emoji: '🍉', name: 'Watermelon', weight: 14, multiplier: 5 },
            { emoji: '🔔', name: 'Bell', weight: 10, multiplier: 10 },
            { emoji: '⭐', name: 'Star', weight: 6, multiplier: 15 },
            { emoji: '💎', name: 'Diamond', weight: 3, multiplier: 25 },
            { emoji: '7️⃣', name: 'Seven', weight: 1, multiplier: 50 },
        ];
    const symbols = configSymbols.map(s => s.emoji);

    let html = '';

    // Inject Custom CSS for Slot Machine
    html += `
    <style>
        .slot-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            max-width: 500px;
            margin: 0 auto;
            background: var(--bg-secondary);
            border-radius: 24px;
            padding: 24px;
            border: 1px solid var(--border-color);
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }

        .slot-machine {
            background: #111;
            padding: 20px;
            border-radius: 16px;
            border: 4px solid #333;
            box-shadow: inset 0 0 20px rgba(0,0,0,0.8), 0 0 15px rgba(251, 191, 36, 0.2);
            position: relative;
            margin-bottom: 24px;
            width: 100%;
        }

        .slot-machine::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background: linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 20%, rgba(0,0,0,0) 80%, rgba(0,0,0,0.4) 100%);
            pointer-events: none;
            border-radius: 12px;
            z-index: 10;
        }

        .reels-container {
            display: flex;
            gap: 12px;
            justify-content: center;
        }

        .reel {
            width: 80px;
            height: 120px;
            background: #fff;
            border-radius: 8px;
            overflow: hidden;
            position: relative;
            box-shadow: inset 0 0 10px rgba(0,0,0,0.5);
        }

        .reel-strip {
            display: flex;
            flex-direction: column;
            transition: transform 3s cubic-bezier(0.1, 0.7, 0.1, 1);
            /* Initial state */
            transform: translateY(0);
        }

        .symbol {
            width: 80px;
            height: 120px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 50px;
            line-height: 1;
            /* text-shadow: 0 2px 4px rgba(0,0,0,0.2); */
            user-select: none;
        }

        /* Payline indicator */
        .payline {
            position: absolute;
            top: 50%;
            left: -10px;
            right: -10px;
            height: 4px;
            background: rgba(251, 191, 36, 0.5);
            transform: translateY(-50%);
            box-shadow: 0 0 8px #fbbf24;
            z-index: 5;
            pointer-events: none;
        }

        .slot-controls {
            display: flex;
            flex-direction: column;
            gap: 16px;
            width: 100%;
        }

        .bet-control {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: var(--bg-tertiary);
            padding: 12px 16px;
            border-radius: 12px;
        }

        .bet-input-wrap {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .bet-btn {
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            color: var(--text-primary);
            width: 32px;
            height: 32px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.2s;
        }

        .bet-btn:hover {
            background: var(--blue);
            color: #fff;
            border-color: var(--blue);
        }

        .bet-input {
            width: 80px;
            background: var(--bg-primary);
            border: 1px solid var(--border-color);
            color: #fbbf24;
            font-weight: 800;
            font-size: 18px;
            text-align: center;
            padding: 8px;
            border-radius: 8px;
            font-family: monospace;
        }

        .spin-btn {
            background: linear-gradient(135deg, #fbbf24, #f59e0b);
            color: #000;
            border: none;
            padding: 16px;
            border-radius: 12px;
            font-weight: 900;
            font-size: 20px;
            text-transform: uppercase;
            letter-spacing: 2px;
            cursor: pointer;
            box-shadow: 0 6px 20px rgba(251,191,36,0.3);
            transition: all 0.1s;
        }

        .spin-btn:active {
            transform: translateY(4px);
            box-shadow: 0 2px 10px rgba(251,191,36,0.3);
        }
        
        .spin-btn:disabled {
            background: #555;
            color: #888;
            box-shadow: none;
            cursor: not-allowed;
            transform: none;
        }

        .slot-status {
            text-align: center;
            font-size: 16px;
            font-weight: 600;
            min-height: 24px;
            margin-top: 10px;
            color: var(--text-secondary);
            transition: color 0.3s;
        }
        
        .win-anim {
            animation: winPulse 1s ease infinite alternate;
            color: #4ade80 !important;
        }
        
        @keyframes winPulse {
            0% { text-shadow: 0 0 5px #4ade80; transform: scale(1); }
            100% { text-shadow: 0 0 20px #4ade80, 0 0 30px #4ade80; transform: scale(1.05); }
        }

        /* Paytable */
        .paytable {
            width: 100%;
            margin-top: 32px;
            background: var(--bg-tertiary);
            border-radius: 12px;
            padding: 16px;
        }

        .paytable-title {
            text-align: center;
            font-weight: 700;
            font-size: 14px;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 12px;
        }

        .paytable-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 12px;
        }

        .paytable-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: var(--bg-secondary);
            padding: 8px 12px;
            border-radius: 8px;
            font-size: 14px;
        }
    </style>
    `;

    html += '<header class="header" style="margin-bottom:20px;">';
    html += '  <div style="display:flex; justify-content:space-between; align-items:center;">';
    html += '    <div>';
    html += '      <h1 class="header-title"><a href="/casino" style="color:var(--text-secondary);text-decoration:none;margin-right:10px;">⬅️</a> Mesin Slot</h1>';
    html += '      <p style="color:var(--text-secondary);font-size:14px;margin-top:4px;">Putar reel dan raih Jackpot!</p>';
    html += '    </div>';
    html += '    <div style="text-align:right;">';
    html += '      <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">Saldo</div>';
    html += '      <div style="font-weight: 800; color: #fbbf24; font-family: monospace; font-size: 20px;" id="casinoChipsVal">' + casinoChips.toLocaleString('id-ID') + '</div>';
    html += '    </div>';
    html += '  </div>';
    html += '</header>';

    html += '<div class="content">';
    html += '<div class="slot-container">';

    // The Machine
    html += '  <div class="slot-machine">';
    html += '    <div class="payline"></div>';
    html += '    <div class="reels-container">';

    // Weighted pick helper for server-side initial reel
    const totalWeight = configSymbols.reduce((sum, s) => sum + s.weight, 0);
    function weightedPick() {
        let r = Math.random() * totalWeight;
        for (const s of configSymbols) {
            r -= s.weight;
            if (r <= 0) return s.emoji;
        }
        return configSymbols[configSymbols.length - 1].emoji;
    }

    // Create 3 reels
    for (let r = 0; r < 3; r++) {
        html += `      <div class="reel"><div class="reel-strip" id="reel${r}">`;
        for (let i = 0; i < 30; i++) {
            html += `<div class="symbol">${weightedPick()}</div>`;
        }
        html += `      </div></div>`;
    }

    html += '    </div>'; // .reels-container
    html += '  </div>'; // .slot-machine

    // Controls
    html += '  <div class="slot-controls">';
    html += '    <div class="bet-control">';
    html += '      <div style="font-size:14px; color:var(--text-secondary); font-weight:600;">Taruhan</div>';
    html += '      <div class="bet-input-wrap">';
    html += '        <button class="bet-btn" onclick="adjustBet(-' + minBet + ')">-</button>';
    html += '        <input type="number" id="betAmount" class="bet-input" value="' + minBet + '" min="' + minBet + '" max="' + Math.min(maxBet, Math.max(minBet, casinoChips)) + '">';
    html += '        <button class="bet-btn" onclick="adjustBet(' + minBet + ')">+</button>';
    html += '        <button class="bet-btn" style="width:auto;padding:0 12px;font-size:12px;background:var(--bg-primary);" onclick="setMaxBet()">MAX</button>';
    html += '      </div>';
    html += '    </div>';

    html += '    <button class="spin-btn" id="spinBtn" onclick="spinSlot()">🎲 PUTAR!</button>';
    html += '    <div class="slot-status" id="slotStatus">Siap diputar!</div>';
    html += '  </div>';

    // Paytable - dynamic from config
    html += '  <div class="paytable">';
    html += '    <div class="paytable-title">Daftar Hadiah (3 Kembar)</div>';
    html += '    <div class="paytable-grid">';
    // Sort by multiplier descending for display
    const sortedSymbols = [...configSymbols].sort((a, b) => b.multiplier - a.multiplier);
    for (const s of sortedSymbols) {
        html += '      <div class="paytable-item"><span>' + s.emoji + ' ' + s.emoji + ' ' + s.emoji + '</span> <span style="color:#fbbf24;font-weight:bold;">x' + s.multiplier + '</span></div>';
    }
    html += '    </div>';
    html += '  </div>';


    html += '</div>'; // .slot-container
    html += '</div>'; // .content

    // JS Logic for Animation and API calling
    html += `
    <script>
        const SYMBOLS = ${JSON.stringify(symbols)};
        const WEIGHTS = ${JSON.stringify(configSymbols.map(s => s.weight))};
        const TOTAL_WEIGHT = WEIGHTS.reduce((a, b) => a + b, 0);
        const SYMBOL_HEIGHT = 120;
        const MIN_BET = ${minBet};
        const MAX_BET = ${maxBet};
        let isSpinning = false;
        let userChips = ${casinoChips};

        function weightedPickVisual() {
            let r = Math.random() * TOTAL_WEIGHT;
            for (let i = 0; i < SYMBOLS.length; i++) {
                r -= WEIGHTS[i];
                if (r <= 0) return SYMBOLS[i];
            }
            return SYMBOLS[SYMBOLS.length - 1];
        }

        function updateChipsDisplay(val) {
            userChips = val;
            document.getElementById('casinoChipsVal').innerText = Number(val).toLocaleString('id-ID');
            document.getElementById('betAmount').max = Math.min(MAX_BET, Math.max(MIN_BET, val));
        }

        function adjustBet(amount) {
            const input = document.getElementById('betAmount');
            let val = parseInt(input.value) || 0;
            val += amount;
            if (val < MIN_BET) val = MIN_BET;
            if (val > Math.min(MAX_BET, userChips)) val = Math.min(MAX_BET, userChips);
            if (val === 0 && userChips === 0) val = MIN_BET;
            input.value = val;
        }

        function setMaxBet() {
            const input = document.getElementById('betAmount');
            const max = Math.min(MAX_BET, userChips);
            input.value = max >= MIN_BET ? max : MIN_BET;
        }

        function spinReel(reelId, targetSymbol, delay, duration) {
            return new Promise(resolve => {
                const strip = document.getElementById(reelId);

                // Build a fresh strip: 30 blur on top, then TARGET, then 1 padding
                let freshHtml = '';
                for (let i = 0; i < 30; i++) {
                    freshHtml += '<div class="symbol" style="filter:blur(2px);">' + weightedPickVisual() + '</div>';
                }
                freshHtml += '<div class="symbol" style="color:#fff;text-shadow:0 0 10px rgba(255,255,255,0.5);">' + targetSymbol + '</div>';
                freshHtml += '<div class="symbol">' + weightedPickVisual() + '</div>';

                // Reset strip: start at top showing blur symbols
                strip.style.transition = 'none';
                strip.innerHTML = freshHtml;
                strip.style.transform = 'translateY(0px)';
                void strip.offsetHeight;

                // After stagger delay, animate down to land on target at index 30
                setTimeout(() => {
                    strip.style.transition = \`transform \${duration}s cubic-bezier(0.1, 0.7, 0.1, 1.1)\`;
                    strip.style.transform = \`translateY(-\${30 * SYMBOL_HEIGHT}px)\`;
                    setTimeout(() => resolve(), duration * 1000);
                }, delay);
            });
        }

        async function spinSlot() {
            if (isSpinning) return;
            
            const betInput = document.getElementById('betAmount');
            const bet = parseInt(betInput.value);
            
            if (isNaN(bet) || bet < MIN_BET) {
                alert("Taruhan minimal " + MIN_BET + " KOIN.");
                return;
            }
            if (bet > userChips) {
                alert("Saldo tidak cukup!");
                return;
            }
            
            isSpinning = true;
            const btn = document.getElementById('spinBtn');
            const status = document.getElementById('slotStatus');
            
            btn.disabled = true;
            status.innerText = "Memutar gulungan...";
            status.classList.remove('win-anim');
            
            // Optimistically deduct bet
            updateChipsDisplay(userChips - bet);

            try {
                // Call API
                const res = await fetch('/api/casino/slot/spin', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ bet })
                });
                
                const data = await res.json();
                
                if (!data.success) {
                    alert(data.message || "Gagal memutar mesin.");
                    updateChipsDisplay(userChips + bet); // revert optimistic deduction
                    isSpinning = false;
                    btn.disabled = false;
                    status.innerText = "Siap diputar!";
                    return;
                }

                // API returned success. We have data.results (array of 3 symbols), data.winnings, data.newBalance
                const results = data.results;
                
                // Start animations
                // stagger delays: reel1=0ms, reel2=500ms, reel3=1000ms
                // durations: reel1=2s, reel2=2.5s, reel3=3s
                const p1 = spinReel('reel0', results[0], 0, 2);
                const p2 = spinReel('reel1', results[1], 500, 2.5);
                const p3 = spinReel('reel2', results[2], 1000, 3);
                
                await Promise.all([p1, p2, p3]);
                
                // Update final state
                updateChipsDisplay(data.newBalance);
                
                if (data.winnings > 0) {
                    status.innerText = "🎉 JACKPOT! Menang +" + data.winnings.toLocaleString('id-ID') + " KOIN! 🎉";
                    status.classList.add('win-anim');
                } else {
                    status.innerText = "Coba lagi! Semoga beruntung.";
                }

            } catch(e) {
                console.error(e);
                alert("Terjadi kesalahan jaringan.");
                updateChipsDisplay(userChips + bet); // revert if errored
            }
            
            isSpinning = false;
            btn.disabled = false;
        }
    </script>
    `;

    return html;
}

module.exports = { getSlotPage };
