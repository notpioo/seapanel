/**
 * .fliptop - Flip Leaderboard (Top 10 Profit)
 */
const { BotUser } = require('../../../models');

module.exports = {
    name: 'fliptop',
    aliases: ['flipleaderboard', 'fliplb'],
    description: 'Lihat Top 10 pemain flip berdasarkan profit',
    category: 'games',
    usage: '.fliptop',

    execute: async ({ reply }) => {
        try {
            const topPlayers = await BotUser.find({
                'flipStats.games': { $gt: 0 }
            })
                .sort({ 'flipStats.profit': -1 })
                .limit(10)
                .lean();

            if (!topPlayers || topPlayers.length === 0) {
                return reply('🪙 Belum ada data permainan flip. Mulai main dulu dengan *.flip [taruhan]*!');
            }

            const medals = ['🥇', '🥈', '🥉'];
            let mentions = [];
            let leaderboardText = '';

            topPlayers.forEach((player, index) => {
                const stats = player.flipStats || { games: 0, wins: 0, losses: 0, profit: 0 };
                const winrate = stats.games > 0 ? ((stats.wins / stats.games) * 100).toFixed(1) : '0.0';
                const profitStr = stats.profit >= 0 ? `+${stats.profit.toLocaleString()}` : `${stats.profit.toLocaleString()}`;
                const rank = medals[index] || `#${index + 1}`;
                const phone = player.phoneNumber;

                mentions.push(`${phone}@s.whatsapp.net`);

                leaderboardText +=
                    `${rank} @${phone}\n` +
                    `┠ Game: ${stats.games} | Win: ${stats.wins} | Lose: ${stats.losses}\n` +
                    `┠ Winrate: ${winrate}%\n` +
                    `┖ Profit: *${profitStr} KOIN*\n\n`;
            });

            const message =
                `🪙 *FLIP LEADERBOARD — TOP 10* 🪙\n` +
                `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `${leaderboardText}` +
                `━━━━━━━━━━━━━━━━━━━━━━\n` +
                `Mainkan *.flip [taruhan]* untuk masuk leaderboard! 🍀`;

            await reply(message, { mentions });

        } catch (error) {
            console.error('Error in fliptop command:', error);
            await reply('❌ Gagal memuat leaderboard flip.');
        }
    }
};
