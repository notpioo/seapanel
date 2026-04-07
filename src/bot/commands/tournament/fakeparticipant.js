const { Tournament } = require('../../../models');

module.exports = {
    name: 'addfake',
    description: 'Add fake participants for testing (Admin)',
    category: 'tournament',
    usage: '.addfake [jumlah]',
    aliases: ['fakejoin', 'botjoin'],

    execute: async ({ reply, args, isOwner }) => {
        if (!isOwner) return reply('❌ Khusus Admin!');

        try {
            const active = await Tournament.getActive();

            if (!active) {
                return reply('❌ Tidak ada turnamen aktif.');
            }

            if (active.status !== 'registration') {
                return reply('❌ Pendaftaran sudah ditutup.');
            }

            const count = parseInt(args[0]) || 1;
            if (count > 20) return reply('❌ Kebanyakan! Max 20.');

            const added = [];

            for (let i = 0; i < count; i++) {
                const randomId = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
                const fakeId = `fake_${randomId}`;
                const fakeName = `Bot-${randomId}`;

                // Ensure unique
                if (!active.participants.find(p => p.id === fakeId)) {
                    active.participants.push({
                        id: fakeId,
                        name: fakeName
                    });
                    added.push(fakeName);
                }
            }

            await active.save();

            return reply(`
✅ *ADDED ${added.length} FAKE PARTICIPANTS*
━━━━━━━━━━━━━━━━━━━━
Added: ${added.join(', ')}
Total Peserta: ${active.participants.length}

Siap untuk start! Ketik: *.startgroup*
            `.trim());

        } catch (error) {
            console.error('AddFake error:', error);
            reply('❌ Gagal menambah bot.');
        }
    }
};
