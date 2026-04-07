/**
 * .mrp - Rebirth Points Upgrade Tree
 * Spend RP on permanent upgrades
 * .mrp          → list semua upgrade dengan nomor shortcut
 * .mrp buy <id|nomor> → beli upgrade
 */

const { PlayerMining, MiningConfig } = require('../../../../models');

function generateBar(current, max) {
    const filled = Math.round((current / max) * 10);
    return '█'.repeat(filled) + '░'.repeat(10 - filled) + ` ${current}/${max}`;
}

module.exports = {
    name: 'mrp',
    description: 'Rebirth Points upgrade tree — belanja bonus permanen',
    category: 'games',
    usage: '.mrp | .mrp buy <id|nomor>',

    execute: async ({ reply, sender, args, socket, message }) => {
        const phoneNumber = sender.replace('@s.whatsapp.net', '').replace('@c.us', '');
        const jid = message.key.remoteJid;

        try {
            const player    = await PlayerMining.getPlayer(phoneNumber);
            const config    = await MiningConfig.getConfig();
            const upgrades  = config.rebirthConfig?.upgrades || [];
            const rpBalance = player.rebirthPoints || 0;
            const subCmd    = args?.[0]?.toLowerCase() || 'list';

            const getCurrentLevel = (upgradeId) =>
                (typeof player.rpUpgrades?.get === 'function'
                    ? player.rpUpgrades.get(upgradeId)
                    : player.rpUpgrades?.[upgradeId]) || 0;

            // ─────────────────────────────────────────────────
            // BUY: .mrp buy <id|nomor>
            // ─────────────────────────────────────────────────
            if (subCmd === 'buy') {
                const raw = args[1];
                if (!raw) return reply('❌ Contoh: _.mrp buy 1_ atau _.mrp buy drop_rate_');

                // Resolve by number shortcut or by id
                let upgrade;
                const asNum = parseInt(raw);
                if (!isNaN(asNum) && asNum >= 1 && asNum <= upgrades.length) {
                    upgrade = upgrades[asNum - 1];
                } else {
                    upgrade = upgrades.find(u => u.id === raw);
                }
                if (!upgrade) return reply(`❌ Upgrade "${raw}" tidak ditemukan.\nKetik _.mrp_ untuk lihat daftar.`);

                const currentLevel = getCurrentLevel(upgrade.id);

                if (currentLevel >= upgrade.maxLevel) {
                    return socket.sendMessage(jid, {
                        text: `🏆 *${upgrade.name}* sudah level maksimum (${upgrade.maxLevel})!`,
                        footer: 'Seana Mining',
                        buttons: [{ buttonId: '.mrp', buttonText: { displayText: '⚡ Lihat RP Tree' } }]
                    }, { quoted: message });
                }

                const cost = upgrade.costs[currentLevel];
                if (rpBalance < cost) {
                    return socket.sendMessage(jid, {
                        text: `❌ RP tidak cukup!\nButuh: *${cost} RP*\nKamu punya: *${rpBalance} RP*\n\nRebirth lagi untuk dapat lebih banyak RP!`,
                        footer: 'Seana Mining',
                        buttons: [
                            { buttonId: '.mrebirth', buttonText: { displayText: '🔄 Cek Rebirth' } },
                            { buttonId: '.mrp',      buttonText: { displayText: '⚡ RP Tree' } }
                        ]
                    }, { quoted: message });
                }

                // Deduct & apply
                player.rebirthPoints -= cost;
                if (!player.rpUpgrades) player.rpUpgrades = new Map();
                if (typeof player.rpUpgrades.set === 'function') {
                    player.rpUpgrades.set(upgrade.id, currentLevel + 1);
                } else {
                    player.rpUpgrades[upgrade.id] = currentLevel + 1;
                }
                player.markModified('rpUpgrades');
                await player.save();

                const newLevel    = currentLevel + 1;
                const isMaxedNow  = newLevel >= upgrade.maxLevel;
                const effectValue = upgrade.effectPerLevel * newLevel;
                const effectUnit  = upgrade.effectType === 'cooldown' ? 's' : '%';
                const effectLabel = upgrade.effectType === 'cooldown'
                    ? `-${effectValue}s cooldown`
                    : `+${effectValue}${effectUnit}`;

                // Find shortcut number for this upgrade
                const upgradeNum = upgrades.findIndex(u => u.id === upgrade.id) + 1;

                return socket.sendMessage(jid, {
                    text: `✅ *Upgrade Berhasil!*
━━━━━━━━━━━━━━━━━
${upgrade.emoji} *${upgrade.name}* → Level ${newLevel}/${upgrade.maxLevel}
💡 Effect total: *${effectLabel}*
💎 RP terpakai: ${cost}
💎 RP sisa: ${player.rebirthPoints.toLocaleString()}
${isMaxedNow ? '\n🏆 MAXED OUT!' : `\n⬆️ Level berikutnya: ${upgrade.costs[newLevel]} RP`}`.trim(),
                    footer: 'Seana Mining',
                    buttons: isMaxedNow
                        ? [{ buttonId: '.mrp', buttonText: { displayText: '⚡ RP Tree' } }]
                        : [
                            { buttonId: `.mrp buy ${upgradeNum}`, buttonText: { displayText: `${upgrade.emoji} Upgrade Lagi` } },
                            { buttonId: '.mrp',                   buttonText: { displayText: '⚡ RP Tree' } }
                          ]
                }, { quoted: message });
            }

            // ─────────────────────────────────────────────────
            // LIST: .mrp (default)
            // ─────────────────────────────────────────────────
            const bonuses = player.getRebirthBonuses();

            let msg = `⚡ *REBIRTH POINTS TREE* ⚡
━━━━━━━━━━━━━━━━━━━━

💎 RP Balance: *${rpBalance.toLocaleString()} RP*
🔄 Rebirth: *R${player.rebirthCount || 0}*

*Current Bonuses:*
📦 Drop Rate: +${Math.round((bonuses.dropMultiplier - 1) * 100)}%
💰 Sell Price: +${Math.round((bonuses.sellMultiplier - 1) * 100)}%
💎 Gem Chance: +${bonuses.gemChanceBonus}%
⚡ Cooldown: -${bonuses.cooldownReduction}s

*Upgrade Tree:*`.trim();

            for (let i = 0; i < upgrades.length; i++) {
                const upgrade    = upgrades[i];
                const currentLvl = getCurrentLevel(upgrade.id);
                const isMaxed    = currentLvl >= upgrade.maxLevel;
                const nextCost   = isMaxed ? null : upgrade.costs[currentLvl];
                const canAfford  = nextCost !== null && rpBalance >= nextCost;
                const bar        = generateBar(currentLvl, upgrade.maxLevel);

                msg += `\n\n*[${i + 1}] ${upgrade.emoji} ${upgrade.name}* [${currentLvl}/${upgrade.maxLevel}]`;
                msg += `\n${bar}`;
                msg += `\n├ ${upgrade.description}`;
                if (isMaxed) {
                    msg += `\n└ 🏆 MAXED OUT!`;
                } else {
                    msg += `\n└ ${canAfford ? '✅' : '❌'} *${nextCost} RP* → _.mrp buy ${i + 1}_`;
                }
            }

            msg += `\n\n_Ketik *.mrp buy <nomor>* untuk upgrade_\n_Contoh: *.mrp buy 1*_`;

            return socket.sendMessage(jid, {
                text: msg,
                footer: 'Seana Mining',
                buttons: [
                    { buttonId: '.mrp buy 1', buttonText: { displayText: '⚡ Buy #1' } },
                    { buttonId: '.mrp buy 2', buttonText: { displayText: '⚡ Buy #2' } },
                    { buttonId: '.mrp buy 3', buttonText: { displayText: '⚡ Buy #3' } }
                ]
            }, { quoted: message });

        } catch (error) {
            console.error('mrp error:', error);
            return reply('❌ Gagal load RP tree. Coba lagi nanti.');
        }
    }
};
