/**
 * .mining - Mining Dashboard (auto-collect pending ore)
 */

const { PlayerMining, MiningConfig } = require('../../../../models');
const { getPetBonuses } = require('../../../utils/petHelper');
const { collectPending, getEffectiveCooldownSec, getDisplayRate } = require('../../../utils/mineHelper');

module.exports = {
    name: 'mining',
    description: 'Show your mining dashboard',
    category: 'games',
    usage: '.mining',

    execute: async ({ reply, sender }) => {
        try {
            const phoneNumber = sender.replace('@s.whatsapp.net', '').replace('@c.us', '');
            const player      = await PlayerMining.getPlayer(phoneNumber);
            const config      = await MiningConfig.getConfig();

            const rebirthBonus = player.getRebirthBonuses();
            const petBonuses   = getPetBonuses(player);
            const activeGlobal = (config.globalBoosts || []).filter(b => new Date(b.expiresAt) > new Date());
            const pickaxe      = config.pickaxeLevels?.find(p => p.level === (player.pickaxeLevel || 1))
                              || { name: 'Wooden Pickaxe', dropMultiplier: 1 };

            // ── Auto-collect pending ore ──────────────────────
            const globalBpMulti = activeGlobal.reduce((m, b) => m * (b.bpMultiplier || 1), 1);
            const pending = collectPending(player, config, rebirthBonus, petBonuses, pickaxe, activeGlobal);
            if (pending.sessions > 0) {
                const bpCap = Math.floor(
                    (player.getBackpackCapacity(config) + petBonuses.bpFlat)
                    * globalBpMulti
                    * (1 + petBonuses.bpPercent / 100)
                );
                const { added } = player.addToInventoryWithCap(pending.drops, bpCap);
                const addedTotal = Object.values(added).reduce((s, v) => s + v, 0);
                player.lastCollect = pending.newLastCollect;
                if (addedTotal > 0) {
                    player.stats.totalMined = (player.stats.totalMined || 0) + addedTotal;
                }
                await player.save();
            }

            // ── Dashboard info ────────────────────────────────
            const location   = player.getLocation(config);
            const bpLvl      = player.backpackLevel || 1;
            const bpCap      = player.getBackpackCapacity(config);
            const cooldownSec = getEffectiveCooldownSec(config, rebirthBonus, petBonuses,
                activeGlobal.reduce((m, b) => m * (b.speedMultiplier || 1), 1));
            const ratePerMin  = getDisplayRate(config, pickaxe, rebirthBonus, petBonuses, cooldownSec);

            // Inventory summary
            let inventoryValue = 0;
            let totalItems     = 0;
            for (const [item, qty] of player.inventory.entries()) {
                const resource = config.resources?.find(r => r.name.toLowerCase() === item.toLowerCase());
                if (resource) inventoryValue += resource.sellPrice * qty;
                totalItems += qty;
            }
            const fillPct = bpCap > 0 ? Math.min(100, Math.round(totalItems / bpCap * 100)) : 0;

            // Next cooldown
            const now     = Date.now();
            const lastMs  = player.lastCollect ? new Date(player.lastCollect).getTime() : now - cooldownSec * 1000;
            const elapsed = (now - lastMs) / 1000;
            const nextSec = Math.max(0, Math.ceil(cooldownSec - (elapsed % cooldownSec)));
            const cooldownText = nextSec <= 0 ? '✅ Ore siap!' : `⏳ ${nextSec}s`;

            // Global boosts
            let globalBoostText = '';
            if (activeGlobal.length > 0) {
                const gbLines = activeGlobal.map(b => {
                    const rem   = Math.ceil((new Date(b.expiresAt) - now) / 60000);
                    const multi = b.speedMultiplier > 1 ? b.speedMultiplier
                                : b.sellMultiplier  > 1 ? b.sellMultiplier
                                : b.bpMultiplier    > 1 ? b.bpMultiplier
                                : b.dropMultiplier  > 1 ? b.dropMultiplier : 1;
                    const icon  = b.boostType === 'speed'      ? '⚡'
                                : b.boostType === 'sell_price' ? '💰'
                                : b.boostType === 'backpack'   ? '📦' : '🌟';
                    return `${icon} ×${multi} — ⏳ ${rem} mnt`;
                });
                globalBoostText = `\n🌍 *Global Boost Aktif!*\n${gbLines.join('\n')}\n`;
            }

            // Rebirth info
            const tierInfo    = player.getRebirthTier();
            const rebirthText = player.rebirthCount > 0
                ? `\n🔄 *Rebirth:* ${tierInfo.emoji} ${tierInfo.label} R${player.rebirthCount} | 💎 ${(player.rebirthPoints || 0).toLocaleString()} RP`
                : '';

            // RP bonus preview
            let rebirthBonusText = '';
            if (player.rebirthCount > 0) {
                const bonuses = [];
                if (rebirthBonus.dropMultiplier > 1)    bonuses.push(`+${Math.round((rebirthBonus.dropMultiplier - 1) * 100)}% drop`);
                if (rebirthBonus.sellMultiplier > 1)    bonuses.push(`+${Math.round((rebirthBonus.sellMultiplier - 1) * 100)}% sell`);
                if (rebirthBonus.cooldownReduction > 0) bonuses.push(`-${rebirthBonus.cooldownReduction}s CD`);
                if (rebirthBonus.upgradeDiscount > 0)   bonuses.push(`-${Math.round(rebirthBonus.upgradeDiscount * 100)}% upgrade cost`);
                if (rebirthBonus.headStartLevel > 0)    bonuses.push(`+${rebirthBonus.headStartLevel} head start`);
                if (bonuses.length > 0) rebirthBonusText = `\n⚡ *RP Aktif:* ${bonuses.join(' • ')}`;
            }

            // Quest info
            const questRank = player.quest?.rank || 'F';

            const dashboard = `
⛏️ *MINING DASHBOARD* ⛏️
━━━━━━━━━━━━━━━━━━━━${rebirthText}${rebirthBonusText}

🗺️ *Lokasi:* ${location.emoji} ${location.name}
⛏️ *Pickaxe:* ${pickaxe.name} (Lv.${player.pickaxeLevel || 1}/250) ×${pickaxe.dropMultiplier}
📦 *Backpack:* Lv.${bpLvl}/250 | ${totalItems}/${bpCap} item (${fillPct}%)

💰 *Saldo:*
├ 🪙 Minecon: ${(player.minecon || 0).toLocaleString()} MC
├ 💎 Gems: ${(player.gems || 0).toLocaleString()}
└ 🔮 Shards: ${(player.quest?.shards || 0).toLocaleString()}

⚡ *Generator:* ~${ratePerMin} ore/menit | ${cooldownText}
📋 *Quest Rank:* ${questRank}
${globalBoostText}
📊 *Stats:*
├ Total Mining: ${(player.stats?.totalMined || 0).toLocaleString()}x
└ Total Earned: ${(player.stats?.totalEarned || 0).toLocaleString()} MC

📋 *Commands:*
.mpick • .mpack • .mrp • .mrebirth
            `.trim();

            await reply(dashboard);

        } catch (error) {
            console.error('Mining dashboard error:', error);
            await reply('❌ Failed to load mining dashboard.');
        }
    }
};
