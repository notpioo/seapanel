const API_URL = 'https://api.siputzx.my.id/api/games/tebakgambar';
const engine = require('../../games/tebakgambarEngine');

async function fetchTebakGambar() {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 10000);
    try {
        const res = await fetch(API_URL, {
            method: 'GET',
            signal: controller.signal,
            headers: { 'accept': 'application/json' }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = await res.json();
        if (!json || json.status !== true || !json.data) throw new Error('Bad response');

        const { index, img, jawaban, deskripsi } = json.data;
        if (!img || !jawaban) throw new Error('Missing fields');

        return {
            index,
            img: String(img).trim().replace(/^[`'\"]+|[`'\"]+$/g, ''),
            jawaban: String(jawaban),
            deskripsi: String(deskripsi || '')
        };
    } finally {
        clearTimeout(t);
    }
}

module.exports = {
    name: 'tebakgambar',
    aliases: ['tg', 'gambar'],
    description: 'Game tebak gambar (ambil soal dari API)',
    category: 'games',
    usage: '.tebakgambar',

    execute: async ({ reply, socket, isGroup, jid, sender, message }) => {
        const key = engine.getSessionKey({ isGroup, jid, sender });
        const existing = engine.getSession(key);

        if (existing && !existing.expired) {
            const caption = engine.buildPuzzleCaption(existing);
            try {
                const send = global.__sankaSendMessage || socket.sendMessage.bind(socket);
                await send(jid, { image: { url: existing.img }, caption }, { quoted: message });
                return;
            } catch (e) {
                return reply(caption);
            }
        }

        if (existing?.expired) {
            engine.clearSession(key);
        }

        try {
            const puzzle = await fetchTebakGambar();
            const session = engine.setSession(key, puzzle);

            engine.scheduleExpiry(key, (expiredSession) => {
                const send = global.__sankaSendMessage || socket.sendMessage.bind(socket);
                Promise.resolve(send(jid, {
                    text: `⏱️ *WAKTU HABIS!*\nJawaban: *${expiredSession.jawaban.toUpperCase()}*\n\nMulai lagi: *.tebakgambar*`
                })).catch(() => { });
            });

            const caption = engine.buildPuzzleCaption(session);
            try {
                const send = global.__sankaSendMessage || socket.sendMessage.bind(socket);
                await send(jid, { image: { url: session.img }, caption }, { quoted: message });
                return;
            } catch (e) {
                return reply(caption);
            }
        } catch (e) {
            return reply('❌ Gagal mengambil soal tebak gambar. Coba lagi nanti.');
        }
    }
};

