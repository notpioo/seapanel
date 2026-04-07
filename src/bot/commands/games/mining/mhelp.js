/**
 * .mhelp - Mining Commands Help
 * Shows all available mining commands compactly
 */

module.exports = {
    name: 'mhelp',
    description: 'Panduan semua perintah game Mining',
    category: 'games',
    usage: '.mhelp',
    aliases: ['mguide', 'mininghelp'],

    execute: async ({ reply, socket, message }) => {
        try {
            const helpText = `
⛏️ *PANDUAN SEANA MINING* ⛏️
━━━━━━━━━━━━━━━━━━━━

📊 *Dasar & Profil*
• *.mining* : Buka dashboard profilmu.
• *.mine* : Mulai menambang (Gacha ore).
• *.mtop* : Papan peringkat (Leaderboard).

🏭 *Fasilitas & Upgrade*
• *.mfloor* : Cek & Pindah lantai tambang.
• *.mpick* : Info & Upgrade Pickaxe.
• *.mbp*   : Lihat isi Backpack (inventory ore).
• *.mpack* : Upgrade Backpack (tambah kapasitas).
• *.mshop* : Beli Boost XP/Drop (Party).

💰 *Ekonomi & Jual Beli*
• *.msell* : Jual hasil tambang ke sistem (Smart Sell).
• *.msell all* : Paksa jual semua item (Force Sell).
• *.msell [item]* : Jual 1 jenis item spesifik.

🔰 *Quest & Rank*
• *.mrank* : Lihat License Card & benefit rank kamu.
• *.mrank [rank]* : Detail benefit rank tertentu (contoh: *.mrank D*)
• *.mquest* : Papan misi harian personal.
• *.mquest reroll* : Reset quest hari ini (Rank D).
            `.trim();

            const jid = message.key.remoteJid;
            await socket.sendMessage(jid, {
                text: helpText,
                footer: 'Seana Mining',
                buttons: [
                    { buttonId: '.mining', buttonText: { displayText: '📊 DASHBOARD' } },
                    { buttonId: '.mine', buttonText: { displayText: '⛏️ MULAI NAMBANG' } }
                ]
            }, { quoted: message });

        } catch (error) {
            console.error('Mhelp error:', error);
            await reply('❌ Gagal memuat bantuan mining.');
        }
    }
};
