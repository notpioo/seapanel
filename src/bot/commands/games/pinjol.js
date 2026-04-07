/**
 * .pinjol - Kasino Loan System
 */
const { BotUser, CasinoConfig } = require('../../../models');

module.exports = {
    name: 'pinjol',
    aliases: ['utang', 'pinjam', 'bayarutang', 'bayarpinjol'],
    description: 'Sistem pinjaman koin kasino dari rentenir',
    category: 'games',
    usage: '.pinjol [nominal] | .bayarpinjol [nominal]',

    execute: async ({ reply, sender, args, command }) => {
        try {
            const phoneNumber = sender.replace('@s.whatsapp.net', '').replace('@c.us', '');

            const config = await CasinoConfig.getConfig();
            if (!config.isEnabled || !config.pinjolEnabled) {
                return reply('❌ Fitur pinjaman kasino sedang dinonaktifkan.');
            }

            const user = await BotUser.findOne({ phoneNumber });
            if (!user) {
                return reply('❌ Anda belum terdaftar, ketik .dailycsn dulu.');
            }

            // Command: bayarpinjol
            if (['bayarutang', 'bayarpinjol'].includes(command)) {
                if ((user.pinjolDebt || 0) <= 0) {
                    return reply('✅ Anda tidak memiliki hutang pinjol. Bagus!');
                }

                let payAmount = user.pinjolDebt; // default pay all
                if (args.length > 0) {
                    const argAmount = parseInt(args[0]);
                    if (!isNaN(argAmount) && argAmount > 0) {
                        payAmount = Math.min(argAmount, user.pinjolDebt);
                    }
                }

                if ((user.casinoChips || 0) < payAmount) {
                    return reply(`❌ Saldo Anda tidak cukup untuk membayar tagihan sebesar *${payAmount.toLocaleString()} KOIN*.\nSaldo Anda: *${(user.casinoChips || 0).toLocaleString()} KOIN*`);
                }

                user.casinoChips -= payAmount;
                user.pinjolDebt -= payAmount;
                await user.save();

                return reply(
                    `💳 *PEMBAYARAN PINJOL BERHASIL* 💳\n\n` +
                    `Telah dibayarkan: *${payAmount.toLocaleString()} KOIN*\n` +
                    `Sisa hutang Anda: *${user.pinjolDebt.toLocaleString()} KOIN*\n` +
                    `Sisa Saldo Kasino: *${user.casinoChips.toLocaleString()} KOIN*\n\n` +
                    `_Terima kasih sudah membayar utang tepat waktu!_`
                );
            }

            // Command: pinjol
            const maxLoan = user.pinjolLimit > 0 ? user.pinjolLimit : (config.pinjolMaxAmount || 2500);
            const interestStr = config.pinjolInterestRate || 20;
            const interestRate = interestStr / 100;
            const minBalance = config.pinjolMinBalance || 500;

            if (args.length === 0) {
                return reply(
                    `🏦 *RENTENIR KASINO SEA* 🏦\n\n` +
                    `Status Hutang Anda: *${(user.pinjolDebt || 0).toLocaleString()} KOIN*\n` +
                    `Maksimal Pinjaman: *${maxLoan.toLocaleString()} KOIN*\n` +
                    `Bunga Kasino: *${interestStr}%*\n\n` +
                    `📝 *SYARAT MEMINJAM:*\n` +
                    `1. Anda harus melunasi hutang sebelumnya.\n` +
                    `2. Saldo koin Anda harus di bawah *${minBalance.toLocaleString()} KOIN*.\n` +
                    `3. Saat Anda menang main dadu, keuntungan Anda akan disedot otomatis untuk mencicil hutang.\n\n` +
                    `Ketik: *.pinjol [nominal]* untuk meminjam.\n` +
                    `Ketik: *.bayarpinjol [nominal]* untuk membayar lunas manual.`
                );
            }

            const amount = parseInt(args[0]);
            if (isNaN(amount) || amount <= 0) {
                return reply('❌ Nominal pinjaman tidak valid!');
            }

            if ((user.pinjolDebt || 0) > 0) {
                return reply(`❌ Anda masih memiliki hutang sebesar *${user.pinjolDebt.toLocaleString()} KOIN*! Lunasi dulu dengan ketik *.bayarpinjol*.`);
            }

            if ((user.casinoChips || 0) > minBalance) {
                return reply(`❌ Saldo Anda masih *${user.casinoChips.toLocaleString()} KOIN*. Pinjol hanya untuk yang saldonya di bawah *${minBalance.toLocaleString()} KOIN*!`);
            }

            if (amount > maxLoan) {
                return reply(`❌ Rentenir hanya berani meminjamkan maksimal *${maxLoan.toLocaleString()} KOIN* kepada Anda.`);
            }

            // Calculate debt with interest
            const totalDebt = Math.floor(amount + (amount * interestRate));

            user.casinoChips = (user.casinoChips || 0) + amount;
            user.pinjolDebt = totalDebt;
            await user.save();

            return reply(
                `💸 *PINJAMAN CAIR!* 💸\n\n` +
                `Nominal Cair: *${amount.toLocaleString()} KOIN*\n` +
                `Total Hutang (Bunga ${interestStr}%): *${totalDebt.toLocaleString()} KOIN*\n` +
                `Saldo Kasino Sekarang: *${user.casinoChips.toLocaleString()} KOIN*\n\n` +
                `⏳ *PERINGATAN:* Hati-hati, rentenir akan memotong otomatis uang Anda jika Anda ketahuan memenangkan kasino!`
            );

        } catch (error) {
            console.error('Error in pinjol command:', error);
            reply('❌ Terjadi kesalahan pada sistem pinjaman.');
        }
    }
};
