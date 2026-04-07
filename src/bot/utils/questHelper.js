/**
 * questHelper.js
 * Quest generation, progress tracking, and reward logic.
 */

const crypto = require('crypto');
const { getPetBonuses } = require('./petHelper');

const RANK_ORDER = ['F','E','D','C','B','A','S','SS','SSS'];
const QUEST_REFRESH_MS = 24 * 60 * 60 * 1000;

// Quest types weighted by probability
const QUEST_TYPE_POOL = [
    'sell_ore', 'sell_ore',
    'collect_ore', 'collect_ore',
    'hunt',
    'upgrade',
];

function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRankConfig(config, rank) {
    return (config.guildSettings?.ranks || []).find(r => r.name === rank) || null;
}

function getNextRank(rank) {
    const idx = RANK_ORDER.indexOf(rank);
    return idx >= 0 && idx < RANK_ORDER.length - 1 ? RANK_ORDER[idx + 1] : null;
}

// Generate fresh daily quests for a player
function generateQuests(rankConfig) {
    const count = rankConfig.questCount || 1;
    const quests = [];
    const usedTypes = [];

    for (let i = 0; i < count; i++) {
        // Pick a type, avoiding back-to-back duplicates
        let pool = QUEST_TYPE_POOL.filter(t => t !== usedTypes[usedTypes.length - 1]);
        if (pool.length === 0) pool = [...QUEST_TYPE_POOL];
        const questType = pool[Math.floor(Math.random() * pool.length)];
        usedTypes.push(questType);

        let resource = '';
        let target = 0;

        if (questType === 'sell_ore' || questType === 'collect_ore') {
            const ores = rankConfig.allowedResources || ['Stone'];
            resource = ores[Math.floor(Math.random() * ores.length)];
            target = randInt(rankConfig.minQuantity || 10, rankConfig.maxQuantity || 50);
        } else if (questType === 'hunt') {
            target = randInt(2, 5);
        } else if (questType === 'upgrade') {
            target = randInt(1, 3);
        }

        const minecon = Math.max(50, Math.floor(target * (rankConfig.rewardMultiplier || 1) * 12));
        const gems    = randInt(rankConfig.gemRewardMin || 0, rankConfig.gemRewardMax || 1);
        const xp      = randInt(rankConfig.xpRewardMin  || 10, rankConfig.xpRewardMax || 30);
        const shards  = (rankConfig.shardRewardMin > 0)
            ? randInt(rankConfig.shardRewardMin, rankConfig.shardRewardMax)
            : 0;

        quests.push({
            id:        crypto.randomBytes(4).toString('hex'),
            questType,
            resource,
            target,
            progress:  0,
            reward:    { minecon, gems, xp, shards },
            status:    'active',
            generatedAt: new Date()
        });
    }

    return quests;
}

// Human-readable quest description
function getQuestLabel(quest) {
    switch (quest.questType) {
        case 'sell_ore':    return `Jual *${quest.target}x* ${quest.resource}`;
        case 'collect_ore': return `Kumpulkan *${quest.target}x* ${quest.resource}`;
        case 'hunt':        return `Berburu pet *${quest.target}x*`;
        case 'upgrade':     return `Upgrade Pickaxe/BP *${quest.target}x*`;
        default:            return `Selesaikan task (${quest.target})`;
    }
}

// Unicode progress bar
function progressBar(current, target, len = 10) {
    const pct   = Math.min(1, current / Math.max(1, target));
    const filled = Math.round(pct * len);
    return '█'.repeat(filled) + '░'.repeat(len - filled);
}

// Check whether quests need refreshing
function needsRefresh(player) {
    const q = player.quest || {};
    const last = q.lastQuestRefresh ? new Date(q.lastQuestRefresh).getTime() : 0;
    const hasActive = (q.activeQuests || []).some(x => x.status === 'active');
    return !hasActive || (Date.now() - last >= QUEST_REFRESH_MS);
}

/**
 * Track quest progress after a player action.
 * @param {Object}  player   - PlayerMining document
 * @param {String}  type     - 'sell_ore'|'collect_ore'|'hunt'|'upgrade'
 * @param {String}  resource - ore name (for sell/collect), empty string otherwise
 * @param {Number}  amount   - how many units were done
 * @returns {Array} completed quest objects (with reward filled)
 */
function trackQuestProgress(player, type, resource, amount) {
    if (!player.quest?.activeQuests) return [];

    const completed = [];
    const res = (resource || '').toLowerCase();

    for (const q of player.quest.activeQuests) {
        if (q.status !== 'active') continue;
        if (q.questType !== type) continue;

        // For ore quests, match resource case-insensitively
        if ((type === 'sell_ore' || type === 'collect_ore')) {
            if ((q.resource || '').toLowerCase() !== res) continue;
        }

        q.progress = Math.min(q.target, (q.progress || 0) + amount);

        if (q.progress >= q.target) {
            q.status = 'completed';
            completed.push(q);
        }
    }

    if (completed.length > 0) {
        player.markModified('quest.activeQuests');
    }

    return completed;
}

/**
 * Apply quest rewards to player, return a short reward summary string.
 */
function applyQuestRewards(player, completedQuests) {
    if (!completedQuests || completedQuests.length === 0) return '';

    let mc = 0, gems = 0, xp = 0, shards = 0;
    for (const q of completedQuests) {
        mc     += q.reward.minecon || 0;
        gems   += q.reward.gems    || 0;
        xp     += q.reward.xp      || 0;
        shards += q.reward.shards  || 0;
        player.quest.completedTotal = (player.quest.completedTotal || 0) + 1;
    }

    // Apply Evoker pet bonus (quest_reward_bonus)
    const petBonuses = getPetBonuses(player);
    const mult = 1 + (petBonuses.questRewardBonus || 0) / 100;
    mc     = Math.round(mc     * mult);
    gems   = Math.round(gems   * mult);
    xp     = Math.round(xp     * mult);
    shards = Math.round(shards * mult);

    player.minecon        = (player.minecon        || 0) + mc;
    player.gems           = (player.gems           || 0) + gems;
    player.quest.xp       = (player.quest.xp       || 0) + xp;
    player.petShards      = (player.petShards      || 0) + shards;

    player.markModified('quest');

    const parts = [];
    if (mc     > 0) parts.push(`🪙+${mc.toLocaleString()}`);
    if (gems   > 0) parts.push(`💎+${gems}`);
    if (xp     > 0) parts.push(`⭐+${xp} XP`);
    if (shards > 0) parts.push(`💠+${shards} Shard`);
    if (mult   > 1) parts.push(`_(+${Math.round((mult-1)*100)}% Evoker!)_`);

    return parts.join(' ');
}

module.exports = {
    RANK_ORDER,
    QUEST_REFRESH_MS,
    getRankConfig,
    getNextRank,
    generateQuests,
    getQuestLabel,
    progressBar,
    needsRefresh,
    trackQuestProgress,
    applyQuestRewards,
};
