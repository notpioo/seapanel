const { BankExchange, BotUser, PlayerMining } = require('../../models');

module.exports = {
    setupRoutes: (app, requireAuth) => {
        app.post('/bank/exchange', requireAuth(['admin', 'user']), async (req, res) => {
            try {
                const session = req.session;
                let phoneNumber = null;
                if (session) {
                    const sid = session.userId || session.id;
                    if (/^\d+$/.test(session.username)) phoneNumber = session.username;
                    else if (sid && /^\d+$/.test(sid)) phoneNumber = sid;
                    else {
                        const User = require('../../models/User');
                        if (sid && sid !== 'admin' && sid !== 'user') {
                            const userDoc = await User.findById(sid).lean();
                            if (userDoc && userDoc.linkedPhoneNumber) phoneNumber = userDoc.linkedPhoneNumber;
                        }
                    }
                }

                if (!phoneNumber) return res.redirect('/bank?error=Akun ini belum terkait dengan WhatsApp.');

                const { amount } = req.body;
                const sellAmount = parseInt(amount);

                if (isNaN(sellAmount) || sellAmount <= 0) {
                    return res.redirect('/bank?error=Jumlah Minecon tidak valid.');
                }

                const player = await PlayerMining.getPlayer(phoneNumber);
                const user = await BotUser.findOne({ phoneNumber });

                if (!player || !user) {
                    return res.redirect('/bank?error=Data pemain tidak ditemukan.');
                }

                if ((player.minecon || 0) < sellAmount) {
                    return res.redirect(`/bank?error=Minecon kamu tidak cukup. Saldo: ${(player.minecon || 0).toLocaleString()} MC`);
                }

                const exchange = await BankExchange.getExchange();
                const rate = exchange.currentRate;

                // Calculate balance: sellAmount / rate
                const balanceEarned = Math.floor(sellAmount / rate);

                if (balanceEarned <= 0) {
                    return res.redirect(`/bank?error=Jumlah jual terlalu kecil. Minimal jual ${rate} MC untuk 1 Balance.`);
                }

                // Deduct MC
                player.minecon -= sellAmount;
                await player.save();

                // Add Balance
                user.balance = (user.balance || 0) + balanceEarned;
                await user.save();

                res.redirect(`/bank?message=Sukses Trading! 🎉 Menjual ${sellAmount.toLocaleString()} MC seharga ${(balanceEarned).toLocaleString()} Balance. (Rate: ${rate})`);

            } catch (error) {
                console.error('Exchange error:', error);
                res.redirect('/bank?error=Gagal memproses penukaran Minecon.');
            }
        });
    },

    getBankPage: async (session) => {
        const exchange = await BankExchange.getExchange();

        // Find user 
        let phoneNumber = null;
        if (session) {
            const sid = session.userId || session.id;
            if (/^\d+$/.test(session.username)) phoneNumber = session.username;
            else if (sid && /^\d+$/.test(sid)) phoneNumber = sid;
            else {
                const User = require('../../models/User');
                if (sid && sid !== 'admin' && sid !== 'user') {
                    const userDoc = await User.findById(sid).lean();
                    if (userDoc && userDoc.linkedPhoneNumber) phoneNumber = userDoc.linkedPhoneNumber;
                }
            }
        }

        let playerMC = 0;
        let playerBal = 0;
        if (phoneNumber) {
            const player = await PlayerMining.getPlayer(phoneNumber);
            if (player) playerMC = player.minecon || 0;
            const user = await BotUser.findOne({ phoneNumber });
            if (user) playerBal = user.balance || 0;
        }

        const rate = exchange.currentRate;
        const history = exchange.history || [];

        // Trend
        let trend = 'same';
        let trendDiff = 0;
        if (history.length >= 2) {
            const last = history[history.length - 1].rate;
            const prev = history[history.length - 2].rate;
            trendDiff = last - prev;
            if (trendDiff > 0) trend = 'up';     // Rate naik (semakin mahal MC-nya) -> Bear untuk seller MC
            if (trendDiff < 0) trend = 'down';   // Rate turun (semakin murah) -> Bull untuk seller MC!
        }

        // --- SVG Chart Generation ---
        const w = 600;
        const h = 200;
        const minH = 100;
        const maxH = 600;

        let pathData = '';
        if (history.length > 0) {
            // scale X
            const stepX = history.length > 1 ? w / (history.length - 1) : w;
            const points = history.map((pt, i) => {
                const x = i * stepX;
                // mapping rate to Y: lower rate = better (line goes UP).
                // Actually, standard exchange: charting rate (MC per 1 Bal). 
                // So if rate goes up (600), value of MC goes DOWN.
                // Let's plot Rate normally. Rate 600 = top of chart? Or invert?
                // Standard chart usually plots Asset Price. Minecon Price (in Bal) = 1 / rate.
                // Let's just plot the Rate. High rate = bottom of chart, Low rate = top of chart.
                // 100 -> Y=10, 600 -> Y=190

                // Let's plot the "Value of MC": y = (max - rate) / (max - min) * h
                const y = 10 + ((pt.rate - minH) / (maxH - minH)) * (h - 20);
                return `${x},${y}`;
            });
            pathData = points.join(' ');
        }

        // Time to next update (just a guess, it updates lazily when accessed)
        // Let's show "Live Exchange" indicator instead

        // Trend UI
        // If rate is HIGH, MC is cheap (Red). If rate is LOW, MC is expensive (Green).
        // Best rate is 100!
        let trendColor = '#888';
        let trendArrow = '➖';
        let trendText = 'Stable';

        if (trend === 'up') {
            trendColor = '#ef4444'; // Red (MC Value dropping because rate goes up)
            trendArrow = '📉';
            trendText = 'Bear Market';
        } else if (trend === 'down') {
            trendColor = '#4ade80'; // Green (MC Value rising because rate goes down)
            trendArrow = '📈';
            trendText = 'Bull Market';
        }

        return `
        <script>
            window.onload = () => {
                const params = new URLSearchParams(window.location.search);
                if (params.has('message')) alert('✅ ' + params.get('message'));
                if (params.has('error')) alert('❌ ' + params.get('error'));
                if (params.has('message') || params.has('error')) window.history.replaceState({}, document.title, window.location.pathname);
                
                // Live calculation
                const inputMC = document.getElementById('sell-amount');
                const outBal = document.getElementById('receive-amount');
                const rate = ${rate};
                
                if(inputMC) {
                    inputMC.addEventListener('input', (e) => {
                        let val = parseInt(e.target.value) || 0;
                        let maxAmt = parseInt(e.target.getAttribute('max')) || 0;
                        if(val > maxAmt) {
                            val = maxAmt;
                            e.target.value = val;
                        }
                        const bal = Math.floor(val / rate);
                        outBal.innerText = bal.toLocaleString();
                    });
                }
            };
            
            function setMaxMC() {
                const inputMC = document.getElementById('sell-amount');
                if (inputMC) {
                    inputMC.value = inputMC.max;
                    inputMC.dispatchEvent(new Event('input'));
                }
            }
        </script>
        
        <header class="header">
            <h1 class="header-title" style="display:flex; align-items:center; gap:8px;">🏛️ Seana Bank Exchange</h1>
        </header>

        <div class="content" style="padding-top:24px;">
            <div style="background:linear-gradient(135deg, rgba(30,41,59,0.5), rgba(15,23,42,0.8)); border:1px solid rgba(255,255,255,0.05); border-radius:16px; padding:24px; margin-bottom:24px; display:flex; flex-direction:column; gap:20px;">
                
                <div style="display:flex; justify-content:space-between; align-items:flex-end; flex-wrap:wrap; gap:16px;">
                    <div>
                        <div style="font-size:13px; color:var(--text-secondary); font-weight:700; letter-spacing:1px; text-transform:uppercase; margin-bottom:6px;">Current Exchange Rate</div>
                        <div style="display:flex; align-items:center; gap:12px;">
                            <div style="font-size:32px; font-weight:800; color:var(--text-primary); letter-spacing:-1px;">
                                1 Bal = ${rate} MC
                            </div>
                            <div style="background:rgba(255,255,255,0.05); padding:6px 12px; border-radius:99px; font-size:12px; font-weight:700; color:${trendColor}; border:1px solid ${trendColor}33; display:flex; align-items:center; gap:6px;">
                                ${trendArrow} ${trendText}
                            </div>
                        </div>
                    </div>
                    
                    <div style="text-align:right;">
                        <div style="font-size:12px; color:var(--text-secondary); margin-bottom:4px;">Market Fluctuates every 5 mins</div>
                        <div style="display:flex; align-items:center; justify-content:flex-end; gap:6px;">
                            <span style="display:inline-block; width:8px; height:8px; background:var(--orange); border-radius:50%; box-shadow:0 0 10px var(--orange); animation:pulse 2s infinite;"></span>
                            <span style="font-size:11px; font-weight:700; color:var(--orange);">LIVE MARKET</span>
                        </div>
                    </div>
                </div>

                <!-- SVG CHART -->
                <div style="width:100%; height:160px; background:rgba(0,0,0,0.3); border-radius:12px; border:1px solid rgba(255,255,255,0.05); position:relative; overflow:hidden;">
                    <!-- Grid Lines -->
                    <div style="position:absolute; inset:0; display:flex; flex-direction:column; justify-content:space-between; padding:10px 0; pointer-events:none; opacity:0.1;">
                        <div style="width:100%; height:1px; background:#fff;"></div>
                        <div style="width:100%; height:1px; background:#fff;"></div>
                        <div style="width:100%; height:1px; background:#fff;"></div>
                        <div style="width:100%; height:1px; background:#fff;"></div>
                    </div>
                    
                    <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="width:100%; height:100%; overflow:visible; display:block; filter:drop-shadow(0 4px 6px ${trendColor}44);">
                        <polyline points="${pathData}" fill="none" stroke="${trendColor}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                        <!-- Fill Area -->
                        <polygon points="0,${h} ${pathData} ${w},${h}" fill="url(#chart-grad)" opacity="0.2"/>
                        
                        <defs>
                            <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stop-color="${trendColor}" />
                                <stop offset="100%" stop-color="transparent" />
                            </linearGradient>
                        </defs>
                    </svg>
                </div>
                
                <style>
                    @keyframes pulse {
                        0% { opacity:1; transform:scale(1); }
                        50% { opacity:0.5; transform:scale(1.2); }
                        100% { opacity:1; transform:scale(1); }
                    }
                </style>
            </div>

            <!-- EXCHANGE BOX -->
            <div class="dash-info-card">
                <div class="dash-info-header" style="border-bottom:1px solid var(--border); padding-bottom:16px;">
                    <div class="dash-info-title">🔄 Trade Minecon</div>
                </div>
                
                <form action="/bank/exchange" method="POST" style="margin:0;">
                    <div style="padding:24px; display:flex; flex-direction:column; gap:20px;">
                        
                        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02); padding:16px; border-radius:12px; border:1px solid var(--border);">
                            <div>
                                <div style="font-size:12px; color:var(--text-secondary); margin-bottom:4px;">Available Minecon</div>
                                <div style="font-size:18px; font-weight:800; color:#fbbf24;">🪙 ${playerMC.toLocaleString()}</div>
                            </div>
                            <div style="width:1px; height:32px; background:var(--border);"></div>
                            <div style="text-align:right;">
                                <div style="font-size:12px; color:var(--text-secondary); margin-bottom:4px;">Available Balance</div>
                                <div style="font-size:18px; font-weight:800; color:#4ade80;">💵 ${playerBal.toLocaleString()}</div>
                            </div>
                        </div>

                        <div>
                            <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                                <label style="font-size:12px; font-weight:600; color:var(--text-secondary);">Amount to Sell (MC)</label>
                                <a href="#" onclick="setMaxMC(); return false;" style="font-size:12px; font-weight:700; color:var(--accent); text-decoration:none;">MAX</a>
                            </div>
                            <input type="number" name="amount" id="sell-amount" class="form-input" placeholder="0" max="${playerMC}" style="font-size:20px; font-weight:700; padding:16px; background:rgba(0,0,0,0.2) !important;">
                        </div>
                        
                        <div style="display:flex; align-items:center; justify-content:center;">
                            <div style="font-size:24px; opacity:0.3;">⬇️</div>
                        </div>
                        
                        <div>
                            <label style="font-size:12px; font-weight:600; color:var(--text-secondary); display:block; margin-bottom:8px;">Estimated Return (Balance)</label>
                            <div style="background:rgba(74,222,128,0.1); border:1px solid rgba(74,222,128,0.2); border-radius:12px; padding:16px; display:flex; justify-content:space-between; align-items:center;">
                                <span style="font-size:24px; font-weight:800; color:#4ade80;" id="receive-amount">0</span>
                                <span style="font-size:16px; opacity:0.6;">💵</span>
                            </div>
                        </div>
                        
                        <button type="submit" class="btn btn-primary" style="margin-top:8px; padding:16px; font-size:16px; border-radius:12px; display:flex; justify-content:center; gap:8px;">
                            <span>Tukar Sekarang</span> 
                        </button>
                    </div>
                </form>
            </div>
            
        </div>
        `;
    }
};
