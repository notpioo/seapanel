/**
 * .mquest          — lihat quest harian + progres
 * .mquest promote  — naik rank (jika XP cukup & mampu bayar)
 */

const { PlayerMining, MiningConfig } = require('../../../../models');
const {
    RANK_ORDER, getRankConfig, getNextRank,
    generateQuests, getQuestLabel, progressBar,
    needsRefresh, applyQuestRewards,
} = require('../../../utils/questHelper');

module.exports = {
    name: 'mquest',
    description: 'Daily quest harian mining',
    category: 'games',
    usage: '.mquest | .mquest promote',
    aliases: ['quest', 'dailyquest'],

    execute: async ({ reply, sender, socket, message, args }) => {
        try {
            const phoneNumber = sender.replace('@s.whatsapp.net', '').replace('@c.us', '');
            const player = await PlayerMining.getPlayer(phoneNumber);
            const config = await MiningConfig.getConfig();
            const jid    = message.key.remoteJid;

            // Ensure quest object exists
            if (!player.quest) player.quest = {};
            if (!player.quest.rank) player.quest.rank = 'F';
            if (!player.quest.xp)   player.quest.xp   = 0;
            if (!player.quest.activeQuests) player.quest.activeQuests = [];

            const action = (args[0] || '').toLowerCase();

            // ── PROMOTE ───────────────────────────────────────────
            if (action === 'promote') {
                const curRank  = player.quest.rank;
                const nextRank = getNextRank(curRank);
                if (!nextRank) {
                    return reply(`🏅 Kamu sudah di rank tertinggi *SSS*! Tidak ada rank lagi.`);
                }

                const nextCfg = getRankConfig(config, nextRank);
                if (!nextCfg) return reply('❌ Config rank tidak ditemukan.');

                const curXp = player.quest.xp || 0;
                if (curXp < nextCfg.requiredXp) {
                    return reply(
                        `📋 *NAIK RANK*\n━━━━━━━━━━━━━━━━━━\n\n` +
                        `❌ XP belum cukup!\n\n` +
                        `🏅 Rank sekarang : *${curRank}*\n` +
                        `🎯 Target rank   : *${nextRank}*\n` +
                        `⭐ XP kamu       : *${curXp.toLocaleString()}*\n` +
                        `⭐ XP dibutuhkan : *${nextCfg.requiredXp.toLocaleString()}*\n\n` +
                        `_Selesaikan quest harian untuk dapat XP!_`
                    );
                }

                // Cost check
                const costMC   = nextCfg.promoteCostMinecon || 0;
                const costGems = nextCfg.promoteCostGems    || 0;
                if (player.minecon < costMC) {
                    return reply(
                        `❌ Minecon tidak cukup untuk naik rank!\n` +
                        `Butuh: 🪙 *${costMC.toLocaleString()} MC*\n` +
                        `Punya: 🪙 *${player.minecon.toLocaleString()} MC*`
                    );
                }
                if (player.gems < costGems) {
                    return reply(
                        `❌ Gems tidak cukup untuk naik rank!\n` +
                        `Butuh: 💎 *${costGems} Gems*\n` +
                        `Punya: 💎 *${player.gems}*`
                    );
                }

                // Apply
                player.minecon   -= costMC;
                player.gems      -= costGems;
                player.quest.rank = nextRank;
                player.quest.activeQuests   = [];
                player.quest.lastQuestRefresh = null;
                player.markModified('quest');
                await player.save();

                let promoteMsg = `🎉 *NAIK RANK!* 🎉\n━━━━━━━━━━━━━━━━━━\n\n`;
                promoteMsg += `🏅 Rank baru: *${nextRank}*\n\n`;
                if (costMC   > 0) promoteMsg += `🪙 -${costMC.toLocaleString()} MC\n`;
                if (costGems > 0) promoteMsg += `💎 -${costGems} Gems\n`;
                promoteMsg += `\n✅ Quest baru akan di-generate!\n_Ketik *.mquest* untuk lihat quest barumu._`;

                return socket.sendMessage(jid, {
                    text: promoteMsg,
                    footer: 'Seana Mining',
                    buttons: [
                        { buttonId: '.mquest', buttonText: { displayText: '📋 Lihat Quest' } },
                        { buttonId: '.mine',   buttonText: { displayText: '⛏️ Mine' } },
                    ]
                }, { quoted: message });
            }

            // ── SHOW QUESTS ───────────────────────────────────────
            const rank       = player.quest.rank || 'F';
            const rankConfig = getRankConfig(config, rank);
            if (!rankConfig) return reply('❌ Config rank tidak ditemukan.');

            // Refresh quests if needed
            if (needsRefresh(player)) {
                player.quest.activeQuests    = generateQuests(rankConfig);
                player.quest.lastQuestRefresh = new Date();
                player.markModified('quest');
                await player.save();
            }

            const quests   = player.quest.activeQuests || [];
            const curXp    = player.quest.xp || 0;
            const nextRank = getNextRank(rank);
            const nextCfg  = nextRank ? getRankConfig(config, nextRank) : null;
            const xpToNext = nextCfg ? nextCfg.requiredXp : null;

            // XP bar
            const xpBarLen = 10;
            const xpBar    = xpToNext
                ? progressBar(curXp, xpToNext, xpBarLen)
                : '█'.repeat(xpBarLen);

            const lastRefresh = player.quest.lastQuestRefresh
                ? new Date(player.quest.lastQuestRefresh).getTime() : 0;
            const refreshInMs = Math.max(0, 24 * 3600 * 1000 - (Date.now() - lastRefresh));
            const rHrs  = Math.floor(refreshInMs / 3600000);
            const rMins = Math.floor((refreshInMs % 3600000) / 60000);

            let msg = `📋 *DAILY QUEST*\n━━━━━━━━━━━━━━━━━━\n\n`;
            msg += `🏅 Rank : *${rank}*  |  ⭐ XP : *${curXp.toLocaleString()}*`;
            if (xpToNext) msg += `/${xpToNext.toLocaleString()}`;
            msg += `\n[${xpBar}]\n`;

            // Promote hint
            if (nextCfg && curXp >= (nextCfg.requiredXp || Infinity)) {
                const hasMC   = player.minecon >= (nextCfg.promoteCostMinecon || 0);
                const hasGems = player.gems    >= (nextCfg.promoteCostGems    || 0);
                if (hasMC && hasGems) {
                    msg += `✅ _Siap naik ke rank *${nextRank}*! Ketik *.mquest promote*_\n`;
                }
            }

            msg += `\n🔄 Refresh dalam: *${rHrs}j ${rMins}m*\n\n`;
            msg += `━━━━━━━━━━━━━━━━━━\n`;

            if (quests.length === 0) {
                msg += `_Tidak ada quest tersedia._`;
            } else {
                quests.forEach((q, i) => {
                    const done  = q.status === 'completed';
                    const prog  = q.progress || 0;
                    const bar   = progressBar(prog, q.target, 8);
                    const icon  = done ? '✅' : '🔸';
                    msg += `\n${icon} *Quest ${i + 1}*\n`;
                    msg += `${getQuestLabel(q)}\n`;
                    msg += `[${bar}] ${prog}/${q.target}\n`;
                    if (!done) {
                        msg += `💰 Reward: 🪙${q.reward.minecon.toLocaleString()}`;
                        if (q.reward.gems   > 0) msg += ` 💎${q.reward.gems}`;
                        if (q.reward.shards > 0) msg += ` 💠${q.reward.shards}`;
                        msg += ` ⭐${q.reward.xp} XP\n`;
                    } else {
                        msg += `_✔ Reward sudah diterima_\n`;
                    }
                });
            }

            msg += `\n━━━━━━━━━━━━━━━━━━\n`;
            msg += `_Progres otomatis tercatat saat kamu mine, sell, hunt, atau upgrade_`;

            return socket.sendMessage(jid, {
                text: msg.trim(),
                footer: 'Seana Mining',
                buttons: [
                    { buttonId: '.mine',   buttonText: { displayText: '⛏️ Mine' } },
                    { buttonId: '.msell',  buttonText: { displayText: '💰 Sell' } },
                    { buttonId: '.mhunt',  buttonText: { displayText: '🏹 Hunt' } },
                ]
            }, { quoted: message });

        } catch (err) {
            console.error('mquest error:', err);
            await reply('❌ Gagal memuat quest. Coba lagi.');
        }
    }
};
