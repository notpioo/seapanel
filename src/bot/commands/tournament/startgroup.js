const { Tournament } = require('../../../models');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'startgroup',
    description: 'Start group stage (Regular Season)',
    category: 'tournament',
    usage: '.startgroup',
    aliases: ['mulaigrup'],

    execute: async ({ reply, isOwner, socket }) => {
        if (!isOwner) return reply('❌ Khusus Admin!');

        try {
            const active = await Tournament.getActive();
            const domain = 'https://nomercy.my.id';
            const webLink = `${domain}/tournament/live`;

            // Prepare Thumbnail
            let thumbnail = null;
            const localLogoPath = path.join(process.cwd(), 'src', 'assets', 'tournament_logo.jpg');
            try {
                if (fs.existsSync(localLogoPath)) {
                    thumbnail = fs.readFileSync(localLogoPath);
                }
            } catch (err) {
                console.error("Failed to load local logo:", err);
            }

            if (!active) return reply('❌ Tidak ada turnamen aktif.');
            if (active.status !== 'registration') return reply(`⚠️ Status turnamen bukan pendaftaran (${active.status}).`);
            if (active.participants.length < 2) return reply('❌ Minimal 2 peserta untuk memulai.');

            // --- 1. SETUP GROUP (SINGLE REGULAR SEASON) ---
            active.groups = [];
            const players = active.participants.map(p => ({
                id: p.id,
                name: p.name,
                points: 0, win: 0, lose: 0, draw: 0, matchesPlayed: 0
            }));

            // Create Group Object
            const group = {
                name: 'Regular Season',
                players: players,
                matches: []
            };

            // --- 2. GENERATE MATCHES (ROUND ROBIN) ---
            let matchCount = 1;
            for (let i = 0; i < players.length; i++) {
                for (let j = i + 1; j < players.length; j++) {
                    group.matches.push({
                        matchId: `M${matchCount++}`,
                        p1: players[i].id,
                        p1Name: players[i].name,
                        p2: players[j].id,
                        p2Name: players[j].name,
                        score: [0, 0],
                        format: active.config.groupFormat
                    });
                }
            }

            active.groups.push(group);
            active.status = 'group';
            await active.save();

            // --- 3. BROADCAST & REPLY ---
            const infoMsg = `
🏆 *TOURNAMENT STARTED!* 🏆
━━━━━━━━━━━━━━━━━━━━
Fase: *Regular Season* (Klasemen)
Total Peserta: ${players.length}
Total Match: ${group.matches.length}

Semua peserta tergabung dalam satu grup besar.
Kumpulkan poin sebanyak-banyaknya untuk lolos ke Playoff!

Cek Klasemen & Jadwal:
🔗 ${webLink}
            `.trim();

            reply('✅ Tournament Started! Broadcast sent to Lobby.');

            if (active.lobbyGroupId && socket) {
                const adReply = {
                    title: "🚀 KICKOFF TOURNAMENT",
                    body: active.name,
                    sourceUrl: webLink,
                    mediaType: 1,
                    renderLargerThumbnail: true
                };

                // Use local buffer if available, else fallback URL
                if (thumbnail) {
                    adReply.thumbnail = thumbnail;
                } else {
                    adReply.thumbnailUrl = "https://telegra.ph/file/1e2617f6927d6d678d781.jpg";
                }

                try {
                    await socket.sendMessage(active.lobbyGroupId, {
                        text: infoMsg,
                        contextInfo: { externalAdReply: adReply }
                    });
                } catch (e) {
                    console.error('Broadcast failed', e);
                }
            } else {
                reply(infoMsg);
            }

        } catch (error) {
            console.error('StartGroup error:', error);
            reply('❌ Gagal memulai grup.');
        }
    }
};
