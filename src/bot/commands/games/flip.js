/**
 * .flip - Coin Flip Multiplayer Game
 */
const { BotUser, CasinoConfig } = require('../../../models');

// In-memory storage for active flip rooms
const activeFlipRooms = new Map();

module.exports = {
    name: 'flip',
    aliases: ['flipjoin', 'startflip', 'head', 'tail'],
    description: 'Main lempar koin Kasino (Head/Tail)',
    category: 'games',
    usage: '.flip [taruhan] | .flipjoin [taruhan] | .startflip | .head / .tail',

    execute: async ({ reply, message, args, command, isGroup, sender }) => {
        try {
            if (!isGroup) {
                return reply('❌ Game flip hanya dapat dimainkan di dalam grup!');
            }

            const groupId = message.key.remoteJid;
            const phoneNumber = sender.replace('@s.whatsapp.net', '').replace('@c.us', '');

            const config = await CasinoConfig.getConfig();

            if (!config.isEnabled) {
                return reply(`🔧 ${config.maintenanceMsg}`);
            }

            const user = await BotUser.findOne({ phoneNumber });
            if (!user) {
                return reply('❌ Anda belum terdaftar, ketik .dailycsn dulu untuk daftar.');
            }

            const minBet = config.diceMinBet || 10;
            const maxBet = config.diceMaxBet || 5000;

            // --- COMMAND: .flip (Buat Room) ---
            if (command === 'flip') {
                if (activeFlipRooms.has(groupId)) {
                    return reply('❌ Sudah ada room flip yang aktif di grup ini. Ketik *.flipjoin* untuk bergabung atau tunggu game selesai.');
                }

                const bet = parseInt(args[0]);
                if (!bet || isNaN(bet) || bet <= 0) {
                    return reply('❌ Masukkan jumlah taruhan! Contoh: *.flip 100*');
                }

                if (bet < minBet) return reply(`❌ Taruhan minimal ${minBet} KOIN`);
                if (bet > maxBet) return reply(`❌ Taruhan maksimal ${maxBet} KOIN`);

                if ((user.casinoChips || 0) < bet) {
                    return reply('❌ Saldo koin kasino Anda tidak cukup!');
                }

                activeFlipRooms.set(groupId, {
                    creator: phoneNumber,
                    status: 'waiting',
                    players: [{ phone: phoneNumber, bet: bet, choice: null }],
                    createdAt: Date.now()
                });

                user.casinoChips -= bet;
                await user.save();

                return reply(
                    `🪙 *ROOM COIN FLIP DIBUAT* 🪙\n\n` +
                    `Pembuat: @${phoneNumber}\n` +
                    `Taruhan: *${bet.toLocaleString()} KOIN*\n\n` +
                    `Ketik *.flipjoin [taruhan]* untuk ikutan!\n` +
                    `Ketik *.startflip* jika semua pemain sudah siap.\n\n` +
                    `_(Max 6 Pemain | Min ${minBet} - Max ${maxBet} KOIN)_`,
                    { mentions: [`${phoneNumber}@s.whatsapp.net`] }
                );
            }

            // --- COMMAND: .flipjoin (Gabung Room) ---
            if (command === 'flipjoin') {
                const room = activeFlipRooms.get(groupId);
                if (!room) return reply('❌ Tidak ada room flip yang aktif! Ketik *.flip [taruhan]* untuk membuat room baru.');
                if (room.status !== 'waiting') return reply('❌ Game sudah dimulai!');

                if (room.players.length >= 6) return reply('❌ Room penuh! Maksimal 6 pemain.');
                if (room.players.find(p => p.phone === phoneNumber)) return reply('❌ Anda sudah berada di dalam room!');

                const bet = parseInt(args[0]);
                if (!bet || isNaN(bet) || bet <= 0) {
                    return reply('❌ Masukkan jumlah taruhan! Contoh: *.flipjoin 500*');
                }
                if (bet < minBet) return reply(`❌ Taruhan minimal ${minBet} KOIN`);
                if (bet > maxBet) return reply(`❌ Taruhan maksimal ${maxBet} KOIN`);

                if ((user.casinoChips || 0) < bet) {
                    return reply('❌ Saldo koin kasino Anda tidak cukup!');
                }

                room.players.push({ phone: phoneNumber, bet: bet, choice: null });
                user.casinoChips -= bet;
                await user.save();

                const totalPot = room.players.reduce((s, p) => s + p.bet, 0);
                let playersList = room.players.map(p => `@${p.phone} (${p.bet.toLocaleString()})`).join('\n');

                return reply(
                    `🪙 *PEMAIN BERGABUNG* 🪙\n\n` +
                    `Total Pemain: ${room.players.length}/6\n` +
                    `Total Pot: *${totalPot.toLocaleString()} KOIN*\n\n` +
                    `Daftar Pemain:\n${playersList}\n\n` +
                    `Ketik *.startflip* (hanya pembuat room) untuk memulai!`,
                    { mentions: room.players.map(p => `${p.phone}@s.whatsapp.net`) }
                );
            }

            // --- COMMAND: .startflip (Mulai Game) ---
            if (command === 'startflip') {
                const room = activeFlipRooms.get(groupId);
                if (!room) return reply('❌ Tidak ada room flip yang aktif!');
                if (room.creator !== phoneNumber) return reply('❌ Hanya pembuat room yang bisa memulai!');
                if (room.status !== 'waiting') return reply('❌ Game sudah dimulai!');
                if (room.players.length < 2) return reply('❌ Butuh minimal 2 pemain!');

                room.status = 'choosing';

                const totalPot = room.players.reduce((s, p) => s + p.bet, 0);
                let playersList = room.players.map(p => `@${p.phone} (${p.bet.toLocaleString()})`).join('\n');

                return reply(
                    `🪙 *COIN FLIP DIMULAI* 🪙\n\n` +
                    `Total Pot: *${totalPot.toLocaleString()} KOIN*\n` +
                    `Daftar Pemain:\n${playersList}\n\n` +
                    `Silakan tentukan pilihan Anda:\n` +
                    `*.head* = Kepala 👤\n` +
                    `*.tail* = Ekor 🦅\n\n` +
                    `(Pemain yang tidak memilih akan hangus)`,
                    { mentions: room.players.map(p => `${p.phone}@s.whatsapp.net`) }
                );
            }

            // --- COMMAND: .head / .tail ---
            if (command === 'head' || command === 'tail') {
                const room = activeFlipRooms.get(groupId);
                if (!room || room.status !== 'choosing') return;

                const playerIndex = room.players.findIndex(p => p.phone === phoneNumber);
                if (playerIndex === -1) return;

                if (room.players[playerIndex].choice !== null) {
                    return reply(`❌ @${phoneNumber}, Anda sudah memilih ${room.players[playerIndex].choice === 'head' ? 'HEAD 👤' : 'TAIL 🦅'}`, { mentions: [`${phoneNumber}@s.whatsapp.net`] });
                }

                room.players[playerIndex].choice = command;

                const allChosen = room.players.every(p => p.choice !== null);

                if (allChosen) {
                    room.status = 'flipping';

                    const totalPot = room.players.reduce((s, p) => s + p.bet, 0);
                    const winRate = (config.diceWinRate || 40) / 100;
                    const multiplier = config.diceMultiplier || 2;

                    // Calculate payouts per side
                    let payoutIfHead = 0;
                    let payoutIfTail = 0;
                    room.players.forEach(p => {
                        const payout = Math.floor(p.bet * multiplier);
                        if (p.choice === 'head') payoutIfHead += payout;
                        if (p.choice === 'tail') payoutIfTail += payout;
                    });

                    let riggedResult = '';

                    if (Math.random() < winRate) {
                        riggedResult = payoutIfHead >= payoutIfTail ? 'head' : 'tail';
                    } else {
                        riggedResult = payoutIfHead < payoutIfTail ? 'head' : 'tail';
                        if (payoutIfHead === payoutIfTail) {
                            riggedResult = Math.random() < 0.5 ? 'head' : 'tail';
                        }
                    }

                    // Process winnings
                    let winningText = '';
                    let mentions = [];

                    for (const p of room.players) {
                        const botUserDb = await BotUser.findOne({ phoneNumber: p.phone });
                        if (!botUserDb) continue;

                        mentions.push(`${p.phone}@s.whatsapp.net`);
                        const playerPayout = Math.floor(p.bet * multiplier);

                        if (p.choice === riggedResult) {
                            botUserDb.casinoChips += playerPayout;
                            if (!botUserDb.flipStats) botUserDb.flipStats = { games: 0, wins: 0, losses: 0, profit: 0 };
                            botUserDb.flipStats.games += 1;
                            botUserDb.flipStats.wins += 1;
                            botUserDb.flipStats.profit += (playerPayout - p.bet);
                            await botUserDb.save();
                            winningText += `✅ @${p.phone} (${p.choice === 'head' ? 'HEAD' : 'TAIL'} | ${p.bet.toLocaleString()}) → +${playerPayout.toLocaleString()} KOIN\n`;
                        } else {
                            if (!botUserDb.flipStats) botUserDb.flipStats = { games: 0, wins: 0, losses: 0, profit: 0 };
                            botUserDb.flipStats.games += 1;
                            botUserDb.flipStats.losses += 1;
                            botUserDb.flipStats.profit -= p.bet;
                            await botUserDb.save();
                            winningText += `❌ @${p.phone} (${p.choice === 'head' ? 'HEAD' : 'TAIL'} | ${p.bet.toLocaleString()}) → -${p.bet.toLocaleString()} KOIN\n`;
                        }
                    }

                    const coinEmoji = riggedResult === 'head' ? '👤' : '🦅';

                    const finalMessage =
                        `🪙 *HASIL COIN FLIP* 🪙\n\n` +
                        `Total Pot: *${totalPot.toLocaleString()} KOIN*\n\n` +
                        `       ╔═══════╗\n` +
                        `       ║   ${coinEmoji}    ║\n` +
                        `       ╚═══════╝\n\n` +
                        `Hasil: *${riggedResult === 'head' ? 'HEAD (Kepala) 👤' : 'TAIL (Ekor) 🦅'}*\n\n` +
                        `*RINCIAN HADIAH*\n` +
                        `${winningText}`;

                    activeFlipRooms.delete(groupId);

                    return reply(finalMessage, { mentions });

                } else {
                    return reply(`☑️ @${phoneNumber} memilih ${command === 'head' ? 'HEAD 👤' : 'TAIL 🦅'}. Menunggu pemain lain...`, { mentions: [`${phoneNumber}@s.whatsapp.net`] });
                }
            }

        } catch (error) {
            console.error('Error executing flip game:', error);
            reply('❌ Terjadi kesalahan pada server game.');
        }
    }
};

// Auto-cleanup rooms older than 5 minutes + refund
const ROOM_TIMEOUT = 5 * 60 * 1000;

setInterval(async () => {
    const now = Date.now();
    for (const [groupId, room] of activeFlipRooms.entries()) {
        if (now - room.createdAt > ROOM_TIMEOUT && room.status !== 'flipping') {
            for (const player of room.players) {
                try {
                    const u = await BotUser.findOne({ phoneNumber: player.phone });
                    if (u) {
                        u.casinoChips += player.bet;
                        await u.save();
                    }
                } catch (e) {
                    console.error('Flip cleanup refund error:', e);
                }
            }
            activeFlipRooms.delete(groupId);
            console.log(`[Flip] Auto-cleaned expired room in ${groupId}`);
        }
    }
}, 60 * 1000);
