const mongoose = require('mongoose');

// Schema untuk satu pertandingan (Match)
const matchSchema = new mongoose.Schema({
    matchId: { type: String, required: true }, // e.g., "A1" (Group A Match 1) or "QF1" (Quarter Final 1)
    p1: { type: String, default: null }, // Phone number Player 1 (null if waiting for bracket)
    p1Name: { type: String, default: 'TBD' }, // Cache name for display
    p2: { type: String, default: null }, // Phone number Player 2
    p2Name: { type: String, default: 'TBD' },
    score: { type: [Number], default: [0, 0] }, // [Score P1, Score P2]
    winner: { type: String, default: null },
    format: { type: String, default: 'bo1' }, // bo1, bo2, bo3, bo5, bo7
    games: [{ // History per game for BO3/BO5 (siapa menang game 1, game 2, dst)
        gameNumber: Number,
        winner: String,
        duration: String
    }],
    nextMatchId: { type: String, default: null }, // ID match selanjutnya untuk pemenang (For Bracket)
    nextMatchSlot: { type: Number, default: null }, // 1 (as P1) or 2 (as P2) in next match
    nextLoserMatchId: { type: String, default: null }, // ID match selanjutnya untuk YANG KALAH (Lower Bracket)
    nextLoserMatchSlot: { type: Number, default: null }, // 1 or 2
    bracketType: { type: String, enum: ['upper', 'lower', 'final'], default: 'upper' }, // Penanda Upper/Lower
    bets: [{
        userId: String,
        choice: String, // Player ID
        userName: String // Cache name for display
    }],
    isBetOpen: { type: Boolean, default: false }, // Status Open/Close Bet
    isFinished: { type: Boolean, default: false },
    scheduledTime: { type: Date, default: null }
});

// Schema untuk satu Grup (Fase Klasemen)
const groupSchema = new mongoose.Schema({
    name: { type: String, required: true }, // "Group A"
    players: [{
        id: String, // Phone number
        name: String, // Display Name
        points: { type: Number, default: 0 },
        win: { type: Number, default: 0 }, // Match Win
        lose: { type: Number, default: 0 }, // Match Lose
        draw: { type: Number, default: 0 },
        matchesPlayed: { type: Number, default: 0 },
        gameWin: { type: Number, default: 0 }, // Game Win (e.g 2 in 2-1)
        gameLose: { type: Number, default: 0 }, // Game Lose (e.g 1 in 2-1)
        buchholz: { type: Number, default: 0 } // Tie-breaker score (optional)
    }],
    matches: [matchSchema] // Jadwal match di grup ini
});

// Schema Utama Turnamen
const tournamentSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    status: {
        type: String,
        enum: ['registration', 'group', 'playoff', 'finished'],
        default: 'registration'
    },
    config: {
        playoffType: { type: String, enum: ['single', 'double'], default: 'single' }, // Toggle Single/Double Elim
        pointsWin: { type: Number, default: 3 },
        pointsDraw: { type: Number, default: 1 },
        pointsLose: { type: Number, default: 0 },
        betReward: { type: Number, default: 1 }, // Reward token per win bet
        groupFormat: { type: String, default: 'bo1' }, // Format match fase grup
        playoffFormat: { type: String, default: 'bo3' }, // Format match playoff awal
        finalFormat: { type: String, default: 'bo5' }   // Format Grand Final
    },
    participants: [{
        id: String, // Phone Number
        name: String, // Registered Name (bisa nama hero)
        joinedAt: { type: Date, default: Date.now },
        spinTokens: { type: Number, default: 0 }, // Jatah spin dari admin
        spinsUsed: { type: Number, default: 0 }    // Spin yang sudah dipakai
    }],
    groups: [groupSchema], // Data fase grup
    bracket: [matchSchema], // Data fase playoff
    champion: { type: String, default: null }, // Juara turnamen
    rules: { type: [String], default: [] }, // Dynamic rules set by admin

    // Cross-Group Announcement Config
    lobbyGroupId: { type: String, default: null }, // ID Grup untuk broadcast umum (Squad)
    lobbyGroupName: { type: String, default: null }, // Nama Grup biar Owner gampang cek

    createdBy: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

// Methods Helper
tournamentSchema.methods.addParticipant = async function (phone, name) {
    if (this.status !== 'registration') throw new Error('Pendaftaran sudah ditutup!');
    if (this.participants.find(p => p.id === phone)) throw new Error('Kamu sudah terdaftar!');

    this.participants.push({ id: phone, name: name });
    return this.save();
};

tournamentSchema.methods.removeParticipant = async function (phone) {
    if (this.status !== 'registration') throw new Error('Tidak bisa keluar saat turnamen berjalan!');

    this.participants = this.participants.filter(p => p.id !== phone);
    return this.save();
};

// Static method untuk cari turnamen aktif
tournamentSchema.statics.getActive = function () {
    return this.findOne({ status: { $ne: 'finished' } });
};

const Tournament = mongoose.model('Tournament', tournamentSchema);

module.exports = Tournament;
