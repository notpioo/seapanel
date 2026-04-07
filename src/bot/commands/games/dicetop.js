/**
 * .dicetop - Dice Leaderboard (Top 10 Profit)
 */
const { BotUser } = require('../../../models');

module.exports = {
    name: 'dicetop',
    aliases: ['diceleaderboard', 'dicelb'],
    description: 'Lihat Top 10 pemain dice berdasarkan profit',
    category: 'games',
    usage: '.dicetop',

    execute: async ({ reply }) => {
        try {
            // Find top 10 players sorted by dice profit
            const topPlayers = await BotUser.find({
                'diceStats.games': { $gt: 0 }
            })
                .sort({ 'diceStats.profit': -1 })
                .limit(10)
                .lean();

            if (!topPlayers || topPlayers.length === 0) {
                return reply('🎲 Belum ada data permainan dice. Mulai main dulu dengan *.dice [taruhan]*!');
            }

            const medals = ['🥇', '🥈', '🥉'];
            let mentions = [];
            let leaderboardText = '';

            topPlayers.forEach((player, index) => {
                const stats = player.diceStats || { games: 0, wins: 0, losses: 0, profit: 0 };
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
                `🎲 *DICE LEADERBOARD — TOP 10* 🎲\n` +
                `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `${leaderboardText}` +
                `━━━━━━━━━━━━━━━━━━━━━━\n` +
                `Mainkan *.dice [taruhan]* untuk masuk leaderboard! 🍀`;

            await reply(message, { mentions });

        } catch (error) {
            console.error('Error in dicetop command:', error);
            await reply('❌ Gagal memuat leaderboard dice.');
        }
    }
};
