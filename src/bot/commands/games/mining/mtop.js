/**
 * .mtop - Mining Leaderboard (Rebirth Ranking)
 */

const { PlayerMining } = require('../../../../models');

module.exports = {
    name: 'mtop',
    description: 'Lihat peringkat pemain berdasarkan jumlah rebirth',
    category: 'games',
    usage: '.mtop',
    aliases: ['topminer', 'mininglb', 'topmine'],

    execute: async ({ reply, sender, socket, message }) => {
        try {
            const phoneNumber = sender.replace('@s.whatsapp.net', '').replace('@c.us', '');
            const jid = message.key.remoteJid;

            const players = await PlayerMining.find({ rebirthCount: { $gt: 0 } })
                .sort({ rebirthCount: -1, rebirthPoints: -1 })
                .lean();

            const allPlayers = await PlayerMining.find().sort({ rebirthCount: -1, rebirthPoints: -1 }).lean();

            if (allPlayers.length === 0) {
                return reply('Belum ada pemain mining di server ini.');
            }

            const myRank   = allPlayers.findIndex(p => p.phoneNumber === phoneNumber) + 1;
            const myData   = allPlayers.find(p => p.phoneNumber === phoneNumber);

            const top10    = allPlayers.slice(0, 10);
            const medals   = ['🥇', '🥈', '🥉'];
            const mentions = [];

            const getTier = (r) => {
                if (r === 0)     return '⚫';
                if (r < 5)       return '🟤';
                if (r < 10)      return '⚪';
                if (r < 25)      return '🟡';
                if (r < 50)      return '🔵';
                if (r < 100)     return '🟣';
                if (r < 200)     return '🔴';
                if (r < 350)     return '🟠';
                if (r < 500)     return '💛';
                if (r < 750)     return '❄️';
                if (r < 1000)    return '🌊';
                if (r < 1250)    return '🌟';
                if (r < 1500)    return '⚡';
                if (r < 1800)    return '🔥';
                return '👑';
            };

            let txt = `🏆 *TOP REBIRTH RANKING* 🏆\n`;
            txt += `━━━━━━━━━━━━━━━━━━━━\n\n`;

            top10.forEach((p, i) => {
                const medal  = medals[i] || `*#${i + 1}*`;
                const tier   = getTier(p.rebirthCount || 0);
                const rebirth = p.rebirthCount || 0;
                const rp     = p.rebirthPoints || 0;
                mentions.push(`${p.phoneNumber}@s.whatsapp.net`);
                txt += `${medal} @${p.phoneNumber} ${tier}\n`;
                txt += `   └─ Rebirth: *R${rebirth}* | RP: ${rp}\n\n`;
            });

            txt += `━━━━━━━━━━━━━━━━━━━━\n`;

            if (myData) {
                const myTier    = getTier(myData.rebirthCount || 0);
                const myRebirth = myData.rebirthCount || 0;
                const myRp      = myData.rebirthPoints || 0;
                txt += `🫵 *Posisi Kamu:* #${myRank}\n`;
                txt += `${myTier} Rebirth: *R${myRebirth}* | RP: ${myRp}`;
            } else {
                txt += `Kamu belum bermain mining. Ketik _.mine_`;
            }

            await socket.sendMessage(jid, {
                text: txt.trim(),
                mentions,
                footer: 'Seana Mining',
                buttons: [
                    { buttonId: '.mine',     buttonText: { displayText: '⛏️ MINE' } },
                    { buttonId: '.mrebirth', buttonText: { displayText: '🔄 REBIRTH' } }
                ]
            }, { quoted: message });

        } catch (err) {
            console.error('MTOP Error:', err);
            return reply('Gagal memuat leaderboard.');
        }
    }
};
