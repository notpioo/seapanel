const BASE_URL = 'https://api.siputzx.my.id/api/stalk/tiktok';

function cleanUrl(s) {
    return String(s || '').trim().replace(/^[`'"]+|[`'"]+$/g, '');
}

function cleanUsername(input) {
    const s = String(input || '').trim();
    if (!s) return '';

    const at = s.startsWith('@') ? s.slice(1) : s;

    const m = at.match(/tiktok\.com\/@([A-Za-z0-9._]+)/i);
    if (m && m[1]) return m[1];

    return at.replace(/[^A-Za-z0-9._]/g, '');
}

function fmtNum(n) {
    const num = Number(n);
    if (!Number.isFinite(num)) return String(n ?? '-');
    return num.toLocaleString('id-ID');
}

async function fetchTiktokStalk(username) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 12000);
    try {
        const url = `${BASE_URL}?username=${encodeURIComponent(username)}`;
        const res = await fetch(url, {
            method: 'GET',
            signal: controller.signal,
            headers: { accept: 'application/json' }
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = await res.json();
        if (!json || json.status !== true || !json.data || !json.data.user || !json.data.stats) {
            throw new Error('Bad response');
        }

        return json.data;
    } finally {
        clearTimeout(t);
    }
}

module.exports = {
    name: 'ttstalk',
    aliases: ['tiktok', 'tiktokstalk', 'stalktt'],
    category: 'general',
    description: 'Stalk profil TikTok via username',
    usage: '.ttstalk <username>',
    ownerOnly: false,

    execute: async ({ reply, socket, message, jid, args }) => {
        const raw = args.join(' ').trim();
        const username = cleanUsername(raw);

        if (!username) {
            return reply(
                '❌ Format salah!\n\n' +
                'Contoh:\n' +
                '• *.ttstalk whtttss*\n' +
                '• *.tiktok whtttss*\n' +
                '• *.ttstalk https://www.tiktok.com/@whtttss*'
            );
        }

        try {
            const data = await fetchTiktokStalk(username);
            const u = data.user;
            const st = data.stats;

            const uniqueId = u.uniqueId || username;
            const nickname = u.nickname || '-';
            const bio = u.signature || '-';
            const verified = u.verified ? '✅' : '❌';

            const profileUrl = `https://www.tiktok.com/@${uniqueId}`;

            const avatarUrl = cleanUrl(u.avatarLarger || u.avatarMedium || u.avatarThumb);

            const caption = (
                `🎵 *TIKTOK STALK*\n` +
                `━━━━━━━━━━━━━━━━━━━━\n\n` +
                `👤 *Nama:* ${nickname}\n` +
                `🔎 *Username:* @${uniqueId}\n` +
                `✅ *Terverifikasi:* ${verified}\n\n` +
                `📝 *Bio:* ${bio}\n\n` +
                `📊 *Statistik:*\n` +
                `• Followers: ${fmtNum(st.followerCount)}\n` +
                `• Following: ${fmtNum(st.followingCount)}\n` +
                `• Likes: ${fmtNum(st.heartCount ?? st.heart)}\n` +
                `• Video: ${fmtNum(st.videoCount)}\n\n` +
                `🔗 ${profileUrl}`
            ).trim();

            const send = global.__sankaSendMessage || socket.sendMessage.bind(socket);

            if (avatarUrl) {
                try {
                    await send(jid, { image: { url: avatarUrl }, caption }, { quoted: message });
                    return;
                } catch (e) {
                    return reply(caption);
                }
            }

            return reply(caption);
        } catch (e) {
            return reply('❌ Gagal stalk TikTok. Pastikan username benar dan coba lagi nanti.');
        }
    }
};