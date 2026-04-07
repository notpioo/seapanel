/**
 * mineHelper.js
 * Shared generator-mining utilities for mine.js and msell.js
 */

const LOOP_THRESHOLD = 200; // Above this, use expected-value approximation

/**
 * Calculate effective session cooldown in seconds.
 * Rebirth RP (-1s/level) and Wither pet (-10s/level) reduce it.
 * Global speed boost also speeds up session rate.
 */
function getEffectiveCooldownSec(config, rebirthBonus, petBonuses, globalSpeedMulti = 1) {
    const base       = config.cooldownSeconds || 15;
    const reduced    = base - (rebirthBonus.cooldownReduction || 0) - (petBonuses.speedFlat || 0);
    const petSpeedMult = 1 + ((petBonuses.speedPercent || 0) / 100);
    return Math.max(2, Math.floor(reduced / (Math.max(1, globalSpeedMulti) * petSpeedMult)));
}

/**
 * Generate random ore drops for N sessions.
 * Uses simulation for N ≤ LOOP_THRESHOLD, expected-value for larger counts.
 */
function generateDrops(sessions, config, player, pickaxe, rebirthBonus, petBonuses, activeBoosts) {
    const location = player.getLocation(config);
    if (!location || !location.resources || location.resources.length === 0) return {};

    const luckyBoost    = player.getBoostMultiplier('lucky');
    const rateMulti     = 1 + ((petBonuses.ratePercent || 0) / 100);
    let   globalDropMul = 1;
    for (const gb of activeBoosts) globalDropMul *= gb.dropMultiplier || 1;

    const totalMulti = (pickaxe.dropMultiplier || 1)
        * luckyBoost
        * globalDropMul
        * (rebirthBonus.dropMultiplier || 1)
        * rateMulti;

    const weighted = [];
    for (const resName of location.resources) {
        const res = config.resources.find(r => r.name.toLowerCase() === resName.toLowerCase());
        if (res) weighted.push({ name: resName, weight: res.dropWeight || 50 });
    }
    if (weighted.length === 0) return {};

    const totalWeight = weighted.reduce((s, r) => s + r.weight, 0);
    const drops = {};

    const ddChance = (petBonuses.doubleDropChance || 0) / 100;

    if (sessions <= LOOP_THRESHOLD) {
        for (let s = 0; s < sessions; s++) {
            const isDouble = Math.random() < ddChance;
            const perSession = Math.max(1, Math.round(
                (config.baseDropMin + Math.random() * (config.baseDropMax - config.baseDropMin))
                * totalMulti
            )) * (isDouble ? 2 : 1);
            for (let i = 0; i < perSession; i++) {
                let rand = Math.random() * totalWeight;
                for (const wr of weighted) {
                    rand -= wr.weight;
                    if (rand <= 0) {
                        drops[wr.name.toLowerCase()] = (drops[wr.name.toLowerCase()] || 0) + 1;
                        break;
                    }
                }
            }
        }
    } else {
        // Expected value approach (slightly random ±5%), factor in double drop chance
        const avgPerSession = ((config.baseDropMin + config.baseDropMax) / 2) * totalMulti * (1 + ddChance);
        const totalDrops    = Math.floor(avgPerSession * sessions * (0.95 + Math.random() * 0.1));
        for (const wr of weighted) {
            const amt = Math.floor(totalDrops * wr.weight / totalWeight);
            if (amt > 0) drops[wr.name.toLowerCase()] = amt;
        }
    }

    return drops;
}

/**
 * Calculate how many sessions have accumulated and generate the ore.
 * Does NOT mutate player — caller must apply drops and save.
 *
 * Returns: { sessions, drops, newLastCollect, nextInSec, cooldownSec }
 */
function collectPending(player, config, rebirthBonus, petBonuses, pickaxe, activeBoosts) {
    const globalSpeedMulti = activeBoosts.reduce((m, b) => m * (b.speedMultiplier || 1), 1);
    const cooldownSec      = getEffectiveCooldownSec(config, rebirthBonus, petBonuses, globalSpeedMulti);

    const now         = Date.now();
    // New players get one free session immediately
    const lastMs      = player.lastCollect
        ? new Date(player.lastCollect).getTime()
        : now - cooldownSec * 1000;

    const timeSinceSec = (now - lastMs) / 1000;
    const sessions     = Math.max(0, Math.floor(timeSinceSec / cooldownSec));
    const nextInSec    = Math.ceil(cooldownSec - (timeSinceSec % cooldownSec));

    if (sessions === 0) {
        return { sessions: 0, drops: {}, newLastCollect: null, nextInSec, cooldownSec };
    }

    const drops = generateDrops(sessions, config, player, pickaxe, rebirthBonus, petBonuses, activeBoosts);

    // Advance timestamp by exactly the sessions completed (preserve fractional time)
    const newLastCollect = new Date(lastMs + sessions * cooldownSec * 1000);
    const newNextInSec   = Math.max(1, Math.ceil(cooldownSec - (now - newLastCollect.getTime()) / 1000));

    return { sessions, drops, newLastCollect, nextInSec: newNextInSec, cooldownSec };
}

/**
 * Return approximate ore/min rate for display purposes.
 */
function getDisplayRate(config, pickaxe, rebirthBonus, petBonuses, cooldownSec) {
    const avgDrops   = ((config.baseDropMin + config.baseDropMax) / 2)
        * (pickaxe.dropMultiplier || 1)
        * (rebirthBonus.dropMultiplier || 1)
        * (1 + ((petBonuses.ratePercent || 0) / 100));
    return (avgDrops * 60 / cooldownSec).toFixed(1);
}

module.exports = { getEffectiveCooldownSec, generateDrops, collectPending, getDisplayRate };
