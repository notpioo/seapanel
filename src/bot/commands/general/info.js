/**
 * Info Command - Display bot information
 */

const os = require('os');

module.exports = {
    name: 'info',
    aliases: ['botinfo', 'about'],
    category: 'general',
    description: 'Menampilkan informasi tentang bot',
    usage: '.info',
    ownerOnly: false,

    async execute({ reply, config }) {
        const uptime = formatUptime(process.uptime());
        const memUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
        const platform = os.platform();
        const nodeVersion = process.version;

        let infoText = `╔══════════════════════════════════════╗\n`;
        infoText += `║          *BOT INFORMATION*           ║\n`;
        infoText += `╚══════════════════════════════════════╝\n\n`;

        infoText += `🤖 *Bot Name:* ${config.bot.name}\n`;
        infoText += `📌 *Version:* ${config.bot.version}\n`;
        infoText += `🏷️ *Prefix:* ${config.bot.prefix}\n\n`;

        infoText += `━━━━ *SYSTEM INFO* ━━━━\n`;
        infoText += `⏱️ *Uptime:* ${uptime}\n`;
        infoText += `💾 *Memory:* ${memUsage} MB\n`;
        infoText += `💻 *Platform:* ${platform}\n`;
        infoText += `📦 *Node.js:* ${nodeVersion}\n\n`;

        infoText += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        infoText += `_Powered by Sanka-Baileys_ 🚀`;

        return reply(infoText);
    },
};

/**
 * Format uptime to human readable string
 */
function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${secs}s`);

    return parts.join(' ');
}
