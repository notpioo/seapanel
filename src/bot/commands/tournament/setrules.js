const { Tournament } = require('../../../models');

module.exports = {
    name: 'setrules',
    description: 'Manage tournament rules (Admin Only)',
    category: 'tournament',
    usage: '.setrules <add|remove|edit|clear> [args]',
    aliases: ['editrules', 'aturanset'],

    execute: async ({ reply, args, isOwner }) => {
        if (!isOwner) return reply('❌ Khusus Admin!');

        try {
            const active = await Tournament.getActive();
            if (!active) return reply('❌ Tidak ada turnamen aktif.');

            const action = args[0]?.toLowerCase();

            // --- ADD ---
            if (action === 'add') {
                const ruleText = args.slice(1).join(' ');
                if (!ruleText) return reply('❌ Masukkan isi rule!\nContoh: *.setrules add Setiap peserta wajib hadir tepat waktu*');

                active.rules.push(ruleText);
                await active.save();

                return reply(`✅ Rule #${active.rules.length} ditambahkan!\n\n📌 "${ruleText}"`);
            }

            // --- REMOVE ---
            if (action === 'remove' || action === 'hapus') {
                const num = parseInt(args[1]);
                if (isNaN(num) || num < 1 || num > active.rules.length) {
                    return reply(`❌ Nomor tidak valid! (1-${active.rules.length})\nContoh: *.setrules remove 2*`);
                }

                const removed = active.rules.splice(num - 1, 1)[0];
                await active.save();

                return reply(`🗑️ Rule #${num} dihapus!\n\n❌ "${removed}"\n\n_Sisa: ${active.rules.length} rules_`);
            }

            // --- EDIT ---
            if (action === 'edit' || action === 'ubah') {
                const num = parseInt(args[1]);
                const newText = args.slice(2).join(' ');

                if (isNaN(num) || num < 1 || num > active.rules.length) {
                    return reply(`❌ Nomor tidak valid! (1-${active.rules.length})\nContoh: *.setrules edit 1 Rule baru*`);
                }
                if (!newText) return reply('❌ Masukkan isi rule baru!\nContoh: *.setrules edit 1 Peserta wajib online H-10 menit*');

                const oldText = active.rules[num - 1];
                active.rules[num - 1] = newText;
                await active.save();

                return reply(`✏️ Rule #${num} diupdate!\n\n❌ Lama: "${oldText}"\n✅ Baru: "${newText}"`);
            }

            // --- CLEAR ---
            if (action === 'clear' || action === 'reset') {
                if (args[1] !== 'confirm') {
                    return reply(`⚠️ Yakin hapus semua ${active.rules.length} rules?\nKetik: *.setrules clear confirm*`);
                }

                const count = active.rules.length;
                active.rules = [];
                await active.save();

                return reply(`🗑️ Semua rules dihapus! (${count} rules removed)`);
            }

            // --- HELP ---
            return reply(`
📜 *MANAGE RULES*
━━━━━━━━━━━━━━━━━━━━

*.setrules add [isi]*
  Tambah rule baru

*.setrules remove [nomor]*
  Hapus rule berdasarkan nomor

*.setrules edit [nomor] [isi baru]*
  Edit rule yang sudah ada

*.setrules clear*
  Hapus semua rules

Lihat rules: *.rules*
_Total saat ini: ${active.rules.length} rules_
            `.trim());

        } catch (error) {
            console.error('SetRules error:', error);
            reply('❌ Gagal mengatur rules.');
        }
    }
};
