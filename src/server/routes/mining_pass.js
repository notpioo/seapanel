/**
 * Mining Pass Routes & Pages
 */
const { MiningPassConfig, MiningPassPlayer, BotUser } = require('../../models');

function getGlobalPassState(config) {
    const wibTime = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));

    let currentGlobalDay;
    if (config.passDuration <= 7) {
        currentGlobalDay = wibTime.getDay() === 0 ? 7 : wibTime.getDay();
        currentGlobalDay = Math.min(currentGlobalDay, config.passDuration);
    } else {
        currentGlobalDay = Math.min(wibTime.getDate(), config.passDuration);
    }

    const y = wibTime.getFullYear();
    const m = String(wibTime.getMonth() + 1).padStart(2, '0');
    const d = String(wibTime.getDate()).padStart(2, '0');
    const todayStr = `${y}-${m}-${d}`;

    return { wibTime, todayStr, currentGlobalDay };
}

function getDateStringForPastDay(wibTime, currentGlobalDay, targetDay) {
    const diffDays = currentGlobalDay - targetDay;
    const pastDate = new Date(wibTime.getTime());
    pastDate.setDate(pastDate.getDate() - diffDays);
    const y = pastDate.getFullYear();
    const m = String(pastDate.getMonth() + 1).padStart(2, '0');
    const d = String(pastDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

module.exports = {
    setupRoutes: (app, requireAuth) => {

        app.post('/pass-config/update', requireAuth(['admin']), async (req, res) => {
            try {
                const { isEnabled, passPrice, passDuration } = req.body;
                await MiningPassConfig.findOneAndUpdate(
                    { configId: 'main' },
                    {
                        isEnabled: isEnabled === 'on' || isEnabled === 'true',
                        passPrice: parseInt(passPrice) || 5000,
                        passDuration: parseInt(passDuration) || 30,
                    },
                    { upsert: true }
                );
                res.redirect('/pass-config?message=Settings saved!');
            } catch (error) {
                console.error('Pass config update error:', error);
                res.redirect('/pass-config?error=Update failed');
            }
        });

        app.post('/pass-config/reward/update', requireAuth(['admin']), async (req, res) => {
            try {
                const { day, freeType, freeAmount, premiumType, premiumAmount, label } = req.body;
                const config = await MiningPassConfig.getConfig();
                const dayNum = parseInt(day);
                const rewardIndex = config.rewards.findIndex(r => r.day === dayNum);

                if (rewardIndex !== -1) {
                    config.rewards[rewardIndex].freeType = freeType;
                    config.rewards[rewardIndex].freeAmount = parseInt(freeAmount) || 0;
                    config.rewards[rewardIndex].premiumType = premiumType;
                    config.rewards[rewardIndex].premiumAmount = parseInt(premiumAmount) || 0;
                    config.rewards[rewardIndex].label = label || '';
                } else {
                    config.rewards.push({
                        day: dayNum,
                        freeType,
                        freeAmount: parseInt(freeAmount) || 0,
                        premiumType,
                        premiumAmount: parseInt(premiumAmount) || 0,
                        label: label || ''
                    });
                }
                await config.save();
                res.redirect('/pass-config?message=Reward updated!');
            } catch (error) {
                console.error('Reward update error:', error);
                res.redirect('/pass-config?error=Update failed');
            }
        });

        app.post('/pass-config/activate', requireAuth(['admin']), async (req, res) => {
            try {
                const { phoneNumber } = req.body;
                const config = await MiningPassConfig.getConfig();
                const phone = phoneNumber.replace(/\D/g, '');
                const existing = await MiningPassPlayer.findOne({
                    phoneNumber: phone, isActive: true, expiresAt: { $gt: new Date() }
                });
                if (existing) return res.redirect('/pass-config?error=Player already has an active pass');
                const now = new Date();
                const expires = new Date(now.getTime() + config.passDuration * 24 * 60 * 60 * 1000);
                await MiningPassPlayer.create({
                    phoneNumber: phone, purchasedAt: now, expiresAt: expires,
                    currentDay: 0, lastClaimDate: '', isActive: true,
                });
                res.redirect('/pass-config?message=Pass activated for ' + phone);
            } catch (error) {
                console.error('Activate pass error:', error);
                res.redirect('/pass-config?error=Activation failed');
            }
        });

        app.post('/mining-pass/claim', requireAuth(['admin', 'user']), async (req, res) => {
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

                if (!phoneNumber) return res.redirect('/mining-pass?error=Akun ini belum terkait dengan WhatsApp. Silakan login ulang via Baris Ajaib di bot WhatsApp.');

                const config = await MiningPassConfig.getConfig();
                if (!config.isEnabled) return res.redirect('/mining-pass?error=Mining Pass sedang dinonaktifkan.');

                let playerPass = await MiningPassPlayer.findOne({
                    phoneNumber, isActive: true, expiresAt: { $gt: new Date() }
                });

                const { wibTime, todayStr, currentGlobalDay } = getGlobalPassState(config);

                if (!playerPass) {
                    const now = new Date();
                    const expires = new Date(wibTime.getTime() + config.passDuration * 24 * 60 * 60 * 1000);
                    playerPass = await MiningPassPlayer.create({
                        phoneNumber,
                        purchasedAt: now,
                        expiresAt: expires,
                        currentDay: currentGlobalDay,
                        lastClaimDate: '',
                        claimedDates: [],
                        isActive: true,
                        hasPremium: false
                    });
                }

                const reqDay = req.body.day ? parseInt(req.body.day) : currentGlobalDay;

                if (reqDay > currentGlobalDay) return res.redirect(`/mining-pass?error=Hadiah Hari ke-${reqDay} belum terbuka.`);

                const targetDateStr = getDateStringForPastDay(wibTime, currentGlobalDay, reqDay);

                if (reqDay < currentGlobalDay && !playerPass.hasPremium) {
                    return res.redirect('/mining-pass?error=Hanya pemain VIP yang bisa klaim hadiah yang terlewat.');
                }

                if (playerPass.claimedDates && playerPass.claimedDates.includes(targetDateStr)) {
                    return res.redirect(`/mining-pass?error=Kamu sudah klaim hadiah Hari ke-${reqDay}.`);
                }

                const reward = config.rewards.find(r => r.day === reqDay);

                if (reward) {
                    const user = await BotUser.findOne({ phoneNumber });
                    if (user) {
                        if (reward.freeType === 'chips') user.casinoChips = (user.casinoChips || 0) + reward.freeAmount;
                        else if (reward.freeType === 'balance') user.balance = (user.balance || 0) + reward.freeAmount;
                        else if (reward.freeType === 'limit') user.limit = (user.limit || 0) + reward.freeAmount;
                        else if (reward.freeType === 'seashells') user.seaShells = (user.seaShells || 0) + reward.freeAmount;

                        if (playerPass.hasPremium) {
                            if (reward.premiumType === 'chips') user.casinoChips = (user.casinoChips || 0) + reward.premiumAmount;
                            else if (reward.premiumType === 'balance') user.balance = (user.balance || 0) + reward.premiumAmount;
                            else if (reward.premiumType === 'limit') user.limit = (user.limit || 0) + reward.premiumAmount;
                            else if (reward.premiumType === 'seashells') user.seaShells = (user.seaShells || 0) + reward.premiumAmount;
                        }

                        await user.save();
                    }
                }

                if (!playerPass.claimedDates) playerPass.claimedDates = [];
                playerPass.claimedDates.push(targetDateStr);
                playerPass.currentDay = Math.max(playerPass.currentDay, reqDay);
                if (reqDay === currentGlobalDay) playerPass.lastClaimDate = todayStr;
                await playerPass.save();

                res.redirect(`/mining-pass?message=Berhasil klaim hadiah Hari ke-${reqDay}!`);
            } catch (error) {
                console.error('Web claim error:', error);
                res.redirect('/mining-pass?error=Gagal memproses klaim.');
            }
        });

        app.post('/mining-pass/buy', requireAuth(['admin', 'user']), async (req, res) => {
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

                if (!phoneNumber) return res.redirect('/mining-pass?error=Akun ini belum terkait dengan WhatsApp. Silakan login ulang via Baris Ajaib di bot WhatsApp.');

                const config = await MiningPassConfig.getConfig();
                if (!config.isEnabled) return res.redirect('/mining-pass?error=Mining Pass sedang dinonaktifkan.');

                const existingPass = await MiningPassPlayer.findOne({
                    phoneNumber,
                    isActive: true,
                    expiresAt: { $gt: new Date() }
                });

                if (existingPass && existingPass.hasPremium) return res.redirect('/mining-pass?error=Kamu sudah memiliki Mining Pass VIP yang aktif.');

                const user = await BotUser.findOne({ phoneNumber });
                if (!user) return res.redirect('/mining-pass?error=Profilmu tidak ditemukan di database bot.');

                if (user.balance < config.passPrice) {
                    return res.redirect(`/mining-pass?error=Balance kamu tidak cukup. Harga: ${config.passPrice.toLocaleString()}, Saldo: ${(user.balance || 0).toLocaleString()}`);
                }

                user.balance -= config.passPrice;

                if (existingPass && !existingPass.hasPremium) {
                    existingPass.hasPremium = true;

                    const { wibTime, currentGlobalDay } = getGlobalPassState(config);
                    let retroactivePremiumClaimed = 0;

                    if (existingPass.claimedDates && existingPass.claimedDates.length > 0) {
                        for (let i = 1; i <= currentGlobalDay; i++) {
                            const targetDateStr = getDateStringForPastDay(wibTime, currentGlobalDay, i);
                            if (existingPass.claimedDates.includes(targetDateStr)) {
                                const reward = config.rewards.find(r => r.day === i);
                                if (reward) {
                                    if (reward.premiumType === 'chips') user.casinoChips = (user.casinoChips || 0) + reward.premiumAmount;
                                    else if (reward.premiumType === 'balance') user.balance = (user.balance || 0) + reward.premiumAmount;
                                    else if (reward.premiumType === 'limit') user.limit = (user.limit || 0) + reward.premiumAmount;
                                    retroactivePremiumClaimed++;
                                }
                            }
                        }
                    }

                    await user.save();
                    await existingPass.save();
                    return res.redirect(`/mining-pass?message=Pembelian berhasil! VIP aktif dan hadiah premium dari ${retroactivePremiumClaimed} hari yang sudah diklaim otomatis masuk! (Hari yg terlewat bisa diklik manual)`);
                }

                await user.save();
                const { wibTime, currentGlobalDay } = getGlobalPassState(config);
                const expires = new Date(wibTime.getTime() + config.passDuration * 24 * 60 * 60 * 1000);

                await MiningPassPlayer.create({
                    phoneNumber,
                    purchasedAt: wibTime,
                    expiresAt: expires,
                    currentDay: currentGlobalDay,
                    lastClaimDate: '',
                    claimedDates: [],
                    isActive: true,
                    hasPremium: true
                });

                res.redirect('/mining-pass?message=Pembelian berhasil! Mining Pass VIP kamu sekarang aktif.');
            } catch (error) {
                console.error('Web buy error:', error);
                res.redirect('/mining-pass?error=Gagal memproses pembelian.');
            }
        });
    },

    getMiningPassPage: async (session) => {
        const config = await MiningPassConfig.getConfig();
        const activePlayers = await MiningPassPlayer.find({
            isActive: true, expiresAt: { $gt: new Date() }
        }).lean();

        const phoneNumbers = activePlayers.map(p => p.phoneNumber);
        const botUsers = await BotUser.find({ phoneNumber: { $in: phoneNumbers } }).lean();
        const nameMap = {};
        botUsers.forEach(u => { nameMap[u.phoneNumber] = u.pushName || 'User'; });

        let userPhoneNumber = null;
        if (session) {
            const sid = session.userId || session.id;
            if (/^\d+$/.test(session.username)) userPhoneNumber = session.username;
            else if (sid && /^\d+$/.test(sid)) userPhoneNumber = sid;
            else {
                const User = require('../../models/User');
                if (sid && sid !== 'admin' && sid !== 'user') {
                    const userDoc = await User.findById(sid).lean();
                    if (userDoc && userDoc.linkedPhoneNumber) userPhoneNumber = userDoc.linkedPhoneNumber;
                }
            }
        }

        let playerPass = null;
        if (userPhoneNumber) {
            playerPass = await MiningPassPlayer.findOne({
                phoneNumber: userPhoneNumber, isActive: true, expiresAt: { $gt: new Date() }
            });
        }

        const { wibTime, todayStr, currentGlobalDay } = getGlobalPassState(config);
        const hasPremium = playerPass ? playerPass.hasPremium : false;
        const canClaim = playerPass ? !(playerPass.claimedDates && playerPass.claimedDates.includes(todayStr)) : true;
        const pct = config.passDuration > 0 ? Math.round((currentGlobalDay / config.passDuration) * 100) : 0;

        const allRewards = [...config.rewards].sort((a, b) => a.day - b.day);
        const sortedRewards = allRewards.filter(r => r.day <= config.passDuration);
        const typeIcons = { chips: '🎰', balance: '💵', limit: '📊', premium: '⭐', seashells: '🐚' };
        const typeLabels = { chips: 'Koin', balance: 'Bal', limit: 'Limit', premium: 'Prem', seashells: 'Shells' };

        const rewardCards = sortedRewards.map(r => {
            const freeIcon = typeIcons[r.freeType] || '🎁';
            const freeLabel = typeLabels[r.freeType] || r.freeType;
            const premIcon = typeIcons[r.premiumType] || '🎁';
            const premLabel = typeLabels[r.premiumType] || r.premiumType;
            const isSpecial = r.label && r.label.length > 0;

            let statusHTML = '';
            let btnStyle = 'background:var(--bg-tertiary); color:var(--text-muted); border:1px solid var(--border);';
            let btnText = 'Terkunci 🔒';
            let cardOpac = '0.6';

            if (r.day > currentGlobalDay) {
                statusHTML = `<button class="btn" disabled style="${btnStyle} font-size:11px; padding:6px; margin-top:8px; width:100%; border-radius:6px; font-weight:600; cursor:not-allowed;">${btnText}</button>`;
            } else {
                cardOpac = '1';
                let thisDateStr;
                if (r.day === currentGlobalDay) thisDateStr = todayStr;
                else thisDateStr = getDateStringForPastDay(wibTime, currentGlobalDay, r.day);

                const isClaimed = playerPass && playerPass.claimedDates && playerPass.claimedDates.includes(thisDateStr);

                if (isClaimed) {
                    btnText = 'Diklaim ✅';
                    statusHTML = `<button class="btn" disabled style="${btnStyle} font-size:11px; padding:6px; margin-top:8px; width:100%; border-radius:6px; font-weight:600; cursor:not-allowed;">${btnText}</button>`;
                } else {
                    if (r.day === currentGlobalDay) {
                        btnText = 'Klaim 🎁';
                        btnStyle = 'background:var(--text-primary); color:var(--bg-primary); border:1px solid var(--text-primary);';
                        statusHTML = `<form method="POST" action="/mining-pass/claim" style="margin-top:8px; width:100%;">
                            <input type="hidden" name="day" value="${r.day}">
                            <button type="submit" class="btn" style="${btnStyle} font-size:11px; padding:6px; width:100%; border-radius:6px; font-weight:700; cursor:pointer;">${btnText}</button>
                        </form>`;
                    } else {
                        if (hasPremium) {
                            btnText = 'Klaim Retro 🎁';
                            btnStyle = 'background:var(--orange); color:#fff; border:1px solid rgba(251,191,36,0.5);';
                            statusHTML = `<form method="POST" action="/mining-pass/claim" style="margin-top:8px; width:100%;">
                                <input type="hidden" name="day" value="${r.day}">
                                <button type="submit" class="btn" style="${btnStyle} font-size:11px; padding:6px; width:100%; border-radius:6px; font-weight:700; cursor:pointer;">${btnText}</button>
                            </form>`;
                        } else {
                            btnText = 'Missed ❌';
                            btnStyle = 'background:var(--bg-tertiary); color:var(--text-muted); border:1px solid var(--border);';
                            statusHTML = `<button class="btn" disabled style="${btnStyle} font-size:11px; padding:6px; margin-top:8px; width:100%; border-radius:6px; font-weight:600; cursor:not-allowed;">${btnText}</button>`;
                        }
                    }
                }
            }

            let isTodayCard = (r.day === currentGlobalDay);
            let idAttr = isTodayCard ? 'id="today-card"' : '';

            return `<div ${idAttr} style="
                background:var(--bg-secondary);
                opacity:${cardOpac};
                border:1px solid ${isSpecial ? 'rgba(255,165,0,0.3)' : 'var(--border)'};
                border-radius:12px;
                padding:12px;
                display:flex;
                flex-direction:column;
                gap:8px;
                transition:all 0.2s;
                min-width:115px;
                flex:0 0 auto;
                scroll-snap-align:start;
                ${isTodayCard ? 'box-shadow: 0 0 15px rgba(251,191,36,0.1); border-color: rgba(251,191,36,0.5);' : ''}
            ">
                <div style="text-align:center;">
                    <div style="font-size:10px;color:var(--text-muted);font-weight:700;letter-spacing:1px;">DAY ${r.day}</div>
                    ${isSpecial ? `<div style="font-size:10px;color:var(--orange);font-weight:700;margin-top:2px;">✨ ${r.label}</div>` : ''}
                </div>
                <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.05); border-radius:6px; padding:10px 6px; text-align:center;">
                    <div style="font-size:18px;margin-bottom:2px;">${freeIcon}</div>
                    <div style="font-size:12px;font-weight:700;">${r.freeAmount.toLocaleString()}</div>
                    <div style="font-size:10px;color:var(--text-muted);">${freeLabel}</div>
                </div>
                <div style="background:rgba(251,191,36,0.1); border:1px solid rgba(251,191,36,0.2); border-radius:6px; padding:10px 6px; text-align:center; position:relative;">
                    <div style="font-size:18px;margin-bottom:2px;">${premIcon}</div>
                    <div style="font-size:12px;font-weight:700;color:var(--orange);">${r.premiumAmount.toLocaleString()}</div>
                    <div style="font-size:10px;color:rgba(251,191,36,0.8);">${premLabel}</div>
                </div>
                ${statusHTML}
            </div>`;
        }).join('');

        let personalBanner = `
        <div style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:16px;padding:24px;margin-bottom:24px;display:flex;flex-direction:column;gap:16px;position:relative;overflow:hidden;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:16px;position:relative;z-index:2;">
                <div>
                    <h1 style="margin:0 0 8px 0;font-size:24px;font-weight:800;display:flex;align-items:center;gap:8px;">
                        ⛏️ Mining Pass
                        ${hasPremium
                ? `<span style="font-size:12px;font-weight:700;background:rgba(251,191,36,0.1);color:var(--orange);padding:4px 8px;border-radius:6px;border:1px solid rgba(251,191,36,0.2);">VIP AKTIF</span>`
                : `<span style="font-size:12px;font-weight:700;background:rgba(255,255,255,0.05);color:var(--text-secondary);padding:4px 8px;border-radius:6px;border:1px solid var(--border);">FREE TRACK</span>`
            }
                    </h1>
                    <p style="margin:0;color:var(--text-secondary);font-size:14px;">
                        ${playerPass
                ? `Hari ke-<strong>${currentGlobalDay}</strong> dari <strong>${config.passDuration}</strong> &nbsp;·&nbsp; ${Math.max(0, Math.ceil((new Date(playerPass.expiresAt) - new Date()) / (1000 * 60 * 60 * 24)))} hari tersisa`
                : `Klaim hadiah harian Mining Pass kamu!`
            }
                    </p>
                </div>
                <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end;">
                    ${!hasPremium
                ? `<form method="POST" action="/mining-pass/buy" style="margin:0;" onsubmit="return confirm('Beli Mining Pass VIP seharga ${config.passPrice.toLocaleString()} Balance?')">
                        <button type="submit" class="btn" style="background:linear-gradient(135deg,#f59e0b,#d97706);color:#000;font-weight:700;font-size:13px;padding:10px 20px;border:none;border-radius:8px;cursor:pointer;white-space:nowrap;">⬆️ Upgrade VIP — ${config.passPrice.toLocaleString()} Bal</button>
                    </form>`
                : ''
            }
                </div>
            </div>
            <div style="position:relative;z-index:2;">
                <div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:12px;color:var(--text-muted);">
                    <span>Progress Hari Ini</span><span>${pct}%</span>
                </div>
                <div style="background:var(--bg-tertiary);border-radius:99px;height:6px;overflow:hidden;">
                    <div style="background:linear-gradient(90deg,#f59e0b,#ef4444);width:${pct}%;height:100%;border-radius:99px;transition:width 0.5s;"></div>
                </div>
            </div>
        </div>`;

        const activeCount = activePlayers.length;

        return `
        <div class="content" style="padding:32px 40px;">
            <div class="dash-section-title">Mining Pass</div>

            ${config.isEnabled
                ? personalBanner
                : `<div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);border-radius:12px;padding:20px;margin-bottom:24px;color:var(--error);text-align:center;font-weight:600;">⛔ Mining Pass sedang dinonaktifkan oleh admin.</div>`
            }

            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px;">
                <div class="dash-section-title" style="margin:0;">Hadiah Harian</div>
                <span style="font-size:12px;color:var(--text-muted);">${activeCount} player aktif &nbsp;·&nbsp; Scroll → untuk lihat semua hari</span>
            </div>

            <div style="overflow-x:auto;padding-bottom:12px;scroll-snap-type:x mandatory;">
                <div style="display:flex;gap:10px;width:max-content;">
                    ${rewardCards}
                </div>
            </div>

            <script>
            (function(){
                var card = document.getElementById('today-card');
                if (card) setTimeout(function(){ card.scrollIntoView({ behavior:'smooth', block:'nearest', inline:'center' }); }, 300);
            })();
            </script>
        </div>`;
    },

    getPassConfigPage: async () => {
        const config = await MiningPassConfig.getConfig();
        const activePlayers = await MiningPassPlayer.find({
            isActive: true, expiresAt: { $gt: new Date() }
        }).lean();

        const typeOptions = ['chips', 'balance', 'limit', 'seashells'];
        const rewardRows = [...config.rewards].sort((a, b) => a.day - b.day).map(r => `
            <tr>
                <td style="padding:8px 12px;font-weight:700;color:var(--text-muted);">Day ${r.day}</td>
                <td style="padding:8px 12px;">
                    <form method="POST" action="/pass-config/reward/update" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                        <input type="hidden" name="day" value="${r.day}">
                        <select name="freeType" style="background:var(--bg-tertiary);color:var(--text-primary);border:1px solid var(--border);border-radius:6px;padding:4px 8px;font-size:12px;">
                            ${typeOptions.map(t => `<option value="${t}" ${r.freeType === t ? 'selected' : ''}>${t}</option>`).join('')}
                        </select>
                        <input type="number" name="freeAmount" value="${r.freeAmount}" style="width:80px;background:var(--bg-tertiary);color:var(--text-primary);border:1px solid var(--border);border-radius:6px;padding:4px 8px;font-size:12px;">
                        <select name="premiumType" style="background:var(--bg-tertiary);color:var(--text-primary);border:1px solid var(--border);border-radius:6px;padding:4px 8px;font-size:12px;">
                            ${typeOptions.map(t => `<option value="${t}" ${r.premiumType === t ? 'selected' : ''}>${t}</option>`).join('')}
                        </select>
                        <input type="number" name="premiumAmount" value="${r.premiumAmount}" style="width:80px;background:var(--bg-tertiary);color:var(--text-primary);border:1px solid var(--border);border-radius:6px;padding:4px 8px;font-size:12px;">
                        <input type="text" name="label" value="${r.label || ''}" placeholder="Label" style="width:100px;background:var(--bg-tertiary);color:var(--text-primary);border:1px solid var(--border);border-radius:6px;padding:4px 8px;font-size:12px;">
                        <button type="submit" style="background:var(--text-primary);color:var(--bg-primary);border:none;border-radius:6px;padding:4px 12px;font-size:12px;font-weight:700;cursor:pointer;">Save</button>
                    </form>
                </td>
            </tr>`).join('');

        return `
        <div class="content" style="padding:32px 40px;">
            <div class="dash-section-title">Mining Pass Config</div>

            <div class="dash-info-card" style="margin-bottom:24px;">
                <div class="dash-info-header"><div class="dash-info-title">⚙️ General Settings</div></div>
                <form method="POST" action="/pass-config/update" style="padding:16px;display:flex;flex-direction:column;gap:12px;">
                    <label style="display:flex;align-items:center;gap:12px;font-size:14px;">
                        <input type="checkbox" name="isEnabled" ${config.isEnabled ? 'checked' : ''} style="width:16px;height:16px;">
                        Mining Pass Aktif
                    </label>
                    <label style="display:flex;flex-direction:column;gap:4px;font-size:13px;">
                        Harga VIP (Balance)
                        <input type="number" name="passPrice" value="${config.passPrice}" style="background:var(--bg-tertiary);color:var(--text-primary);border:1px solid var(--border);border-radius:6px;padding:8px 12px;font-size:14px;width:200px;">
                    </label>
                    <label style="display:flex;flex-direction:column;gap:4px;font-size:13px;">
                        Durasi Pass (hari)
                        <input type="number" name="passDuration" value="${config.passDuration}" style="background:var(--bg-tertiary);color:var(--text-primary);border:1px solid var(--border);border-radius:6px;padding:8px 12px;font-size:14px;width:200px;">
                    </label>
                    <button type="submit" class="btn" style="background:var(--text-primary);color:var(--bg-primary);border:none;border-radius:8px;padding:10px 20px;font-weight:700;cursor:pointer;width:fit-content;">Simpan Perubahan</button>
                </form>
            </div>

            <div class="dash-info-card" style="margin-bottom:24px;">
                <div class="dash-info-header"><div class="dash-info-title">🎁 Edit Rewards per Hari</div></div>
                <div style="overflow-x:auto;">
                    <table style="width:100%;border-collapse:collapse;font-size:13px;">
                        <thead>
                            <tr style="border-bottom:1px solid var(--border);">
                                <th style="padding:8px 12px;text-align:left;color:var(--text-muted);font-size:11px;letter-spacing:1px;">HARI</th>
                                <th style="padding:8px 12px;text-align:left;color:var(--text-muted);font-size:11px;letter-spacing:1px;">FREE TYPE / AMT &nbsp;·&nbsp; VIP TYPE / AMT &nbsp;·&nbsp; LABEL</th>
                            </tr>
                        </thead>
                        <tbody>${rewardRows}</tbody>
                    </table>
                </div>
            </div>

            <div class="dash-info-card" style="margin-bottom:24px;">
                <div class="dash-info-header"><div class="dash-info-title">🎫 Aktifkan Pass Manual</div></div>
                <form method="POST" action="/pass-config/activate" style="padding:16px;display:flex;gap:12px;align-items:center;flex-wrap:wrap;">
                    <input type="text" name="phoneNumber" placeholder="Nomor HP (628xxxx)" style="background:var(--bg-tertiary);color:var(--text-primary);border:1px solid var(--border);border-radius:6px;padding:8px 12px;font-size:14px;width:220px;">
                    <button type="submit" class="btn" style="background:var(--success);color:#000;border:none;border-radius:8px;padding:10px 20px;font-weight:700;cursor:pointer;">Aktifkan</button>
                </form>
            </div>

            <div class="dash-info-card">
                <div class="dash-info-header"><div class="dash-info-title">👥 Active Players (${activePlayers.length})</div></div>
                <div style="padding:8px 0;">
                    ${activePlayers.length === 0
                ? `<div style="text-align:center;padding:24px;color:var(--text-muted);">Tidak ada player aktif saat ini.</div>`
                : activePlayers.map(p => {
                    const daysLeft = Math.max(0, Math.ceil((new Date(p.expiresAt) - new Date()) / (1000 * 60 * 60 * 24)));
                    return `<div class="dash-info-row">
                        <div class="dash-info-label"><span>${p.hasPremium ? '💎' : '🆓'}</span> ${nameMap[p.phoneNumber] || p.phoneNumber}</div>
                        <div class="dash-info-value" style="color:var(--text-muted);font-size:12px;">${daysLeft} hari lagi · ${p.claimedDates?.length || 0} diklaim</div>
                    </div>`;
                }).join('')
            }
                </div>
            </div>
        </div>`;
    }
};
