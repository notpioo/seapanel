const { Tournament } = require('../../../models');

module.exports = {
    name: 'tourney',
    description: 'Tournament management command (Admin Only)',
    category: 'tournament',
    usage: '.tourney <create|delete|status|config|reminder> [args]',
    aliases: ['tournament', 'turnamen'],

    execute: async ({ reply, sender, args, isOwner, socket }) => {
        if (!isOwner) return reply('❌ Khusus Admin!');

        const action = args[0]?.toLowerCase();

        try {
            // --- CREATE ---
            if (action === 'create') {
                const name = args.slice(1).join(' ');
                if (!name) return reply('❌ Masukkan nama turnamen!\nContoh: .tourney create Sanka Cup Season 1');

                // Cek turnamen aktif
                const active = await Tournament.getActive();
                if (active) return reply(`❌ Masih ada turnamen aktif: *${active.name}*\nSelesaikan atau hapus dulu.`);

                const newTourney = new Tournament({
                    name: name,
                    createdBy: sender.replace('@s.whatsapp.net', ''),
                    status: 'registration'
                });

                await newTourney.save();
                return reply(`
🏆 *TOURNAMENT CREATED!* 🏆
━━━━━━━━━━━━━━━━━━━━
Nama: *${name}*
Status: *Pendaftaran Dibuka* ✅

Ayo daftar dengan ketik:
👉 *.join [Nama/Hero]*

Cek peserta: *.peserta*
Start grup: *.startgroup* (Nanti)
                `.trim());
            }

            // --- DELETE ---
            if (action === 'delete') {
                const active = await Tournament.getActive();
                if (!active) return reply('❌ Tidak ada turnamen aktif.');

                if (args[1] !== 'confirm') {
                    return reply(`⚠️ Yakin hapus *${active.name}*? Data akan hilang selamanya.\nKetik: *.tourney delete confirm*`);
                }

                await Tournament.deleteOne({ _id: active._id });
                return reply('🗑️ Turnamen berhasil dihapus.');
            }

            // --- STATUS ---
            if (action === 'status') {
                const active = await Tournament.getActive();
                if (!active) return reply('💤 Tidak ada turnamen aktif.');

                let statusText = '';
                if (active.status === 'registration') statusText = '📝 Pendaftaran';
                if (active.status === 'group') statusText = '⚽ Fase Grup';
                if (active.status === 'playoff') statusText = '⚔️ Playoff Bracket';

                const lobbyInfo = active.lobbyGroupName
                    ? `${active.lobbyGroupName} (ID: ${active.lobbyGroupId.split('@')[0]}...)`
                    : '❌ Belum diset (Gunakan `.setlobby` di grup target)';

                const domain = 'https://nomercy.my.id';
                const webLink = `${domain}/tournament/live`;

                return reply(`
📊 *STATUS TOURNAMENT*
━━━━━━━━━━━━━━━━━━━━
Nama: *${active.name}*
Status: *${statusText}*
Peserta: ${active.participants.length} orang
Format: ${active.config.groupFormat.toUpperCase()} -> ${active.config.playoffFormat.toUpperCase()}

🎯 *Lobby Broadcast:*
${lobbyInfo}

🔗 Live: ${webLink}
                `.trim());
            }

            // --- CONFIG ---
            if (action === 'config') {
                const active = await Tournament.getActive();
                if (!active) return reply('❌ Tidak ada turnamen aktif.');

                const key = args[1]?.toLowerCase();
                const value = args[2]?.toLowerCase();

                if (!key || !value) {
                    return reply(`
🛠️ *CONFIG SETTING*
━━━━━━━━━━━━━━━━━━━━
Gunakan command ini untuk ubah aturan.

👉 *Format Pertandingan:*
.tourney config group [bo1/bo3/bo5]
.tourney config playoff [bo1/bo3/bo5]
.tourney config final [bo1/bo3/bo5/bo7]

👉 *Poin Klasemen:*
.tourney config win [3]
.tourney config draw [1]
.tourney config lose [0]

Current Config:
Group: ${active.config.groupFormat}
Playoff: ${active.config.playoffFormat}
Final: ${active.config.finalFormat}
Poin: W=${active.config.pointsWin}/D=${active.config.pointsDraw}/L=${active.config.pointsLose}
                    `.trim());
                }

                // Update Logic
                if (['group', 'playoff', 'final'].includes(key)) {
                    if (!['bo1', 'bo2', 'bo3', 'bo5', 'bo7'].includes(value)) {
                        return reply('❌ Format harus bo1, bo2, bo3, bo5, atau bo7.');
                    }
                    if (key === 'group') active.config.groupFormat = value;
                    if (key === 'playoff') active.config.playoffFormat = value;
                    if (key === 'final') active.config.finalFormat = value;
                }
                else if (['win', 'draw', 'lose'].includes(key)) {
                    const points = parseInt(value);
                    if (isNaN(points)) return reply('❌ Poin harus berupa angka.');

                    if (key === 'win') active.config.pointsWin = points;
                    if (key === 'draw') active.config.pointsDraw = points;
                    if (key === 'lose') active.config.pointsLose = points;
                }
                else {
                    return reply('❌ Config key tidak dikenali.');
                }

                await active.save();
                return reply(`✅ Config updated: *${key.toUpperCase()}* set to *${value.toUpperCase()}*`);
            }

            // --- REMINDER (NEW) ---
            if (action === 'reminder') {
                const active = await Tournament.getActive();
                if (!active) return reply('❌ Tidak ada turnamen aktif.');

                const rawMatchId = args[1]; // Keep original case for display if needed
                if (!rawMatchId) return reply('❌ Masukkan Match ID!\nContoh: .tourney reminder M1');

                const searchId = rawMatchId.toLowerCase(); // Use lowercase for search

                // Find Match Logic
                let match = null;
                let groupName = '';

                // Check Group Phase
                if (active.status === 'group' && active.groups) {
                    for (const g of active.groups) {
                        if (!g.matches) continue;
                        const m = g.matches.find(x => x.matchId && x.matchId.toLowerCase() === searchId);
                        if (m) {
                            match = m;
                            groupName = g.name;
                            break;
                        }
                    }
                }
                // Check Playoff Phase
                else if (active.status === 'playoff' && active.bracket) {
                    match = active.bracket.find(x => x.matchId && x.matchId.toLowerCase() === searchId);
                    groupName = 'Playoff Bracket';
                }

                if (!match) return reply(`❌ Match ID *${rawMatchId}* tidak ditemukan.`);
                if (!match.p1 || !match.p2) return reply('⚠️ Match ini belum siap (TBD).');

                // Format JID for Mentions
                const p1Jid = match.p1.includes('@s.whatsapp.net') ? match.p1 : `${match.p1}@s.whatsapp.net`;
                const p2Jid = match.p2.includes('@s.whatsapp.net') ? match.p2 : `${match.p2}@s.whatsapp.net`;
                const mentions = [p1Jid, p2Jid];

                const reminderMsg = `
📢 *MATCH REMINDER*
Match ID: *${match.matchId}* (${groupName})

Halo @${match.p1.split('@')[0]} & @${match.p2.split('@')[0]} 👋

Giliran kalian bertanding!
Segera merapat ke Room / Lobby Game.
                `.trim();

                // Send to Lobby Group (Priority)
                if (active.lobbyGroupId && socket) {
                    try {
                        await socket.sendMessage(active.lobbyGroupId, {
                            text: reminderMsg,
                            mentions: mentions
                        });
                        return reply(`✅ Reminder sent to Lobby Group for Match ${match.matchId}`);
                    } catch (e) {
                        console.error('Reminder failed:', e);
                        return reply('❌ Gagal kirim ke Lobby (Cek Bot Admin).');
                    }
                } else {
                    // Fallback: Reply here (use reply function from handler)
                    // Note: 'reply' usually doesn't support mentions array in simple handler, unless customized.
                    // But standard baileys reply is text only.
                    return reply(`⚠️ Lobby Group belum diset (.setlobby). Pesan tidak terkirim ke pemain.`);
                }
            }

            // --- MEMBER (List with @format for easy givspin) ---
            if (action === 'member' || action === 'members') {
                const active = await Tournament.getActive();
                if (!active) return reply('❌ Tidak ada turnamen aktif.');

                if (active.participants.length === 0) return reply('❌ Belum ada peserta.');

                let msg = `👥 *MEMBER LIST (Copy-Paste Format)*\n🏆 ${active.name}\n━━━━━━━━━━━━━━━━━━━━\n\n`;

                const mentions = [];
                active.participants.forEach((p, i) => {
                    const jid = p.id.includes('@s.whatsapp.net') ? p.id : `${p.id}@s.whatsapp.net`;
                    mentions.push(jid);
                    msg += `${i + 1}. @${p.id} — *${p.name}*\n`;
                });

                msg += `\n━━━━━━━━━━━━━━━━━━━━\n`;
                msg += `_Total: ${active.participants.length} peserta_\n\n`;

                // Return with mentions (need socket to mention properly)
                return reply(msg);
            }

            // --- INFO ---
            return reply(`
🛠️ *ADMIN TOURNAMENT*
━━━━━━━━━━━━━━━━━━━━
.tourney create [Nama]
.tourney delete
.tourney status
.tourney config format [bo1/bo3/bo5]
.tourney reminder [MatchID]
.tourney member
            `.trim());

        } catch (error) {
            console.error('Tourney error:', error);
            reply('❌ Error system.');
        }
    }
};
