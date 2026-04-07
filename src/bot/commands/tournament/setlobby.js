const { Tournament } = require('../../../models');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'setlobby',
    description: 'Set current group as tournament lobby and announce registration',
    category: 'tournament',
    usage: '.setlobby',
    aliases: ['setgrup', 'settourneygroup'],

    execute: async ({ reply, socket, message, isOwner, isGroup }) => {
        if (!isOwner) return reply('❌ Khusus Admin/Owner!');
        if (!isGroup) return reply('❌ Perintah ini hanya bisa dijalankan di dalam Grup!');

        try {
            const active = await Tournament.getActive();
            if (!active) return reply('❌ Tidak ada turnamen aktif.');

            const groupId = message.key.remoteJid;

            // Fetch Group Name
            let groupName = 'Unknown Group';
            try {
                const metadata = await socket.groupMetadata(groupId);
                groupName = metadata.subject;
            } catch (e) {
                console.log('Failed to fetch group metadata, using fallback name');
            }

            // Save to DB
            active.lobbyGroupId = groupId;
            active.lobbyGroupName = groupName;
            await active.save();

            // === PREPARE ANNOUNCEMENT ===
            const domain = 'https://nomercy.my.id';
            const webLink = `${domain}/tournament/live`;

            const announcementMsg = `
📢 *OFFICIAL ANNOUNCEMENT* 📢
━━━━━━━━━━━━━━━━━━━━
🏆 *${active.name}*

Pendaftaran turnamen telah DIBUKA secara resmi di grup ini! 🔥
Siapkan tim/skill terbaik kalian dan rebut gelar juara!

🔴 *CARA DAFTAR:*
Ketik: *.join [Nama/Nick]*
Contoh: *.join SankaPro*

👥 Cek Peserta: *.peserta*
📊 Web Live: ${webLink}

_Jangan sampai kehabisan slot!_
_Let the game begin!_ 🎮🔥
            `.trim();

            const adReply = {
                title: "🏆 OPEN REGISTRATION",
                body: active.name,
                sourceUrl: webLink,
                mediaType: 1,
                renderLargerThumbnail: true,
                thumbnailUrl: "https://telegra.ph/file/1e2617f6927d6d678d781.jpg" // Default fallback
            };

            // Try Local Logo (Priority) - URL Fallback logic handled by "Safe Logic" below
            // Since this is .setlobby (executed IN the lobby), we can just use reply() with adReply context
            // But we want to ensure using URL for safety as learned from setscore debugging.

            // Note: reply() is a wrapper for sendMessage to current jid. 
            // We can construct the full message options.

            await socket.sendMessage(groupId, {
                text: announcementMsg,
                contextInfo: {
                    externalAdReply: adReply
                }
            });

            // Optional: Send simple feedback to admin (if needed, but the main msg is already visible)
            // reply('✅ Lobby set & Announcement sent!'); 

        } catch (error) {
            console.error('SetLobby error:', error);
            reply('❌ Gagal mengatur lobby.');
        }
    }
};
