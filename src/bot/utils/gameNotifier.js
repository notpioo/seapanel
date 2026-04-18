const https = require('https');
const GameNotifConfig = require('../../models/GameNotifConfig');

const API_URL = 'https://free-games-notifier-production.up.railway.app/api/free-games';
const TICK_INTERVAL_MS = 15 * 1000; // check every 15 seconds

class GameNotifier {
    constructor() {
        this.socket = null;
        this.timer = null;
        this.isRunning = false;
    }

    start(socket) {
        this.socket = socket;
        if (this.isRunning) return;
        this.isRunning = true;
        this.timer = setInterval(() => this.tick(), TICK_INTERVAL_MS);
        setTimeout(() => this.tick(), 15 * 1000);
        console.log('[GameNotifier] Polling service started (tick every 15s)');
    }

    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        this.isRunning = false;
    }

    updateSocket(socket) {
        this.socket = socket;
    }

    async fetchGames() {
        return new Promise((resolve, reject) => {
            https.get(API_URL, { timeout: 10000 }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        resolve(json.games || []);
                    } catch (e) {
                        reject(new Error('Failed to parse API response'));
                    }
                });
            }).on('error', reject).on('timeout', () => reject(new Error('API request timed out')));
        });
    }

    async tick() {
        try {
            if (!this.socket) return;

            const now = new Date();
            const configs = await GameNotifConfig.find({ isActive: true });

            for (const cfg of configs) {
                const elapsedMinutes = cfg.lastCheck
                    ? (now - cfg.lastCheck) / 1000 / 60
                    : Infinity;

                if (elapsedMinutes < cfg.intervalMinutes) continue;

                await this.checkAndNotify(cfg, now);
            }
        } catch (e) {
            console.error('[GameNotifier] Tick error:', e.message);
        }
    }

    async checkAndNotify(cfg, now) {
        try {
            const games = await this.fetchGames();

            cfg.lastCheck = now;
            await cfg.save();

            if (games.length === 0) {
                console.log(`[GameNotifier] No games found for ${cfg.groupId}`);
                return;
            }

            await this.sendGamesToGroup(cfg.groupId, games);
            console.log(`[GameNotifier] Sent ${games.length} game(s) to ${cfg.groupId}`);
        } catch (e) {
            console.error(`[GameNotifier] Error notifying ${cfg.groupId}:`, e.message);
        }
    }

    async sendGamesToGroup(groupId, games) {
        // Header message
        await this.socket.sendMessage(groupId, {
            text: `🎮 *GAME GRATIS TERSEDIA!*\n━━━━━━━━━━━━━━━━━━\n📦 ${games.length} game gratis saat ini:`
        });

        // Send each game as a separate image card
        for (const g of games) {
            await this.sendGameCard(groupId, g);
            // small delay to avoid spam rate limit
            await new Promise(r => setTimeout(r, 500));
        }
    }

    async sendGameCard(groupId, g) {
        const platformIcon = g.platform === 'Steam' ? '🔵'
            : g.platform === 'Epic Games' ? '⚫'
            : g.platform === 'GOG' ? '🟣' : '🎮';

        const caption =
            `${platformIcon} *${g.title}*\n` +
            `📌 *Platform:* ${g.platform}\n` +
            `🔗 ${g.url}`;

        if (g.iconUrl) {
            try {
                await this.socket.sendMessage(groupId, {
                    image: { url: g.iconUrl },
                    caption
                });
                return;
            } catch (e) {
                console.warn(`[GameNotifier] Image send failed for "${g.title}", falling back to text:`, e.message);
            }
        }

        // Fallback: text only if no iconUrl or image failed
        await this.socket.sendMessage(groupId, { text: caption });
    }

    formatMessage(games) {
        let txt = `🎮 *GAME GRATIS TERSEDIA!*\n`;
        txt += `━━━━━━━━━━━━━━━━━━\n\n`;

        for (const g of games) {
            const icon = g.platform === 'Steam' ? '🔵'
                : g.platform === 'Epic Games' ? '⚫'
                : g.platform === 'GOG' ? '🟣' : '🎮';

            txt += `${icon} *${g.title}*\n`;
            txt += `📌 Platform: ${g.platform}\n`;
            txt += `🔗 ${g.url}\n\n`;
        }

        txt += `_Update otomatis — matikan dengan .gnotif off_`;
        return txt.trim();
    }

    parseInterval(str) {
        const match = String(str).match(/^(\d+)(s|m|h|d)$/i);
        if (!match) return null;
        const num = parseInt(match[1]);
        const unit = match[2].toLowerCase();
        if (unit === 's') return num / 60;
        if (unit === 'm') return num;
        if (unit === 'h') return num * 60;
        if (unit === 'd') return num * 60 * 24;
        return null;
    }

    formatIntervalLabel(minutes) {
        if (minutes < 1) return `${Math.round(minutes * 60)} detik`;
        if (minutes < 60) return `${minutes} menit`;
        if (minutes < 1440) return `${minutes / 60} jam`;
        return `${minutes / 1440} hari`;
    }
}

module.exports = new GameNotifier();
