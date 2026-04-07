const mongoose = require('mongoose');

// Arsip lengkap tournament yang sudah selesai
const tournamentHistorySchema = new mongoose.Schema({
    // Info Dasar
    name: { type: String, required: true },
    season: { type: Number, default: 1 },

    // Hasil Akhir
    champion: { id: String, name: String },
    runnerUp: { id: String, name: String },
    topPlayers: [{
        rank: Number,
        id: String,
        name: String,
        points: Number,
        wins: Number,
        losses: Number,
        gameWin: Number,
        gameLose: Number
    }],

    // Skor Final
    finalScore: { type: [Number], default: [0, 0] },
    finalMatchId: { type: String, default: null },

    // Data Lengkap (snapshot)
    totalParticipants: { type: Number, default: 0 },
    participants: [{ id: String, name: String }],
    config: {
        pointsWin: Number,
        pointsDraw: Number,
        pointsLose: Number,
        groupFormat: String,
        playoffFormat: String,
        finalFormat: String
    },
    rules: { type: [String], default: [] },

    // Standings Grup (Final)
    groupStandings: [{
        groupName: String,
        players: [{
            id: String,
            name: String,
            points: Number,
            win: Number,
            lose: Number,
            draw: Number,
            matchesPlayed: Number,
            gameWin: Number,
            gameLose: Number
        }],
        matches: [{
            matchId: String,
            p1Name: String,
            p2Name: String,
            score: [Number],
            winner: String,
            isFinished: Boolean
        }]
    }],

    // Bracket Playoff (Lengkap)
    bracket: [{
        matchId: String,
        p1: String,
        p1Name: String,
        p2: String,
        p2Name: String,
        score: [Number],
        winner: String,
        format: String,
        isFinished: Boolean
    }],

    // Meta
    createdBy: { type: String },
    startedAt: { type: Date },
    finishedAt: { type: Date, default: Date.now }
});

// Static: Ambil semua riwayat (terbaru dulu)
tournamentHistorySchema.statics.getAll = function () {
    return this.find().sort({ finishedAt: -1 }).lean();
};

// Static: Ambil per season
tournamentHistorySchema.statics.getBySeason = function (season) {
    return this.findOne({ season }).lean();
};

// Static: Hitung season otomatis
tournamentHistorySchema.statics.getNextSeason = async function () {
    const last = await this.findOne().sort({ season: -1 });
    return last ? last.season + 1 : 1;
};

// Static: Arsipkan tournament yang selesai
tournamentHistorySchema.statics.archiveTournament = async function (tournament, finalMatch) {
    const season = await this.getNextSeason();

    // Kumpulkan semua player dari semua grup + urutkan
    const allPlayers = tournament.groups.flatMap(g => g.players);
    const sorted = allPlayers.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.win !== a.win) return b.win - a.win;
        return (b.gameWin - b.gameLose) - (a.gameWin - a.gameLose);
    });

    // Champion & Runner-up dari final match
    const championId = finalMatch.winner;
    const runnerUpId = championId === finalMatch.p1 ? finalMatch.p2 : finalMatch.p1;
    const championName = championId === finalMatch.p1 ? finalMatch.p1Name : finalMatch.p2Name;
    const runnerUpName = runnerUpId === finalMatch.p1 ? finalMatch.p1Name : finalMatch.p2Name;

    // Top players dari klasemen grup
    const topPlayers = sorted.slice(0, 8).map((p, i) => ({
        rank: i + 1,
        id: p.id,
        name: p.name,
        points: p.points || 0,
        wins: p.win || 0,
        losses: p.lose || 0,
        gameWin: p.gameWin || 0,
        gameLose: p.gameLose || 0
    }));

    // Snapshot group standings
    const groupStandings = tournament.groups.map(g => ({
        groupName: g.name,
        players: g.players.map(p => ({
            id: p.id,
            name: p.name,
            points: p.points || 0,
            win: p.win || 0,
            lose: p.lose || 0,
            draw: p.draw || 0,
            matchesPlayed: p.matchesPlayed || 0,
            gameWin: p.gameWin || 0,
            gameLose: p.gameLose || 0
        })),
        matches: g.matches.map(m => ({
            matchId: m.matchId,
            p1Name: m.p1Name,
            p2Name: m.p2Name,
            score: m.score,
            winner: m.winner,
            isFinished: m.isFinished
        }))
    }));

    // Snapshot bracket
    const bracket = tournament.bracket.map(m => ({
        matchId: m.matchId,
        p1: m.p1,
        p1Name: m.p1Name,
        p2: m.p2,
        p2Name: m.p2Name,
        score: m.score,
        winner: m.winner,
        format: m.format,
        isFinished: m.isFinished
    }));

    const archive = await this.create({
        name: tournament.name,
        season,
        champion: { id: championId, name: championName },
        runnerUp: { id: runnerUpId, name: runnerUpName },
        topPlayers,
        finalScore: finalMatch.score,
        finalMatchId: finalMatch.matchId,
        totalParticipants: tournament.participants.length,
        participants: tournament.participants.map(p => ({ id: p.id, name: p.name })),
        config: {
            pointsWin: tournament.config.pointsWin,
            pointsDraw: tournament.config.pointsDraw,
            pointsLose: tournament.config.pointsLose,
            groupFormat: tournament.config.groupFormat,
            playoffFormat: tournament.config.playoffFormat,
            finalFormat: tournament.config.finalFormat
        },
        groupStandings,
        bracket,
        rules: tournament.rules || [],
        createdBy: tournament.createdBy,
        startedAt: tournament.createdAt,
        finishedAt: new Date()
    });

    console.log(`[Tournament] Archived: ${tournament.name} as Season ${season}`);
    return archive;
};

module.exports = mongoose.model('TournamentHistory', tournamentHistorySchema);
