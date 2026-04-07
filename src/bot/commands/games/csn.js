/**
 * .csn - Casino Dashboard
 */
const { BotUser, CasinoConfig } = require('../../../models');

module.exports = {
    name: 'csn',
    aliases: ['casino', 'kasino'],
    description: 'Lihat dashboard kasino pribadi',
    category: 'games',
    usage: '.csn',

    execute: async ({ reply, sender }) => {
        try {
            const phoneNumber = sender.replace('@s.whatsapp.net', '').replace('@c.us', '');
            const config = await CasinoConfig.getConfig();

            // Check if casino is enabled
            if (!config.isEnabled) {
                return reply(`🔧 ${config.maintenanceMsg}`);
            }

            // Find user or create
            let user = await BotUser.findOne({ phoneNumber });
            if (!user) {
                user = new BotUser({ phoneNumber });
                await user.save();
            }

            const chips = (user.casinoChips || 0).toLocaleString('id-ID');

            // Daily claim status
            const now = new Date();
            const lastClaim = user.lastDailyCsn ? new Date(user.lastDailyCsn) : null;
            const cooldownHours = config.dailyCooldownHours || 24;

            let dailyStatus = '';
            if (!lastClaim) {
                dailyStatus = '✅ *Tersedia!* Ketik .dailycsn';
            } else {
                const hoursPassed = (now - lastClaim) / (1000 * 60 * 60);
                if (hoursPassed >= cooldownHours) {
                    dailyStatus = '✅ *Tersedia!* Ketik .dailycsn';
                } else {
                    const remaining = cooldownHours - hoursPassed;
                    const h = Math.floor(remaining);
                    const m = Math.floor((remaining * 60) % 60);
                    dailyStatus = `⏳ Cooldown *${h}j ${m}m* lagi`;
                }
            }

            const message =
                `🎰 *KASINO DASHBOARD* 🎰\n` +
                `━━━━━━━━━━━━━━━━━━━\n\n` +
                `👤 Player: @${phoneNumber}\n` +
                `💰 Saldo Koin: *${chips} KOIN*\n\n` +
                `📅 *KLAIM HARIAN*\n` +
                `${dailyStatus}\n\n` +
                `━━━━━━━━━━━━━━━━━━━\n` +
                `Selamat bermain & semoga hoki! 🍀`;

            await reply(message, { mentions: [`${phoneNumber}@s.whatsapp.net`] });

        } catch (error) {
            console.error('Error in csn command:', error);
            await reply('❌ Gagal memuat dashboard kasino.');
        }
    }
};
