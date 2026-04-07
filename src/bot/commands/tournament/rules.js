const { Tournament } = require('../../../models');

module.exports = {
    name: 'rules',
    description: 'View tournament rules',
    category: 'tournament',
    usage: '.rules',
    aliases: ['aturan', 'peraturan'],

    execute: async ({ reply }) => {
        try {
            const active = await Tournament.getActive();
            if (!active) return reply('❌ Tidak ada turnamen aktif.');

            if (!active.rules || active.rules.length === 0) {
                return reply(`📜 *TOURNAMENT RULES*\n🏆 ${active.name}\n━━━━━━━━━━━━━━━━━━━━\n\n_Belum ada rules yang ditetapkan._\nAdmin bisa set rules dengan *.setrules add [isi]*`);
            }

            let msg = `📜 *TOURNAMENT RULES*\n🏆 ${active.name}\n━━━━━━━━━━━━━━━━━━━━\n\n`;

            active.rules.forEach((rule, index) => {
                msg += `${index + 1}. ${rule}\n`;
            });

            msg += `\n━━━━━━━━━━━━━━━━━━━━`;
            msg += `\n_Total: ${active.rules.length} rules_`;

            const domain = 'https://nomercy.my.id';
            msg += `\n🔗 Live: ${domain}/tournament/live`;

            return reply(msg);

        } catch (error) {
            console.error('Rules error:', error);
            reply('❌ Gagal memuat rules.');
        }
    }
};
