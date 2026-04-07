const sessions = new Map();

const SESSION_TTL_MS = Number(process.env.SUSUNKATA_TTL_MS) || (30 * 1000);

function nowMs() {
    return Date.now();
}

function getSessionKey({ isGroup, jid, sender }) {
    if (isGroup) return jid;
    return sender.replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@lid', '');
}

function normalizeAnswer(s) {
    return String(s || '')
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '');
}

function formatRemainingMs(ms) {
    const sec = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m <= 0) return `${s}d`;
    return `${m}m ${s}d`;
}

function setSession(key, puzzle) {
    clearSession(key);
    const createdAt = nowMs();
    const expiresAt = createdAt + SESSION_TTL_MS;
    sessions.set(key, {
        index: puzzle.index,
        soal: String(puzzle.soal || ''),
        tipe: String(puzzle.tipe || '-'),
        jawaban: String(puzzle.jawaban || ''),
        answerNorm: normalizeAnswer(puzzle.jawaban),
        createdAt,
        expiresAt,
        timeoutId: null
    });
    return sessions.get(key);
}

function getSession(key) {
    const s = sessions.get(key);
    if (!s) return null;
    if (nowMs() >= s.expiresAt) return { ...s, expired: true };
    return s;
}

function clearSession(key) {
    const s = sessions.get(key);
    if (s?.timeoutId) {
        clearTimeout(s.timeoutId);
    }
    sessions.delete(key);
}

function buildPuzzleMessage(session) {
    const remaining = formatRemainingMs(session.expiresAt - nowMs());
    return [
        '🧩 *SUSUN KATA*',
        '━━━━━━━━━━━━━━━━━━━━',
        '',
        `Kategori: *${session.tipe}*`,
        `Soal: *${session.soal}*`,
        '',
        `⏳ Waktu: ${remaining}`,
        'Ketik jawabannya langsung di chat.'
    ].join('\n');
}

function tryAnswer(key, text) {
    const session = getSession(key);
    if (!session) return { handled: false };

    if (session.expired) {
        clearSession(key);
        return {
            handled: true,
            result: 'expired',
            session
        };
    }

    const guessNorm = normalizeAnswer(text);
    if (!guessNorm) return { handled: false };

    if (guessNorm === session.answerNorm) {
        clearSession(key);
        return {
            handled: true,
            result: 'correct',
            session
        };
    }

    return { handled: false };
}

function scheduleExpiry(key, onExpire) {
    const session = getSession(key);
    if (!session || session.expired) return false;

    const existing = sessions.get(key);
    if (!existing) return false;

    if (existing.timeoutId) {
        clearTimeout(existing.timeoutId);
    }

    const delayMs = Math.max(0, existing.expiresAt - nowMs());
    existing.timeoutId = setTimeout(() => {
        const current = sessions.get(key);
        if (!current) return;
        if (nowMs() < current.expiresAt) return;
        sessions.delete(key);
        try {
            onExpire(current);
        } catch (_) { }
    }, delayMs);

    return true;
}

module.exports = {
    SESSION_TTL_MS,
    buildPuzzleMessage,
    clearSession,
    formatRemainingMs,
    getSession,
    getSessionKey,
    scheduleExpiry,
    setSession,
    tryAnswer
};
