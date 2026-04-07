/**
 * .msell - Sell Mining Resources
 * Sell inventory items for Minecon
 */

const { PlayerMining, MiningConfig } = require('../../../../models');
const { getPetBonuses } = require('../../../utils/petHelper');
const { collectPending } = require('../../../utils/mineHelper');
const { trackQuestProgress, applyQuestRewards } = require('../../../utils/questHelper');

module.exports = {
    name: 'msell',
    description: 'Sell your mining resources for Minecon',
    category: 'games',
    usage: '.msell [item] / .msell all (jual paksa)',
    aliases: ['minesell'],

    execute: async ({ reply, sender, args, socket, message }) => {
        try {
            const phoneNumber = sender.replace('@s.whatsapp.net', '').replace('@c.us', '');
            const jid = message.key.remoteJid;
            const player = await PlayerMining.getPlayer(phoneNumber);
            const config = await MiningConfig.getConfig();

            // Sell price bonus from RP upgrades + pets
            const rebirthBonus = player.getRebirthBonuses();
            const petBonuses   = getPetBonuses(player);
            const sellBonusPct = Math.round((rebirthBonus.sellMultiplier - 1) * 100);

            // Global boosts
            const activeGlobal    = (config.globalBoosts || []).filter(b => new Date(b.expiresAt) > new Date());
            const globalSellMulti = activeGlobal.reduce((m, b) => m * (b.sellMultiplier || 1), 1);
            const globalBpMulti   = activeGlobal.reduce((m, b) => m * (b.bpMultiplier || 1), 1);

            // ── Auto-collect pending generator ore ────────────
            const pickaxe   = config.pickaxeLevels.find(p => p.level === (player.pickaxeLevel || 1)) || { dropMultiplier: 1 };
            const bpCapacity = Math.floor(
                (player.getBackpackCapacity(config) + petBonuses.bpFlat)
                * globalBpMulti
                * (1 + petBonuses.bpPercent / 100)
            );
            const pending = collectPending(player, config, rebirthBonus, petBonuses, pickaxe, activeGlobal);
            if (pending.sessions > 0) {
                player.addToInventoryWithCap(pending.drops, bpCapacity);
                player.lastCollect = pending.newLastCollect;
                player.stats.totalMined = (player.stats.totalMined || 0) + Object.values(pending.drops).reduce((s, v) => s + v, 0);
            }

            if (player.inventory.size === 0) {
                return socket.sendMessage(jid, {
                    text: `📦 Inventory kosong! Generator belum menghasilkan ore.\n_Tunggu lebih lama agar ore terkumpul lebih banyak!_`,
                    footer: 'Seana Mining',
                    buttons: [
                        { buttonId: '.mine',  buttonText: { displayText: '⛏️ CEK GENERATOR' } },
                        { buttonId: '.mining', buttonText: { displayText: '📊 DASHBOARD' } }
                    ]
                }, { quoted: message });
            }

            let sellTarget = args[0]?.toLowerCase() || 'smart';

            // If user types .msell all, treat it as force sell (sell everything)
            if (sellTarget === 'all') {
                sellTarget = 'force';
            }

            const isForce = sellTarget === 'force';
            const isSmart = sellTarget === 'smart';

            // For specific item sell, support multi-word names (e.g. "crystal shard")
            let specificItemName = null;
            if (!isForce && !isSmart) {
                specificItemName = args.join(' ').toLowerCase();
            }

            // Build protection map for next pickaxe
            const nextPickaxe = config.pickaxeLevels.find(p => p.level === player.pickaxeLevel + 1);
            const requiredMap = {};
            if (nextPickaxe && nextPickaxe.requiredItems && !isForce) {
                for (const req of nextPickaxe.requiredItems) {
                    requiredMap[req.name.toLowerCase()] = req.amount;
                }
            }

            let baseTotalEarned = 0;
            let soldItems = [];
            let protectedMsg = '';
            const soldTrack = {}; // resource.name → qty sold (for quest tracking)

            if (sellTarget === 'smart' || isForce) {
                // Smart Sell Everything
                const newInventory = new Map();
                let protectedCount = 0;

                for (const [item, qty] of player.inventory.entries()) {
                    const resource = config.resources.find(r => r.name.toLowerCase() === item.toLowerCase());
                    if (resource && qty > 0) {
                        const reqAmt = requiredMap[item.toLowerCase()] || 0;
                        let sellQty = qty;

                        // Protect required amount
                        if (reqAmt > 0) {
                            if (qty <= reqAmt) {
                                sellQty = 0;
                                newInventory.set(item, qty);
                                protectedCount++;
                            } else {
                                sellQty = qty - reqAmt;
                                newInventory.set(item, reqAmt);
                                protectedCount++;
                            }
                        }

                        if (sellQty > 0) {
                            const baseValue = resource.sellPrice * sellQty;
                            baseTotalEarned += baseValue;
                            const dispName = item.charAt(0).toUpperCase() + item.slice(1);
                            soldItems.push(`• ${dispName} x${sellQty} = 🪙${baseValue.toLocaleString()}`);
                            soldTrack[resource.name] = (soldTrack[resource.name] || 0) + sellQty;
                        }
                    }
                }
                player.inventory = newInventory;
                if (protectedCount > 0) protectedMsg = `\n🛡️ *(Bahan Upgrade Pickaxe Lv.${nextPickaxe.level} otomatis diamankan)*`;

            } else {
                // Sell specific item (supports multi-word names like "crystal shard")
                // Try exact match first, then partial match
                let resource = config.resources.find(r => r.name.toLowerCase() === specificItemName);
                if (!resource) {
                    resource = config.resources.find(r => r.name.toLowerCase().includes(specificItemName));
                }
                if (!resource) return reply(`❌ Resource *${specificItemName}* tidak dikenal.`);

                const itemKey = resource.name.toLowerCase();
                const qty = player.inventory.get(itemKey);
                if (!qty || qty <= 0) {
                    return reply(`❌ Kamu tidak punya *${resource.name}* di inventory.`);
                }

                const reqAmt = requiredMap[itemKey] || 0;
                let sellQty = qty;

                if (reqAmt > 0) {
                    if (qty <= reqAmt) {
                        return reply(`🛡️ Penjualan dibatalkan! Kamu butuh ${reqAmt} ${resource.name} untuk Upgrade.\n*(Gunakan .msell all untuk jual paksa seisi tas)*`);
                    } else {
                        sellQty = qty - reqAmt;
                        protectedMsg = `\n🛡️ *(Sisa ${reqAmt} ${resource.name} disimpan untuk Upgrade)*`;
                    }
                }

                const baseValue = resource.sellPrice * sellQty;
                baseTotalEarned += baseValue;
                const dispName = resource.name.charAt(0).toUpperCase() + resource.name.slice(1);
                soldItems.push(`• ${dispName} x${sellQty} = 🪙${baseValue.toLocaleString()}`);
                soldTrack[resource.name] = (soldTrack[resource.name] || 0) + sellQty;

                const remaining = qty - sellQty;
                if (remaining > 0) player.inventory.set(itemKey, remaining);
                else player.inventory.delete(itemKey);
            }

            if (baseTotalEarned === 0) {
                return reply(`❌ Tidak ada barang yang bisa dijual.${protectedMsg}`);
            }

            const petSellMult      = 1 + (petBonuses.sellPercent / 100);
            const afterRpBonus     = Math.floor(baseTotalEarned * rebirthBonus.sellMultiplier);
            const finalTotalEarned = Math.floor(afterRpBonus * globalSellMulti * petSellMult);
            const petSellBonusPct  = Math.round(petBonuses.sellPercent * 10) / 10;

            // Update player stats & Minecon
            const totalOreSold = Object.values(soldTrack).reduce((s, v) => s + v, 0);
            player.minecon += finalTotalEarned;
            player.stats.totalSold = (player.stats.totalSold || 0) + totalOreSold;
            player.stats.totalEarned += finalTotalEarned;

            // Quest tracking — sell_ore per resource
            let questNotif = '';
            const allCompleted = [];
            for (const [resName, qty] of Object.entries(soldTrack)) {
                const done = trackQuestProgress(player, 'sell_ore', resName, qty);
                allCompleted.push(...done);
            }
            if (allCompleted.length > 0) {
                const reward = applyQuestRewards(player, allCompleted);
                questNotif = `\n\n✅ *Quest Selesai!* (${allCompleted.length}x)\n${reward}`;
            }

            await player.save();

            const bonusLines = [
                sellBonusPct > 0    ? `✨ *Bonus Merchant:* +${sellBonusPct}%` : '',
                petSellBonusPct > 0 ? `🐾 *Bonus Pet:* +${petSellBonusPct}%` : '',
                globalSellMulti > 1 ? `💰 *Global Sell Boost:* ×${globalSellMulti}` : ''
            ].filter(Boolean);

            const remainingInv = player.inventory.size;
            const sellText = `
🪙 *SOLD!* 🪙
━━━━━━━━━━━━━━━
${soldItems.join('\n')}

━━━━━━━━━━━━━━━
⛏️ *Total Ore Terjual:* ${totalOreSold.toLocaleString()} ore
🪙 *Total Dasar:* ${baseTotalEarned.toLocaleString()} MC
${bonusLines.length > 0 ? bonusLines.join('\n') + '\n' : ''}━━━━━━━━━━━━━━━
💰 *Total Didapat:* +${finalTotalEarned.toLocaleString()} MC
🪙 *Saldo:* ${player.minecon.toLocaleString()} MC${protectedMsg}${questNotif}
            `.trim();

            const buttons = remainingInv > 0
                ? [
                    { buttonId: '.msell',    buttonText: { displayText: '💰 JUAL SEMUA' } },
                    { buttonId: '.mine',     buttonText: { displayText: '⛏️ MINE LAGI' } },
                    { buttonId: '.mpick',    buttonText: { displayText: '⛏️ UPGRADE PICK' } }
                ]
                : [
                    { buttonId: '.mine',     buttonText: { displayText: '⛏️ MINE LAGI' } },
                    { buttonId: '.mpick',    buttonText: { displayText: '⛏️ UPGRADE PICK' } },
                    { buttonId: '.mpack',    buttonText: { displayText: '📦 UPGRADE BP' } }
                ];

            await socket.sendMessage(jid, {
                text: sellText,
                footer: 'Seana Mining',
                buttons
            }, { quoted: message });

        } catch (error) {
            console.error('Sell error:', error);
            await reply('❌ Gagal menjual. Coba lagi.');
        }
    }
};
