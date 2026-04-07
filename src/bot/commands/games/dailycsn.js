/**
 * .dailycsn - Claim daily casino chips
 */
const { BotUser, CasinoConfig } = require('../../../models');

module.exports = {
    name: 'dailycsn',
    description: 'Klaim koin kasino gratis setiap beberapa jam',
    category: 'games',
    usage: '.dailycsn',

    execute: async ({ reply, sender }) => {
        try {
            const phoneNumber = sender.replace('@s.whatsapp.net', '').replace('@c.us', '');
            const config = await CasinoConfig.getConfig();

            // Check if casino is enabled
            if (!config.isEnabled) {
                return reply(`🔧 ${config.maintenanceMsg}`);
            }

            // Find user or create if somehow not exists
            let user = await BotUser.findOne({ phoneNumber });
            if (!user) {
                user = new BotUser({ phoneNumber });
            }

            const now = new Date();
            const lastClaim = user.lastDailyCsn ? new Date(user.lastDailyCsn) : null;
            const cooldownHours = config.dailyCooldownHours || 2;

            // Check cooldown
            if (lastClaim) {
                const hoursPassed = (now - lastClaim) / (1000 * 60 * 60);
                if (hoursPassed < cooldownHours) {
                    const remainingHours = Math.floor(cooldownHours - hoursPassed);
                    const remainingMinutes = Math.floor(((cooldownHours - hoursPassed) * 60) % 60);
                    return reply(`⏳ Anda sudah melakukan klaim!\nSilakan kembali dalam *${remainingHours} jam ${remainingMinutes} menit* lagi.`);
                }
            }

            // Generate reward amount from config
            const min = config.dailyClaimMin || 100;
            const max = config.dailyClaimMax || 400;
            let reward = Math.floor(Math.random() * (max - min + 1)) + min;

            // Handle rentenir auto debit
            let debtDeducted = 0;
            if (user.pinjolDebt > 0) {
                // Rentenir takes a share based on the deduction rate
                const deductionRate = (config.pinjolDeductionRate || 50) / 100;
                let deductAmount = Math.ceil(reward * deductionRate);
                if (deductAmount === 0 && reward > 0) deductAmount = 1;

                debtDeducted = Math.min(deductAmount, user.pinjolDebt);
                user.pinjolDebt -= debtDeducted;
                reward -= debtDeducted;
            }

            // Update user
            user.casinoChips = (user.casinoChips || 0) + reward;
            user.lastDailyCsn = now;
            await user.save();

            // Format message
            let rentenirMsg = '';
            if (debtDeducted > 0) {
                rentenirMsg = `\n⚠️ *Rentenir:* -${debtDeducted.toLocaleString('id-ID')} KOIN ditarik untuk mencicil hutang (Sisa hutang: ${user.pinjolDebt.toLocaleString('id-ID')})\n`;
            }

            const message = `
🎁 *KLAIM GRATIS KASINO* 🎁
━━━━━━━━━━━━━━━━━━━━

Berhasil! Anda mendapatkan *+${(reward + debtDeducted).toLocaleString('id-ID')} KOIN* kasino saat ini.${rentenirMsg}

💰 *Saldo Koin Kasino:* ${(user.casinoChips || 0).toLocaleString('id-ID')}

Kembali lagi nanti untuk klaim koin gratis berikutnya! Ketik .casino untuk bermain.
`.trim();

            await reply(message);

        } catch (error) {
            console.error('Error in dailycsn command:', error);
            await reply('❌ Gagal mengklaim koin kasino harian akibat kesalahan sistem.');
        }
    }
};
