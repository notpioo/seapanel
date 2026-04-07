/**
 * Casino Config Routes & Page
 */
const { CasinoConfig, BotUser } = require('../../models');

module.exports = {
    setupRoutes: (app, requireAuth) => {

        // Update general settings
        app.post('/casino-config/update', requireAuth(['admin']), async (req, res) => {
            try {
                const {
                    dailyClaimMin, dailyClaimMax, dailyCooldownHours,
                    slotMinBet, slotMaxBet,
                    diceWinRate, diceMultiplier, diceMinBet, diceMaxBet,
                    isEnabled, maintenanceMsg
                } = req.body;
                await CasinoConfig.findOneAndUpdate(
                    { configId: 'main' },
                    {
                        dailyClaimMin: parseInt(dailyClaimMin) || 100,
                        dailyClaimMax: parseInt(dailyClaimMax) || 500,
                        dailyCooldownHours: parseInt(dailyCooldownHours) || 24,
                        slotMinBet: parseInt(slotMinBet) || 10,
                        slotMaxBet: parseInt(slotMaxBet) || 10000,
                        diceWinRate: parseInt(diceWinRate) || 40,
                        diceMultiplier: parseFloat(diceMultiplier) || 2,
                        diceMinBet: parseInt(diceMinBet) || 10,
                        diceMaxBet: parseInt(diceMaxBet) || 5000,
                        isEnabled: isEnabled === 'on' || isEnabled === 'true',
                        maintenanceMsg: maintenanceMsg || 'Kasino sedang dalam pemeliharaan.',
                    },
                    { upsert: true }
                );
                res.redirect('/casino-config?message=Settings saved!');
            } catch (error) {
                console.error('Casino config update error:', error);
                res.redirect('/casino-config?error=Update failed');
            }
        });

        // Update Pinjol Settings
        app.post('/casino-config/pinjol/update', requireAuth(['admin']), async (req, res) => {
            try {
                const {
                    pinjolEnabled, pinjolMaxAmount, pinjolInterestRate, pinjolMinBalance, pinjolDeductionRate
                } = req.body;
                await CasinoConfig.findOneAndUpdate(
                    { configId: 'main' },
                    {
                        pinjolEnabled: pinjolEnabled === 'on' || pinjolEnabled === 'true',
                        pinjolMaxAmount: parseInt(pinjolMaxAmount) || 2500,
                        pinjolInterestRate: parseInt(pinjolInterestRate) || 20,
                        pinjolMinBalance: parseInt(pinjolMinBalance) || 500,
                        pinjolDeductionRate: parseInt(pinjolDeductionRate) || 50,
                    },
                    { upsert: true }
                );
                res.redirect('/casino-config?tab=pinjol&message=Pinjol Settings saved!');
            } catch (error) {
                console.error('Casino config update error:', error);
                res.redirect('/casino-config?tab=pinjol&error=Update failed');
            }
        });

        // Add slot symbol
        app.post('/casino-config/symbol/add', requireAuth(['admin']), async (req, res) => {
            try {
                const { emoji, name, weight, multiplier } = req.body;
                const config = await CasinoConfig.getConfig();
                config.slotSymbols.push({
                    emoji, name,
                    weight: parseInt(weight) || 10,
                    multiplier: parseInt(multiplier) || 3,
                });
                await config.save();
                res.redirect('/casino-config?tab=slot&message=Symbol added!');
            } catch (error) {
                res.redirect('/casino-config?tab=slot&error=Failed to add symbol');
            }
        });

        // Delete slot symbol
        app.post('/casino-config/symbol/delete', requireAuth(['admin']), async (req, res) => {
            try {
                const { emoji } = req.body;
                const config = await CasinoConfig.getConfig();
                config.slotSymbols = config.slotSymbols.filter(s => s.emoji !== emoji);
                await config.save();
                res.redirect('/casino-config?tab=slot&message=Symbol deleted!');
            } catch (error) {
                res.redirect('/casino-config?tab=slot&error=Failed to delete');
            }
        });

        // Edit slot symbol
        app.post('/casino-config/symbol/edit', requireAuth(['admin']), async (req, res) => {
            try {
                const { originalEmoji, emoji, name, weight, multiplier } = req.body;
                const config = await CasinoConfig.getConfig();
                const idx = config.slotSymbols.findIndex(s => s.emoji === originalEmoji);
                if (idx !== -1) {
                    config.slotSymbols[idx] = {
                        emoji, name,
                        weight: parseInt(weight) || 10,
                        multiplier: parseInt(multiplier) || 3,
                    };
                    await config.save();
                }
                res.redirect('/casino-config?tab=slot&message=Symbol updated!');
            } catch (error) {
                res.redirect('/casino-config?tab=slot&error=Failed to update');
            }
        });

        // Give chips to player
        app.post('/casino-config/player/give', requireAuth(['admin']), async (req, res) => {
            try {
                const { phoneNumber, amount } = req.body;
                const amt = parseInt(amount) || 0;
                if (amt === 0) return res.redirect('/casino-config?tab=players&error=Invalid amount');
                const user = await BotUser.findOne({ phoneNumber });
                if (!user) return res.redirect('/casino-config?tab=players&error=User not found');
                user.casinoChips = (user.casinoChips || 0) + amt;
                if (user.casinoChips < 0) user.casinoChips = 0;
                await user.save();
                res.redirect('/casino-config?tab=players&message=Chips updated!');
            } catch (error) {
                res.redirect('/casino-config?tab=players&error=Failed');
            }
        });

        // Set player pinjol limit
        app.post('/casino-config/player/limit', requireAuth(['admin']), async (req, res) => {
            try {
                const { phoneNumber, limit } = req.body;
                const amt = parseInt(limit) || 0;
                await BotUser.findOneAndUpdate({ phoneNumber }, { pinjolLimit: amt });
                res.redirect('/casino-config?tab=players&message=Player Limit updated!');
            } catch (error) {
                res.redirect('/casino-config?tab=players&error=Failed');
            }
        });

        // Reset player chips
        app.post('/casino-config/player/reset', requireAuth(['admin']), async (req, res) => {
            try {
                const { phoneNumber } = req.body;
                await BotUser.findOneAndUpdate({ phoneNumber }, { casinoChips: 0, lastDailyCsn: null });
                res.redirect('/casino-config?tab=players&message=Player reset!');
            } catch (error) {
                res.redirect('/casino-config?tab=players&error=Failed to reset');
            }
        });
    },

    getCasinoConfigPage: async () => {
        const cc = await CasinoConfig.getConfig();
        const players = await BotUser.find({ casinoChips: { $gt: 0 } }).sort({ casinoChips: -1 }).limit(50);
        const totalPlayers = await BotUser.countDocuments({ casinoChips: { $gt: 0 } });

        // Calculate total chips in circulation
        const result = await BotUser.aggregate([{ $group: { _id: null, total: { $sum: '$casinoChips' } } }]);
        const totalChips = result.length > 0 ? result[0].total : 0;

        // Calculate total weight for probability display
        const totalWeight = cc.slotSymbols.reduce((sum, s) => sum + s.weight, 0);

        return `
        <style>
            .casino-tabs { display: flex; gap: 8px; margin-bottom: 24px; flex-wrap: wrap; }
            .casino-tab { padding: 10px 16px; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 8px; cursor: pointer; font-weight: 500; transition:all 0.2s; text-decoration: none; color: var(--text-secondary); }
            .casino-tab:hover { background: var(--bg-tertiary); color: var(--text-primary); }
            .casino-tab.active { background: var(--text-primary); color: var(--bg-primary); border-color: var(--text-primary); }
            .ctab-section { display: none; }
            .ctab-section.active { display: block; }
        </style>

        <header class="header"><h1 class="header-title">🎰 Casino Manager</h1></header>
        <div class="content">

            <!-- Overview Cards -->
            <div class="grid grid-3" style="margin-bottom: 24px;">
                <div class="stat-card">
                    <div class="stat-card-icon" style="background:rgba(251,191,36,0.12);color:#fbbf24;">🪙</div>
                    <div class="stat-card-body">
                        <div class="stat-card-label">Total Chips</div>
                        <div class="stat-card-value" style="color:#fbbf24;">${totalChips.toLocaleString()}</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-icon" style="background:rgba(74,222,128,0.12);color:#4ade80;">👥</div>
                    <div class="stat-card-body">
                        <div class="stat-card-label">Active Players</div>
                        <div class="stat-card-value" style="color:#4ade80;">${totalPlayers}</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-icon" style="background:rgba(168,85,247,0.12);color:#a855f7;">${cc.isEnabled ? '🟢' : '🔴'}</div>
                    <div class="stat-card-body">
                        <div class="stat-card-label">Status</div>
                        <div class="stat-card-value" style="color:${cc.isEnabled ? '#4ade80' : '#ef4444'};">${cc.isEnabled ? 'Online' : 'Maintenance'}</div>
                    </div>
                </div>
            </div>

            <!-- Tab Navigation -->
            <div class="casino-tabs">
                <a class="casino-tab active" data-tab="settings" onclick="showCTab('settings')">⚙️ Settings</a>
                <a class="casino-tab" data-tab="pinjol" onclick="showCTab('pinjol')">🏦 Pinjol</a>
                <a class="casino-tab" data-tab="slot" onclick="showCTab('slot')">🎰 Slot (${cc.slotSymbols.length})</a>
                <a class="casino-tab" data-tab="players" onclick="showCTab('players')">👥 Players (${totalPlayers})</a>
            </div>

            <!-- TAB: Settings -->
            <div class="ctab-section active" id="ctab-settings">
                <div class="card" style="margin-bottom: 24px;">
                    <div class="card-header"><div><div class="card-title">⚙️ General Settings</div></div></div>
                    <form action="/casino-config/update" method="POST" style="padding: 24px;">
                        <div class="grid grid-2" style="gap:16px; margin-bottom:20px;">
                            <div class="form-group" style="margin:0;">
                                <label class="form-label">Kasino Aktif</label>
                                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:8px 12px;background:var(--bg-tertiary);border-radius:8px;">
                                    <input type="checkbox" name="isEnabled" ${cc.isEnabled ? 'checked' : ''} style="width:18px;height:18px;">
                                    <span style="font-size:14px;color:var(--text-secondary);">Nyalakan / Matikan kasino</span>
                                </label>
                            </div>
                            <div class="form-group" style="margin:0;">
                                <label class="form-label">Pesan Maintenance</label>
                                <input type="text" name="maintenanceMsg" value="${cc.maintenanceMsg}" class="form-input">
                            </div>
                        </div>

                        <div style="font-weight:600;font-size:14px;margin-bottom:12px;color:var(--text-secondary);">🎁 Daily Claim</div>
                        <div class="grid grid-3" style="gap:12px; margin-bottom:20px;">
                            <div class="form-group" style="margin:0;">
                                <label class="form-label">Koin Min</label>
                                <input type="number" name="dailyClaimMin" value="${cc.dailyClaimMin}" class="form-input">
                            </div>
                            <div class="form-group" style="margin:0;">
                                <label class="form-label">Koin Max</label>
                                <input type="number" name="dailyClaimMax" value="${cc.dailyClaimMax}" class="form-input">
                            </div>
                            <div class="form-group" style="margin:0;">
                                <label class="form-label">Cooldown (Jam)</label>
                                <input type="number" name="dailyCooldownHours" value="${cc.dailyCooldownHours}" class="form-input">
                            </div>
                        </div>

                        <div style="font-weight:600;font-size:14px;margin-bottom:12px;color:var(--text-secondary);">🎰 Slot Machine</div>
                        <div class="grid grid-2" style="gap:12px; margin-bottom:20px;">
                            <div class="form-group" style="margin:0;">
                                <label class="form-label">Taruhan Min</label>
                                <input type="number" name="slotMinBet" value="${cc.slotMinBet}" class="form-input">
                            </div>
                            <div class="form-group" style="margin:0;">
                                <label class="form-label">Taruhan Max</label>
                                <input type="number" name="slotMaxBet" value="${cc.slotMaxBet}" class="form-input">
                            </div>
                        </div>

                        <div style="font-weight:600;font-size:14px;margin-bottom:12px;color:var(--text-secondary);">🎲 Hi-Lo Dice</div>
                        <div class="grid grid-2" style="gap:12px; margin-bottom:12px;">
                            <div class="form-group" style="margin:0;">
                                <label class="form-label">Taruhan Min</label>
                                <input type="number" name="diceMinBet" value="${cc.diceMinBet}" class="form-input">
                            </div>
                            <div class="form-group" style="margin:0;">
                                <label class="form-label">Taruhan Max</label>
                                <input type="number" name="diceMaxBet" value="${cc.diceMaxBet}" class="form-input">
                            </div>
                        </div>
                        <div class="grid grid-2" style="gap:12px; margin-bottom:20px;">
                            <div class="form-group" style="margin:0;">
                                <label class="form-label">Win Rate (%)</label>
                                <input type="number" name="diceWinRate" value="${cc.diceWinRate}" class="form-input">
                            </div>
                            <div class="form-group" style="margin:0;">
                                <label class="form-label">Multiplier</label>
                                <input type="number" step="0.1" name="diceMultiplier" value="${cc.diceMultiplier}" class="form-input">
                            </div>
                        </div>

                        <button type="submit" class="btn btn-primary">💾 Simpan</button>
                    </form>
                </div>
            </div>

            <!-- TAB: Pinjol -->
            <div class="ctab-section" id="ctab-pinjol">
                <div class="card" style="margin-bottom: 24px;">
                    <div class="card-header"><div><div class="card-title">🏦 Rentenir Kasino (Pinjol)</div></div></div>
                    <form action="/casino-config/pinjol/update" method="POST" style="padding: 24px;">
                        
                        <div class="grid grid-2" style="gap:12px; margin-bottom:16px;">
                            <div class="form-group" style="margin:0;">
                                <label class="form-label">Aktifkan Pinjaman?</label>
                                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:8px 12px;background:var(--bg-tertiary);border-radius:8px;">
                                    <input type="checkbox" name="pinjolEnabled" ${cc.pinjolEnabled ? 'checked' : ''} style="width:18px;height:18px;">
                                    <span style="font-size:14px;color:var(--text-secondary);">Fitur Pinjol Tersedia</span>
                                </label>
                            </div>
                            <div class="form-group" style="margin:0;">
                                <label class="form-label">Syarat Mak Saldo Untuk Pinjam</label>
                                <input type="number" name="pinjolMinBalance" value="${cc.pinjolMinBalance}" class="form-input" placeholder="Misal: 500">
                                <small style="display:block;margin-top:6px;color:var(--text-muted);font-size:12px;">Pemain hanya bisa pinjam jika saldo di bawah angka ini.</small>
                            </div>
                        </div>

                        <div class="grid grid-3" style="gap:12px; margin-bottom:20px;">
                            <div class="form-group" style="margin:0;">
                                <label class="form-label">Default Maksimal Pinjam</label>
                                <input type="number" name="pinjolMaxAmount" value="${cc.pinjolMaxAmount}" class="form-input" placeholder="Misal: 2500">
                            </div>
                            <div class="form-group" style="margin:0;">
                                <label class="form-label">Bunga Pinjaman (%)</label>
                                <input type="number" name="pinjolInterestRate" value="${cc.pinjolInterestRate}" class="form-input" placeholder="Misal: 20">
                            </div>
                            <div class="form-group" style="margin:0;">
                                <label class="form-label">Potongan Kemenangan (%)</label>
                                <input type="number" name="pinjolDeductionRate" value="${cc.pinjolDeductionRate || 50}" class="form-input" placeholder="Misal: 50">
                                <small style="display:block;margin-top:6px;color:var(--text-muted);font-size:12px;">Seberapa ganas rentenir narik pot kemenangannya (default 50%).</small>
                            </div>
                        </div>

                        <button type="submit" class="btn btn-primary">💾 Simpan</button>
                    </form>
                </div>
            </div>

            <!-- TAB: Slot Symbols -->
            <div class="ctab-section" id="ctab-slot">
                <div class="card">
                    <div class="card-header">
                        <div><div class="card-title">🎰 Slot Symbols (${cc.slotSymbols.length})</div></div>
                        <button onclick="document.getElementById('addSymbolForm').style.display='block'" class="btn btn-secondary">+ Tambah</button>
                    </div>
                    <div id="addSymbolForm" style="display:none; padding:16px; background:var(--bg-tertiary); border-bottom:1px solid var(--border);">
                        <form action="/casino-config/symbol/add" method="POST">
                            <div class="grid grid-4" style="gap:12px; align-items:end;">
                                <input type="text" name="emoji" placeholder="Emoji (e.g. 🍒)" class="form-input" required>
                                <input type="text" name="name" placeholder="Name (e.g. Cherry)" class="form-input" required>
                                <input type="number" name="weight" placeholder="Weight (10)" class="form-input" value="10" required>
                                <input type="number" name="multiplier" placeholder="Multiplier (3)" class="form-input" value="3" required>
                            </div>
                            <div style="margin-top:12px;">
                                <button type="submit" class="btn btn-primary">Tambah Simbol</button>
                                <button type="button" onclick="document.getElementById('addSymbolForm').style.display='none'" class="btn btn-secondary">Batal</button>
                            </div>
                        </form>
                    </div>

                    <div style="padding:16px 24px;">
                        <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px;">
                            <strong>Weight</strong> = Seberapa sering simbol muncul (semakin tinggi semakin sering).
                            <strong>Multiplier</strong> = Kalikan taruhan jika 3 kembar muncul. Total weight: <strong>${totalWeight}</strong>
                        </div>
                    </div>

                    <div class="table-container">
                        <table class="table">
                            <thead><tr><th>Simbol</th><th>Nama</th><th>Weight</th><th>Peluang</th><th>Multiplier</th><th>Aksi</th></tr></thead>
                            <tbody>
                                ${cc.slotSymbols.map(s => `
                                <tr>
                                    <td style="font-size:28px;">${s.emoji}</td>
                                    <td>${s.name}</td>
                                    <td>${s.weight}</td>
                                    <td style="color:#fbbf24;font-weight:600;">${(s.weight / totalWeight * 100).toFixed(1)}%</td>
                                    <td style="color:#4ade80;font-weight:700;">x${s.multiplier}</td>
                                    <td>
                                        <button onclick="openEditSym('${s.emoji}','${s.name}',${s.weight},${s.multiplier})" class="btn btn-secondary" style="padding:4px 10px;font-size:12px;">✏️</button>
                                        <form action="/casino-config/symbol/delete" method="POST" style="display:inline;" onsubmit="return confirm('Hapus simbol ${s.name}?')">
                                            <input type="hidden" name="emoji" value="${s.emoji}">
                                            <button type="submit" class="btn btn-secondary" style="padding:4px 10px;font-size:12px;">🗑️</button>
                                        </form>
                                    </td>
                                </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- TAB: Players -->
            <div class="ctab-section" id="ctab-players">
                <div class="card" style="margin-bottom:24px;">
                    <div class="card-header">
                        <div><div class="card-title">🎁 Beri / Kurangi Koin</div></div>
                    </div>
                    <form action="/casino-config/player/give" method="POST" style="padding:16px 24px;">
                        <div class="grid grid-3" style="gap:12px; align-items:end;">
                            <div class="form-group" style="margin:0;">
                                <label class="form-label">No. HP</label>
                                <input type="text" name="phoneNumber" placeholder="6281xxxxx" class="form-input" required>
                            </div>
                            <div class="form-group" style="margin:0;">
                                <label class="form-label">Jumlah (negatif untuk kurangi)</label>
                                <input type="number" name="amount" placeholder="1000" class="form-input" required>
                            </div>
                            <button type="submit" class="btn btn-primary" style="height:42px;">💸 Kirim</button>
                        </div>
                    </form>
                </div>

                <div class="card">
                    <div class="card-header"><div><div class="card-title">👥 Top Players (${totalPlayers})</div></div></div>
                    <div class="table-container">
                        <table class="table">
                            <thead><tr><th>#</th><th>No. HP</th><th>Nama</th><th>Koin Kasino</th><th>Limit Pinjol</th><th>Klaim Terakhir</th><th>Aksi</th></tr></thead>
                            <tbody>
                                ${players.map((p, i) => `
                                <tr>
                                    <td>${i + 1}</td>
                                    <td style="font-family:monospace;">${p.phoneNumber}</td>
                                    <td>${p.pushName || '-'}</td>
                                    <td style="color:#fbbf24;font-weight:700;">🪙 ${(p.casinoChips || 0).toLocaleString()}<br>${p.pinjolDebt > 0 ? `<small style="color:#ef4444;">Utang: ${p.pinjolDebt.toLocaleString()}</small>` : ''}</td>
                                    <td>
                                        <form action="/casino-config/player/limit" method="POST" style="display:flex;gap:4px;align-items:center;">
                                            <input type="hidden" name="phoneNumber" value="${p.phoneNumber}">
                                            <input type="number" name="limit" value="${p.pinjolLimit || 0}" style="width:70px;padding:4px;font-size:12px;border:1px solid var(--border);border-radius:4px;background:var(--bg-tertiary);color:var(--text-primary);">
                                            <button type="submit" class="btn btn-secondary" style="padding:4px 8px;font-size:12px;">Set</button>
                                        </form>
                                        <small style="color:var(--text-muted);font-size:10px;">(0 = Limit Default)</small>
                                    </td>
                                    <td style="font-size:12px;color:var(--text-muted);">${p.lastDailyCsn ? new Date(p.lastDailyCsn).toLocaleString('id-ID') : '-'}</td>
                                    <td>
                                        <form action="/casino-config/player/reset" method="POST" style="display:inline;" onsubmit="return confirm('Reset koin kasino player ini?')">
                                            <input type="hidden" name="phoneNumber" value="${p.phoneNumber}">
                                            <button type="submit" class="btn btn-secondary" style="padding:4px 10px;font-size:12px;" title="Reset">🔄</button>
                                        </form>
                                    </td>
                                </tr>
                                `).join('')}
                                ${players.length === 0 ? '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:32px;">Belum ada pemain.</td></tr>' : ''}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Edit Symbol Modal -->
            <div id="editSymModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:1000;align-items:center;justify-content:center;" onclick="if(event.target===this)this.style.display='none'">
                <div style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:16px;padding:24px;width:90%;max-width:400px;">
                    <div style="font-size:18px;font-weight:600;margin-bottom:20px;">✏️ Edit Simbol</div>
                    <form action="/casino-config/symbol/edit" method="POST">
                        <input type="hidden" name="originalEmoji" id="editSymOrig">
                        <div class="form-group"><label class="form-label">Emoji</label><input type="text" name="emoji" id="editSymEmoji" class="form-input" required></div>
                        <div class="form-group"><label class="form-label">Nama</label><input type="text" name="name" id="editSymName" class="form-input" required></div>
                        <div class="form-group"><label class="form-label">Weight</label><input type="number" name="weight" id="editSymWeight" class="form-input" required><small style="color:var(--text-secondary);">Semakin tinggi = semakin sering muncul</small></div>
                        <div class="form-group"><label class="form-label">Multiplier</label><input type="number" name="multiplier" id="editSymMulti" class="form-input" required><small style="color:var(--text-secondary);">Kalikan taruhan jika 3 kembar</small></div>
                        <div style="display:flex;gap:8px;margin-top:16px;">
                            <button type="submit" class="btn btn-primary">Simpan</button>
                            <button type="button" onclick="document.getElementById('editSymModal').style.display='none'" class="btn btn-secondary">Batal</button>
                        </div>
                    </form>
                </div>
            </div>

            <script>
                function openEditSym(emoji, name, weight, multiplier) {
                    document.getElementById('editSymOrig').value = emoji;
                    document.getElementById('editSymEmoji').value = emoji;
                    document.getElementById('editSymName').value = name;
                    document.getElementById('editSymWeight').value = weight;
                    document.getElementById('editSymMulti').value = multiplier;
                    document.getElementById('editSymModal').style.display = 'flex';
                }

                function showCTab(tabId) {
                    document.querySelectorAll('.ctab-section').forEach(s => s.classList.remove('active'));
                    document.querySelectorAll('.casino-tab').forEach(t => t.classList.remove('active'));
                    document.getElementById('ctab-' + tabId).classList.add('active');
                    document.querySelector('.casino-tab[data-tab="' + tabId + '"]').classList.add('active');
                }
            </script>
        </div>
        `;
    }
};
