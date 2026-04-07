/**
 * .mpt - Mining Patungan (Boost Pool)
 * Crowdfund global boosts together
 */

const { PlayerMining, MiningConfig } = require('../../../../models');

const POOL_DURATION_MINUTES = 30; // Pool expires after 30 minutes
const MIN_CONTRIBUTION = 5;       // Minimum gems per contribution
const GUILD_XP_PER_GEM = 1;       // Guild XP reward per gem contributed
const ACTIVATOR_BONUS_XP = 35;    // Bonus Guild XP for starting the pool

module.exports = {
    name: 'mpt',
    description: 'Patungan global boost bersama',
    category: 'games',
    usage: '.mpt [start <boost_id> <amount> | join <amount> | info | cancel]',
    aliases: ['mpool', 'patungan'],

    execute: async ({ reply, sender, args }) => {
        try {
            const phoneNumber = sender.replace('@s.whatsapp.net', '').replace('@c.us', '');
            const player = await PlayerMining.getPlayer(phoneNumber);
            const config = await MiningConfig.getConfig();

            // Check guild membership
            if (!player.guild?.joined) {
                return reply('❌ Kamu harus tergabung dalam *Seana Miner Guild* untuk menggunakan fitur Patungan!\n\nKetik *.mreg* untuk mendaftar.');
            }

            const action = args[0]?.toLowerCase();

            // === CLEANUP: Check if active pool is expired ===
            if (config.activePool?.active && config.activePool.status === 'active') {
                if (new Date() > new Date(config.activePool.expiresAt)) {
                    // Pool expired — refund all contributors
                    for (const contrib of config.activePool.contributors) {
                        const contributor = await PlayerMining.getPlayer(contrib.phoneNumber);
                        contributor.gems += contrib.amount;
                        await contributor.save();
                    }
                    config.activePool.active = false;
                    config.activePool.status = 'expired';
                    await config.save();
                }
            }

            // === COMMAND: .mpt start <boost_id> <amount> ===
            if (action === 'start') {
                const boostId = args[1]?.toLowerCase();
                const initialAmount = parseInt(args[2]) || 0;

                if (!boostId) {
                    // Show available global boosts
                    const globalItems = (config.shopItems || []).filter(i => i.isGlobal);
                    if (globalItems.length === 0) return reply('❌ Tidak ada Global Boost yang tersedia.');

                    let listMsg = `🤝 *PATUNGAN BOOST*\n━━━━━━━━━━━━━━━━━━━━\n\n`;
                    listMsg += `*Boost yang tersedia:*\n`;
                    for (const item of globalItems) {
                        listMsg += `├ ${item.emoji} *${item.name}* (ID: \`${item.id}\`)\n`;
                        listMsg += `│  └ 💎${item.price} Gems — ${item.description}\n`;
                    }
                    listMsg += `\n📝 Mulai: *.mpt start <id> <gems>*`;
                    listMsg += `\nContoh: *.mpt start party2 30*`;
                    return reply(listMsg);
                }

                // Check if pool already active
                if (config.activePool?.active && config.activePool.status === 'active') {
                    return reply('❌ Sudah ada Patungan aktif! Ketik *.mpt info* untuk melihat detailnya.\n\nTunggu sampai selesai atau minta pembuat membatalkannya.');
                }

                // Find boost item in shop
                const shopItem = config.shopItems.find(i => i.id === boostId && i.isGlobal);
                if (!shopItem) {
                    return reply(`❌ Boost *${boostId}* tidak ditemukan atau bukan Global Boost.\n\nKetik *.mpt start* untuk lihat daftar.`);
                }

                if (initialAmount < MIN_CONTRIBUTION) {
                    return reply(`❌ Kontribusi minimum *${MIN_CONTRIBUTION} Gems*. Kamu harus menyertakan setoran awal.\n\nContoh: *.mpt start ${boostId} ${MIN_CONTRIBUTION}*`);
                }

                if (player.gems < initialAmount) {
                    return reply(`❌ 💎 Gems tidak cukup! Kamu punya *${player.gems}*, mau setor *${initialAmount}*.`);
                }

                // Deduct gems from starter
                player.gems -= initialAmount;
                player.stats.totalBoostDonated = (player.stats.totalBoostDonated || 0) + initialAmount;

                // Create pool
                const now = new Date();
                const expiresAt = new Date(now.getTime() + POOL_DURATION_MINUTES * 60 * 1000);

                config.activePool = {
                    active: true,
                    boostId: shopItem.id,
                    boostName: shopItem.name,
                    targetGems: shopItem.price,
                    collectedGems: initialAmount,
                    contributors: [{ phoneNumber, amount: initialAmount }],
                    startedBy: phoneNumber,
                    startedAt: now,
                    expiresAt,
                    status: 'active'
                };

                // Check if fully funded already
                if (initialAmount >= shopItem.price) {
                    return await activatePool(config, shopItem, player, phoneNumber, reply);
                }

                await config.save();
                await player.save();

                const remaining = shopItem.price - initialAmount;
                const minsLeft = Math.ceil((expiresAt - now) / 60000);

                return reply(`
🤝 *PATUNGAN DIMULAI!* 🤝
━━━━━━━━━━━━━━━━━━━━

${shopItem.emoji} *${shopItem.name}*
${shopItem.description}

💎 *Target:* ${shopItem.price} Gems
├ 🟢 Terkumpul: ${initialAmount} Gems
└ 🔴 Kurang: ${remaining} Gems

📊 *Progress:* ${Math.round((initialAmount / shopItem.price) * 100)}%
${'█'.repeat(Math.floor((initialAmount / shopItem.price) * 10))}${'░'.repeat(10 - Math.floor((initialAmount / shopItem.price) * 10))}

⏱️ Batas waktu: *${minsLeft} menit*

📢 Ayo bergabung patungan!
> *.mpt join <jumlah>* untuk kontribusi
                `.trim());
            }

            // === COMMAND: .mpt join <amount> ===
            if (action === 'join') {
                if (!config.activePool?.active || config.activePool.status !== 'active') {
                    return reply('❌ Tidak ada Patungan aktif saat ini.\n\nKetik *.mpt start <boost_id> <gems>* untuk memulai!');
                }

                const amount = parseInt(args[1]);
                if (!amount || amount < MIN_CONTRIBUTION) {
                    return reply(`❌ Kontribusi minimum *${MIN_CONTRIBUTION} Gems*.\n\nContoh: *.mpt join 20*`);
                }

                if (player.gems < amount) {
                    return reply(`❌ 💎 Gems tidak cukup! Kamu punya *${player.gems}*, mau setor *${amount}*.`);
                }

                // Cap contribution to remaining amount
                const remaining = config.activePool.targetGems - config.activePool.collectedGems;
                const actualAmount = Math.min(amount, remaining);

                // Deduct gems
                player.gems -= actualAmount;
                player.stats.totalBoostDonated = (player.stats.totalBoostDonated || 0) + actualAmount;

                // Add or update contribution
                const existingContrib = config.activePool.contributors.find(c => c.phoneNumber === phoneNumber);
                if (existingContrib) {
                    existingContrib.amount += actualAmount;
                } else {
                    config.activePool.contributors.push({ phoneNumber, amount: actualAmount });
                }
                config.activePool.collectedGems += actualAmount;

                // Check if pool is now fully funded
                const shopItem = config.shopItems.find(i => i.id === config.activePool.boostId && i.isGlobal);
                if (config.activePool.collectedGems >= config.activePool.targetGems) {
                    return await activatePool(config, shopItem, player, phoneNumber, reply);
                }

                await config.save();
                await player.save();

                const newRemaining = config.activePool.targetGems - config.activePool.collectedGems;
                const progress = Math.round((config.activePool.collectedGems / config.activePool.targetGems) * 100);

                return reply(`
✅ *KONTRIBUSI DITERIMA!*
━━━━━━━━━━━━━━━━━━━━

💎 Kamu menyetor *${actualAmount} Gems*
${amount > actualAmount ? `_(Dibatasi sisa kebutuhan, ${amount - actualAmount} gems dikembalikan)_\n` : ''}
📊 *Progress:* ${config.activePool.collectedGems}/${config.activePool.targetGems} Gems (${progress}%)
${'█'.repeat(Math.floor(progress / 10))}${'░'.repeat(10 - Math.floor(progress / 10))}

🔴 Kurang: ${newRemaining} Gems lagi!
👥 Total Kontributor: ${config.activePool.contributors.length} orang
                `.trim());
            }

            // === COMMAND: .mpt info ===
            if (action === 'info' || !action) {
                if (!config.activePool?.active || config.activePool.status !== 'active') {
                    // Show last pool info or no pool
                    let msg = `🤝 *PATUNGAN BOOST*\n━━━━━━━━━━━━━━━━━━━━\n\n`;
                    msg += `Tidak ada Patungan aktif saat ini.\n\n`;
                    msg += `📝 Mulai baru: *.mpt start*\n`;
                    msg += `📊 Stats kamu: 💎 Total Donated: ${(player.stats.totalBoostDonated || 0).toLocaleString()} Gems`;
                    return reply(msg);
                }

                const pool = config.activePool;
                const progress = Math.round((pool.collectedGems / pool.targetGems) * 100);
                const minsLeft = Math.max(0, Math.ceil((new Date(pool.expiresAt) - new Date()) / 60000));

                let contribList = '';
                for (const c of pool.contributors) {
                    const maskedPhone = c.phoneNumber.slice(0, 4) + '***' + c.phoneNumber.slice(-3);
                    const isStarter = c.phoneNumber === pool.startedBy ? ' 👑' : '';
                    contribList += `├ ${maskedPhone}${isStarter}: 💎${c.amount}\n`;
                }

                return reply(`
🤝 *PATUNGAN AKTIF*
━━━━━━━━━━━━━━━━━━━━

🎯 *${pool.boostName}*

📊 *Progress:* ${pool.collectedGems}/${pool.targetGems} Gems (${progress}%)
${'█'.repeat(Math.floor(progress / 10))}${'░'.repeat(10 - Math.floor(progress / 10))}

👥 *Kontributor (${pool.contributors.length}):*
${contribList}
⏱️ Sisa waktu: *${minsLeft} menit*

📝 Bergabung: *.mpt join <jumlah>*
                `.trim());
            }

            // === COMMAND: .mpt cancel ===
            if (action === 'cancel') {
                if (!config.activePool?.active || config.activePool.status !== 'active') {
                    return reply('❌ Tidak ada Patungan aktif untuk dibatalkan.');
                }

                // Only starter or admin can cancel
                if (config.activePool.startedBy !== phoneNumber) {
                    return reply('❌ Hanya pembuat Patungan yang bisa membatalkannya!');
                }

                // Refund all contributors
                let refundMsg = '💸 *REFUND:*\n';
                for (const contrib of config.activePool.contributors) {
                    const contributor = await PlayerMining.getPlayer(contrib.phoneNumber);
                    contributor.gems += contrib.amount;
                    contributor.stats.totalBoostDonated = Math.max(0, (contributor.stats.totalBoostDonated || 0) - contrib.amount);
                    await contributor.save();
                    const maskedPhone = contrib.phoneNumber.slice(0, 4) + '***' + contrib.phoneNumber.slice(-3);
                    refundMsg += `├ ${maskedPhone}: +💎${contrib.amount}\n`;
                }

                config.activePool.active = false;
                config.activePool.status = 'cancelled';
                await config.save();

                return reply(`
❌ *PATUNGAN DIBATALKAN*
━━━━━━━━━━━━━━━━━━━━

Patungan untuk *${config.activePool.boostName}* telah dibatalkan.

${refundMsg}
Semua Gems telah dikembalikan ke pemiliknya.
                `.trim());
            }

            return reply(`
🤝 *PATUNGAN BOOST*
━━━━━━━━━━━━━━━━━━━━

*Perintah:*
> *.mpt start <id> <gems>* - Mulai patungan baru
> *.mpt join <jumlah>* - Ikut kontribusi
> *.mpt info* - Lihat status patungan
> *.mpt cancel* - Batalkan (hanya pembuat)
            `.trim());

        } catch (error) {
            console.error('MPT error:', error);
            await reply('❌ Gagal memproses patungan. Coba lagi.');
        }
    }
};

/**
 * Activate the boost pool — called when target gems are met
 */
async function activatePool(config, shopItem, lastContributor, lastContribPhone, reply) {
    const pool = config.activePool;

    // Activate the global boost
    const expiresAt = new Date(Date.now() + shopItem.durationMinutes * 60 * 1000);

    // Remove existing boost of same type
    config.globalBoosts = config.globalBoosts.filter(b => b.type !== shopItem.boostType);

    config.globalBoosts.push({
        type: shopItem.boostType,
        dropMultiplier: shopItem.multiplier,
        xpMultiplier: shopItem.boostType === 'party' ? shopItem.multiplier : 1,
        expiresAt,
        activatedBy: pool.startedBy,
        contributors: pool.contributors
    });

    // Mark pool as completed
    pool.active = false;
    pool.status = 'completed';

    // Give rewards to all contributors
    let rewardMsg = '🏅 *REWARDS:*\n';
    for (const contrib of pool.contributors) {
        const contributor = await PlayerMining.getPlayer(contrib.phoneNumber);
        
        // Guild XP reward based on contribution
        const guildXp = Math.floor(contrib.amount * GUILD_XP_PER_GEM);
        const isStarter = contrib.phoneNumber === pool.startedBy;
        const bonusXp = isStarter ? ACTIVATOR_BONUS_XP : 0;
        const totalXp = guildXp + bonusXp;
        
        if (contributor.quest) contributor.quest.xp = (contributor.quest.xp || 0) + totalXp;
        contributor.stats.boostsActivated = (contributor.stats.boostsActivated || 0) + 1;
        await contributor.save();
        
        const maskedPhone = contrib.phoneNumber.slice(0, 4) + '***' + contrib.phoneNumber.slice(-3);
        const starterBadge = isStarter ? ' 👑' : '';
        rewardMsg += `├ ${maskedPhone}${starterBadge}: 💎${contrib.amount} → +${totalXp} Guild XP${bonusXp > 0 ? ' (🌟bonus)' : ''}\n`;
    }

    await config.save();
    await lastContributor.save();

    return reply(`
🎉 *PATUNGAN BERHASIL!* 🎉
━━━━━━━━━━━━━━━━━━━━

${shopItem.emoji} *${shopItem.name}* AKTIF!

📢 Semua pemain mendapat:
├ +${Math.round((shopItem.multiplier - 1) * 100)}% Drop Rate
└ +${Math.round((shopItem.multiplier - 1) * 100)}% XP Bonus

⏱️ Berlaku selama *${shopItem.durationMinutes} menit*

${rewardMsg}
👥 ${pool.contributors.length} orang bergotong-royong! 💖
    `.trim());
}
