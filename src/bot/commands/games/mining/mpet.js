/**
 * .mpet - View and upgrade pets
 * Auto-active: all owned pets apply bonuses without equipping
 */

const { PlayerMining } = require('../../../../models');
const {
    PET_LIST, RARITY_CONFIG, PET_MAX_LEVEL,
    getPetByCode, getPetById, getStatDescription, getPetBonuses
} = require('../../../utils/petHelper');

const RARITY_ORDER = ['legendary', 'mythical', 'epic', 'rare', 'uncommon', 'common'];

module.exports = {
    name: 'mpet',
    description: 'Lihat dan kelola pet kamu',
    category: 'games',
    usage: '.mpet | .mpet up [kode] | .mpet list',
    aliases: ['pets', 'mypet'],

    execute: async ({ reply, sender, args }) => {
        try {
            const phoneNumber = sender.replace('@s.whatsapp.net', '').replace('@c.us', '');
            const player = await PlayerMining.getPlayer(phoneNumber);
            const action = (args[0] || '').toLowerCase();

            // ─── LIST CATALOG ──────────────────────────────────
            if (action === 'list' || action === 'catalog' || action === 'daftar') {
                let msg = `📖 *DAFTAR PET*\n━━━━━━━━━━━━━━━\n\n`;
                for (const rarity of RARITY_ORDER) {
                    const rar = RARITY_CONFIG[rarity];
                    const pets = PET_LIST.filter(p => p.rarity === rarity);
                    msg += `*${rar.badge}* (${rar.chance}%)\n`;
                    msg += `_+${rar.upgradeCost} shard/lvl | dupe = ${rar.shards} shard_\n`;
                    for (const p of pets) {
                        msg += `  ${p.emoji} ${p.name} (${p.shortcode}): ${getStatDescription(p, 1).replace('1', 'N')} per level\n`;
                    }
                    msg += `\n`;
                }
                msg += `_Cari pet: *.mhunt* | Total: ${PET_LIST.length} pet_`;
                return reply(msg.trim());
            }

            // ─── UPGRADE ──────────────────────────────────────
            if (action === 'upgrade' || action === 'up') {
                const code = args[1];
                if (!code) return reply('❌ Masukkan kode pet!\nContoh: *.mpet up co*\n\nCek kode: *.mpet list*');

                const petDef = getPetByCode(code);
                if (!petDef) return reply(`❌ Pet "${code}" tidak dikenal.\nCek daftar: *.mpet list*`);

                const ownedPet = (player.pets || []).find(p => p.id === petDef.id);
                if (!ownedPet) return reply(`❌ Kamu belum punya ${petDef.emoji} *${petDef.name}*!\nDapat dari *.mhunt*`);

                if (ownedPet.level >= PET_MAX_LEVEL) {
                    return reply(`⭐ ${petDef.emoji} *${petDef.name}* sudah *MAX LEVEL* (Lv.${PET_MAX_LEVEL})!`);
                }

                // Upgrade cost
                const petBonuses = getPetBonuses(player);
                const rar = RARITY_CONFIG[petDef.rarity];
                const discount = Math.min(90, petBonuses.shardCostPercent || 0);
                const finalCost = Math.max(1, Math.round(rar.upgradeCost * (1 - discount / 100)));
                const currentShards = player.petShards || 0;

                if (currentShards < finalCost) {
                    return reply(
                        `❌ *Shard tidak cukup!*\n\n` +
                        `Butuh: *${finalCost} 💠*\n` +
                        `Kamu punya: *${currentShards} 💠*\n\n` +
                        `Dapat shard dari *.mhunt*!`
                    );
                }

                const oldLevel = ownedPet.level;
                player.petShards -= finalCost;
                ownedPet.level += 1;
                player.markModified('pets');
                await player.save();

                const rarLabel = petDef.rarity.charAt(0).toUpperCase() + petDef.rarity.slice(1);
                const newStat = getStatDescription(petDef, ownedPet.level);
                const nextCost = ownedPet.level < PET_MAX_LEVEL
                    ? `_Upgrade berikutnya: ${finalCost} shard_`
                    : `⭐ _MAX LEVEL tercapai!_`;

                let msg = `✨ *PET UPGRADE!* ✨\n━━━━━━━━━━━━━━━\n\n`;
                msg += `${rar.badge} ${petDef.emoji} *${petDef.name}*\n`;
                msg += `Lv.*${oldLevel}* → Lv.*${ownedPet.level}*\n\n`;
                msg += `📊 *Bonus Sekarang:*\n  ${newStat}\n\n`;
                msg += `💠 Shard dipakai: -${finalCost} | Sisa: ${player.petShards}\n`;
                msg += nextCost;

                return reply(msg);
            }

            // ─── VIEW MY PETS ──────────────────────────────────
            const owned = player.pets || [];
            const shards = player.petShards || 0;

            if (owned.length === 0) {
                return reply(
                    `🐾 *PETS KAMU*\n━━━━━━━━━━━━━━━\n\n` +
                    `😔 Belum punya pet apapun!\n\n` +
                    `🏹 Cari pet dengan *.mhunt* (cooldown 8 menit)\n` +
                    `📖 Lihat daftar pet: *.mpet list*\n` +
                    `💠 Shard kamu: *${shards}*`
                );
            }

            const petBonuses = getPetBonuses(player);

            let msg = `🐾 *PETS KAMU* (${owned.length}/${PET_LIST.length})\n`;
            msg += `💠 Shard: *${shards}*\n`;
            msg += `━━━━━━━━━━━━━━━\n\n`;

            for (const rarity of RARITY_ORDER) {
                const rarPets = owned
                    .map(op => ({ op, def: getPetById(op.id) }))
                    .filter(({ def }) => def && def.rarity === rarity);
                if (rarPets.length === 0) continue;

                const rar = RARITY_CONFIG[rarity];
                msg += `${rar.badge}\n`;
                for (const { op, def } of rarPets) {
                    const stars = '⭐'.repeat(op.level);
                    const lvlBar = `Lv.*${op.level}*/${PET_MAX_LEVEL}`;
                    msg += `  ${def.emoji} ${def.name} (${def.shortcode}) ${lvlBar}\n`;
                    msg += `     ${getStatDescription(def, op.level)}\n`;
                }
                msg += `\n`;
            }

            msg += `━━━━━━━━━━━━━━━\n`;
            msg += `📊 *Total Bonus Aktif:*\n`;
            if (petBonuses.bpPercent > 0)        msg += `  📦 BP: +${petBonuses.bpPercent.toFixed(1)}%\n`;
            if (petBonuses.bpFlat > 0)            msg += `  📦 BP Flat: +${petBonuses.bpFlat.toLocaleString()}\n`;
            if (petBonuses.speedPercent > 0)      msg += `  ⚡ Mining Speed: +${petBonuses.speedPercent.toFixed(1)}% (sesi lebih cepat)\n`;
            if (petBonuses.speedFlat > 0)         msg += `  ⏱️ Session Cooldown: -${petBonuses.speedFlat}s\n`;
            if (petBonuses.sellPercent > 0)       msg += `  💰 Sell Price: +${petBonuses.sellPercent.toFixed(1)}%\n`;
            if (petBonuses.upgradeDiscount > 0)   msg += `  💸 Upgrade Disc: -${(petBonuses.upgradeDiscount * 100).toFixed(0)}%\n`;
            if (petBonuses.huntCooldownReductionSec > 0) msg += `  🏹 Hunt Cooldown: -${petBonuses.huntCooldownReductionSec}s\n`;
            if (petBonuses.doubleDropChance > 0)         msg += `  ⚡ Double Drop: ${petBonuses.doubleDropChance}% chance\n`;
            if (petBonuses.boostDurationPct > 0)         msg += `  ⏳ Boost Duration: +${petBonuses.boostDurationPct}%\n`;
            if (petBonuses.questRewardBonus > 0)         msg += `  📜 Quest Reward: +${petBonuses.questRewardBonus}%\n`;
            if (petBonuses.shardBonusPct > 0)     msg += `  💠 Shard Bonus: +${petBonuses.shardBonusPct}%\n`;
            if (petBonuses.shardCostPercent > 0)    msg += `  💠 Upgrade Cost: -${petBonuses.shardCostPercent.toFixed(0)}% shard\n`;
            if (petBonuses.failedHuntShards > 0)    msg += `  👻 Failed Hunt: +${petBonuses.failedHuntShards} shard ekstra\n`;

            msg += `\n_Upgrade: *.mpet up [kode]* | Hunt: *.mhunt*_\n`;
            msg += `_Daftar pet: *.mpet list*_`;

            return reply(msg.trim());

        } catch (error) {
            console.error('mpet error:', error);
            await reply('❌ Gagal. Coba lagi nanti.');
        }
    }
};
