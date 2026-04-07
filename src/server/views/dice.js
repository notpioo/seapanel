/**
 * Hi-Lo 9-Dice Game View
 * Uses 9 dice (Sum 9-54).
 * Low: 9-31
 * High: 32-54
 * Rigged win rate is configurable by admin 😈
 */

function getDicePage(session, botUser, casinoConfig) {
    const casinoChips = botUser ? (botUser.casinoChips || 0) : 0;
    const minBet = (casinoConfig && casinoConfig.diceMinBet) || 10;
    const maxBet = (casinoConfig && casinoConfig.diceMaxBet) || 5000;
    const multiplier = (casinoConfig && casinoConfig.diceMultiplier) || 2;
    const isAdmin = session && session.role === 'admin';

    // Maintenance check
    if (casinoConfig && !casinoConfig.isEnabled && !isAdmin) {
        return `
        <header class="header"><h1 class="header-title"><a href="/casino" style="color:var(--text-secondary);text-decoration:none;margin-right:10px;">⬅️</a> Hi-Lo 9 Dice</h1></header>
        <div class="content" style="display:flex;align-items:center;justify-content:center;min-height:60vh;">
            <div style="text-align:center;max-width:400px;">
                <div style="font-size:80px;margin-bottom:16px;">🔧</div>
                <h2 style="color:var(--text-primary);margin-bottom:8px;">Sedang Dalam Pemeliharaan</h2>
                <p style="color:var(--text-secondary);font-size:15px;">${casinoConfig.maintenanceMsg || 'Kasino sedang dalam pemeliharaan.'}</p>
                <a href="/casino" class="btn btn-secondary" style="margin-top:20px;">← Kembali</a>
            </div>
        </div>`;
    }

    return `
    <style>
        .dice-page { max-width: 520px; margin: 0 auto; }

        .dice-arena {
            background: linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
            border-radius: 24px;
            padding: 24px 16px;
            text-align: center;
            border: 1px solid rgba(255,255,255,0.08);
            box-shadow: 0 20px 60px rgba(0,0,0,0.4);
            margin-bottom: 20px;
            position: relative;
            overflow: hidden;
        }

        .dice-arena::before {
            content: '';
            position: absolute;
            top: -50%; left: -50%;
            width: 200%; height: 200%;
            background: radial-gradient(circle at 50% 120%, rgba(251,191,36,0.06) 0%, transparent 60%);
            pointer-events: none;
            animation: pulseBg 4s infinite alternate;
        }

        @keyframes pulseBg {
            0% { transform: scale(1); opacity: 0.5; }
            100% { transform: scale(1.1); opacity: 1; }
        }

        .dice-container {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 12px;
            min-height: 100px;
            perspective: 600px;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }

        .dice {
            width: 45px; height: 45px;
            background: #fff;
            border-radius: 10px;
            position: relative;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3), inset 0 -2px 6px rgba(0,0,0,0.1);
            transition: transform 0.3s ease;
        }

        .dice.rolling { animation: diceRoll 0.5s ease infinite; }

        @keyframes diceRoll {
            0%   { transform: rotateX(0deg) rotateZ(0deg) scale(1); }
            25%  { transform: rotateX(90deg) rotateZ(45deg) scale(0.9); }
            50%  { transform: rotateX(180deg) rotateZ(90deg) scale(1); }
            75%  { transform: rotateX(270deg) rotateZ(135deg) scale(0.9); }
            100% { transform: rotateX(360deg) rotateZ(180deg) scale(1); }
        }

        .dice.win { box-shadow: 0 0 20px rgba(74,222,128,0.7); animation: diceBig 0.5s ease; border: 2px solid #4ade80; }
        .dice.lose { box-shadow: 0 0 20px rgba(239,68,68,0.7); animation: diceShake 0.4s ease; border: 2px solid #ef4444; }

        @keyframes diceBig { 0% { transform: scale(1); } 50% { transform: scale(1.2); } 100% { transform: scale(1); } }
        @keyframes diceShake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }

        .dot {
            position: absolute;
            width: 8px; height: 8px;
            background: #1a1a2e;
            border-radius: 50%;
            transform: translate(-50%, -50%);
        }

        .dice-result-text {
            font-size: 15px;
            font-weight: 700;
            margin-top: 10px;
            min-height: 22px;
            color: var(--text-secondary);
        }

        .dice-result-text.win-text { color: #4ade80; text-shadow: 0 0 10px rgba(74,222,128,0.5); font-size: 18px; }
        .dice-result-text.lose-text { color: #ef4444; text-shadow: 0 0 10px rgba(239,68,68,0.5); font-size: 16px; }

        /* Choice Buttons */
        .choice-section { display: flex; gap: 12px; margin-bottom: 16px; }
        .choice-btn {
            flex: 1; padding: 16px; border-radius: 14px;
            border: 2px solid var(--border); background: var(--bg-secondary);
            color: var(--text-primary); font-size: 16px; font-weight: 800;
            cursor: pointer; transition: all 0.2s; text-align: center;
        }
        .choice-btn:hover { transform: translateY(-2px); border-color: var(--blue); }
        .choice-btn.selected-high { border-color: #4ade80; background: rgba(74,222,128,0.12); color: #4ade80; box-shadow: 0 0 20px rgba(74,222,128,0.15); }
        .choice-btn.selected-low { border-color: #f472b6; background: rgba(244,114,182,0.12); color: #f472b6; box-shadow: 0 0 20px rgba(244,114,182,0.15); }
        .choice-range { font-size: 12px; font-weight: 500; opacity: 0.8; display: block; margin-top: 4px; color: var(--text-secondary); }

        /* Controls */
        .dice-controls { background: var(--bg-secondary); border-radius: 16px; padding: 20px; border: 1px solid var(--border); }
        .bet-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
        .bet-input-group { display: flex; align-items: center; gap: 8px; }
        .bet-adj { width: 34px; height: 34px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-tertiary); color: var(--text-primary); cursor: pointer; font-weight: bold; }
        .dice-bet-input { width: 90px; text-align: center; background: var(--bg-primary); border: 1px solid var(--border); border-radius: 8px; padding: 8px; color: #fbbf24; font-weight: 800; font-size: 18px; font-family: monospace; }
        .roll-btn { width: 100%; padding: 16px; border-radius: 12px; border: none; background: linear-gradient(135deg, #8b5cf6, #6d28d9); color: #fff; font-weight: 900; font-size: 20px; text-transform: uppercase; letter-spacing: 2px; cursor: pointer; box-shadow: 0 6px 20px rgba(139,92,246,0.3); transition: all 0.15s; }
        .roll-btn:disabled { background: #555; cursor: not-allowed; opacity: 0.7; box-shadow: none; transform: none; }
        .payout-badge { text-align: center; margin-top: 12px; font-size: 13px; color: var(--text-muted); }
        .payout-badge span { color: #fbbf24; font-weight: 700; }
    </style>

    <header class="header" style="margin-bottom:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
                <h1 class="header-title"><a href="/casino" style="color:var(--text-secondary);text-decoration:none;margin-right:10px;">⬅️</a> Hi-Lo 9 Dice</h1>
                <p style="color:var(--text-secondary);font-size:14px;margin-top:4px;">9 Dadu. Tebak Total Skor!</p>
            </div>
            <div style="text-align:right;">
                <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px;">Saldo</div>
                <div style="font-weight:800;color:#fbbf24;font-family:monospace;font-size:20px;" id="diceChipsVal">${casinoChips.toLocaleString('id-ID')}</div>
            </div>
        </div>
    </header>

    <div class="content">
    <div class="dice-page">

        <!-- Dice Arena -->
        <div class="dice-arena">
            <div class="dice-container" id="diceContainer">
                <div class="dice" id="d1"><div class="dot" style="left:50%;top:50%;"></div></div>
                <div class="dice" id="d2"><div class="dot" style="left:50%;top:50%;"></div></div>
                <div class="dice" id="d3"><div class="dot" style="left:50%;top:50%;"></div></div>
                <div class="dice" id="d4"><div class="dot" style="left:50%;top:50%;"></div></div>
                <div class="dice" id="d5"><div class="dot" style="left:50%;top:50%;"></div></div>
                <div class="dice" id="d6"><div class="dot" style="left:50%;top:50%;"></div></div>
                <div class="dice" id="d7"><div class="dot" style="left:50%;top:50%;"></div></div>
                <div class="dice" id="d8"><div class="dot" style="left:50%;top:50%;"></div></div>
                <div class="dice" id="d9"><div class="dot" style="left:50%;top:50%;"></div></div>
            </div>
            <div class="dice-result-text" id="diceResultText">Pilih HIGH atau LOW lalu lempar!</div>
        </div>

        <div class="choice-section">
            <button class="choice-btn" id="btnLow" onclick="selectChoice('low')">
                LOW 🔽
                <span class="choice-range">Skor 9 - 31</span>
            </button>
            <button class="choice-btn" id="btnHigh" onclick="selectChoice('high')">
                HIGH 🔼
                <span class="choice-range">Skor 32 - 54</span>
            </button>
        </div>

        <!-- Controls -->
        <div class="dice-controls">
            <div class="bet-row">
                <label>Taruhan</label>
                <div class="bet-input-group">
                    <button class="bet-adj" onclick="adjDiceBet(-${minBet})">-</button>
                    <input type="number" id="diceBetAmt" class="dice-bet-input" value="${minBet}" min="${minBet}" max="${Math.min(maxBet, Math.max(minBet, casinoChips))}">
                    <button class="bet-adj" onclick="adjDiceBet(${minBet})">+</button>
                    <button class="bet-adj" style="width:auto;padding:0 10px;font-size:11px;" onclick="maxDiceBet()">MAX</button>
                </div>
            </div>

            <button class="roll-btn" id="rollBtn" onclick="rollDice()">🎲 LEMPAR (9 DADU)!</button>
            <div class="payout-badge">Menang = taruhan × <span>x${multiplier}</span></div>
        </div>

    </div>
    </div>

    <script>
        const MIN_BET = ${minBet};
        const MAX_BET = ${maxBet};
        let userChips = ${casinoChips};
        let selectedChoice = null;
        let isRolling = false;

        const FACES = {
            1: [[50,50]],
            2: [[25,25],[75,75]],
            3: [[25,25],[50,50],[75,75]],
            4: [[25,25],[75,25],[25,75],[75,75]],
            5: [[25,25],[75,25],[50,50],[25,75],[75,75]],
            6: [[25,25],[75,25],[25,50],[75,50],[25,75],[75,75]]
        };

        function renderDie(id, num) {
            const el = document.getElementById('d' + id);
            const dots = FACES[num] || FACES[1];
            el.innerHTML = dots.map(d => '<div class="dot" style="left:'+d[0]+'%;top:'+d[1]+'%;"></div>').join('');
        }

        function updateChips(val) {
            userChips = val;
            document.getElementById('diceChipsVal').innerText = Number(val).toLocaleString('id-ID');
        }

        function selectChoice(choice) {
            selectedChoice = choice;
            document.getElementById('btnHigh').className = 'choice-btn' + (choice === 'high' ? ' selected-high' : '');
            document.getElementById('btnLow').className = 'choice-btn' + (choice === 'low' ? ' selected-low' : '');
            
            // Highlight texts
            document.getElementById('btnHigh').querySelector('.choice-range').style.color = choice === 'high' ? '#fff' : 'var(--text-secondary)';
            document.getElementById('btnLow').querySelector('.choice-range').style.color = choice === 'low' ? '#fff' : 'var(--text-secondary)';
        }

        function adjDiceBet(amt) {
            const inp = document.getElementById('diceBetAmt');
            let v = parseInt(inp.value) || 0;
            v += amt;
            if (v < MIN_BET) v = MIN_BET;
            if (v > Math.min(MAX_BET, userChips)) v = Math.min(MAX_BET, userChips);
            inp.value = v;
        }

        function maxDiceBet() {
            const inp = document.getElementById('diceBetAmt');
            const mx = Math.min(MAX_BET, userChips);
            inp.value = mx >= MIN_BET ? mx : MIN_BET;
        }

        async function rollDice() {
            if (isRolling) return;
            if (!selectedChoice) { alert('Pilih HIGH atau LOW dulu!'); return; }

            const bet = parseInt(document.getElementById('diceBetAmt').value) || 0;
            if (bet < MIN_BET) { alert('Taruhan minimal ' + MIN_BET + ' KOIN.'); return; }
            if (bet > userChips) { alert('Saldo tidak cukup!'); return; }

            isRolling = true;
            const btn = document.getElementById('rollBtn');
            const resultText = document.getElementById('diceResultText');
            btn.disabled = true;
            resultText.className = 'dice-result-text';
            resultText.innerText = 'Mengocok 9 dadu...';
            updateChips(userChips - bet);

            // Animate all 9 dice
            for(let i=1; i<=9; i++) {
                document.getElementById('d'+i).className = 'dice rolling';
                document.getElementById('d'+i).innerHTML = ''; // Hide dots while rolling
            }

            // Rapid face changes
            const rollInterval = setInterval(() => {
                for(let i=1; i<=9; i++) renderDie(i, Math.floor(Math.random() * 6) + 1);
            }, 80);

            try {
                const res = await fetch('/api/casino/dice/roll', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ bet, choice: selectedChoice })
                });
                const data = await res.json();

                    if (!data.success) {
                    clearInterval(rollInterval);
                    alert(data.message);
                    updateChips(userChips + bet); // refund
                    for(let i=1; i<=9; i++) {
                        document.getElementById('d'+i).className = 'dice';
                        renderDie(i, 1);
                    }
                    resultText.innerText = 'Pilih HIGH atau LOW lalu lempar!';
                    isRolling = false;
                    btn.disabled = false;
                    return;
                }

                // Suspense delay
                setTimeout(() => {
                    clearInterval(rollInterval);

                    // Show result dice
                    const results = data.diceResult; 
                    let totalScore = 0;
                    for(let i=0; i<9; i++) {
                        renderDie(i+1, results[i]);
                        totalScore += results[i];
                        
                        // stagger the win/lose animation slightly
                        setTimeout(() => {
                            const dieEl = document.getElementById('d'+(i+1));
                            dieEl.className = data.won ? 'dice win' : 'dice lose';
                        }, i * 60); // Faster stagger for 9 dice
                    }

                    setTimeout(() => {
                        if (data.won) {
                            resultText.className = 'dice-result-text win-text';
                            resultText.innerText = '🎉 Total ' + totalScore + ' — ' + (totalScore >= 32 ? 'HIGH' : 'LOW') + '! Menang +' + data.winnings.toLocaleString('id-ID') + '! 🎉';
                        } else {
                            resultText.className = 'dice-result-text lose-text';
                            resultText.innerText = '💀 Total ' + totalScore + ' — ' + (totalScore >= 32 ? 'HIGH' : 'LOW') + '. Anda kalah!';
                        }
                        updateChips(data.newBalance);
                        isRolling = false;
                        btn.disabled = false;
                    }, 600); // Wait for stagger anim

                }, 1500);

            } catch(e) {
                clearInterval(rollInterval);
                console.error(e);
                alert('Terjadi kesalahan jaringan.');
                updateChips(userChips + bet); // refund visualization
                isRolling = false;
                btn.disabled = false;
            }
        }

        // Init
        for(let i=1; i<=9; i++) renderDie(i, Math.floor(Math.random()*6)+1);
    </script>
    `;
}

module.exports = { getDicePage };
