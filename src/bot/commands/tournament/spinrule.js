const { HeroPool, Tournament } = require('../../../models');

// Role emoji mapping
const roleEmoji = {
    'tank': '🛡️',
    'mage': '🧙‍♂️',
    'fighter': '⚔️',
    'assassin': '🗡️',
    'marksman': '🎯',
    'support': '💚',
    'jungle': '🌿',
    'roamer': '🔄',
    'goldlaner': '💰',
    'explaner': '🗺️'
};

const getEmoji = (role) => roleEmoji[role.toLowerCase()] || '🎮';

module.exports = {
    name: 'spinrule',
    description: 'Spin random role or hero',
    category: 'tournament',
    usage: '.spinrule <role|all|list|[nama_role]>',
    aliases: ['spin', 'random'],

    execute: async ({ reply, args, sender }) => {
        try {
            const action = args[0]?.toLowerCase();

            if (!action) {
                return reply(`
🎰 *SPIN RULE*
━━━━━━━━━━━━━━━━━━━━

*.spinrule role*
  Spin random role

*.spinrule all*
  Spin random hero dari semua role

*.spinrule [nama_role]*
  Spin random hero dari role tertentu
  Contoh: *.spinrule mage*

*.spinrule list*
  Lihat semua role & hero yang tersedia
                `.trim());
            }

            // LIST doesn't need token
            if (action === 'list') {
                const roles = await HeroPool.getAllRoles();
                if (!roles || roles.length === 0) return reply('❌ Belum ada role/hero yang tersedia.');

                let msg = `📋 *HERO POOL*\n━━━━━━━━━━━━━━━━━━━━\n\n`;

                let totalHeroes = 0;
                roles.forEach(r => {
                    totalHeroes += r.heroes.length;
                    msg += `${getEmoji(r.role)} *${r.role}* (${r.heroes.length})\n`;
                    if (r.heroes.length > 0) {
                        msg += `   ${r.heroes.join(', ')}\n`;
                    }
                    msg += `\n`;
                });

                msg += `━━━━━━━━━━━━━━━━━━━━\n`;
                msg += `_Total: ${roles.length} roles, ${totalHeroes} heroes_`;

                return reply(msg);
            }

            // === TOKEN CHECK for spin actions ===
            const active = await Tournament.getActive();
            const phoneNumber = sender.replace('@s.whatsapp.net', '').replace('@c.us', '');

            if (!active) return reply('❌ Tidak ada turnamen aktif.');

            const participant = active.participants.find(p => p.id === phoneNumber);
            if (!participant) return reply('❌ Kamu belum terdaftar di turnamen.\nDaftar dulu: *.join [Nama]*');



            // --- SPIN ROLE (FREE - NO TOKEN REQUIRED) ---
            if (action === 'role') {
                const result = await HeroPool.getRandomRole();
                if (!result) return reply('❌ Belum ada role yang tersedia.\nAdmin harus setup dulu dengan *.heropool*');

                return reply(`
🎰 *SPIN ROLE!*
━━━━━━━━━━━━━━━━━━━━

${getEmoji(result.role)} Role kamu: *${result.role.toUpperCase()}*

_Hero ${result.role}: ${result.heroes.length} tersedia_
Spin hero: *.spinrule ${result.role.toLowerCase()}*
                `.trim());
            }

            // === Token Check Removed ===



            // --- SPIN LISTIC ---
            let heroes = [];
            let displayRole = '';

            if (action === 'all') {
                displayRole = 'ALL ROLE';
                // Get 3 random unique heroes from ALL
                for (let i = 0; i < 3; i++) {
                    const res = await HeroPool.getRandomHeroFromAll();
                    if (res) {
                        // Simple check to avoid duplicate in this batch if pool > 3
                        // (Ideally getRandomHeroFromAll should support exclusion, but here we retry simple)
                        if (!heroes.find(h => h.hero === res.hero)) heroes.push(res);
                        else i--; // Retro if duplicate (loop limit safety needed ideally)
                    }
                }
            } else {
                // Specific Role
                displayRole = action.toUpperCase();
                const pool = await HeroPool.getByRole(action);

                if (!pool || pool.heroes.length === 0) {
                    return reply(`❌ Role *${action}* tidak ditemukan atau kosong.`);
                }

                // Get 3 random unique
                const available = [...pool.heroes];
                if (available.length < 3) {
                    // Not enough heroes, take all
                    available.forEach(h => heroes.push({ hero: h, role: pool.role }));
                } else {
                    // Shuffle and pick 3
                    const shuffled = available.sort(() => 0.5 - Math.random());
                    heroes = shuffled.slice(0, 3).map(h => ({ hero: h, role: pool.role }));
                }
            }

            if (heroes.length === 0) return reply('❌ Gagal mendapatkan hero.');

            // Token consumption removed

            // Construct Message
            let msg = `*Mirror Hero Match*\n`;

            heroes.forEach((h, index) => {
                msg += `match ${index + 1}: ${getEmoji(h.role)} *${h.hero}*\n`;
            });

            return reply(msg.trim());

        } catch (error) {
            console.error('SpinRule error:', error);
            reply('❌ Gagal spin.');
        }
    }
};
