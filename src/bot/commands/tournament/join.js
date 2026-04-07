const { Tournament } = require('../../../models');

module.exports = {
    name: 'join',
    description: 'Join active tournament',
    category: 'tournament',
    usage: '.join [Display Name/Hero]',
    aliases: ['daftar', 'regis'],

    execute: async ({ reply, sender, args, pushName }) => {
        try {
            const active = await Tournament.getActive();

            if (!active) {
                return reply('❌ Tidak ada turnamen yang sedang dibuka pendaftarannya.');
            }

            if (active.status !== 'registration') {
                return reply('❌ Pendaftaran sudah ditutup! Turnamen sedang berjalan.');
            }

            const phoneNumber = sender.replace('@s.whatsapp.net', '').replace('@c.us', '');

            // Cek sudah daftar?
            if (active.participants.find(p => p.id === phoneNumber)) {
                return reply('✅ Kamu sudah terdaftar kok!');
            }

            // Nama default ambil dari pushName kalau kosong
            let displayName = args.join(' ');
            if (!displayName) displayName = pushName || 'Player';

            // Limit nama biar ga ngerusak layout gambar nanti
            if (displayName.length > 12) displayName = displayName.substring(0, 12);

            // Add participant
            active.participants.push({
                id: phoneNumber,
                name: displayName
            });

            await active.save();

            const domain = 'https://nomercy.my.id';
            const webLink = `${domain}/tournament/live`;

            return reply(`
✅ *BERHASIL DAFTAR!*
━━━━━━━━━━━━━━━━━━━━
👤 Nama: *${displayName}*
🏆 Turnamen: ${active.name}
👥 Total Peserta: ${active.participants.length}

Tunggu info selanjutnya dari Admin ya! 🔥
🔗 Live: ${webLink}
            `.trim());

        } catch (error) {
            console.error('Join error:', error);
            reply('❌ Gagal mendaftar.');
        }
    }
};
