const { AuthToken, WAUser, Tournament } = require('../../../models');
const crypto = require('crypto');

module.exports = {
    name: 'login',
    description: 'Get a magic link to login to the Web Panel',
    category: 'tournament',
    usage: '.login',
    aliases: ['web', 'panel'],

    execute: async ({ reply, sender, pushName, isOwner, isGroup, socket }) => {
        try {
            // Generate a random 32-character hex token
            const token = crypto.randomBytes(16).toString('hex');

            // Clean the sender ID
            const userId = sender.replace('@s.whatsapp.net', '').replace('@c.us', '');

            // Try to find real name
            let displayName = pushName;

            // Check WAUser database
            const waUser = await WAUser.findOne({ phoneNumber: userId });

            if (displayName && displayName !== 'Player' && displayName !== 'Member') {
                if (waUser) {
                    if (waUser.name !== displayName) {
                        waUser.name = displayName;
                        await waUser.save();
                    }
                } else {
                    await WAUser.findOrCreate(userId, displayName);
                }
            } else {
                if (waUser && waUser.name && waUser.name !== 'Member' && waUser.name !== 'Player') {
                    displayName = waUser.name;
                }
            }

            // Fallback to Tournament Participants
            if (!displayName || displayName === 'Player' || displayName === 'Member') {
                const active = await Tournament.getActive();
                if (active) {
                    const participant = active.participants.find(p => p.id === userId);
                    if (participant && participant.name) displayName = participant.name;
                }
            }

            // Final fallback
            if (!displayName || displayName === 'Member') displayName = 'Player';

            // Determine Role (Lowercase!)
            const role = isOwner ? 'admin' : 'user';

            // Save to database
            const newToken = new AuthToken({
                userId,
                token,
                role,
                name: displayName
            });
            await newToken.save();

            // Web link URL
            const webLink = `https://nomercy.my.id/auth/magic?token=${token}`;

            const msg = `
🔐 *MAGIC LINK LOGIN*
━━━━━━━━━━━━━━━━━━━━
Halo ${role === 'admin' ? 'Admin 👑' : `*${displayName}*`},

Klik link di bawah ini untuk masuk ke Web Panel.
(Tidak perlu username/password)

🔗 ${webLink}

⚠️ _Link ini hanya berlaku untuk 1 jam dan akan hangus setelah digunakan. Jangan bagikan link ini ke siapapun!_
            `.trim();

            if (isGroup) {
                // Send nicely to PM
                try {
                    await socket.sendMessage(sender, { text: msg });
                    return reply('✅ Link login rahasia telah dikirim melalui Private Message (Chat Pribadi). Silakan cek pesan dari saya.');
                } catch (e) {
                    console.error('Failed to send PM:', e);
                    return reply('❌ Gagal mengirim Private Message. Pastikan kamu sudah pernah chat bot ini secara pribadi.');
                }
            } else {
                // Already in PM
                return reply(msg);
            }

        } catch (error) {
            console.error('Login error:', error);
            return reply('❌ Gagal membuat link login. Coba lagi nanti.');
        }
    }
};
