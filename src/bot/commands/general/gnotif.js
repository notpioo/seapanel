const GameNotifConfig = require('../../../models/GameNotifConfig');
const gameNotifier = require('../../utils/gameNotifier');

module.exports = {
    name: 'gnotif',
    description: 'Kelola notifikasi game gratis di group ini',
    category: 'general',
    usage: '.gnotif on | off | set <interval> | status | cek',
    aliases: ['gamenotif', 'fgame'],

    execute: async ({ reply, jid, isGroup, args, isOwner }) => {
        if (!isGroup) return reply('⚠️ Command ini hanya bisa dipakai di dalam group!');

        const sub = (args[0] || '').toLowerCase();

        if (!sub || sub === 'help') {
            return reply(
                `🎮 *Game Notifier*\n\n` +
                `*.gnotif on* — Aktifkan notif game gratis di group ini\n` +
                `*.gnotif off* — Matikan notif\n` +
                `*.gnotif set 30s* — Set interval (contoh: 30s, 30m, 2h, 1d)\n` +
                `*.gnotif status* — Lihat status & konfigurasi\n` +
                `*.gnotif cek* — Cek sekarang tanpa nunggu interval\n` +
                `*.gnotif reset* — Reset cache (kirim ulang semua game)`
            );
        }

        if (sub === 'on') {
            let cfg = await GameNotifConfig.findOne({ groupId: jid });
            if (cfg && cfg.isActive) {
                return reply(
                    `✅ Notif game gratis sudah aktif di group ini!\n` +
                    `Interval: ${gameNotifier.formatIntervalLabel(cfg.intervalMinutes)}\n\n` +
                    `Gunakan *.gnotif set <interval>* untuk ubah interval.`
                );
            }

            if (!cfg) {
                cfg = new GameNotifConfig({ groupId: jid });
            } else {
                cfg.isActive = true;
            }
            await cfg.save();

            return reply(
                `✅ *Notif game gratis diaktifkan!*\n\n` +
                `Interval default: *1 jam*\n` +
                `Bot akan mengirim notif game gratis dari Steam, Epic, & GOG ke group ini.\n\n` +
                `Ubah interval: *.gnotif set 30m* / *2h* / *1d*\n` +
                `Matikan: *.gnotif off*`
            );
        }

        if (sub === 'off') {
            const cfg = await GameNotifConfig.findOne({ groupId: jid });
            if (!cfg || !cfg.isActive) {
                return reply('ℹ️ Notif game gratis belum aktif di group ini.');
            }
            cfg.isActive = false;
            await cfg.save();
            return reply('🔕 Notif game gratis dimatikan untuk group ini.');
        }

        if (sub === 'set') {
            const intervalStr = args[1];
            if (!intervalStr) {
                return reply(
                    `⚠️ Masukkan interval!\n\n` +
                    `Contoh:\n` +
                    `• *.gnotif set 30s* — setiap 30 detik\n` +
                    `• *.gnotif set 30m* — setiap 30 menit\n` +
                    `• *.gnotif set 2h* — setiap 2 jam\n` +
                    `• *.gnotif set 1d* — setiap 1 hari`
                );
            }

            const minutes = gameNotifier.parseInterval(intervalStr);
            if (!minutes) {
                return reply('❌ Format interval tidak valid. Gunakan: *30s*, *30m*, *2h*, *1d*, dll.');
            }
            if (minutes < 0.5) {
                return reply('⚠️ Interval minimal 30 detik (30s).');
            }

            let cfg = await GameNotifConfig.findOne({ groupId: jid });
            if (!cfg) cfg = new GameNotifConfig({ groupId: jid });
            cfg.intervalMinutes = minutes;
            cfg.isActive = true;
            await cfg.save();

            return reply(
                `✅ *Interval diubah!*\n\n` +
                `Notif game gratis akan dikirim setiap *${gameNotifier.formatIntervalLabel(minutes)}*.\n` +
                `Status: Aktif`
            );
        }

        if (sub === 'status') {
            const cfg = await GameNotifConfig.findOne({ groupId: jid });
            if (!cfg) {
                return reply(
                    `📊 *Game Notifier — Status*\n\n` +
                    `Status: ❌ Belum aktif\n\n` +
                    `Aktifkan dengan *.gnotif on*`
                );
            }

            const now = new Date();
            const nextCheck = cfg.lastCheck
                ? new Date(cfg.lastCheck.getTime() + cfg.intervalMinutes * 60 * 1000)
                : new Date();
            const minsLeft = Math.max(0, Math.round((nextCheck - now) / 1000 / 60));

            let txt = `📊 *Game Notifier — Status*\n\n`;
            txt += `Status: ${cfg.isActive ? '✅ Aktif' : '❌ Nonaktif'}\n`;
            txt += `Interval: *${gameNotifier.formatIntervalLabel(cfg.intervalMinutes)}*\n`;
            txt += `Terakhir cek: ${cfg.lastCheck ? cfg.lastCheck.toLocaleString('id-ID') : 'Belum pernah'}\n`;
            txt += `Cek berikutnya: ${cfg.isActive ? `~${minsLeft} menit lagi` : '-'}\n`;
            txt += `Game ternotif: ${cfg.notifiedTitles.length} judul`;

            return reply(txt);
        }

        if (sub === 'cek') {
            let cfg = await GameNotifConfig.findOne({ groupId: jid });
            if (!cfg) cfg = new GameNotifConfig({ groupId: jid, isActive: false });

            await reply('🔍 Mengecek game gratis terbaru...');

            try {
                const games = await gameNotifier.fetchGames();

                if (games.length === 0) {
                    return reply(`ℹ️ Tidak ada game gratis yang tersedia saat ini.`);
                }

                await gameNotifier.sendGamesToGroup(jid, games);
            } catch (e) {
                return reply(`❌ Gagal mengambil data: ${e.message}`);
            }

            return;
        }

        if (sub === 'reset') {
            const cfg = await GameNotifConfig.findOne({ groupId: jid });
            if (!cfg) return reply('ℹ️ Belum ada konfigurasi notif di group ini.');
            cfg.lastCheck = null;
            await cfg.save();
            return reply('🔄 Timer direset! Notif berikutnya akan dikirim dalam ~15 detik.');
        }

        return reply(`❓ Subcommand tidak dikenal. Ketik *.gnotif help* untuk bantuan.`);
    }
};
