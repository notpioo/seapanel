const { HeroPool } = require('../../../models');

module.exports = {
    name: 'heropool',
    description: 'Manage hero pool for spinrule (Owner Only)',
    category: 'tournament',
    usage: '.heropool <addrole|delrole|add|remove|list> [args]',
    aliases: ['hp'],

    execute: async ({ reply, args, isOwner }) => {
        if (!isOwner) return reply('❌ Khusus Owner Bot!');

        try {
            const action = args[0]?.toLowerCase();

            // --- ADD ROLE ---
            if (action === 'addrole') {
                const roleName = args.slice(1).join(' ');
                if (!roleName) return reply('❌ Masukkan nama role!\nContoh: *.heropool addrole Tank*');

                // Check if role already exists
                const existing = await HeroPool.getByRole(roleName);
                if (existing) return reply(`⚠️ Role *${existing.role}* sudah ada! (${existing.heroes.length} heroes)`);

                const newRole = new HeroPool({ role: roleName, heroes: [] });
                await newRole.save();

                return reply(`✅ Role *${roleName}* berhasil dibuat!\nSekarang tambah hero: *.heropool add ${roleName} [nama hero]*`);
            }

            // --- DELETE ROLE ---
            if (action === 'delrole') {
                const roleName = args.slice(1).join(' ');
                if (!roleName) return reply('❌ Masukkan nama role!\nContoh: *.heropool delrole Tank*');

                const pool = await HeroPool.getByRole(roleName);
                if (!pool) return reply(`❌ Role *${roleName}* tidak ditemukan.`);

                if (!args.includes('--confirm')) {
                    return reply(`⚠️ Yakin hapus role *${pool.role}* beserta ${pool.heroes.length} hero?\nKetik: *.heropool delrole ${pool.role} --confirm*`);
                }

                await HeroPool.deleteOne({ _id: pool._id });
                return reply(`🗑️ Role *${pool.role}* berhasil dihapus! (${pool.heroes.length} heroes removed)`);
            }

            // --- ADD HEROES ---
            if (action === 'add') {
                const roleName = args[1];
                if (!roleName) return reply('❌ Format salah!\nContoh: *.heropool add Tank Tigreal, Khufra, Atlas*');

                const heroInput = args.slice(2).join(' ');
                if (!heroInput) return reply('❌ Masukkan nama hero!\nContoh: *.heropool add Tank Tigreal, Khufra, Atlas*');

                // Parse comma-separated or single hero
                const heroNames = heroInput.split(',').map(h => h.trim()).filter(h => h.length > 0);
                if (heroNames.length === 0) return reply('❌ Nama hero tidak valid.');

                let pool = await HeroPool.getByRole(roleName);

                // Auto-create role if not exists
                if (!pool) {
                    pool = new HeroPool({ role: roleName, heroes: [] });
                }

                // Check duplicates & add
                const added = [];
                const skipped = [];

                heroNames.forEach(name => {
                    const exists = pool.heroes.some(h => h.toLowerCase() === name.toLowerCase());
                    if (exists) {
                        skipped.push(name);
                    } else {
                        pool.heroes.push(name);
                        added.push(name);
                    }
                });

                await pool.save();

                let msg = `✅ *${added.length} hero* ditambahkan ke role *${pool.role}*!\n\n`;
                if (added.length > 0) msg += `➕ Added: ${added.join(', ')}\n`;
                if (skipped.length > 0) msg += `⚠️ Skipped (sudah ada): ${skipped.join(', ')}\n`;
                msg += `\n_Total hero ${pool.role}: ${pool.heroes.length}_`;

                return reply(msg);
            }

            // --- REMOVE HERO ---
            if (action === 'remove' || action === 'del') {
                const roleName = args[1];
                const heroName = args.slice(2).join(' ');

                if (!roleName || !heroName) return reply('❌ Format salah!\nContoh: *.heropool remove Tank Tigreal*');

                const pool = await HeroPool.getByRole(roleName);
                if (!pool) return reply(`❌ Role *${roleName}* tidak ditemukan.`);

                const heroIndex = pool.heroes.findIndex(h => h.toLowerCase() === heroName.toLowerCase());
                if (heroIndex === -1) return reply(`❌ Hero *${heroName}* tidak ada di role *${pool.role}*.`);

                const removed = pool.heroes.splice(heroIndex, 1)[0];
                await pool.save();

                return reply(`🗑️ Hero *${removed}* dihapus dari role *${pool.role}*!\n_Sisa: ${pool.heroes.length} heroes_`);
            }

            // --- LIST ---
            if (action === 'list') {
                const specificRole = args[1];

                if (specificRole) {
                    const pool = await HeroPool.getByRole(specificRole);
                    if (!pool) return reply(`❌ Role *${specificRole}* tidak ditemukan.`);

                    let msg = `📋 *HERO POOL — ${pool.role.toUpperCase()}*\n━━━━━━━━━━━━━━━━━━━━\n\n`;

                    if (pool.heroes.length === 0) {
                        msg += `_Belum ada hero._\n`;
                    } else {
                        pool.heroes.forEach((h, i) => {
                            msg += `${i + 1}. ${h}\n`;
                        });
                    }

                    msg += `\n_Total: ${pool.heroes.length} heroes_`;
                    return reply(msg);
                }

                // List all roles
                const roles = await HeroPool.getAllRoles();
                if (!roles || roles.length === 0) return reply('❌ Belum ada role/hero.\nBuat role: *.heropool addrole [nama]*');

                let msg = `📋 *HERO POOL — ALL ROLES*\n━━━━━━━━━━━━━━━━━━━━\n\n`;
                let totalHeroes = 0;

                roles.forEach(r => {
                    totalHeroes += r.heroes.length;
                    msg += `🎮 *${r.role}* (${r.heroes.length})\n`;
                    if (r.heroes.length > 0) {
                        msg += `   ${r.heroes.join(', ')}\n`;
                    } else {
                        msg += `   _kosong_\n`;
                    }
                    msg += `\n`;
                });

                msg += `━━━━━━━━━━━━━━━━━━━━\n`;
                msg += `_Total: ${roles.length} roles, ${totalHeroes} heroes_`;

                return reply(msg);
            }

            // --- HELP ---
            return reply(`
🛠️ *HERO POOL MANAGER*
━━━━━━━━━━━━━━━━━━━━

📌 *Role Management:*
*.heropool addrole [nama]*
  Buat role baru

*.heropool delrole [nama]*
  Hapus role + semua hero-nya

📌 *Hero Management:*
*.heropool add [role] [hero1, hero2, ...]*
  Tambah hero (bisa bulk, pisah koma)

*.heropool remove [role] [hero]*
  Hapus hero dari role

📌 *View:*
*.heropool list*
  Lihat semua role & hero

*.heropool list [role]*
  Lihat hero di role tertentu
            `.trim());

        } catch (error) {
            console.error('HeroPool error:', error);
            reply('❌ Gagal mengatur hero pool.');
        }
    }
};
