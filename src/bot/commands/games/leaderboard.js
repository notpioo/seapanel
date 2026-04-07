
const { RPGPlayer, RPGHero, RPGConfig, RPGItem } = require('../../../models');

const fmt = (n) => new Intl.NumberFormat('en-US').format(n);

module.exports = {
    name: 'toprpg',
    description: 'Lihat peringkat pemain RPG terkuat (Top CP)',
    category: 'games',
    usage: '.toprpg',
    aliases: ['topcp', 'lb', 'leaderboard'],

    execute: async ({ reply, sender }) => {
        try {
            // 1. Ambil Data Referensi Sekali Saja
            const config = await RPGConfig.getConfig();
            const heroesMap = await RPGHero.getHeroesMap();

            // Fetch Items Map for accurate CP calculation
            const items = await RPGItem.find();
            const itemsMap = {};
            items.forEach(i => itemsMap[i.itemId] = i);

            // 2. Ambil Semua Player
            // Optimasi: Hanya ambil field yang diperlukan jika memungkinkan,
            // tapi karena CP butuh heroes & inventory lengkap, kita perlu full doc.
            const players = await RPGPlayer.find();

            if (players.length === 0) {
                return reply('Belum ada pemain RPG di server ini.');
            }

            // 3. Hitung CP untuk setiap player
            const leaderboard = players.map(p => {
                // Hitung stat dinamis
                const stats = p.calcStats(heroesMap, config, itemsMap);

                // Coba dapatkan nama, dari pushName (disimpan di DB? Belum ada field nama di RPGPlayer).
                // Kita gunakan phoneNumber formatted sebagai nama sementara.
                let name = p.phoneNumber.replace('@s.whatsapp.net', '');
                // Format: 62812... -> +62 812...

                return {
                    id: p.phoneNumber,
                    name: name,
                    level: p.level,
                    cp: stats.cp,
                    title: stats.cp > 10000 ? '🔥' : (stats.cp > 5000 ? '⚔️' : '')
                };
            });

            // 4. Sort Descending by CP
            leaderboard.sort((a, b) => b.cp - a.cp);

            // 5. Ambil Top 10
            const top10 = leaderboard.slice(0, 10);

            // 6. Cek Posisi Sender
            const myRank = leaderboard.findIndex(p => p.id === sender) + 1;
            const myData = leaderboard.find(p => p.id === sender);

            // 7. Format Output
            let txt = `🏆 *TOP 10 STRONGEST WARRIORS*\n`;
            txt += `Server Leaderboard (Based on CP)\n`;
            txt += `──────────────────\n`;

            const medals = ['🥇', '🥈', '🥉'];

            top10.forEach((p, index) => {
                const rank = index + 1;
                const medal = medals[index] || `#${rank}`;
                const bold = p.id === sender ? '*' : ''; // Highlight diri sendiri

                txt += `${medal} ${bold}${p.name}${bold}\n`;
                txt += `   └─ CP: ${fmt(p.cp)} | Lv.${p.level} ${p.title}\n`;
            });

            txt += `──────────────────\n`;
            if (myRank > 0) {
                txt += `🫵 *Posisi Kamu:* #${myRank}\n`;
                txt += `📊 CP: ${fmt(myData.cp)} | Lv.${myData.level}`;
            } else {
                txt += `Kamu belum terdaftar di RPG. Ketik .rpg`;
            }

            return reply(txt);

        } catch (error) {
            console.error('LEADERBOARD Error:', error);
            return reply('Gagal memuat leaderboard.');
        }
    }
};
