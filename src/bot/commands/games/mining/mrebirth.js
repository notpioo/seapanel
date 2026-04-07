/**
 * .mrebirth - Rebirth Command
 * Reset progress and earn +1 permanent Rebirth Point
 */

const { PlayerMining, MiningConfig } = require('../../../../models');

if (!global.rebirthConfirmations) {
    global.rebirthConfirmations = new Map();
}

// Next location unlock message — dynamic from config.locations
function getNextLocationMsg(currentRebirth, configLocations) {
    const locs = (configLocations || [])
        .slice()
        .sort((a, b) => a.minRebirth - b.minRebirth)
        .filter(l => l.minRebirth > currentRebirth);
    if (locs.length === 0) {
        return `🌟 *Kamu sudah di zona tertinggi: The Absolute!*`;
    }
    const next = locs[0];
    const needed = next.minRebirth - currentRebirth;
    return `🗺️ *${needed} rebirth lagi* untuk unlock ${next.emoji} ${next.name} (R${next.minRebirth})!`;
}

function getNextTierMsg(currentRebirth) {
    const tiers = [
        { at: 1,    label: 'Bronze R1',      emoji: '🟤' },
        { at: 5,    label: 'Silver R5',       emoji: '⚪' },
        { at: 10,   label: 'Gold R10',        emoji: '🟡' },
        { at: 25,   label: 'Platinum R25',    emoji: '🔵' },
        { at: 50,   label: 'Diamond R50',     emoji: '💎' },
        { at: 100,  label: 'Mythril R100',    emoji: '🟣' },
        { at: 250,  label: 'Void R250',       emoji: '🌑' },
        { at: 500,  label: 'God R500',        emoji: '👑' },
        { at: 750,  label: 'Transcendent R750',emoji: '✨' },
        { at: 1000, label: 'Celestial R1000', emoji: '🌌' },
        { at: 1500, label: 'Omnipotent R1500',emoji: '⚡' },
        { at: 1800, label: 'Absolute R1800',  emoji: '🌟' }
    ];
    for (const t of tiers) {
        if (currentRebirth < t.at) {
            const needed = t.at - currentRebirth;
            return `🎯 *${needed} rebirth lagi* untuk tier ${t.emoji} ${t.label}!`;
        }
    }
    return `🌟 *Kamu sudah mencapai tier tertinggi: ABSOLUTE!*`;
}

module.exports = {
    name: 'mrebirth',
    description: 'Rebirth — reset dan dapatkan +1 Rebirth Point permanen',
    category: 'games',
    usage: '.mrebirth | .mrebirth confirm',

    execute: async ({ reply, sender, args, socket, message }) => {
        const phoneNumber = sender.replace('@s.whatsapp.net', '').replace('@c.us', '');
        const jid = message.key.remoteJid;

        try {
            const player = await PlayerMining.getPlayer(phoneNumber);
            const config  = await MiningConfig.getConfig();

            const minPickaxe = config.rebirthConfig?.minPickaxe || 200;
            const minBP      = config.rebirthConfig?.minBP || 200;
            const isConfirm  = args?.[0]?.toLowerCase() === 'confirm';

            // ─────────────────────────────────────────────────
            // CONFIRM — execute rebirth
            // ─────────────────────────────────────────────────
            if (isConfirm) {
                const confirmData = global.rebirthConfirmations.get(phoneNumber);
                if (!confirmData || Date.now() - confirmData.timestamp > 60000) {
                    global.rebirthConfirmations.delete(phoneNumber);
                    return reply('❌ Konfirmasi expired. Ketik _.mrebirth_ lagi untuk mulai proses rebirth.');
                }

                if ((player.pickaxeLevel || 1) < minPickaxe || (player.backpackLevel || 1) < minBP) {
                    global.rebirthConfirmations.delete(phoneNumber);
                    const missing = [];
                    if ((player.pickaxeLevel || 1) < minPickaxe) missing.push(`Pickaxe Lv.${minPickaxe}`);
                    if ((player.backpackLevel || 1) < minBP) missing.push(`BP Lv.${minBP}`);
                    return reply(`❌ Syarat tidak terpenuhi lagi: ${missing.join(' & ')} dibutuhkan.`);
                }

                const newRebirthCount = (player.rebirthCount || 0) + 1;

                // ── RESET (full) ──────────────────────────────
                const bonuses      = player.getRebirthBonuses();
                const headStart    = bonuses.headStartLevel || 0;
                const extraRp      = bonuses.extraRpPerRebirth || 0;

                player.pickaxeLevel  = Math.min(1 + headStart, config.pickaxeConfig?.maxLevel || 250);
                player.backpackLevel = Math.min(1 + headStart, config.bpConfig?.maxLevel || 250);
                player.minecon       = 0;
                player.inventory     = new Map();
                player.lastMineTime  = null;
                player.activeBoosts  = [];

                // Reset quest progress on rebirth
                if (player.quest) {
                    player.quest.rank             = 'F';
                    player.quest.xp               = 0;
                    player.quest.activeQuests     = [];
                    player.quest.completedTotal   = 0;
                    player.quest.lastQuestRefresh = null;
                    player.markModified('quest');
                }
                // Reset guild progress (keep joined flag)
                if (player.guild?.joined) {
                    player.guild.rank            = 'F';
                    player.guild.xp              = 0;
                    player.guild.activeQuests    = [];
                    player.guild.completedQuests = 0;
                    player.guild.lastQuestRefresh = null;
                }

                // ── PERMANENT GAINS ───────────────────────────
                player.rebirthCount  = newRebirthCount;
                player.rebirthPoints = (player.rebirthPoints || 0) + 1 + extraRp;
                // gems & rpUpgrades untouched

                global.rebirthConfirmations.delete(phoneNumber);
                await player.save();

                const tier     = player.getRebirthTier();
                const location = player.getLocation(config);

                const rpGained = 1 + extraRp;
                return reply(`🔄 *REBIRTH BERHASIL!* 🔄
━━━━━━━━━━━━━━━━━━━━

${tier.emoji} Kamu sekarang *${tier.label} R${newRebirthCount}*!

*Bonus Permanen:*
┌ +${rpGained} RP didapat${extraRp > 0 ? ` (+${extraRp} dari Rebirth Mastery)` : ''}
└ Total RP: ${player.rebirthPoints.toLocaleString()} RP

*Semua direset:*
├ Pickaxe → Lv.${player.pickaxeLevel}${headStart > 0 ? ` (Head Start +${headStart})` : ''}
├ Backpack → Lv.${player.backpackLevel}${headStart > 0 ? ` (Head Start +${headStart})` : ''}
├ Minecon → 0
└ Inventory dikosongkan

*Yang TIDAK direset:*
✅ Gems
✅ Semua RP & upgrade tree
✅ Rebirth count & tier

*Lokasi mining sekarang:*
${location.emoji} *${location.name}* (R${newRebirthCount}+)

Gunakan _.mrp_ untuk belanja upgrade permanen!`.trim());
            }

            // ─────────────────────────────────────────────────
            // INFO — show rebirth panel
            // ─────────────────────────────────────────────────
            const meetsPickaxe = (player.pickaxeLevel || 1) >= minPickaxe;
            const meetsBP      = (player.backpackLevel || 1) >= minBP;
            const meetsAll     = meetsPickaxe && meetsBP;
            const tierInfo     = player.getRebirthTier();

            let msg = `🔄 *REBIRTH INFO* 🔄
━━━━━━━━━━━━━━━━━━━━

${tierInfo.emoji} Status: *${tierInfo.label} R${player.rebirthCount || 0}*
💎 Total RP: *${(player.rebirthPoints || 0).toLocaleString()} RP*

*Syarat Rebirth:*
${meetsPickaxe ? '✅' : '❌'} Pickaxe: Lv.${player.pickaxeLevel || 1} / ${minPickaxe} (${meetsPickaxe ? 'OK' : 'kurang'})
${meetsBP ? '✅' : '❌'} Backpack: Lv.${player.backpackLevel || 1} / ${minBP} (${meetsBP ? 'OK' : 'kurang'})`.trim();

            let buttons = [];

            if (meetsAll) {
                global.rebirthConfirmations.set(phoneNumber, { timestamp: Date.now() });

                // Check next location unlock — dynamically from config
                const sortedLocs = (config.locations || [])
                    .slice()
                    .sort((a, b) => a.minRebirth - b.minRebirth)
                    .filter(l => l.minRebirth > (player.rebirthCount || 0));
                let locUnlockMsg = '';
                if (sortedLocs.length > 0) {
                    const nextLoc = sortedLocs[0];
                    locUnlockMsg = `\n🗺️ R${nextLoc.minRebirth} → Unlock ${nextLoc.emoji} ${nextLoc.name}!`;
                }

                msg += `\n\n*Preview Rebirth:*`;
                msg += `\n┌ +1 RP yang akan didapat`;
                msg += `\n├ Pickaxe, BP, Minecon, Inventory → reset`;
                msg += `\n└ Gems & RP tree tetap aman`;
                msg += locUnlockMsg;
                msg += `\n\n${getNextTierMsg(player.rebirthCount || 0)}`;
                msg += `\n\n⚠️ Tekan tombol di bawah untuk konfirmasi (valid 60 detik)!`;

                buttons = [
                    { buttonId: '.mrebirth confirm', buttonText: { displayText: '🔄 REBIRTH SEKARANG' } },
                    { buttonId: '.mstats',           buttonText: { displayText: '📊 STATS' } }
                ];
            } else {
                msg += `\n\n❌ Belum memenuhi semua syarat rebirth.`;
                if (!meetsPickaxe) msg += `\n⛏️ Upgrade Pickaxe ke Lv.${minPickaxe} dulu!`;
                if (!meetsBP) msg += `\n📦 Upgrade Backpack ke Lv.${minBP} dulu!`;
                msg += `\n\n${getNextLocationMsg(player.rebirthCount || 0, config.locations)}`;
                msg += `\n${getNextTierMsg(player.rebirthCount || 0)}`;

                if (!meetsPickaxe && !meetsBP) {
                    buttons = [
                        { buttonId: '.mpick', buttonText: { displayText: '⛏️ Upgrade Pickaxe' } },
                        { buttonId: '.mpack', buttonText: { displayText: '📦 Upgrade Backpack' } }
                    ];
                } else if (!meetsPickaxe) {
                    buttons = [
                        { buttonId: '.mpick', buttonText: { displayText: '⛏️ Upgrade Pickaxe' } },
                        { buttonId: '.mine',  buttonText: { displayText: '⛏️ MINE' } }
                    ];
                } else {
                    buttons = [
                        { buttonId: '.mpack', buttonText: { displayText: '📦 Upgrade Backpack' } },
                        { buttonId: '.mine',  buttonText: { displayText: '⛏️ MINE' } }
                    ];
                }
            }

            return socket.sendMessage(jid, { text: msg.trim(), footer: 'Seana Mining', buttons }, { quoted: message });

        } catch (error) {
            console.error('mrebirth error:', error);
            return reply('❌ Gagal load rebirth. Coba lagi nanti.');
        }
    }
};
