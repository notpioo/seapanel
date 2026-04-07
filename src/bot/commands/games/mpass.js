/**
 * Mining Pass Commands (.mbuypass, .mpass, .mpassinfo)
 */
const { MiningPassConfig, MiningPassPlayer, BotUser } = require('../../../models');

function getGlobalPassState(config) {
    const wibTime = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
    let currentGlobalDay;
    if (config.passDuration <= 7) {
        currentGlobalDay = wibTime.getDay() === 0 ? 7 : wibTime.getDay();
        currentGlobalDay = Math.min(currentGlobalDay, config.passDuration);
    } else {
        currentGlobalDay = Math.min(wibTime.getDate(), config.passDuration);
    }
    const y = wibTime.getFullYear();
    const m = String(wibTime.getMonth() + 1).padStart(2, '0');
    const d = String(wibTime.getDate()).padStart(2, '0');
    const todayStr = `${y}-${m}-${d}`;
    return { wibTime, todayStr, currentGlobalDay };
}

function getDateStringForPastDay(wibTime, currentGlobalDay, targetDay) {
    const diffDays = currentGlobalDay - targetDay;
    const pastDate = new Date(wibTime.getTime());
    pastDate.setDate(pastDate.getDate() - diffDays);
    const y = pastDate.getFullYear();
    const m = String(pastDate.getMonth() + 1).padStart(2, '0');
    const d = String(pastDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

module.exports = {
    name: 'mpass',
    description: 'Klaim hadiah harian Mining Pass kamu',
    category: 'games',
    usage: '.mpass',

    execute: async ({ reply, sender, command }) => {
        try {
            const phoneNumber = sender.replace('@s.whatsapp.net', '').replace('@c.us', '');
            const config = await MiningPassConfig.getConfig();

            if (!config.isEnabled) {
                return reply(`⛏️ *Mining Pass* sedang dinonaktifkan sementara.`);
            }

            const { wibTime, todayStr, currentGlobalDay } = getGlobalPassState(config);

            // Command: .mbuypass
            if (command === 'mbuypass') {
                const user = await BotUser.findOne({ phoneNumber });
                if (!user) return reply(`❌ Profilmu tidak ditemukan. Kamu harus interaksi dengan bot dulu.`);

                const existingPass = await MiningPassPlayer.findOne({
                    phoneNumber,
                    isActive: true,
                    expiresAt: { $gt: new Date() }
                });

                if (existingPass && existingPass.hasPremium) {
                    const daysLeft = Math.ceil((new Date(existingPass.expiresAt) - new Date()) / (1000 * 60 * 60 * 24));
                    return reply(`⚠️ Kamu sudah memiliki Mining Pass VIP yang aktif!\nSisa durasi: *${daysLeft} hari*.\nCek Dashboard Mining Pass untuk klaim!`);
                }

                if (user.balance < config.passPrice) {
                    return reply(`❌ Balance kamu tidak cukup untuk membeli Mining Pass VIP.\nHarga: *${config.passPrice.toLocaleString()} Balance*\nSaldomu: *${(user.balance || 0).toLocaleString()} Balance*`);
                }

                user.balance -= config.passPrice;

                if (existingPass && !existingPass.hasPremium) {
                    existingPass.hasPremium = true;
                    let retroactivePremiumClaimed = 0;

                    if (existingPass.claimedDates && existingPass.claimedDates.length > 0) {
                        for (let i = 1; i <= currentGlobalDay; i++) {
                            const targetDateStr = getDateStringForPastDay(wibTime, currentGlobalDay, i);
                            if (existingPass.claimedDates.includes(targetDateStr)) {
                                const reward = config.rewards.find(r => r.day === i);
                                if (reward) {
                                    if (reward.premiumType === 'chips') user.casinoChips = (user.casinoChips || 0) + reward.premiumAmount;
                                    else if (reward.premiumType === 'balance') user.balance = (user.balance || 0) + reward.premiumAmount;
                                    else if (reward.premiumType === 'limit') user.limit = (user.limit || 0) + reward.premiumAmount;
                                    retroactivePremiumClaimed++;
                                }
                            }
                        }
                    }

                    await user.save();
                    await existingPass.save();
                    return reply(`🎉 *UPGRADE BERHASIL!*\nMining Pass milikmu telah di-upgrade menjadi VIP!\nHadiah premium dari ${retroactivePremiumClaimed} hari yang terlewat (jika ada) otomatis dicairkan!\n\nHari yang belum pernah diklaim sama sekali dapat diakses via Web Dashboard.`);
                }

                await user.save();

                const expires = new Date(wibTime.getTime() + config.passDuration * 24 * 60 * 60 * 1000);

                await MiningPassPlayer.create({
                    phoneNumber,
                    purchasedAt: wibTime,
                    expiresAt: expires,
                    currentDay: currentGlobalDay,
                    lastClaimDate: '',
                    claimedDates: [],
                    isActive: true,
                    hasPremium: true
                });

                return reply(`🎉 *PEMBELIAN BERHASIL!*\nKamu telah mengaktifkan Mining Pass VIP selama ${config.passDuration} hari dengan harga ${config.passPrice.toLocaleString()} Balance.\nSisa Balance: *${user.balance.toLocaleString()}*\n\nKetik *.mpass* untuk klaim hadiah HARI INI! ⛏️`);
            }

            // Commands: .mpass, .mpassinfo
            let playerPass = await MiningPassPlayer.findOne({
                phoneNumber,
                isActive: true,
                expiresAt: { $gt: new Date() }
            });

            if (command === 'mpassinfo') {
                if (!playerPass) return reply(`❌ Kamu tidak memiliki Mining Pass yang aktif.\nKetik *.mpass* untuk memulai versi Gratis, atau *.mbuypass* untuk VIP seharga *${config.passPrice.toLocaleString()} Balance*.`);

                const daysLeft = Math.max(0, Math.ceil((new Date(playerPass.expiresAt) - new Date()) / (1000 * 60 * 60 * 24)));
                const tipe = playerPass.hasPremium ? 'VIP 💎' : 'Free 🆓';
                const isClaimedToday = playerPass.claimedDates && playerPass.claimedDates.includes(todayStr);

                return reply(`⛏️ *Info Mining Pass*\n\nTipe: *${tipe}*\nHari Global: *Hari ke-${currentGlobalDay}* dari ${config.passDuration}\nSisa Waktu: *${daysLeft} hari*\n\nKlaim Hari Ini: *${isClaimedToday ? 'Sudah ✅' : 'Belum ❌'}*\n_(Ketik .mpass untuk klaim)_`);
            }

            // Command: .mpass (Claim process)
            if (!playerPass) {
                const expires = new Date(wibTime.getTime() + config.passDuration * 24 * 60 * 60 * 1000);
                playerPass = await MiningPassPlayer.create({
                    phoneNumber,
                    purchasedAt: wibTime,
                    expiresAt: expires,
                    currentDay: currentGlobalDay,
                    lastClaimDate: '',
                    claimedDates: [],
                    isActive: true,
                    hasPremium: false
                });
            }

            if (playerPass.claimedDates && playerPass.claimedDates.includes(todayStr)) {
                return reply(`⚠️ Kamu sudah mengklaim hadiah Mining Pass HARI INI (Hari ke-${currentGlobalDay}).\nKembali besok untuk hadiah berikutnya!\nJika ada hari yang terlewat, kamu bisa klaim retroaktif di Menu Web (khusus VIP).`);
            }

            const reward = config.rewards.find(r => r.day === currentGlobalDay);

            if (!reward) {
                if (!playerPass.claimedDates) playerPass.claimedDates = [];
                playerPass.claimedDates.push(todayStr);
                playerPass.currentDay = Math.max(playerPass.currentDay, currentGlobalDay);
                playerPass.lastClaimDate = todayStr;
                await playerPass.save();
                return reply(`Hari ke-${currentGlobalDay} berhasil ditandai selesai, namun tidak ada hadiah spesifik di hari ini.`);
            }

            const user = await BotUser.findOne({ phoneNumber });
            let bonusMsg = '';

            if (user) {
                if (reward.freeType === 'chips') user.casinoChips = (user.casinoChips || 0) + reward.freeAmount;
                else if (reward.freeType === 'balance') user.balance = (user.balance || 0) + reward.freeAmount;
                else if (reward.freeType === 'limit') user.limit = (user.limit || 0) + reward.freeAmount;
                bonusMsg += `\n🆓 *Free:* ${reward.freeAmount.toLocaleString()} ${reward.freeType.toUpperCase()}`;

                if (playerPass.hasPremium) {
                    if (reward.premiumType === 'chips') user.casinoChips = (user.casinoChips || 0) + reward.premiumAmount;
                    else if (reward.premiumType === 'balance') user.balance = (user.balance || 0) + reward.premiumAmount;
                    else if (reward.premiumType === 'limit') user.limit = (user.limit || 0) + reward.premiumAmount;
                    bonusMsg += `\n💎 *VIP:* ${reward.premiumAmount.toLocaleString()} ${reward.premiumType.toUpperCase()}`;
                } else if (config.isEnabled) {
                    bonusMsg += `\n\n💡 _Upgrade ke VIP (.mbuypass) untuk juga dapat hadiah Premium sebesar **${reward.premiumAmount.toLocaleString()} ${reward.premiumType.toUpperCase()}**!_`;
                }

                await user.save();
            }

            if (!playerPass.claimedDates) playerPass.claimedDates = [];
            playerPass.claimedDates.push(todayStr);
            playerPass.currentDay = Math.max(playerPass.currentDay, currentGlobalDay);
            playerPass.lastClaimDate = todayStr;
            await playerPass.save();

            const specialLabel = reward.label ? `\n✨ *${reward.label}* ✨` : '';
            return reply(`⛏️ *Klaim Mining Pass Berhasil!* (Hari ke-${currentGlobalDay})${specialLabel}\n${bonusMsg}`);
        } catch (error) {
            console.error('Mining Pass command error:', error);
            reply(`❌ Terjadi kesalahan saat memproses Mining Pass.`);
        }
    }
};
