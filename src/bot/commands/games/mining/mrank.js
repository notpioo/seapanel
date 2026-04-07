const { PlayerMining, MiningConfig } = require('../../../../models');

// Static map of hardcoded unlocks per rank
// (features beyond just quest stats that are gated by rank in code)
const RANK_UNLOCKS = {
    'F': [],
    'E': [],
    'D': [
        '🎲 Quest Reroll 1x per hari (.mquest reroll)',
    ],
    'C': [],
    'B': [],
    'A': [],
    'S': [],
    'SS': [],
    'SSS': [],
};

const RANK_ORDER = ['F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'];

function buildProgressBar(current, max, length = 10) {
    const pct = Math.min(1, current / Math.max(max, 1));
    const filled = Math.floor(pct * length);
    const empty = length - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
}

module.exports = {
    name: 'mrank',
    description: 'Lihat info dan benefit semua Rank Guild',
    category: 'games',
    usage: '.mrank [nama rank]',
    aliases: ['mrankinfo', 'rankinfo'],

    execute: async ({ reply, sender, args }) => {
        try {
            const phoneNumber = sender.replace('@s.whatsapp.net', '').replace('@c.us', '');
            const player = await PlayerMining.getPlayer(phoneNumber);
            const config = await MiningConfig.getConfig();

            if (!player || !player.quest) {
                return reply('❌ Kamu belum bergabung dengan Guild! Ketik *.mreg* untuk mendaftar.');
            }

            const guildRanks = config.guildSettings.ranks;
            const target = args[0]?.toUpperCase();

            // === MODE DETAIL: .mrank D / .mrank C etc ===
            if (target && RANK_ORDER.includes(target)) {
                const rankData = guildRanks.find(r => r.name === target);
                if (!rankData) {
                    return reply(`❌ Data untuk Rank *${target}* tidak ditemukan di konfigurasi.`);
                }

                const rankIndex = RANK_ORDER.indexOf(target);
                const prevRank = rankIndex > 0 ? RANK_ORDER[rankIndex - 1] : null;

                let msg = `🔰 *DETAIL RANK ${target}*\n`;
                msg += `━━━━━━━━━━━━━━━━━━━━\n\n`;

                // Quest Stats
                msg += `📋 *Keuntungan Quest Harian:*\n`;
                msg += `> 📝 Jumlah Quest: ${rankData.questCount}x per hari\n`;
                msg += `> 💰 Reward Multiplier: ${rankData.rewardMultiplier}x lipat\n`;
                if (rankData.gemRewardMax > 0) {
                    msg += `> 💎 Gems per Quest: ${rankData.gemRewardMin}-${rankData.gemRewardMax}\n`;
                } else {
                    msg += `> 💎 Gems per Quest: Tidak ada\n`;
                }

                // Specific feature unlocks at this rank
                const unlocks = RANK_UNLOCKS[target] || [];
                if (unlocks.length > 0) {
                    msg += `\n🎁 *Fitur Eksklusif Terbuka:*\n`;
                    unlocks.forEach(u => msg += `> ${u}\n`);
                }

                // Cost to reach this rank (from previous rank)
                if (prevRank) {
                    msg += `\n💸 *Biaya Naik ke Rank ${target}:*\n`;
                    if (rankData.requiredXp > 0) msg += `> ⭐ Quest XP: ${rankData.requiredXp.toLocaleString()} GXP\n`;
                    if (rankData.promoteCostMinecon > 0) msg += `> 🪙 Minecon: ${rankData.promoteCostMinecon.toLocaleString()}\n`;
                    if (rankData.promoteCostGems > 0) msg += `> 💎 Gems: ${rankData.promoteCostGems}\n`;
                    if (rankData.promoteCostMinecon === 0 && rankData.promoteCostGems === 0 && rankData.requiredXp === 0) {
                        msg += `> _Tidak ada biaya (cukup XP Guild)_\n`;
                    }
                } else {
                    msg += `\n_Rank ${target} adalah rank awal semua petualang._\n`;
                }

                // Is player already at or above this rank?
                const playerRankIndex = RANK_ORDER.indexOf(player.quest?.rank);
                if (playerRankIndex >= rankIndex) {
                    msg += `\n✅ _Kamu sudah mencapai Rank ini!_`;
                } else {
                    msg += `\n💡 Ketik *.mpromote* saat syarat terpenuhi untuk naik rank!`;
                }

                return reply(msg.trim());
            }

            // === MODE PERSONAL: .mrank (tanpa argumen) ===
            const currentRank = player.quest?.rank || 'F';
            const currentRankIndex = RANK_ORDER.indexOf(currentRank);
            const currentRankData = guildRanks.find(r => r.name === currentRank);
            const nextRankName = currentRankIndex < RANK_ORDER.length - 1 ? RANK_ORDER[currentRankIndex + 1] : null;
            const nextRankData = nextRankName ? guildRanks.find(r => r.name === nextRankName) : null;

            let msg = `🪪 *SEANA GUILD LICENSE CARD*\n`;
            msg += `━━━━━━━━━━━━━━━━━━━━\n`;
            msg += `👤 Petualang: ${phoneNumber}\n`;
            msg += `🏅 Rank: *${currentRank}*\n`;
            msg += `⭐ Quest XP: ${(player.quest?.xp || 0).toLocaleString()}\n\n`;

            // Current rank benefits
            if (currentRankData) {
                msg += `✅ *BENEFIT AKTIF (Rank ${currentRank}):*\n`;
                msg += `> 📝 ${currentRankData.questCount}x Quest/hari (${currentRankData.rewardMultiplier}x reward)\n`;
                if (currentRankData.gemRewardMax > 0) msg += `> 💎 Pasti dapet ${currentRankData.gemRewardMin}-${currentRankData.gemRewardMax} Gems/quest\n`;

                const currentUnlocks = RANK_UNLOCKS[currentRank] || [];

                // Accumulate all unlocks from rank F up to current rank
                let allUnlocks = [];
                for (let i = 0; i <= currentRankIndex; i++) {
                    const r = RANK_ORDER[i];
                    allUnlocks = allUnlocks.concat(RANK_UNLOCKS[r] || []);
                }
                if (allUnlocks.length > 0) {
                    allUnlocks.forEach(u => msg += `> ${u}\n`);
                }
            }

            // Next rank preview
            if (nextRankData) {
                const reqXp = nextRankData.requiredXp || 0;
                const playerXp = player.quest?.xp || 0;
                const xpPct = Math.min(100, Math.floor((playerXp / Math.max(reqXp, 1)) * 100));
                const bar = buildProgressBar(playerXp, reqXp);

                msg += `\n🔒 *BERIKUTNYA — Rank ${nextRankName}:*\n`;
                msg += `> 📝 ${nextRankData.questCount}x Quest/hari (${nextRankData.rewardMultiplier}x reward)\n`;

                const nextUnlocks = RANK_UNLOCKS[nextRankName] || [];
                if (nextUnlocks.length > 0) {
                    nextUnlocks.forEach(u => msg += `> ${u}\n`);
                }

                msg += `\n📊 *Progress XP:* ${bar} ${xpPct}%\n`;
                msg += `⭐ ${playerXp.toLocaleString()} / ${reqXp.toLocaleString()} GXP\n`;

                if (nextRankData.promoteCostMinecon > 0) msg += `💰 Biaya: ${nextRankData.promoteCostMinecon.toLocaleString()} MC\n`;
                if (nextRankData.promoteCostGems > 0) msg += `💎 Biaya: ${nextRankData.promoteCostGems} Gems\n`;

                msg += `\n💡 Ketik *.mrank ${nextRankName}* untuk detail • *.mpromote* untuk naik rank`;
            } else {
                msg += `\n🎉 *MAX RANK TERCAPAI!* Kamu adalah petualang terkuat di Guild!`;
            }

            return reply(msg.trim());

        } catch (error) {
            console.error('Mrank error:', error);
            await reply('❌ Gagal memuat info Rank Guild.');
        }
    }
};
