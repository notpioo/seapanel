/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                    WEB SERVER - EXPRESS                      ║
 * ║           MONOCHROME DESIGN v2.0 + AUTH + RBAC              ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const QRCode = require('qrcode');
const crypto = require('crypto');

const config = require('../../config/bot.config');
const authConfig = require('../../config/auth.config');
const Logger = require('../utils/logger');
const { User, BotSettings, Session, BotUser, MiningConfig, PlayerMining, Tournament, TournamentHistory, WAUser, RPGHero, RPGChapter, RPGConfig, RPGEnemy, RPGItem, CasinoConfig } = require('../models');
const rpgRoutes = require('./routes/rpg');
const miningRoutes = require('./routes/mining');
const usersRoutes = require('./routes/users');
const waUsersRoutes = require('./routes/wa_users');
const sidebar = require('./views/sidebar');
const authRoutes = require('./routes/auth');
const { buildTournamentPage } = require('./tournament_page');
const { getCSS } = require('./views/styles');
const { getSeasonHistoryPage, renderHistoryMatchBox } = require('./views/season_history');
const { getTournamentLivePage } = require('./views/tournament_live');
const { getCommandsPage } = require('./views/commands');
const { getCasinoPage } = require('./views/casino');
const { getSlotPage } = require('./views/slot');
const { getDicePage } = require('./views/dice');
const casinoRoutes = require('./routes/casino');
const miningPassRoutes = require('./routes/mining_pass');
const bankRoutes = require('./routes/bank');
const dungeonRoutes = require('./routes/dungeon');
const { getMiningGamePage } = require('./views/mining_play');
const { getMiningLeaderboardPage } = require('./views/mining_leaderboard');

const logger = new Logger('WebServer');

// Simple session store (in production use Redis)
const sessions = new Map();

/**
 * Web Server Class
 */
class WebServer {
    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.io = new Server(this.server, {
            cors: { origin: '*', methods: ['GET', 'POST'] },
        });
        this.botClient = null; // BotClient instance for OTP delivery
    }

    getIO() {
        return this.io;
    }

    setBotClient(botClient) {
        this.botClient = botClient;
        logger.info('BotClient injected to WebServer');
    }

    // ═══════════════════════════════════════════════════════════════
    // AUTHENTICATION HELPERS
    // ═══════════════════════════════════════════════════════════════

    generateToken() {
        return crypto.randomBytes(32).toString('hex');
    }

    createSession(user) {
        const token = this.generateToken();
        const session = {
            token,
            userId: user._id || user.id,
            username: user.username,
            role: user.role,
            name: user.name,
            createdAt: Date.now(),
            expiresAt: Date.now() + authConfig.sessionExpiry,
        };
        sessions.set(token, session);
        return token;
    }

    getSession(token) {
        const session = sessions.get(token);
        if (!session) return null;
        if (Date.now() > session.expiresAt) {
            sessions.delete(token);
            return null;
        }
        return session;
    }

    destroySession(token) {
        sessions.delete(token);
    }

    async findUser(username, password) {
        // Try MongoDB first
        try {
            const user = await User.findByCredentials(username, password);
            if (user) return user;
        } catch (error) {
            logger.error('Database auth failed:', error);
        }

        // Fallback to static config (for backup/recovery)
        return authConfig.users.find(
            u => u.username === username && u.password === password
        );
    }

    canAccessPage(role, page) {
        const allowedRoles = authConfig.pagePermissions[page] || [];
        return allowedRoles.includes(role);
    }

    getRoleConfig(role) {
        return authConfig.roles[role] || authConfig.roles.user;
    }

    // ═══════════════════════════════════════════════════════════════
    // MIDDLEWARE
    // ═══════════════════════════════════════════════════════════════

    setupMiddleware() {
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
        this.app.use(express.static(path.join(__dirname, 'public')));

        // Parse cookies manually (simple implementation)
        this.app.use((req, res, next) => {
            const cookies = {};
            const cookieHeader = req.headers.cookie;
            if (cookieHeader) {
                cookieHeader.split(';').forEach(cookie => {
                    const [name, value] = cookie.trim().split('=');
                    cookies[name] = value;
                });
            }
            req.cookies = cookies;
            next();
        });
    }

    // Auth middleware
    requireAuth(allowedRoles = ['admin', 'user']) {
        return (req, res, next) => {
            const token = req.cookies.token;
            const session = this.getSession(token);

            if (!session) {
                return res.redirect('/login');
            }

            if (!allowedRoles.includes(session.role)) {
                return res.status(403).send(this.render403Page(session));
            }

            // Prevent browser from caching authenticated pages
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');

            req.session = session;
            next();
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // ROUTES
    // ═══════════════════════════════════════════════════════════════

    setupRoutes() {
        // Health check (no auth)
        // Health check (no auth) - Simplified for Railway
        this.app.get('/health', (req, res) => {
            res.status(200).send('OK');
        });

        // ═══════════════════════════════════════════════════════════════
        // WHATSAPP OTP AUTHENTICATION
        // ═══════════════════════════════════════════════════════════════

        // Send OTP to WhatsApp (Member Login)
        this.app.post('/auth/send-otp', async (req, res) => {
            try {
                let { phoneNumber } = req.body;

                if (!phoneNumber) {
                    return res.status(400).json({ success: false, message: 'Phone number required' });
                }

                // Normalize phone number (08xxx -> 628xxx)
                phoneNumber = phoneNumber.replace(/\s+/g, '').replace(/^0/, '62');

                // Ensure it starts with 62
                if (!phoneNumber.startsWith('62')) {
                    phoneNumber = '62' + phoneNumber;
                }

                // Validate phone format (simple check)
                if (!/^628\d{8,13}$/.test(phoneNumber)) {
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid phone number format. Use 08xxx or 628xxx'
                    });
                }

                // Generate OTP
                const otp = WAUser.generateOTP();
                const expiry = Date.now() + 5 * 60 * 1000; // 5 minutes

                // Find or create WA user
                const waUser = await WAUser.findOrCreate(phoneNumber, 'Member');

                // Save OTP
                waUser.loginOTP = otp;
                waUser.otpExpiry = expiry;
                await waUser.save();

                // Send via WhatsApp
                if (this.botClient) {
                    // Check connection
                    if (!this.botClient.isConnected) {
                        logger.warn('Bot not connected');
                        return res.status(503).json({
                            success: false,
                            message: 'Bot not connected. Scan QR first.'
                        });
                    }

                    const jid = `${phoneNumber}@s.whatsapp.net`;
                    const message = `🔐 *Kode Login NoMercy*\n\n` +
                        `Kode OTP: *${otp}*\n\n` +
                        `⏰ Berlaku selama 5 menit.\n` +
                        `Jangan bagikan kode ini ke siapapun!`;

                    try {
                        await this.botClient.sendMessage(jid, { text: message });
                        logger.info(`OTP sent to ${phoneNumber}`);
                        return res.json({ success: true, message: 'OTP sent to WhatsApp' });
                    } catch (error) {
                        logger.error('Failed to send OTP via WhatsApp:', error);
                        return res.status(500).json({
                            success: false,
                            message: 'Failed to send OTP. Make sure your WhatsApp is connected to bot.'
                        });
                    }
                } else {
                    logger.warn('BotClient not available for OTP delivery');
                    return res.status(503).json({
                        success: false,
                        message: 'WhatsApp bot not connected. Please try again later.'
                    });
                }

            } catch (error) {
                logger.error('Send OTP error:', error);
                return res.status(500).json({ success: false, message: 'Internal server error' });
            }
        });

        // Login page
        authRoutes.setupRoutes(
            this.app,
            {
                getSession: this.getSession.bind(this),
                createSession: this.createSession.bind(this),
                destroySession: this.destroySession.bind(this),
                findUser: this.findUser.bind(this)
            },
            this.getCSS.bind(this)
        );

        // Register page
        this.app.get('/register', (req, res) => {
            const token = req.cookies.token;
            if (this.getSession(token)) {
                return res.redirect('/');
            }
            res.send(this.renderRegisterPage());
        });

        // Register action
        this.app.post('/register', async (req, res) => {
            try {
                let { username, password, confirmPassword, phoneNumber } = req.body;

                // Validation
                if (!username || !password || !confirmPassword || !phoneNumber) {
                    return res.send(this.renderRegisterPage('All fields are required'));
                }

                if (username.length < 3 || username.length > 20) {
                    return res.send(this.renderRegisterPage('Username must be 3-20 characters'));
                }

                if (!/^[a-zA-Z0-9]+$/.test(username)) {
                    return res.send(this.renderRegisterPage('Username can only contain letters and numbers'));
                }

                // Password Validation
                if (password.length < 6) {
                    return res.send(this.renderRegisterPage('Password must be at least 6 characters'));
                }

                if (password !== confirmPassword) {
                    return res.send(this.renderRegisterPage('Passwords do not match'));
                }

                // Phone Number Normalization & Validation
                phoneNumber = phoneNumber.replace(/[\s-]/g, '');
                if (phoneNumber.startsWith('08')) {
                    phoneNumber = '62' + phoneNumber.substring(1);
                } else if (!phoneNumber.startsWith('62')) {
                    // Assume user entered 8xxx without 0 or 62 (unlikely but safe to handle or reject)
                    // Better to strict check
                }

                if (!/^628\d{8,15}$/.test(phoneNumber)) {
                    return res.send(this.renderRegisterPage('Invalid WhatsApp number. Use format: 08xxx or 628xxx'));
                }

                // Check if user exists
                const existingUser = await User.findOne({ username: username.toLowerCase() });
                if (existingUser) {
                    return res.send(this.renderRegisterPage('Username already taken'));
                }

                // Check if phone number is already linked
                const existingPhone = await User.findOne({ linkedPhoneNumber: phoneNumber });
                if (existingPhone) {
                    return res.send(this.renderRegisterPage('This WhatsApp number is already linked to another account'));
                }

                // Create new user
                const newUser = new User({
                    username: username.toLowerCase(),
                    password: password, // Will be hashed by model
                    name: username.charAt(0).toUpperCase() + username.slice(1), // Auto-fill name from username
                    linkedPhoneNumber: phoneNumber,
                    role: 'user',
                    isActive: true,
                    createdAt: new Date()
                });

                await newUser.save();
                logger.info(`New user registered: ${username} (linked: ${phoneNumber})`);

                // Auto-login after register
                const token = this.createSession(newUser);
                res.setHeader('Set-Cookie', `token=${token}; Path=/; HttpOnly; Max-Age=${authConfig.sessionExpiry / 1000}`);
                res.redirect('/');

            } catch (error) {
                logger.error('Register error:', error);
                return res.send(this.renderRegisterPage('Registration failed. Please try again.'));
            }
        });


        // API routes (no auth for some)
        this.app.get('/api/status', (req, res) => {
            res.json({
                botName: config.bot.name,
                version: config.bot.version,
                connected: global.botStatus?.connected || false,
                uptime: process.uptime(),
            });
        });

        this.app.get('/api/qr', async (req, res) => {
            const qrData = global.currentQR;
            if (!qrData) {
                return res.status(404).json({ error: 'No QR code available' });
            }
            try {
                const qrImage = await QRCode.toDataURL(qrData, {
                    width: 512, margin: 2,
                    color: { dark: '#FFFFFF', light: '#141414' },
                });
                res.json({ qr: qrImage });
            } catch (error) {
                res.status(500).json({ error: 'Failed to generate QR code' });
            }
        });



        // --- PUBLIC TOURNAMENT VIEW (NO AUTH) ---
        this.app.get('/tournament/live', async (req, res) => {
            try {
                const tourney = await Tournament.getActive();
                const active = tourney || { name: 'No Active Tournament', status: 'none', participants: [], groups: [], bracket: [] };

                let content = '';

                // === HEADER ===
                const header = `
                    <div style="text-align:center;margin-bottom:40px;">
                        <span style="background:#ffd700;color:#000;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;">LIVE TOURNAMENT</span>
                        <h1 style="font-size:3rem;margin:16px 0;background:linear-gradient(to right, #fff, #888);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">${active.name}</h1>
                        <div style="color:#888;">${active.status === 'none' ? 'Waiting for Admin...' : active.status.toUpperCase() + ' PHASE'}</div>
                    </div>
                `;

                // === CONTENT BY STATUS ===

                // 1. REGISTRATION
                if (active.status === 'registration' || active.status === 'none') {
                    content = `
                        <div style="text-align:center;padding:40px;background:rgba(255,255,255,0.05);border-radius:16px;border:1px solid rgba(255,255,255,0.1);">
                            <div style="font-size:4rem;margin-bottom:20px;">📝</div>
                            <h2 style="font-size:24px;margin-bottom:10px;">Registration Open</h2>
                            <p style="color:#aaa;margin-bottom:30px;">Join now via WhatsApp Bot!</p>
                            <div style="display:inline-block;background:#333;padding:10px 20px;border-radius:8px;font-family:monospace;">.join [YourName]</div>
                            <div style="margin-top:40px;">
                                <div style="font-weight:bold;margin-bottom:10px;">Create Team / Join Solo</div>
                                <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
                                    ${active.participants.map(p => `<div style="background:rgba(0,0,0,0.3);padding:8px 16px;border-radius:20px;border:1px solid #333;">👤 ${p.name}</div>`).join('')}
                                </div>
                                <div style="margin-top:20px;color:#666;">Total: ${active.participants.length} Players</div>
                            </div>
                        </div>
                    `;
                }

                // 2. GROUP STAGE (STANDINGS)
                else if (active.status === 'group') {
                    let groupsHtml = '';
                    for (const g of active.groups) {
                        const sorted = [...g.players].sort((a, b) => {
                            if (b.points !== a.points) return b.points - a.points;
                            const gdA = (a.gameWin || 0) - (a.gameLose || 0);
                            const gdB = (b.gameWin || 0) - (b.gameLose || 0);
                            if (gdA !== gdB) return gdB - gdA;
                            return b.win - a.win;
                        });

                        // Determine Cutoff based on total players (Same logic as EndGroup)
                        const totalP = sorted.length;
                        let cutoff = 4; // Default Small (Top 4)
                        let label = "Top 4 to Playoff";

                        if (totalP >= 10) {
                            cutoff = 8;
                            label = "Top 8 Qualify (QF)";
                        } else if (totalP >= 6) {
                            cutoff = 6;
                            label = "Top 6 Qualify (1-2 Semis)";
                        }

                        groupsHtml += `
                            <div style="flex:1;min-width:300px;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1);border-radius:16px;overflow:hidden;">
                                <div style="padding:16px;background:rgba(255,255,255,0.05);font-weight:bold;border-bottom:1px solid rgba(255,255,255,0.1);display:flex;justify-content:space-between;">
                                    <span>${g.name}</span>
                                    <span style="font-size:12px;color:#ffd700;background:rgba(255,215,0,0.1);padding:2px 8px;border-radius:10px;">${label}</span>
                                </div>
                                <table style="width:100%;border-collapse:collapse;font-size:14px;">
                                    <tr style="color:#666;font-size:12px;text-align:left;">
                                        <th style="padding:10px;">RK PLAYER</th>
                                        <th style="text-align:center;">M</th>
                                        <th style="text-align:center;">W-L</th>
                                        <th style="text-align:center;">GD</th>
                                        <th style="text-align:center;">PTS</th>
                                    </tr>
                                    ${sorted.map((p, i) => {
                            const rank = i + 1;
                            const isQualified = rank <= cutoff;
                            const isPrivilege = (totalP >= 6 && totalP < 10) && rank <= 2; // Rank 1-2 in Mid size

                            // Colors
                            let bg = isQualified ? 'rgba(74, 222, 128, 0.05)' : 'rgba(239, 68, 68, 0.05)';
                            let textColor = isQualified ? '#4ade80' : '#ef4444';

                            if (isPrivilege) {
                                bg = 'rgba(255, 215, 0, 0.1)';
                                textColor = '#ffd700';
                            }

                            const gdVal = (p.gameWin || 0) - (p.gameLose || 0);
                            const gdSign = gdVal > 0 ? '+' : '';
                            const gdStr = `${gdSign}${gdVal}`;

                            return `
                                        <tr style="border-bottom:1px solid rgba(255,255,255,0.05);background:${bg};">
                                            <td style="padding:10px;display:flex;align-items:center;gap:8px;">
                                                <span style="color:${textColor};width:20px;font-weight:bold;">${rank}</span>
                                                <span style="font-weight:500;color:#fff;">
                                                    ${p.name}
                                                    ${isPrivilege ? '👑' : ''}
                                                </span>
                                            </td>
                                            <td style="text-align:center;color:#888;">${p.matchesPlayed || 0}</td>
                                            <td style="text-align:center;color:#ccc;">${p.win}-${p.lose}</td>
                                            <td style="text-align:center;color:${gdVal >= 0 ? '#4ade80' : '#ef4444'};font-weight:bold;">${gdStr}</td>
                                            <td style="text-align:center;font-weight:bold;color:${textColor};font-size:16px;">${p.points}</td>
                                        </tr>`;
                        }).join('')}
                                </table>
                            </div>
                        `;
                    }
                    content = `<div style="display:flex;gap:24px;flex-wrap:wrap;justify-content:center;">${groupsHtml}</div>`;
                }

                // 3. PLAYOFF / FINISHED (VISUAL BRACKET)
                else if (active.status === 'playoff' || active.status === 'finished') {

                    // Detect Mode
                    const isPagePlayoff = active.bracket.some(m => m.matchId === 'UB_Final');
                    const isDoubleElim = active.bracket.some(m => m.matchId === 'WB_QF1');

                    // Helper: MatchBox Component
                    const MatchBox = (m) => {
                        if (!m) return '';
                        return `
                        <div class="match-box ${(!m.isFinished && m.p1 && m.p2) ? 'match-active' : ''}">
                            <div style="font-size:10px;color:#666;padding:4px 8px;border-bottom:1px solid #333;display:flex;justify-content:space-between;">
                                <span>${m.matchId}</span>
                                <span>${m.format ? m.format.toUpperCase() : 'BO1'}</span>
                            </div>
                            <!-- P1 -->
                            <div style="padding:8px 12px;display:flex;justify-content:space-between;align-items:center;${m.winner && m.winner === m.p1 ? 'background:rgba(255,215,0,0.1);color:#ffd700;' : ''}">
                                <span style="font-weight:500;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:140px;">${m.p1Name || 'TBD'}</span>
                                <span style="background:#333;padding:2px 6px;border-radius:4px;font-size:12px;">${m.score[0]}</span>
                            </div>
                            <!-- P2 -->
                            <div style="padding:8px 12px;display:flex;justify-content:space-between;align-items:center;border-top:1px solid #333;${m.winner && m.winner === m.p2 ? 'background:rgba(255,215,0,0.1);color:#ffd700;' : ''}">
                                <span style="font-weight:500;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:140px;">${m.p2Name || 'TBD'}</span>
                                <span style="background:#333;padding:2px 6px;border-radius:4px;font-size:12px;">${m.score[1]}</span>
                            </div>
                        </div>
                    `};

                    // Determine Champion Display
                    let finalMatch = active.bracket.find(m => m.matchId === 'FINAL');
                    if (isPagePlayoff || isDoubleElim) finalMatch = active.bracket.find(m => m.matchId === 'GRAND_FINAL');

                    const champName = active.champion ? active.champion.name : (
                        (finalMatch && finalMatch.isFinished) ? (finalMatch.winner === finalMatch.p1 ? finalMatch.p1Name : finalMatch.p2Name) : null
                    );

                    const ChampionBox = champName ? `
                        <div class="champion-box">
                            <div style="font-size:3rem;">👑</div>
                            <div class="champion-name">${champName}</div>
                            <div class="champion-label">CHAMPION</div>
                        </div>
                    ` : '';


                    // === RENDER BRACKET ===

                    if (isDoubleElim) {
                        const wb_qf = active.bracket.filter(m => m.matchId.startsWith('WB_QF'));
                        const wb_sf = active.bracket.filter(m => m.matchId.startsWith('WB_SF'));
                        const wb_final = active.bracket.find(m => m.matchId === 'WB_Final');

                        // Lower Bracket Matches (Support both Full & Compact)
                        const lb_r1 = active.bracket.filter(m => m.matchId.startsWith('LB_R1'));
                        const lb_r2 = active.bracket.filter(m => m.matchId.startsWith('LB_R2'));

                        // Map LB_Semis to 'LB Semis' slot (Compact logic uses LB_Semis, Full uses LB_R3)
                        let lb_semis = active.bracket.find(m => m.matchId === 'LB_R3');
                        if (!lb_semis) lb_semis = active.bracket.find(m => m.matchId === 'LB_Semis');

                        const lb_final = active.bracket.find(m => m.matchId === 'LB_Final');
                        const g_final = active.bracket.find(m => m.matchId === 'GRAND_FINAL');

                        content = `
                        <div class="bracket-wrapper" style="overflow-x: auto; padding: 20px;">
                            <div style="display:flex; flex-direction:row; align-items:center; gap:60px; width:max-content;">
                                
                                <!-- LEFT COLUMN: BRACKETS STACK -->
                                <div style="display:flex; flex-direction:column; gap:80px;">
                                    
                                    <!-- UPPER BRACKET ROW -->
                                    <div>
                                         <div class="section-title text-gold" style="margin-bottom:20px;">UPPER BRACKET</div>
                                         <div style="display:flex; flex-direction:row; gap:40px; align-items:center;">
                                              <!-- Round 1: QF -->
                                              ${wb_qf.length ? `
                                                <div class="bracket-column">
                                                    <div class="bracket-header">Quarter Finals</div>
                                                    <div class="matches-stack">${wb_qf.map(MatchBox).join('')}</div>
                                                </div>
                                                <div class="connector-arrow">👉</div>
                                              ` : ''}

                                              <!-- Round 2: SF -->
                                              <div class="bracket-column">
                                                  <div class="bracket-header">Semifinals</div>
                                                  <div class="matches-stack">${wb_sf.map(MatchBox).join('')}</div>
                                              </div>
                                              <div class="connector-arrow">👉</div>

                                              <!-- Round 3: Final -->
                                              <div class="bracket-column">
                                                  <div class="bracket-header">UB Final</div>
                                                  <div class="matches-stack">${MatchBox(wb_final)}</div>
                                              </div>
                                         </div>
                                    </div>

                                    <!-- LOWER BRACKET ROW -->
                                    <div>
                                         <div class="section-title text-red" style="margin-bottom:20px;">LOWER BRACKET</div>
                                         <div style="display:flex; flex-direction:row; gap:40px; align-items:center;">
                                              
                                              <!-- SPACER FOR COMPACT MODE (Top 6) -->
                                              <!-- This aligns LB Semis with Upper SF (Column 2) -->
                                              ${(lb_r1.length === 0 && lb_r2.length === 0) ? `
                                                <div class="bracket-column" style="opacity:0; pointer-events:none;">
                                                    <div class="bracket-header">Spacer</div>
                                                    <div class="matches-stack">
                                                        <div style="width:220px; height:60px;"></div>
                                                    </div>
                                                </div>
                                                <div class="connector-arrow" style="opacity:0;">👉</div>
                                              ` : ''}

                                              <!-- LB R1 (Only for Full Double Elim) -->
                                              ${lb_r1.length ? `
                                                <div class="bracket-column">
                                                    <div class="bracket-header">Round 1</div>
                                                    <div class="matches-stack">${lb_r1.map(MatchBox).join('')}</div>
                                                </div>
                                                <div class="connector-arrow">👉</div>
                                              `: ''}

                                              <!-- LB R2 (Only for Full Double Elim) -->
                                              ${lb_r2.length ? `
                                              <div class="bracket-column">
                                                  <div class="bracket-header">Round 2</div>
                                                  <div class="matches-stack">${lb_r2.map(MatchBox).join('')}</div>
                                              </div>
                                              <div class="connector-arrow">👉</div>
                                              ` : ''}

                                              <!-- LB Semis -->
                                              ${lb_semis ? `
                                              <div class="bracket-column">
                                                  <div class="bracket-header">LB Semis</div>
                                                  <div class="matches-stack">${MatchBox(lb_semis)}</div>
                                              </div>
                                              <div class="connector-arrow">👉</div>
                                              ` : ''}

                                              <!-- LB Final -->
                                              <div class="bracket-column">
                                                  <div class="bracket-header">LB Final</div>
                                                  <div class="matches-stack">${MatchBox(lb_final)}</div>
                                              </div>
                                         </div>
                                    </div>

                                </div>

                                <!-- RIGHT COLUMN: GRAND FINAL -->
                                <div style="display:flex; flex-direction:column; align-items:center; padding-left:40px; border-left:1px dashed #333; align-self:stretch; justify-content:center;">
                                     <div class="section-title text-gold" style="font-size:24px;border:none;padding:0;margin-bottom:30px;">🏆 GRAND FINAL</div>
                                     ${MatchBox(g_final)}
                                     ${ChampionBox}
                                </div>

                            </div>
                        </div>
                        <div style="text-align:center;color:#666;font-size:10px;margin-top:10px;">(Geser ke kanan untuk melihat Grand Final 👉)</div>
                        `;

                    } else if (isPagePlayoff) {
                        // --- PAGE PLAYOFF LAYOUT (Top 4 Special) ---
                        const ubFinal = active.bracket.find(m => m.matchId === 'UB_Final');
                        const lbSemis = active.bracket.find(m => m.matchId === 'LB_Semis');
                        const lbFinal = active.bracket.find(m => m.matchId === 'LB_Final');
                        const grandFinal = active.bracket.find(m => m.matchId === 'GRAND_FINAL');

                        content = `
                        <div class="bracket-wrapper">
                            <div class="bracket-container">
                                <div class="bracket-column">
                                    <div class="bracket-header">Page Playoff R1</div>
                                    <div class="matches-stack">
                                        <div style="text-align:center;font-size:10px;color:#ffd700;">UPPER BRACKET</div>
                                        ${MatchBox(ubFinal)}
                                        <div style="text-align:center;font-size:10px;color:#ef4444;margin-top:20px;">LOWER BRACKET</div>
                                        ${MatchBox(lbSemis)}
                                    </div>
                                </div>
                                <div class="connector-arrow">👉</div>
                                <div class="bracket-column">
                                    <div class="bracket-header">Lower Final</div>
                                    ${MatchBox(lbFinal)}
                                </div>
                                <div class="connector-arrow">👉</div>
                                <div class="bracket-column">
                                    <div class="bracket-header text-gold">🏆 Grand Final</div>
                                    ${MatchBox(grandFinal)}
                                    ${ChampionBox}
                                </div>
                            </div>
                        </div>`;

                    } else {
                        // --- STANDARD SINGLE ELIMINATION ---
                        const qfs = active.bracket.filter(m => m.matchId.startsWith('QF'));
                        const semis = active.bracket.filter(m => m.matchId.startsWith('SF'));
                        const final = active.bracket.find(m => m.matchId === 'FINAL');

                        content = `
                        <div class="bracket-wrapper">
                            <div class="bracket-container">
                                ${qfs.length > 0 ? `
                                    <div class="bracket-column">
                                        <div class="bracket-header">Quarter Finals</div>
                                        <div class="matches-stack">
                                            ${qfs.map(MatchBox).join('')}
                                        </div>
                                    </div>
                                    <div class="connector-arrow">👉</div>
                                ` : ''}

                                <div class="bracket-column">
                                    <div class="bracket-header">Semifinals</div>
                                    <div class="matches-stack">
                                        ${semis.map(MatchBox).join('')}
                                    </div>
                                </div>
                                
                                <div class="connector-arrow">👉</div>

                                <div class="bracket-column">
                                    <div class="bracket-header text-gold">🏆 Grand Final</div>
                                    ${MatchBox(final)}
                                    ${ChampionBox}
                                </div>
                            </div>
                        </div>`;
                    }

                }


                // === FULL PAGE HTML ===
                const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Live Bracket - ${active.name}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
    <meta http-equiv="refresh" content="30"> <!-- Auto refresh every 30s -->
    <style>
        body { font-family: 'Outfit', sans-serif; background: #0a0a0a; color: #fff; margin:0; padding:0; min-height:100vh; }
        .bg-pattern {
            position: fixed; inset: 0; z-index: -1;
            background-image: radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px);
            background-size: 30px 30px;
        }
        .container { max-width: 1000px; margin: 0 auto; padding: 40px 20px; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        * { box-sizing: border-box; }

        /* NEW DOUBLE ELIM STYLES */
        .bracket-section {
            width: 100%;
            display: flex;
            flex-direction: column;
            margin-bottom: 20px;
        }
        .section-title {
            font-size: 18px;
            font-weight: 800;
            letter-spacing: 2px;
            margin-bottom: 20px;
            padding-left: 20px;
            border-left: 4px solid currentColor;
            opacity: 0.8;
            text-transform: uppercase;
        }
        .bracket-row-scroll {
            display: flex;
            flex-direction: row;
            align-items: center;
            gap: 40px;
            overflow-x: auto;
            padding: 10px 20px 30px 20px;
            scrollbar-width: thin;
        }
        .bracket-row-scroll::-webkit-scrollbar {
            height: 6px;
        }
        .bracket-row-scroll::-webkit-scrollbar-thumb {
            background: #333;
            border-radius: 3px;
        }

        /* BRACKET RESPONSIVE STYLES (HORIZONTAL SCROLL) */
        .bracket-wrapper {
            width: 100%;
            overflow-x: auto; /* Enable horizontal scroll */
            padding-bottom: 20px;
            /* Hide scrollbar for cleaner look */
            -ms-overflow-style: none;  /* IE and Edge */
            scrollbar-width: none;  /* Firefox */
        }
        .bracket-wrapper::-webkit-scrollbar {
            display: none;
        }

        .bracket-container {
            display: flex;
            flex-direction: row; /* Always Horizontal */
            align-items: center;
            gap: 40px;
            width: max-content; /* Force width based on content */
            margin: 0 auto;
            padding: 0 20px;
        }
        
        .bracket-column {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 30px;
            min-width: 240px; /* Prevent shrinking */
            flex-shrink: 0;
        }
        
        .matches-stack {
            display: flex;
            flex-direction: column;
            gap: 30px; /* Jarak antar match vertikal */
            justify-content: center;
        }

        .bracket-header {
            text-align: center;
            color: #666;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 10px;
        }
        .text-gold { color: #ffd700; letter-spacing: 2px; }
        .connector-arrow { color: #333; font-size: 2rem; flex-shrink: 0; }
        
        .champion-box {
            margin-top: 20px;
            text-align: center;
            animation: fadeIn 1s;
        }
        .champion-name {
            font-size: 1.5rem;
            font-weight: bold;
            color: #ffd700;
            text-shadow: 0 0 20px rgba(255,215,0,0.5);
        }
        .champion-label { color: #666; font-size: 12px; letter-spacing: 1px; }

        /* Match Box Styling Enhancement */
        .match-box {
            background: #1a1a1a;
            border: 1px solid #333;
            border-radius: 8px;
            width: 220px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
            transition: transform 0.2s;
        }
        .match-box:hover {
            transform: translateY(-2px);
            border-color: #555;
        }
        .match-active { border-color: #ffd700; box-shadow: 0 0 15px rgba(255,215,0,0.1); }
        
        /* DESKTOP TWEAKS */
        @media (min-width: 768px) {
            .bracket-container {
                gap: 60px; /* Lebih lebar di desktop */
            }
        }
    </style>
</head>
<body>
    <div class="bg-pattern"></div>
    <div class="container">
        ${header}
        <div style="animation:fadeIn 0.5s ease-out;">
            ${content}
        </div>
        <div style="text-align:center;margin-top:60px;color:#444;font-size:12px;">
            Powered by NoMercy Engine • Auto-updates every 30s
        </div>
    </div>
</body>
</html>
                `;

                res.send(html);

            } catch (error) {
                console.error('Bracket View Error:', error);
                res.status(500).send('System Error');
            }
        });

        this.app.get('/', this.requireAuth(['admin', 'user']), async (req, res) => {
            const page = await this.renderPage('dashboard', req.session);
            res.send(page);
        });

        this.app.get('/qr', this.requireAuth(['admin', 'user']), async (req, res) => {
            const page = await this.renderPage('qr', req.session);
            res.send(page);
        });

        this.app.get('/commands', this.requireAuth(['admin', 'user']), async (req, res) => {
            const page = await this.renderPage('commands', req.session);
            res.send(page);
        });

        this.app.get('/settings', this.requireAuth(['admin']), async (req, res) => {
            const page = await this.renderPage('settings', req.session);
            res.send(page);
        });

        // --- USER-FACING PAGES ---
        this.app.get('/tournament', this.requireAuth(['admin', 'user']), async (req, res) => {
            const page = await this.renderPage('tournament', req.session);
            res.send(page);
        });

        this.app.get('/hall-of-fame', this.requireAuth(['admin', 'user']), async (req, res) => {
            const page = await this.renderPage('hall-of-fame', req.session);
            res.send(page);
        });

        this.app.get('/hall-of-fame/season/:season', this.requireAuth(['admin', 'user']), async (req, res) => {
            const season = parseInt(req.params.season);
            if (isNaN(season)) return res.redirect('/hall-of-fame');
            req.session._seasonParam = season;
            const page = await this.renderPage('season-history', req.session);
            res.send(page);
        });

        this.app.get('/rpg', this.requireAuth(['admin', 'user']), async (req, res) => {
            const page = await this.renderPage('rpg', req.session);
            res.send(page);
        });

        this.app.get('/mining', this.requireAuth(['admin', 'user']), async (req, res) => {
            const page = await this.renderPage('mining', req.session);
            res.send(page);
        });

        this.app.get('/mining/leaderboard', this.requireAuth(['admin', 'user']), async (req, res) => {
            const page = await this.renderPage('mining-leaderboard', req.session);
            res.send(page);
        });

        this.app.get('/casino', this.requireAuth(['admin', 'user']), async (req, res) => {
            const page = await this.renderPage('casino', req.session);
            res.send(page);
        });

        this.app.post('/casino/claim', this.requireAuth(['admin', 'user']), async (req, res) => {
            try {
                const casinoConf = await CasinoConfig.getConfig();
                if (!casinoConf.isEnabled && req.session.role !== 'admin') {
                    return res.send(`<script>alert("${casinoConf.maintenanceMsg}");window.location.href="/casino";</script>`);
                }

                const user = await User.findOne({ username: req.session.username });
                if (!user || !user.linkedPhoneNumber) {
                    return res.send('<script>alert("Silakan tautkan nomor WhatsApp Anda di halaman Account untuk menggunakan fitur ini.");window.location.href="/casino";</script>');
                }
                const botUser = await BotUser.findOne({ phoneNumber: user.linkedPhoneNumber });
                if (!botUser) {
                    return res.send('<script>alert("Data pengguna tidak ditemukan di bot.");window.location.href="/casino";</script>');
                }

                const now = new Date();
                const cooldownHours = casinoConf.dailyCooldownHours || 24;
                const lastClaim = botUser.lastDailyCsn ? new Date(botUser.lastDailyCsn) : null;
                if (lastClaim && (now - lastClaim) / (1000 * 60 * 60) < cooldownHours) {
                    return res.send('<script>alert("Anda sudah melakukan klaim hari ini!");window.location.href="/casino";</script>');
                }

                const min = casinoConf.dailyClaimMin || 100;
                const max = casinoConf.dailyClaimMax || 500;
                const reward = Math.floor(Math.random() * (max - min + 1)) + min;
                botUser.casinoChips = (botUser.casinoChips || 0) + reward;
                botUser.lastDailyCsn = now;
                await botUser.save();

                res.send(`<script>alert("Mantap! Anda berhasil klaim +${reward.toLocaleString('id-ID')} KOIN dari panel Web.");window.location.href="/casino";</script>`);
            } catch (error) {
                console.error('Casino web claim error', error);
                res.send('<script>alert("Terjadi kesalahan sistem saat mencoba klaim.");window.location.href="/casino";</script>');
            }
        });

        this.app.get('/casino/slot', this.requireAuth(['admin', 'user']), async (req, res) => {
            const page = await this.renderPage('casino-slot', req.session);
            res.send(page);
        });

        this.app.post('/api/casino/slot/spin', this.requireAuth(['admin', 'user']), express.json(), async (req, res) => {
            try {
                const casinoConf = await CasinoConfig.getConfig();
                if (!casinoConf.isEnabled && req.session.role !== 'admin') {
                    return res.json({ success: false, message: casinoConf.maintenanceMsg });
                }

                const user = await User.findOne({ username: req.session.username });
                if (!user || !user.linkedPhoneNumber) {
                    return res.json({ success: false, message: "Nomor WhatsApp belum terhubung." });
                }
                const botUser = await BotUser.findOne({ phoneNumber: user.linkedPhoneNumber });
                if (!botUser) return res.json({ success: false, message: "Data bot user tidak ditemukan." });

                const bet = parseInt(req.body.bet) || 0;
                const minBet = casinoConf.slotMinBet || 10;
                const maxBet = casinoConf.slotMaxBet || 10000;
                if (bet < minBet) return res.json({ success: false, message: `Taruhan minimal ${minBet} KOIN.` });
                if (bet > maxBet) return res.json({ success: false, message: `Taruhan maksimal ${maxBet} KOIN.` });
                if ((botUser.casinoChips || 0) < bet) return res.json({ success: false, message: "Saldo KOIN tidak cukup." });

                // Deduct bet
                botUser.casinoChips -= bet;

                // Weighted spin logic from config
                const symbols = casinoConf.slotSymbols || [];
                const totalWeight = symbols.reduce((sum, s) => sum + s.weight, 0);

                function pickWeightedSymbol() {
                    let r = Math.random() * totalWeight;
                    for (const s of symbols) {
                        r -= s.weight;
                        if (r <= 0) return s;
                    }
                    return symbols[symbols.length - 1];
                }

                const r1 = pickWeightedSymbol();
                const r2 = pickWeightedSymbol();
                const r3 = pickWeightedSymbol();

                let multiplier = 0;
                if (r1.emoji === r2.emoji && r2.emoji === r3.emoji) {
                    multiplier = r1.multiplier || 3;
                }

                const winnings = bet * multiplier;
                if (winnings > 0) {
                    botUser.casinoChips += winnings;
                }

                await botUser.save();
                return res.json({ success: true, results: [r1.emoji, r2.emoji, r3.emoji], winnings, newBalance: botUser.casinoChips });
            } catch (error) {
                console.error('Slot spin api error:', error);
                res.json({ success: false, message: "Terjadi kesalahan server." });
            }
        });

        // DICE ROUTES
        this.app.get('/casino/dice', this.requireAuth(['admin', 'user']), async (req, res) => {
            const page = await this.renderPage('casino-dice', req.session);
            res.send(page);
        });

        this.app.post('/api/casino/dice/roll', this.requireAuth(['admin', 'user']), express.json(), async (req, res) => {
            try {
                const casinoConf = await CasinoConfig.getConfig();
                if (!casinoConf.isEnabled && req.session.role !== 'admin') {
                    return res.json({ success: false, message: casinoConf.maintenanceMsg });
                }

                const { bet: rawBet, choice } = req.body;
                const bet = parseInt(rawBet) || 0;

                const minBet = casinoConf.diceMinBet || 10;
                const maxBet = casinoConf.diceMaxBet || 5000;
                const winRate = (casinoConf.diceWinRate || 40) / 100;
                const multiplier = casinoConf.diceMultiplier || 2;

                if (bet < minBet) return res.json({ success: false, message: `Taruhan minimal ${minBet} KOIN.` });
                if (bet > maxBet) return res.json({ success: false, message: `Taruhan maksimal ${maxBet} KOIN.` });
                if (choice !== 'high' && choice !== 'low') return res.json({ success: false, message: "Pilihan tidak valid." });

                const user = await User.findOne({ username: req.session.username });
                if (!user || !user.linkedPhoneNumber) {
                    return res.json({ success: false, message: "Nomor belum ditautkan." });
                }

                const botUser = await BotUser.findOne({ phoneNumber: user.linkedPhoneNumber });
                if (!botUser || (botUser.casinoChips || 0) < bet) {
                    return res.json({ success: false, message: "Saldo koin kasino tidak cukup." });
                }

                // Deduct bet safely
                botUser.casinoChips -= bet;

                // --- THE RIGGED LOGIC (9 DICE EDITION) ---
                // 1. Determine Win or Lose based on config Win Rate
                const didWin = Math.random() < winRate;

                // 2. Determine target range for the sum
                // High = 32-54. Low = 9-31.
                let targetMin, targetMax;

                if ((choice === 'high' && didWin) || (choice === 'low' && !didWin)) {
                    // Result must be HIGH (32-54)
                    targetMin = 32; targetMax = 54;
                } else {
                    // Result must be LOW (9-31)
                    targetMin = 9; targetMax = 31;
                }

                // 3. Generate 9 dice that sum to the target range
                // We restart strictly if sum is out of bounds. 
                // Since 31 is exactly half of max sum (54), the probabilities are 50/50 exactly.
                let finalDice = [];
                let sum = 0;
                do {
                    finalDice = [];
                    sum = 0;
                    for (let i = 0; i < 9; i++) {
                        const d = Math.floor(Math.random() * 6) + 1;
                        finalDice.push(d);
                        sum += d;
                    }
                } while (sum < targetMin || sum > targetMax);

                let winnings = 0;
                if (didWin) {
                    winnings = Math.floor(bet * multiplier);
                    botUser.casinoChips += winnings;
                }

                await botUser.save();

                return res.json({
                    success: true,
                    won: didWin,
                    diceResult: finalDice,
                    totalScore: sum,
                    winnings,
                    newBalance: botUser.casinoChips
                });
            } catch (error) {
                console.error('Dice roll api error:', error);
                res.json({ success: false, message: "Terjadi kesalahan server." });
            }
        });

        this.app.get('/logs', this.requireAuth(['admin']), async (req, res) => {
            const page = await this.renderPage('logs', req.session);
            res.send(page);
        });

        this.app.get('/users', this.requireAuth(['admin']), async (req, res) => {
            const page = await this.renderPage('users', req.session);
            res.send(page);
        });

        this.app.get('/wa-users', this.requireAuth(['admin']), async (req, res) => {
            const page = await this.renderPage('wa-users', req.session);
            res.send(page);
        });

        this.app.post('/settings', this.requireAuth(['admin']), async (req, res) => {
            try {
                await BotSettings.updateSettings(req.body);

                // Update runtime config
                const settings = await BotSettings.getSettings();
                config.bot.name = settings.botName;
                config.bot.prefix = settings.prefix;
                if (settings.ownerNumber) {
                    config.ownerNumber = [settings.ownerNumber];
                }

                // Emit update to bot if connected via socket/event

                res.redirect('/settings');
            } catch (error) {
                logger.error('Failed to update settings:', error);
                res.redirect('/settings?error=Update failed');
            }
        });

        this.app.post('/reset-session', this.requireAuth(['admin']), async (req, res) => {
            try {
                const sessionId = config.session.sessionName;
                await Session.deleteMany({ sessionId });
                logger.info(`Session ${sessionId} cleared by admin from web panel.`);
                res.redirect('/settings?message=Session Cleared. Please restart bot.');
            } catch (error) {
                logger.error('Failed to clear session:', error);
                res.redirect('/settings?error=Failed to clear session');
            }
        });

        this.app.post('/wa-users/update', this.requireAuth(['admin']), async (req, res) => {
            try {
                const { phoneNumber, isPremium, limit, balance } = req.body;

                await BotUser.findOneAndUpdate(
                    { phoneNumber },
                    {
                        isPremium: isPremium === 'true',
                        limit: parseInt(limit) || 0,
                        balance: parseInt(balance) || 0
                    }
                );

                res.redirect('/wa-users');
            } catch (error) {
                logger.error('Failed to update WA user:', error);
                res.redirect('/wa-users?error=Update failed');
            }
        });


        // Mining Config Routes
        this.app.get('/mining-config', this.requireAuth(['admin']), async (req, res) => {
            const session = this.getSession(req.cookies.token);
            res.send(await this.renderPage('mining-config', session));
        });


        miningRoutes.setupRoutes(this.app, this.requireAuth.bind(this));

        // ═══════════════════════════════════════════════
        // RPG CONFIG ROUTES
        // ═══════════════════════════════════════════════

        this.app.get('/rpg-config', this.requireAuth(['admin']), async (req, res) => {
            const session = this.getSession(req.cookies.token);
            res.send(await this.renderPage('rpg-config', session));
        });

        // -- RPG ROUTES --
        rpgRoutes.setupRoutes(this.app, this.requireAuth.bind(this));
        usersRoutes.setupRoutes(this.app, this.requireAuth.bind(this));
        waUsersRoutes.setupRoutes(this.app, this.requireAuth.bind(this));
        casinoRoutes.setupRoutes(this.app, this.requireAuth.bind(this));
        miningPassRoutes.setupRoutes(this.app, this.requireAuth.bind(this));
        bankRoutes.setupRoutes(this.app, this.requireAuth.bind(this));
        dungeonRoutes.setupRoutes(this.app, this.requireAuth.bind(this));

        this.app.get('/casino-config', this.requireAuth(['admin']), async (req, res) => {
            const session = this.getSession(req.cookies.token);
            res.send(await this.renderPage('casino-config', session));
        });

        this.app.get('/mining-pass', this.requireAuth(['admin', 'user']), async (req, res) => {
            const session = this.getSession(req.cookies.token);
            res.send(await this.renderPage('mining-pass', session));
        });

        this.app.get('/bank', this.requireAuth(['admin', 'user']), async (req, res) => {
            const session = this.getSession(req.cookies.token);
            res.send(await this.renderPage('bank', session));
        });

        this.app.get('/pass-config', this.requireAuth(['admin']), async (req, res) => {
            const session = this.getSession(req.cookies.token);
            res.send(await this.renderPage('pass-config', session));
        });

        // ═══════════════════════════════════════════════
        // PUBLIC TOURNAMENT LIVE VIEW (no auth)
        // ═══════════════════════════════════════════════
        this.app.get('/tournament/live', async (req, res) => {
            try {
                const page = await this.getTournamentLivePage();
                res.send(page);
            } catch (err) {
                logger.error('Tournament live error:', err);
                res.status(500).send('<h1>Something went wrong</h1>');
            }
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // SOCKET.IO
    // ═══════════════════════════════════════════════════════════════

    setupSocketIO() {
        this.io.on('connection', (socket) => {
            logger.info(`Client connected: ${socket.id}`);

            const emitStatus = () => {
                if (global.currentQR) {
                    QRCode.toDataURL(global.currentQR, {
                        width: 512, margin: 2,
                        color: { dark: '#FFFFFF', light: '#141414' }
                    }).then(qrImage => {
                        socket.emit('bot-status', {
                            state: global.botStatus?.state || 'waiting_qr',
                            connected: global.botStatus?.connected || false,
                            qr: global.currentQR,
                            qrImage: qrImage,
                            botName: config.bot.name,
                            user: global.botStatus?.user || null,
                        });
                    }).catch(() => {
                        socket.emit('bot-status', {
                            state: 'disconnected',
                            connected: false,
                            botName: config.bot.name,
                        });
                    });
                } else {
                    socket.emit('bot-status', {
                        state: global.botStatus?.state || 'disconnected',
                        connected: global.botStatus?.connected || false,
                        botName: config.bot.name,
                        user: global.botStatus?.user || null,
                    });
                }
            };

            emitStatus();

            socket.on('disconnect', () => {
                logger.debug(`Client disconnected: ${socket.id}`);
            });

            // ── Mining real-time updates ──────────────────────────────
            socket.on('mining-subscribe', async ({ identifier } = {}) => {
                if (!identifier) return;

                const buildPayload = async () => {
                    try {
                        const player = await PlayerMining.getPlayer(identifier);
                        const cfg    = await MiningConfig.getConfig();

                        const pickaxe = (cfg.pickaxeLevels || []).find(p => p.level === (player.pickaxeLevel || 1))
                                     || { name: 'Wooden Pickaxe', dropMultiplier: 1 };

                        const bpLvl = player.backpackLevel || 1;
                        const bpCap = player.getBackpackCapacity
                            ? player.getBackpackCapacity(cfg)
                            : 50 + (bpLvl - 1) * 20;

                        let totalItems = 0, invValue = 0;
                        const inventory = [];
                        if (player.inventory?.size > 0) {
                            for (const [resName, qty] of player.inventory.entries()) {
                                const r = (cfg.resources || []).find(x => x.name.toLowerCase() === resName.toLowerCase());
                                if (r && qty > 0) {
                                    totalItems += qty;
                                    invValue   += r.sellPrice * qty;
                                    inventory.push({ name: r.name, rarity: r.rarity, qty, sellPrice: r.sellPrice });
                                }
                            }
                            inventory.sort((a, b) => b.sellPrice - a.sellPrice);
                        }

                        const bpFill = bpCap > 0 ? Math.min(100, Math.round(totalItems / bpCap * 100)) : 0;

                        const locs = (cfg.locations || []).slice().sort((a, b) => a.minRebirth - b.minRebirth);
                        const rebirthCount = player.rebirthCount || 0;
                        let location = locs[0] || { minRebirth: 0, name: 'Surface', emoji: '🌄' };
                        for (const loc of locs) { if (rebirthCount >= loc.minRebirth) location = loc; }

                        return {
                            pickaxeLevel:  player.pickaxeLevel || 1,
                            pickaxeName:   pickaxe.name,
                            dropMultiplier: pickaxe.dropMultiplier,
                            bpLvl,
                            bpCap,
                            bpFill,
                            totalItems,
                            invValue,
                            minecon:       player.minecon || 0,
                            gems:          player.gems || 0,
                            shards:        player.quest?.shards || 0,
                            questRank:     player.quest?.rank || 'F',
                            rebirthCount,
                            locationName:  `${location.emoji} ${location.name}`,
                            totalMined:    player.stats?.totalMined  || 0,
                            totalEarned:   player.stats?.totalEarned || 0,
                            inventory,
                        };
                    } catch (e) {
                        logger.debug('mining-subscribe payload error:', e.message);
                        return null;
                    }
                };

                // Send immediately on subscribe
                const initial = await buildPayload();
                if (initial) socket.emit('mining-update', initial);

                // Then every 10 seconds
                const interval = setInterval(async () => {
                    const data = await buildPayload();
                    if (data) socket.emit('mining-update', data);
                }, 10000);

                socket.on('disconnect', () => clearInterval(interval));
            });
        });

        const originalEmit = this.io.emit.bind(this.io);
        this.io.emit = (event, data) => {
            if (event === 'bot-status') {
                global.botStatus = data;
                if (data.qr) global.currentQR = data.qr;
                if (data.connected) global.currentQR = null;
            }
            return originalEmit(event, data);
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // CSS
    // ═══════════════════════════════════════════════════════════════

    getCSS() {
        return getCSS();
    }

    // ═══════════════════════════════════════════════════════════════
    // SIDEBAR
    // ═══════════════════════════════════════════════════════════════

    getSidebar(activePage, session) {
        const roleConfig = this.getRoleConfig(session.role);
        return sidebar.getSidebar(activePage, session, roleConfig);
    }

    // ═══════════════════════════════════════════════════════════════
    // PAGES
    // ═══════════════════════════════════════════════════════════════


    render403Page(session) {
        return `
                < !DOCTYPE html >
                <html lang="en">
                    <head>
                        <meta charset="UTF-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                <title>Access Denied - ${config.webPanel.title}</title>
                                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
                                    <style>${this.getCSS()}</style>
                                </head>
                                <body>
                                    <div class="error-page">
                                        <div class="error-code">403</div>
                                        <h1 class="error-title">Access Denied</h1>
                                        <p class="error-desc">You don't have permission to access this page.</p>
                                        <a href="/" class="btn btn-primary">← Back to Dashboard</a>
                                    </div>
                                </body>
                            </html>
                            `;
    }

    async getDashboardPage(session) {
        if (session.role === 'admin') {
            return this.getAdminDashboard(session);
        }
        return this.getUserDashboard(session);
    }

    async getAdminDashboard(session) {
        const user = await User.findOne({ username: session.username });
        const fmt = (n) => new Intl.NumberFormat('en-US').format(n);

        let linkedInfo = { isActive: false, phone: '-', premium: false, balance: 0, limit: 0, maxLimit: 30, seaShells: 0 };

        if (user && user.linkedPhoneNumber) {
            linkedInfo.isActive = true;
            linkedInfo.phone = user.linkedPhoneNumber;
            const botUser = await BotUser.findOne({ phoneNumber: user.linkedPhoneNumber });
            if (botUser) {
                linkedInfo.premium = botUser.isPremium;
                linkedInfo.balance = botUser.balance || 0;
                linkedInfo.seaShells = botUser.seaShells || 0;
                linkedInfo.limit = botUser.limit;
                linkedInfo.maxLimit = botUser.maxLimit || 30;
            }
        }
        const hour = new Date().getHours();
        const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

        return `
                            <div class="content" style="padding: 32px 40px;">
                                <div class="dash-hero" style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:20px; padding:32px;">
                                    <div style="position: relative; z-index: 10;">
                                        <div class="dash-hero-greeting">${greeting}</div>
                                        <div class="dash-hero-name" style="margin-bottom: 8px;">${session.name} 👑</div>
                                        <div style="display:flex; align-items:center; gap:20px; flex-wrap:wrap;">
                                            <div style="display:flex; flex-direction:column; gap:2px;">
                                                <div style="font-size:10px; color:rgba(255,255,255,0.7); font-weight:700; letter-spacing:1px;">BALANCE</div>
                                                <div style="font-size:18px; font-weight:800; color:var(--success); font-family:monospace;">Rp ${fmt(linkedInfo.balance)}</div>
                                            </div>
                                            <div style="display:flex; flex-direction:column; gap:2px;">
                                                <div style="font-size:10px; color:rgba(255,255,255,0.7); font-weight:700; letter-spacing:1px;">SEA SHELLS 🐚</div>
                                                <div style="font-size:18px; font-weight:800; color:#fff; font-family:monospace;">${fmt(linkedInfo.seaShells)}</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div style="position: relative; z-index: 10;">
                                        <div class="dash-hero-badge premium" style="position:static;">
                                            ⭐ KING ADMIN
                                        </div>
                                    </div>
                                </div>

                                <div class="dash-section-title" style="margin-top: 28px;">Menu</div>
                                <div class="quick-menu-grid" style="margin-bottom: 32px;">
                                    <a href="/mining-pass" class="quick-menu-item">
                                        <div class="quick-menu-box" style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.05);">
                                            <div class="quick-menu-icon" style="filter:grayscale(1) contrast(5) brightness(1.5); font-size:24px;">⛏️</div>
                                        </div>
                                        <div class="quick-menu-label" style="color:var(--text-primary);">Mining Pass</div>
                                    </a>
                                    <a href="/bank" class="quick-menu-item">
                                        <div class="quick-menu-box" style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.05);">
                                            <div class="quick-menu-icon" style="filter:grayscale(1) contrast(5) brightness(1.5); font-size:24px;">🏛️</div>
                                        </div>
                                        <div class="quick-menu-label" style="color:var(--text-primary);">Bank</div>
                                    </a>
                                    <a href="#" class="quick-menu-item">
                                        <div class="quick-menu-box" style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.05);">
                                            <div class="quick-menu-icon" style="filter:grayscale(1) contrast(5) brightness(1.5); font-size:24px;">🛒</div>
                                        </div>
                                        <div class="quick-menu-label" style="color:var(--text-primary);">Shop</div>
                                    </a>
                                    <a href="#" class="quick-menu-item">
                                        <div class="quick-menu-box" style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.05);">
                                            <div class="quick-menu-icon" style="filter:grayscale(1) contrast(5) brightness(1.5); font-size:24px;">🎲</div>
                                        </div>
                                        <div class="quick-menu-label" style="color:var(--text-primary);">Gacha</div>
                                    </a>
                                    <a href="#" class="quick-menu-item quick-menu-disabled" style="cursor:not-allowed; opacity:0.4;">
                                        <div class="quick-menu-box" style="background:transparent; border:1px dashed rgba(255,255,255,0.2);">
                                            <div class="quick-menu-icon" style="filter:grayscale(1) brightness(0.6); font-size:24px;">🔒</div>
                                        </div>
                                        <div class="quick-menu-label" style="color:var(--text-secondary);">Soon</div>
                                    </a>
                                </div>

                                <div class="dash-section-title" style="margin-top: 28px;">Admin Menu</div>
                                <div class="quick-menu-grid" style="margin-bottom: 32px;">
                                    <a href="/qr" class="quick-menu-item">
                                        <div class="quick-menu-box" style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.05);">
                                            <div class="quick-menu-icon" style="filter:grayscale(1) contrast(5) brightness(1.5); font-size:24px;">📱</div>
                                        </div>
                                        <div class="quick-menu-label" style="color:var(--text-primary);">Wa Connect</div>
                                    </a>
                                    <a href="/users" class="quick-menu-item">
                                        <div class="quick-menu-box" style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.05);">
                                            <div class="quick-menu-icon" style="filter:grayscale(1) contrast(5) brightness(1.5); font-size:24px;">👥</div>
                                        </div>
                                        <div class="quick-menu-label" style="color:var(--text-primary);">Wa User</div>
                                    </a>
                                    <a href="/pass-config" class="quick-menu-item">
                                        <div class="quick-menu-box" style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.05);">
                                            <div class="quick-menu-icon" style="filter:grayscale(1) contrast(5) brightness(1.5); font-size:24px;">🎫</div>
                                        </div>
                                        <div class="quick-menu-label" style="color:var(--text-primary);">Pass Config</div>
                                    </a>
                                    <a href="/casino" class="quick-menu-item">
                                        <div class="quick-menu-box" style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.05);">
                                            <div class="quick-menu-icon" style="filter:grayscale(1) contrast(5) brightness(1.5); font-size:24px;">🎰</div>
                                        </div>
                                        <div class="quick-menu-label" style="color:var(--text-primary);">Casino Config</div>
                                    </a>
                                    <a href="/rpg" class="quick-menu-item">
                                        <div class="quick-menu-box" style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.05);">
                                            <div class="quick-menu-icon" style="filter:grayscale(1) contrast(5) brightness(1.5); font-size:24px;">⚔️</div>
                                        </div>
                                        <div class="quick-menu-label" style="color:var(--text-primary);">RPG Config</div>
                                    </a>
                                    <a href="/miners" class="quick-menu-item">
                                        <div class="quick-menu-box" style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.05);">
                                            <div class="quick-menu-icon" style="filter:grayscale(1) contrast(5) brightness(1.5); font-size:24px;">⛏️</div>
                                        </div>
                                        <div class="quick-menu-label" style="color:var(--text-primary);">Mining Config</div>
                                    </a>
                                </div>

                                <div class="dash-section-title" style="margin-top: 28px;">System Status</div>
                                <div class="grid grid-3">
                                    <div class="stat-card">
                                        <div class="stat-card-icon" style="background:rgba(59,130,246,0.12); color:var(--blue);">🤖</div>
                                        <div class="stat-card-body">
                                            <div class="stat-card-label">Bot Connection</div>
                                            <div class="stat-card-value" id="stat-status" style="color:var(--blue); font-size:18px;">Checking...</div>
                                        </div>
                                    </div>
                                    <div class="stat-card">
                                        <div class="stat-card-icon" style="background:rgba(245,158,11,0.12); color:var(--orange);">⏱️</div>
                                        <div class="stat-card-body">
                                            <div class="stat-card-label">System Uptime</div>
                                            <div class="stat-card-value" id="stat-uptime" style="color:var(--orange); font-size:18px;">0s</div>
                                        </div>
                                    </div>
                                    <div class="stat-card">
                                        <div class="stat-card-icon" style="background:rgba(74,222,128,0.12); color:var(--success);">✅</div>
                                        <div class="stat-card-body">
                                            <div class="stat-card-label">Server Health</div>
                                            <div class="stat-card-value" style="color:var(--success); font-size:18px;">Online</div>
                                        </div>
                                    </div>
                                </div>

                                <div class="grid grid-2" style="margin-top: 24px;">

                                    <div class="dash-info-card">
                                        <div class="dash-info-header">
                                            <div class="dash-info-title">⚙️ Bot Information</div>
                                        </div>
                                        <div class="dash-info-row">
                                            <div class="dash-info-label"><span>🏷️</span> Bot Name</div>
                                            <div class="dash-info-value">${config.bot.name}</div>
                                        </div>
                                        <div class="dash-info-row">
                                            <div class="dash-info-label"><span>⌨️</span> Prefix</div>
                                            <div class="dash-info-value" style="color:var(--orange);">${config.bot.prefix}</div>
                                        </div>
                                        <div class="dash-info-row">
                                            <div class="dash-info-label"><span>🧑‍💻</span> Connected As</div>
                                            <div class="dash-info-value" id="bot-user" style="color:var(--success); max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">-</div>
                                        </div>
                                        <div class="dash-info-row">
                                            <div class="dash-info-label"><span>🆚</span> Version</div>
                                            <div class="dash-info-value">${config.bot.version}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            `;
    }

    async getUserDashboard(session) {
        const user = await User.findOne({ username: session.username });
        const fmt = (n) => new Intl.NumberFormat('en-US').format(n);

        let linkedInfo = { isActive: false, phone: '-', premium: false, balance: 0, limit: 0, maxLimit: 30, seaShells: 0 };

        if (user && user.linkedPhoneNumber) {
            linkedInfo.isActive = true;
            linkedInfo.phone = user.linkedPhoneNumber;
            const botUser = await BotUser.findOne({ phoneNumber: user.linkedPhoneNumber });
            if (botUser) {
                linkedInfo.premium = botUser.isPremium;
                linkedInfo.balance = botUser.balance || 0;
                linkedInfo.seaShells = botUser.seaShells || 0;
                linkedInfo.limit = botUser.limit;
                linkedInfo.maxLimit = botUser.maxLimit || 30;
            }
        }
        const hour = new Date().getHours();
        const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

        return `
                            <div class="content" style="padding: 32px 40px;">
                                <div class="dash-hero" style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:20px; padding:32px;">
                                    <div style="position: relative; z-index: 10;">
                                        <div class="dash-hero-greeting">${greeting}</div>
                                        <div class="dash-hero-name" style="margin-bottom: 8px;">${session.name} 👋</div>
                                        <div style="display:flex; align-items:center; gap:20px; flex-wrap:wrap;">
                                            <div style="display:flex; flex-direction:column; gap:2px;">
                                                <div style="font-size:10px; color:rgba(255,255,255,0.7); font-weight:700; letter-spacing:1px;">BALANCE</div>
                                                <div style="font-size:18px; font-weight:800; color:var(--success); font-family:monospace;">Rp ${fmt(linkedInfo.balance)}</div>
                                            </div>
                                            <div style="display:flex; flex-direction:column; gap:2px;">
                                                <div style="font-size:10px; color:rgba(255,255,255,0.7); font-weight:700; letter-spacing:1px;">SEA SHELLS 🐚</div>
                                                <div style="font-size:18px; font-weight:800; color:#fff; font-family:monospace;">${fmt(linkedInfo.seaShells)}</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div style="position: relative; z-index: 10;">
                                        <div class="dash-hero-badge ${linkedInfo.premium ? 'premium' : 'basic'}" style="position:static;">
                                            ${linkedInfo.premium ? '⭐ PREMIUM' : '● BASIC'}
                                        </div>
                                    </div>
                                </div>

                                ${!linkedInfo.isActive ? `
                <div class="dash-alert warn">
                    <span style="font-size:20px;">⚠️</span>
                    <div>
                        <div style="font-weight:600; margin-bottom:2px;">Account Not Linked</div>
                        <div style="font-size:13px; opacity:0.8;">Link your WhatsApp number to sync game data and access all features.</div>
                    </div>
                </div>
                ` : ''}

                                <div class="dash-section-title" style="margin-top: 28px;">Menu</div>
                                <div class="quick-menu-grid" style="margin-bottom: 32px;">
                                    <a href="/mining-pass" class="quick-menu-item">
                                        <div class="quick-menu-box" style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.05);">
                                            <div class="quick-menu-icon" style="filter:grayscale(1) contrast(5) brightness(1.5); font-size:24px;">⛏️</div>
                                        </div>
                                        <div class="quick-menu-label" style="color:var(--text-primary);">Mining Pass</div>
                                    </a>
                                    <a href="/bank" class="quick-menu-item">
                                        <div class="quick-menu-box" style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.05);">
                                            <div class="quick-menu-icon" style="filter:grayscale(1) contrast(5) brightness(1.5); font-size:24px;">🏛️</div>
                                        </div>
                                        <div class="quick-menu-label" style="color:var(--text-primary);">Bank</div>
                                    </a>
                                    <a href="#" class="quick-menu-item">
                                        <div class="quick-menu-box" style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.05);">
                                            <div class="quick-menu-icon" style="filter:grayscale(1) contrast(5) brightness(1.5); font-size:24px;">🛒</div>
                                        </div>
                                        <div class="quick-menu-label" style="color:var(--text-primary);">Shop</div>
                                    </a>
                                    <a href="#" class="quick-menu-item">
                                        <div class="quick-menu-box" style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.05);">
                                            <div class="quick-menu-icon" style="filter:grayscale(1) contrast(5) brightness(1.5); font-size:24px;">🎲</div>
                                        </div>
                                        <div class="quick-menu-label" style="color:var(--text-primary);">Gacha</div>
                                    </a>
                                    <a href="#" class="quick-menu-item quick-menu-disabled" style="cursor:not-allowed; opacity:0.4;">
                                        <div class="quick-menu-box" style="background:transparent; border:1px dashed rgba(255,255,255,0.2);">
                                            <div class="quick-menu-icon" style="filter:grayscale(1) brightness(0.6); font-size:24px;">🔒</div>
                                        </div>
                                        <div class="quick-menu-label" style="color:var(--text-secondary);">Soon</div>
                                    </a>
                                </div>

                                <div class="dash-section-title" style="margin-top: 28px;">Account Details</div>
                                <div class="grid grid-1">
                                    <div class="dash-info-card">
                                        <div class="dash-info-header">
                                            <div class="dash-info-title"><span style="filter:grayscale(1) brightness(1.2); opacity:0.6; margin-right:8px; font-size:16px;">📱</span> Linked Account</div>
                                            <div style="font-size:11px; padding:3px 10px; border-radius:12px; background:${linkedInfo.isActive ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)'}; color:${linkedInfo.isActive ? 'var(--success)' : 'var(--error)'}; font-weight:600;">
                                                ${linkedInfo.isActive ? '● Connected' : '● Not Linked'}
                                            </div>
                                        </div>
                                        <div class="dash-info-row">
                                            <div class="dash-info-label"><span style="filter:grayscale(1) brightness(1.2); opacity:0.6;">📞</span> WhatsApp</div>
                                            <div class="dash-info-value">${linkedInfo.isActive ? '+' + linkedInfo.phone : '—'}</div>
                                        </div>
                                        <div class="dash-info-row">
                                            <div class="dash-info-label"><span style="filter:grayscale(1) brightness(1.2); opacity:0.6;">👤</span> Username</div>
                                            <div class="dash-info-value">${session.username}</div>
                                        </div>
                                        <div class="dash-info-row">
                                            <div class="dash-info-label"><span style="filter:grayscale(1) brightness(1.2); opacity:0.6;">🎖️</span> Status</div>
                                            <div class="dash-info-value" style="color:${linkedInfo.premium ? 'var(--orange)' : 'var(--text-secondary)'};">${linkedInfo.premium ? '⭐ Premium' : 'Basic'}</div>
                                        </div>
                                        <div class="dash-info-row">
                                            <div class="dash-info-label"><span style="filter:grayscale(1) brightness(1.2); opacity:0.6;">💵</span> Balance</div>
                                            <div class="dash-info-value" style="color:var(--success);">Rp ${fmt(linkedInfo.balance)}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            `;
    }

    async getHallOfFamePage() {
        const history = await TournamentHistory.getAll();

        if (!history || history.length === 0) {
            return `
                            <header class="header">
                                <h1 class="header-title">Hall of Fame</h1>
                            </header>
                            <div class="content">
                                <div class="hof-empty">
                                    <div class="hof-empty-icon">🏆</div>
                                    <div class="hof-empty-text">No completed tournaments yet.<br>Champions will be recorded here.</div>
                                </div>
                            </div>
                            `;
        }

        const formatDate = (d) => {
            if (!d) return '-';
            return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        };

        const seasonCards = history.map(t => {
            const champId = t.champion ? t.champion.id : null;
            const ruId = t.runnerUp ? t.runnerUp.id : null;
            const third = (t.topPlayers || []).find(p => p.id !== champId && p.id !== ruId);
            const thirdName = third ? third.name : '-';
            const finalScoreText = (t.finalScore && t.finalScore.length === 2) ? Math.max(t.finalScore[0], t.finalScore[1]) + ' - ' + Math.min(t.finalScore[0], t.finalScore[1]) : '-';

            return `
                            <div class="hof-season">
                                <div class="hof-season-head">
                                    <div class="hof-season-title">Season ${t.season} — ${t.name}</div>
                                    <div class="hof-season-meta">
                                        <span>👥 ${t.totalParticipants || 0} players</span>
                                        <span>📅 ${formatDate(t.finishedAt)}</span>
                                    </div>
                                </div>
                                <div class="hof-podium">
                                    <div class="hof-place silver">
                                        <div class="hof-place-trophy">🥈</div>
                                        <div class="hof-place-rank">Runner-up</div>
                                        <div class="hof-place-name">${t.runnerUp ? t.runnerUp.name : '-'}</div>
                                    </div>
                                    <div class="hof-place gold">
                                        <div class="hof-place-trophy">🏆</div>
                                        <div class="hof-place-rank">Champion</div>
                                        <div class="hof-place-name">${t.champion ? t.champion.name : '-'}</div>
                                    </div>
                                    <div class="hof-place bronze">
                                        <div class="hof-place-trophy">🥉</div>
                                        <div class="hof-place-rank">3rd Place</div>
                                        <div class="hof-place-name">${thirdName}</div>
                                    </div>
                                </div>
                                <div class="hof-final">
                                    <span>${t.champion ? t.champion.name : '?'}</span>
                                    <span class="hof-final-score">${finalScoreText}</span>
                                    <span>${t.runnerUp ? t.runnerUp.name : '?'}</span>
                                </div>
                                <a href="/hall-of-fame/season/${t.season}" class="hof-history-btn">📋 View History</a>
                            </div>
                            `;
        }).join('');

        return `
                            <header class="header">
                                <h1 class="header-title">Hall of Fame</h1>
                            </header>
                            <div class="content">
                                ${seasonCards}
                            </div>
                            `;
    }

    renderHistoryMatchBox(m) {
        return renderHistoryMatchBox(m);
    }

    async getSeasonHistoryPage(season) {
        return getSeasonHistoryPage(season);
    }

    async getTournamentLivePage() {
        return getTournamentLivePage();
    }

    getComingSoonPage(title, icon, description) {
        return `
                            <header class="header">
                                <h1 class="header-title">${title}</h1>
                            </header>
                            <div class="content">
                                <div class="coming-soon-wrap">
                                    <div class="coming-soon-icon">${icon}</div>
                                    <div class="coming-soon-title">${title}</div>
                                    <div class="coming-soon-desc">${description}</div>
                                    <div class="coming-soon-badge-lg">🚧 Coming Soon</div>
                                </div>
                            </div>
                            `;
    }

    async getCasinoPage(session) {
        let botUser = null;
        const casinoConf = await CasinoConfig.getConfig();
        if (session && session.username) {
            const user = await User.findOne({ username: session.username });
            if (user && user.linkedPhoneNumber) {
                botUser = await BotUser.findOne({ phoneNumber: user.linkedPhoneNumber });
            }
        }
        return getCasinoPage(session, botUser, casinoConf);
    }

    async getSlotPage(session) {
        let botUser = null;
        const casinoConf = await CasinoConfig.getConfig();
        if (session && session.username) {
            const user = await User.findOne({ username: session.username });
            if (user && user.linkedPhoneNumber) {
                botUser = await BotUser.findOne({ phoneNumber: user.linkedPhoneNumber });
            }
        }
        return getSlotPage(session, botUser, casinoConf);
    }

    async getDicePage(session) {
        let botUser = null;
        const casinoConf = await CasinoConfig.getConfig();
        if (session && session.username) {
            const user = await User.findOne({ username: session.username });
            if (user && user.linkedPhoneNumber) {
                botUser = await BotUser.findOne({ phoneNumber: user.linkedPhoneNumber });
            }
        }
        return getDicePage(session, botUser, casinoConf);
    }

    async getCasinoConfigPage() {
        return await casinoRoutes.getCasinoConfigPage();
    }

    async getTournamentPage(session) {
        const tourney = await Tournament.getActive();
        const active = tourney || null;
        return buildTournamentPage(active, session);
    }

    getQRPage() {
        return `
                            <header class="header">
                                <h1 class="header-title">QR Scanner</h1>
                            </header>
                            <div class="content">
                                <div class="card">
                                    <div class="qr-wrapper">
                                        <div class="qr-status">
                                            <span class="qr-status-badge waiting" id="qr-status-badge">
                                                <span class="status-dot waiting"></span>
                                                <span id="qr-status-text">Waiting...</span>
                                            </span>
                                        </div>
                                        <div class="qr-container" id="qr-container">
                                            <div class="qr-placeholder">
                                                <div class="qr-loader"></div>
                                                <span>Waiting for QR Code...</span>
                                            </div>
                                        </div>
                                        <div class="qr-instructions">
                                            <p>1. Open WhatsApp on your phone</p>
                                            <p>2. Tap Menu ⋮ or Settings ⚙️</p>
                                            <p>3. Select "Linked Devices"</p>
                                            <p>4. Scan the QR code above</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            `;
    }

    async getUsersPage() {
        return await usersRoutes.getUsersPage();
    }

    async getSettingsPage() {
        const settings = await BotSettings.getSettings();

        return `
                            < header class="header" > <h1 class="header-title">Settings</h1></header >
                            <div class="content">
                                <div class="grid grid-2">
                                    <div class="card">
                                        <div class="card-header">
                                            <div><div class="card-title">General Settings</div><div class="card-subtitle">Basic bot configuration</div></div>
                                        </div>

                                        <form action="/settings" method="POST">
                                            <div class="form-group">
                                                <label class="form-label">Bot Name</label>
                                                <input type="text" name="botName" class="form-input" value="${settings.botName}" required>
                                            </div>

                                            <div class="form-group">
                                                <label class="form-label">Command Prefix</label>
                                                <input type="text" name="prefix" class="form-input" value="${settings.prefix}" required maxlength="1">
                                            </div>

                                            <div class="form-group">
                                                <label class="form-label">Owner Phone Number</label>
                                                <input type="number" name="ownerNumber" class="form-input" value="${settings.ownerNumber}" placeholder="628xxx">
                                                    <small style="color: var(--text-secondary); font-size: 11px;">Includes country code, no symbols</small>
                                            </div>

                                            <button type="submit" class="btn btn-primary" style="width: 100%">Save Changes</button>
                                        </form>
                                    </div>

                                    <div class="card" style="border-color: var(--error);">
                                        <div class="card-header">
                                            <div><div class="card-title" style="color: var(--error);">Danger Zone</div></div>
                                        </div>
                                        <div style="padding: 10px 0;">
                                            <p style="color: var(--text-secondary); margin-bottom: 15px; font-size: 14px;">
                                                If you are stuck in a login loop or connection error (401), use this to clear the WhatsApp session from the database.
                                            </p>
                                            <form action="/reset-session" method="POST" onsubmit="return confirm('Are you sure? This will log out the bot and require rescanning QR.');">
                                                <button type="submit" class="btn" style="background: var(--error); color: white; width: 100%;">Reset WhatsApp Session</button>
                                            </form>
                                        </div>
                                    </div>

                                    <div class="card">
                                        <div class="card-header">
                                            <div><div class="card-title">Information</div></div>
                                        </div>
                                        <div style="color: var(--text-secondary); font-size: 14px; line-height: 1.6;">
                                            <p style="margin-bottom: 12px;"><strong>Prefix:</strong> Character used to trigger bot commands (e.g. .ping, !help).</p>
                                            <p style="margin-bottom: 12px;"><strong>Owner Number:</strong> The WhatsApp number that has super-admin access to the bot.</p>
                                            <p>Changes are applied immediately.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            `;
    }

    async getWAUsersPage() {
        return await waUsersRoutes.getWAUsersPage();
    }

    getLogsPage() {
        return `
                            <header class="header"><h1 class="header-title">Logs</h1></header>
                            <div class="content">
                                <div class="card">
                                    <div class="card-header"><div><div class="card-title">Bot Logs</div></div></div>
                                    <p style="color: var(--text-secondary); text-align: center; padding: 60px 0;">📝 Logs viewer coming soon...</p>
                                </div>
                            </div>
                            `;
    }

    async getMiningConfigPage() {
        return await miningRoutes.getMiningConfigPage();
    }
    // RPG CONFIG PAGE
    // ═══════════════════════════════════════════════════════════════

    async getRPGConfigPage() {
        return await rpgRoutes.getRPGConfigPage();
    }

    async renderPage(page, session) {
        let pageContent = '';

        switch (page) {
            case 'dashboard': pageContent = await this.getDashboardPage(session); break;
            case 'qr': pageContent = this.getQRPage(); break;
            case 'commands': pageContent = this.getCommandsPage(); break;
            case 'settings': pageContent = await this.getSettingsPage(); break;
            case 'logs': pageContent = this.getLogsPage(); break;
            case 'users': pageContent = await this.getUsersPage(); break;
            case 'wa-users': pageContent = await this.getWAUsersPage(); break;
            case 'mining-config': pageContent = await this.getMiningConfigPage(); break;
            case 'rpg-config': pageContent = await this.getRPGConfigPage(); break;
            case 'tournament': pageContent = await this.getTournamentPage(session); break;
            case 'hall-of-fame': pageContent = await this.getHallOfFamePage(); break;
            case 'season-history': pageContent = await this.getSeasonHistoryPage(session._seasonParam); break;
            case 'rpg': pageContent = this.getComingSoonPage('RPG Adventure', '⚔️', 'An epic RPG adventure is being crafted. Level up, explore dungeons, and defeat bosses — coming soon.'); break;
            case 'mining': {
                let identifier = session.username || session.id;
                const fullUser = await User.findOne({ username: session.username });
                if (fullUser && fullUser.linkedPhoneNumber) identifier = fullUser.linkedPhoneNumber;

                const pMining = await PlayerMining.getPlayer(identifier);
                const mConf = await MiningConfig.getConfig();
                const botSettings = await BotSettings.getSettings();
                pageContent = getMiningGamePage(pMining, mConf, botSettings.miningWebEnabled === true, identifier);
                break;
            }
            case 'mining-leaderboard': {
                const topRebirth = await PlayerMining
                    .find()
                    .sort({ rebirthCount: -1, pickaxeLevel: -1, 'stats.totalMined': -1 })
                    .limit(50)
                    .lean();
                pageContent = getMiningLeaderboardPage(topRebirth);
                break;
            }
            case 'casino': pageContent = await this.getCasinoPage(session); break;
            case 'casino-slot': pageContent = await this.getSlotPage(session); break;
            case 'casino-dice': pageContent = await this.getDicePage(session); break;
            case 'casino-config': pageContent = await this.getCasinoConfigPage(); break;
            case 'mining-pass': pageContent = await miningPassRoutes.getMiningPassPage(session); break;
            case 'bank': pageContent = await bankRoutes.getBankPage(session); break;
            case 'pass-config': pageContent = await miningPassRoutes.getPassConfigPage(); break;
            default: pageContent = await this.getDashboardPage(session);
        }

        return `
                            <!DOCTYPE html>
                            <html lang="en">
                                <head>
                                    <meta charset="UTF-8">
                                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                            <title>${config.webPanel.title}</title>
                                            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
                                                <script src="/socket.io/socket.io.js"></script>
                                                <style>${this.getCSS()}</style>
                                            </head>
                                            <body>
                                                <div class="sidebar-overlay" onclick="toggleSidebar()"></div>

                                                <div class="app">
                                                    ${this.getSidebar(page, session)}

                                                    <main class="main">
                                                        <!-- Mobile Header -->
                                                        <div class="mobile-header">
                                                            <button class="menu-toggle" onclick="toggleSidebar()">☰</button>
                                                            <div style="font-weight:700; font-size: 18px;">${config.webPanel.title}</div>
                                                        </div>

                                                        ${pageContent}
                                                    </main>
                                                </div>

                                                <script>
                                                    function toggleSidebar() {
                                                        document.querySelector('.sidebar').classList.toggle('active');
                                                    document.querySelector('.sidebar-overlay').classList.toggle('active');
        }

                                                    function toggleCategory(categoryId) {
            const cat = document.querySelector(\`.nav-category[data-category="\${categoryId}"]\`);
                                                    if (cat) {
                                                        cat.classList.toggle('expanded');
                                                    // Save state to localStorage
                                                    const expanded = JSON.parse(localStorage.getItem('sidebarCategories') || '{ }');
                                                    expanded[categoryId] = cat.classList.contains('expanded');
                                                    localStorage.setItem('sidebarCategories', JSON.stringify(expanded));
            }
        }

                                                    // Restore category states from localStorage
                                                    (function() {
            const saved = JSON.parse(localStorage.getItem('sidebarCategories') || '{ }');
            Object.keys(saved).forEach(catId => {
                const cat = document.querySelector(\`.nav-category[data-category="\${catId}"]\`);
                                                    if (cat) {
                    if (saved[catId]) cat.classList.add('expanded');
                                                    else cat.classList.remove('expanded');
                }
            });
        })();

        // Close sidebar when clicking a link on mobile
        document.querySelectorAll('.nav-item').forEach(item => {
                                                        item.addEventListener('click', () => {
                                                            if (window.innerWidth <= 768) toggleSidebar();
                                                        });
        });

                                                    const socket = io();
                                                    let startTime = Date.now();

        setInterval(() => {
            const seconds = Math.floor((Date.now() - startTime) / 1000);
                                                    const el = document.getElementById('stat-uptime');
                                                    if (el) el.textContent = formatUptime(seconds);
        }, 1000);

                                                    function formatUptime(s) {
            const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 60) / 60);
            if (d > 0) return d + 'd ' + h + 'h';
            if (h > 0) return h + 'h ' + m + 'm';
            if (m > 0) return m + 'm ' + (s % 60) + 's';
                                                    return s + 's';
        }

        socket.on('bot-status', (data) => {
            const statStatus = document.getElementById('stat-status');
                                                    if (statStatus) statStatus.textContent = data.connected ? '🟢 Online' : '🔴 Offline';

                                                    const botUser = document.getElementById('bot-user');
                                                    if (botUser && data.user) botUser.textContent = data.user.name || data.user.id || '-';

                                                    const qrContainer = document.getElementById('qr-container');
                                                    const qrBadge = document.getElementById('qr-status-badge');
                                                    const qrText = document.getElementById('qr-status-text');

                                                    if (qrContainer) {
                if (data.connected) {
                                                        qrContainer.innerHTML = '<div class="connected-view"><div class="connected-icon">✓</div><div class="connected-title">Connected!</div><div class="connected-user">' + (data.user?.name || 'WhatsApp') + '</div></div>';
                                                    if (qrBadge) {qrBadge.className = 'qr-status-badge connected'; qrText.textContent = 'Connected'; }
                } else if (data.qrImage) {
                                                        qrContainer.innerHTML = '<img src="' + data.qrImage + '" alt="QR" />';
                                                    if (qrBadge) {qrBadge.className = 'qr-status-badge waiting'; qrText.textContent = 'Scan QR'; }
                }
            }
        });
                                                </script>
                                            </body>
                                        </html>
                                        `;
    }

    async start() {
        return new Promise((resolve) => {
            this.setupMiddleware();
            this.setupRoutes();
            this.setupSocketIO();

            const port = config.server.port;
            const host = '0.0.0.0'; // Force 0.0.0.0 for Railway

            logger.info(`Starting web server on ${host}:${port}...`);

            this.server.on('error', (e) => {
                logger.error('Server failed to start/listen:', e);
                process.exit(1);
            });

            this.server.listen(port, host, () => {
                logger.success(`Web server running at http://${host}:${port}`);
                logger.info('Login with admin/admin123 or user/user123');
                resolve();
            });
        });
    }

    async stop() {
        return new Promise((resolve) => {
            this.server.close(() => { logger.info('Web server stopped'); resolve(); });
        });
    }
}

module.exports = WebServer;

