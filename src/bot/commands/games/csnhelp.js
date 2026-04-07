/**
 * .csnhelp - List semua command kasino
 */
module.exports = {
    name: 'csnhelp',
    aliases: ['casinohelp'],
    description: 'Daftar semua command kasino',
    category: 'games',
    usage: '.csnhelp',

    execute: async ({ reply }) => {
        const message =
            `🎰 *DAFTAR COMMAND KASINO* 🎰\n` +
            `━━━━━━━━━━━━━━━━━━━━━━\n\n` +

            `📊 *UMUM*\n` +
            `*.csn* — Dashboard kasino pribadi\n` +
            `*.dailycsn* — Klaim koin gratis harian\n` +
            `*.csnhelp* — Daftar command ini\n\n` +

            `🎲 *HI-LO 9 DICE*\n` +
            `*.dice [taruhan]* — Buat room dice\n` +
            `*.joindice [taruhan]* — Gabung room dice\n` +
            `*.startdice* — Mulai game (pembuat room)\n` +
            `*.k* / *.b* — Pilih Kecil / Besar\n` +
            `*.dicetop* — Leaderboard dice\n\n` +

            `🪙 *COIN FLIP*\n` +
            `*.flip [taruhan]* — Buat room flip\n` +
            `*.flipjoin [taruhan]* — Gabung room flip\n` +
            `*.startflip* — Mulai game (pembuat room)\n` +
            `*.head* / *.tail* — Pilih Kepala / Ekor\n` +
            `*.fliptop* — Leaderboard flip\n\n` +

            `💸 *TRANSAKSI*\n` +
            `*.tfchip @player jumlah* — Transfer koin\n` +
            `*.tfchip nomor jumlah* — Transfer via nomor\n` +
            `_(Pajak transfer 3.5% | Min. 100 KOIN)_\n\n` +

            `🔧 *OWNER ONLY*\n` +
            `*.resetdice* — Reset leaderboard dice\n\n` +

            `━━━━━━━━━━━━━━━━━━━━━━\n` +
            `Selamat bermain & semoga hoki! 🍀`;

        await reply(message);
    }
};
