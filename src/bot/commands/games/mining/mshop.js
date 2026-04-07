/**
 * .mshop - Mining Shop (Global Boosters)
 * .mshop          → list semua item bernomor
 * .mshop buy <nomor|id> → beli item
 */

const { PlayerMining, MiningConfig } = require('../../../../models');
const { getPetBonuses } = require('../../../utils/petHelper');

function minutesLeft(expiresAt) {
    return Math.max(0, Math.ceil((new Date(expiresAt) - Date.now()) / 60000));
}

function boostLabel(boostType) {
    if (boostType === 'speed')      return { emoji: '⚡', label: 'Mining Speed' };
    if (boostType === 'sell_price') return { emoji: '💰', label: 'Harga Jual' };
    if (boostType === 'backpack')   return { emoji: '📦', label: 'Kapasitas BP' };
    if (boostType === 'drop')       return { emoji: '🎲', label: 'Drop Rate' };
    return { emoji: '🌟', label: boostType };
}

module.exports = {
    name: 'mshop',
    description: 'View and buy global mining boosters',
    category: 'games',
    usage: '.mshop | .mshop buy <nomor>',
    aliases: ['mineshop'],

    execute: async ({ reply, sender, args, socket, message }) => {
        try {
            const phoneNumber = sender.replace('@s.whatsapp.net', '').replace('@c.us', '');
            const player = await PlayerMining.getPlayer(phoneNumber);
            const config  = await MiningConfig.getConfig();
            const jid     = message.key.remoteJid;

            const shopItems = config.shopItems || [];
            const action    = args[0]?.toLowerCase();
            const raw       = args[1];

            // ─── BUY ─────────────────────────────────────────────
            if (action === 'buy' && raw) {
                // Resolve by number (1-based) or by id
                let shopItem;
                const asNum = parseInt(raw);
                if (!isNaN(asNum) && asNum >= 1 && asNum <= shopItems.length) {
                    shopItem = shopItems[asNum - 1];
                } else {
                    shopItem = shopItems.find(i => i.id === raw.toLowerCase());
                }
                if (!shopItem) {
                    return socket.sendMessage(jid, {
                        text: `❌ Item "${raw}" tidak ditemukan.\nKetik *.mshop* untuk lihat daftar.`,
                        footer: 'Seana Mining',
                        buttons: [{ buttonId: '.mshop', buttonText: { displayText: '🛒 Lihat Shop' } }]
                    }, { quoted: message });
                }

                const currency  = shopItem.currency || 'gems';
                const playerBal = currency === 'gems' ? player.gems : player.minecon;
                const curEmoji  = currency === 'gems' ? '💎' : '🪙';

                if (playerBal < shopItem.price) {
                    return socket.sendMessage(jid, {
                        text: `❌ ${curEmoji} Tidak cukup!\nButuh: *${shopItem.price} gems*\nKamu punya: *${playerBal} gems*`,
                        footer: 'Seana Mining',
                        buttons: [
                            { buttonId: '.mshop',  buttonText: { displayText: '🛒 Lihat Shop' } },
                            { buttonId: '.mining', buttonText: { displayText: '📊 Dashboard' } }
                        ]
                    }, { quoted: message });
                }

                // Deduct
                if (currency === 'gems') player.gems   -= shopItem.price;
                else                     player.minecon -= shopItem.price;

                // Apply global boost — remove existing same type first
                const petBonuses    = getPetBonuses(player);
                const durationBonus = 1 + (petBonuses.boostDurationPct || 0) / 100;
                const finalMinutes  = Math.round(shopItem.durationMinutes * durationBonus);
                const expiresAt     = new Date(Date.now() + finalMinutes * 60 * 1000);
                config.globalBoosts = (config.globalBoosts || []).filter(
                    b => new Date(b.expiresAt) > new Date() && b.type !== shopItem.boostType
                );
                config.globalBoosts.push({
                    type:           shopItem.boostType,
                    dropMultiplier:  shopItem.boostType === 'drop'       ? shopItem.multiplier : 1,
                    speedMultiplier: shopItem.boostType === 'speed'      ? shopItem.multiplier : 1,
                    sellMultiplier:  shopItem.boostType === 'sell_price' ? shopItem.multiplier : 1,
                    bpMultiplier:    shopItem.boostType === 'backpack'   ? shopItem.multiplier : 1,
                    expiresAt,
                    activatedBy:  phoneNumber,
                    contributors: [{ phoneNumber, amount: shopItem.price }]
                });

                // Guild XP
                const guildXp = 150;
                if (player.guild?.joined) player.guild.xp = (player.guild.xp || 0) + guildXp;

                // Minecon cashback (300 MC per gem)
                let cashbackMsg = '';
                if (currency === 'gems') {
                    const cashback = Math.floor(shopItem.price * 300);
                    player.minecon = (player.minecon || 0) + cashback;
                    cashbackMsg = `├ 🪙 +${cashback.toLocaleString()} Minecon Cashback\n`;
                }

                player.stats.boostsActivated  = (player.stats.boostsActivated  || 0) + 1;
                player.stats.totalBoostDonated = (player.stats.totalBoostDonated || 0) + shopItem.price;

                await config.save();
                await player.save();

                const { emoji: bEmoji, label: bLabel } = boostLabel(shopItem.boostType);
                const maskedPhone = phoneNumber.slice(0, 4) + '***' + phoneNumber.slice(-3);
                const itemIndex   = shopItems.findIndex(i => i.id === shopItem.id) + 1;

                return socket.sendMessage(jid, {
                    text: `
🎉 *GLOBAL BOOST AKTIF!* 🎉
━━━━━━━━━━━━━━━━━━━━

${shopItem.emoji} *${shopItem.name}*
📢 Disponsori oleh *${maskedPhone}* 💖

📢 Semua pemain mendapat:
└ ${bEmoji} *${shopItem.multiplier}×* ${bLabel} selama *${finalMinutes} menit*${durationBonus > 1 ? ` _(+${Math.round((durationBonus-1)*100)}% Giant bonus!)_` : ``}

🏅 *Reward Sponsor:*
├ ⭐ +${guildXp} Guild XP
${cashbackMsg}└ 🌟 +20% Bonus Personal selama boost aktif!

${curEmoji} Sisa: *${(currency === 'gems' ? player.gems : player.minecon).toLocaleString()}* gems

Terima kasih sudah boost server! 💖
                    `.trim(),
                    footer: 'Seana Mining',
                    buttons: [
                        { buttonId: `.mshop buy ${itemIndex}`, buttonText: { displayText: `${shopItem.emoji} Beli Lagi` } },
                        { buttonId: '.mshop',                  buttonText: { displayText: '🛒 Lihat Shop' } },
                        { buttonId: '.mine',                   buttonText: { displayText: '⛏️ Mine Sekarang' } }
                    ]
                }, { quoted: message });
            }

            // ─── SHOW SHOP ────────────────────────────────────────
            // Active boost status
            const activeBoosts = (config.globalBoosts || []).filter(b => new Date(b.expiresAt) > new Date());
            let activeBoostText = '';
            if (activeBoosts.length > 0) {
                activeBoostText = '\n🔥 *Boost Aktif Sekarang:*\n'
                    + activeBoosts.map(b => {
                        const { emoji: bEmoji, label: bLabel } = boostLabel(b.type);
                        const multi = b.speedMultiplier > 1 ? b.speedMultiplier
                                    : b.sellMultiplier  > 1 ? b.sellMultiplier
                                    : b.bpMultiplier    > 1 ? b.bpMultiplier
                                    : b.dropMultiplier  > 1 ? b.dropMultiplier : 1;
                        return `${bEmoji} ${bLabel} ×${multi} — ⏳ ${minutesLeft(b.expiresAt)} mnt lagi`;
                    }).join('\n')
                    + '\n\n━━━━━━━━━━━━━━━━━━━━';
            }

            // Build item list with numbers
            let itemsText;
            if (shopItems.length === 0) {
                itemsText = '🚧 *Shop sedang kosong.*\nItem belum tersedia saat ini.';
            } else {
                itemsText = shopItems.map((item, i) => {
                    const cur      = item.currency === 'gems' ? '💎' : '🪙';
                    const canBuy   = (item.currency === 'gems' ? player.gems : player.minecon) >= item.price;
                    const status   = canBuy ? '✅' : '❌';
                    return `*[${i + 1}] ${item.emoji} ${item.name}* — ${cur}${item.price}\n    ├ ${item.description}\n    └ ${status} _.mshop buy ${i + 1}_`;
                }).join('\n\n');
            }

            let msg = `🛒 *MINING SHOP* 🛒
━━━━━━━━━━━━━━━━━━━━

💰 *Saldo Kamu:*
├ 🪙 Minecon : ${(player.minecon || 0).toLocaleString()} MC
└ 💎 Gems    : ${(player.gems || 0).toLocaleString()}

━━━━━━━━━━━━━━━━━━━━${activeBoostText}

${itemsText}

━━━━━━━━━━━━━━━━━━━━
_Ketik *.mshop buy <nomor>* untuk beli_
_Contoh: *.mshop buy 1*_`.trim();

            // Buttons: first 3 items (max 3 buttons)
            const buttons = shopItems.length === 0
                ? [
                    { buttonId: '.mine',   buttonText: { displayText: '⛏️ Mine' } },
                    { buttonId: '.mining', buttonText: { displayText: '📊 Dashboard' } }
                  ]
                : shopItems.slice(0, 3).map((item, i) => ({
                    buttonId: `.mshop buy ${i + 1}`,
                    buttonText: { displayText: `${item.emoji} Beli #${i + 1}` }
                  }));

            return socket.sendMessage(jid, {
                text: msg,
                footer: 'Seana Mining',
                buttons
            }, { quoted: message });

        } catch (error) {
            console.error('Shop error:', error);
            await reply('❌ Gagal memuat shop. Coba lagi.');
        }
    }
};
