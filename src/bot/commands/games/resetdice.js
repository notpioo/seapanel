/**
 * .resetdice - Reset Dice Leaderboard (Owner Only)
 */
const { BotUser } = require('../../../models');

module.exports = {
    name: 'resetdice',
    description: 'Reset leaderboard dice (Owner only)',
    category: 'games',
    usage: '.resetdice',
    ownerOnly: true,

    execute: async ({ reply }) => {
        try {
            // Count players with dice stats
            const playerCount = await BotUser.countDocuments({
                'diceStats.games': { $gt: 0 }
            });

            if (playerCount === 0) {
                return reply('🎲 Belum ada data permainan dice untuk direset.');
            }

            // Reset all dice stats
            await BotUser.updateMany(
                { 'diceStats.games': { $gt: 0 } },
                {
                    $set: {
                        'diceStats.games': 0,
                        'diceStats.wins': 0,
                        'diceStats.losses': 0,
                        'diceStats.profit': 0,
                    }
                }
            );

            await reply(
                `🎲 *LEADERBOARD DICE DIRESET* 🎲\n\n` +
                `✅ Total *${playerCount}* pemain telah direset statistiknya.\n\n` +
                `Selamat bermain kembali! 🍀`
            );

        } catch (error) {
            console.error('Error in resetdice command:', error);
            await reply('❌ Gagal mereset leaderboard dice.');
        }
    }
};
