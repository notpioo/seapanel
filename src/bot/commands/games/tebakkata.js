const API_URL = 'https://api.siputzx.my.id/api/games/tebakkata';
const engine = require('../../games/tebakkataEngine');

async function fetchTebakKata() {
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

        const { index, soal, jawaban } = json.data;
        if (!soal || !jawaban) throw new Error('Missing fields');

        return {
            index,
            soal: String(soal),
            jawaban: String(jawaban)
        };
    } finally {
        clearTimeout(t);
    }
}

module.exports = {
    name: 'tebakkata',
    aliases: ['tk', 'tebak'],
    description: 'Game tebak kata (ambil soal dari API)',
    category: 'games',
    usage: '.tebakkata',

    execute: async ({ reply, socket, isGroup, jid, sender }) => {
        const key = engine.getSessionKey({ isGroup, jid, sender });
        const existing = engine.getSession(key);

        if (existing && !existing.expired) {
            return reply(engine.buildPuzzleMessage(existing));
        }

        if (existing?.expired) {
            engine.clearSession(key);
        }

        try {
            const puzzle = await fetchTebakKata();
            const session = engine.setSession(key, puzzle);

            engine.scheduleExpiry(key, (expiredSession) => {
                const send = global.__sankaSendMessage || socket.sendMessage.bind(socket);
                Promise.resolve(send(jid, {
                    text: `⏱️ *WAKTU HABIS!*\nJawaban: *${expiredSession.jawaban.toUpperCase()}*\n\nMulai lagi: *.tebakkata*`
                })).catch(() => { });
            });

            return reply(engine.buildPuzzleMessage(session));
        } catch (e) {
            return reply('❌ Gagal mengambil soal tebak kata. Coba lagi nanti.');
        }
    }
};
