/**
 * .mhunt - Hunt for Pets
 * Cooldown: 8 minutes (reduced by Dragon pet)
 * Duplicate pets → shards
 */

const { PlayerMining } = require('../../../../models');
const {
    rollHunt, getPetById, getPetBonuses,
    RARITY_CONFIG, PET_MAX_LEVEL, getStatDescription,
    HUNT_COOLDOWN_SEC
} = require('../../../utils/petHelper');
const { trackQuestProgress, applyQuestRewards } = require('../../../utils/questHelper');

module.exports = {
    name: 'mhunt',
    description: 'Berburu Pet!',
    category: 'games',
    usage: '.mhunt',
    aliases: ['pethunt', 'hunt'],

    execute: async ({ reply, sender, socket, message }) => {
        try {
            const phoneNumber = sender.replace('@s.whatsapp.net', '').replace('@c.us', '');
            const player = await PlayerMining.getPlayer(phoneNumber);
            const petBonuses = getPetBonuses(player);

            // ── Cooldown check ────────────────────────────────
            const now = Date.now();
            const lastHunt = player.lastHunt ? new Date(player.lastHunt).getTime() : 0;
            const cooldownMs = petBonuses.huntCooldownMs;

            if (now - lastHunt < cooldownMs) {
                const remaining = Math.ceil((cooldownMs - (now - lastHunt)) / 1000);
                const mins = Math.floor(remaining / 60);
                const secs = remaining % 60;
                const timeStr = mins > 0 ? `${mins} menit ${secs} detik` : `${secs} detik`;
                const totalCooldownMin = Math.round(cooldownMs / 60000);
                return reply(
                    `🏹 *BERBURU PET*\n━━━━━━━━━━━━━━━\n\n` +
                    `⏳ Masih berburu...\n\n` +
                    `Tunggu *${timeStr}* lagi sebelum hunt berikutnya.\n` +
                    `_(Cooldown: ${totalCooldownMin} menit)_`
                );
            }

            // ── Roll ──────────────────────────────────────────
            player.lastHunt = new Date();
            const result = rollHunt();

            let msg;

            // Quest tracking helper for hunt
            function huntQuestCheck() {
                const done = trackQuestProgress(player, 'hunt', '', 1);
                if (done.length > 0) {
                    const reward = applyQuestRewards(player, done);
                    return `\n\n✅ *Quest Selesai!*\n${reward}`;
                }
                return '';
            }

            if (!result.success) {
                // Failed hunt — consolation 1–3 shards + Phantom bonus
                const baseShards = Math.floor(Math.random() * 3) + 1;
                const skeletonBonus = Math.floor(baseShards * (petBonuses.shardBonusPct / 100));
                const phantomBonus = petBonuses.failedHuntShards || 0;
                const total = baseShards + skeletonBonus + phantomBonus;
                player.petShards = (player.petShards || 0) + total;
                const huntNotif = huntQuestCheck();
                await player.save();

                msg = `🏹 *BERBURU PET*\n━━━━━━━━━━━━━━━\n\n`;
                msg += `😔 _Tidak menemukan pet kali ini..._\n\n`;
                msg += `💠 +*${total} shard* konsolasi`;
                if (skeletonBonus > 0) msg += ` _(+${skeletonBonus} skeleton bonus)_`;
                if (phantomBonus > 0)  msg += `\n👻 +*${phantomBonus} shard* dari Phantom`;
                msg += `\n💠 Total shard kamu: *${player.petShards}*\n\n`;
                msg += `_Hunt lagi dalam ${Math.round(cooldownMs / 60000)} menit!_`;
                msg += huntNotif;
            } else {
                const petDef = result.pet;
                const rar = RARITY_CONFIG[petDef.rarity];
                const rarLabel = petDef.rarity.charAt(0).toUpperCase() + petDef.rarity.slice(1);

                const existing = (player.pets || []).find(p => p.id === petDef.id);

                if (existing) {
                    // Duplicate → shards
                    const baseShards = rar.shards;
                    const bonus = Math.floor(baseShards * (petBonuses.shardBonusPct / 100));
                    const total = baseShards + bonus;
                    player.petShards = (player.petShards || 0) + total;
                    const huntNotif = huntQuestCheck();
                    await player.save();

                    msg = `🏹 *BERBURU PET*\n━━━━━━━━━━━━━━━\n\n`;
                    msg += `*${rar.badge}* ${petDef.emoji} *${petDef.name}*\n\n`;
                    msg += `📦 _Pet ini sudah kamu miliki (Lv.${existing.level})_\n`;
                    msg += `✨ Dikonversi → *+${total} 💠 shard*\n`;
                    if (bonus > 0) msg += `   _(+${bonus} bonus dari Wraith)_\n`;
                    msg += `💠 Total shard: *${player.petShards}*\n\n`;
                    msg += `_Upgrade: *.mpet upgrade ${petDef.shortcode}*_`;
                    msg += huntNotif;
                } else {
                    // New pet!
                    if (!player.pets) player.pets = [];
                    player.pets.push({ id: petDef.id, level: 1 });
                    const huntNotif = huntQuestCheck();
                    await player.save();

                    msg = `🏹 *BERBURU PET*\n━━━━━━━━━━━━━━━\n\n`;
                    msg += `🎉 *PET BARU DIDAPAT!* 🎉\n\n`;
                    msg += `*${rar.badge}* ${petDef.emoji} *${petDef.name}*\n`;
                    msg += `_Kode: ${petDef.shortcode}_\n\n`;
                    msg += `📊 *Bonus Aktif (Lv.1):*\n`;
                    msg += `  ${getStatDescription(petDef, 1)}\n\n`;
                    msg += `✅ _Efek langsung aktif! Tidak perlu equip._\n`;
                    msg += `_Upgrade: *.mpet upgrade ${petDef.shortcode}*_`;
                    msg += huntNotif;
                }
            }

            return reply(msg);

        } catch (error) {
            console.error('mhunt error:', error);
            await reply('❌ Gagal berburu. Coba lagi nanti.');
        }
    }
};
