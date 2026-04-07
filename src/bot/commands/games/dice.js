/**
 * .dice - Hi-Lo 9 Dice Multiplayer Game
 */
const { BotUser, CasinoConfig } = require('../../../models');

// In-memory storage for active dice rooms
// Key: groupId, Value: room context object
const activeRooms = new Map();

// Generate string array of 9 dice emojis
function formatDiceGrid(results) {
    const diceIcons = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    const emojis = results.map(r => diceIcons[r - 1]);

    return `[ ${emojis[0]} ] [ ${emojis[1]} ] [ ${emojis[2]} ]
[ ${emojis[3]} ] [ ${emojis[4]} ] [ ${emojis[5]} ]
[ ${emojis[6]} ] [ ${emojis[7]} ] [ ${emojis[8]} ]`;
}

module.exports = {
    name: 'dice',
    aliases: ['joindice', 'startdice', 'k', 'b'],
    description: 'Main tebak 9 dadu Kasino (Kecil/Besar)',
    category: 'games',
    usage: '.dice [taruhan] | .joindice [taruhan] | .startdice | K / B',

    execute: async ({ reply, socket, message, args, command, isGroup, sender }) => {
        try {
            if (!isGroup) {
                return reply('❌ Game dice hanya dapat dimainkan di dalam grup!');
            }

            const groupId = message.key.remoteJid;
            const phoneNumber = sender.replace('@s.whatsapp.net', '').replace('@c.us', '');

            const config = await CasinoConfig.getConfig();

            if (!config.isEnabled) {
                return reply(`🔧 ${config.maintenanceMsg}`);
            }

            // Find user
            const user = await BotUser.findOne({ phoneNumber });
            if (!user) {
                return reply('❌ Anda belum terdaftar, ketik .dailycsn dulu untuk daftar.');
            }

            // --- COMMAND: .dice (Buat Room) ---
            if (command === 'dice') {
                if (activeRooms.has(groupId)) {
                    return reply('❌ Sudah ada room dice yang aktif di grup ini. Ketik *.joindice* untuk bergabung atau tunggu game selesai.');
                }

                const bet = parseInt(args[0]);
                if (!bet || isNaN(bet) || bet <= 0) {
                    return reply('❌ Masukkan jumlah taruhan yang valid! Contoh: *.dice 100*');
                }

                if (bet < config.diceMinBet) return reply(`❌ Taruhan minimal ${config.diceMinBet} KOIN`);
                if (bet > config.diceMaxBet) return reply(`❌ Taruhan maksimal ${config.diceMaxBet} KOIN`);

                if ((user.casinoChips || 0) < bet) {
                    return reply('❌ Saldo koin kasino Anda tidak cukup!');
                }

                // Create room
                activeRooms.set(groupId, {
                    creator: phoneNumber,
                    status: 'waiting',
                    players: [{ phone: phoneNumber, bet: bet, choice: null }],
                    createdAt: Date.now()
                });

                // Deduct balance
                user.casinoChips -= bet;
                await user.save();

                return reply(
                    `🎲 *ROOM DICE DIBUAT* 🎲\n\n` +
                    `Pembuat: @${phoneNumber}\n` +
                    `Taruhan: *${bet.toLocaleString()} KOIN*\n\n` +
                    `Ketik *.joindice [taruhan]* untuk ikutan bermain!\n` +
                    `Ketik *.startdice* jika semua pemain sudah siap.\n\n` +
                    `_(Max 6 Pemain | Min ${config.diceMinBet} - Max ${config.diceMaxBet} KOIN)_`,
                    { mentions: [`${phoneNumber}@s.whatsapp.net`] }
                );
            }

            // --- COMMAND: .joindice (Gabung Room) ---
            if (command === 'joindice') {
                const room = activeRooms.get(groupId);
                if (!room) return reply('❌ Tidak ada room dice yang aktif! Ketik *.dice [taruhan]* untuk membuat room baru.');
                if (room.status !== 'waiting') return reply('❌ Game sudah dimulai/berlangsung!');

                if (room.players.length >= 6) return reply('❌ Room penuh! Maksimal 6 pemain.');
                if (room.players.find(p => p.phone === phoneNumber)) return reply('❌ Anda sudah berada di dalam room!');

                const bet = parseInt(args[0]);
                if (!bet || isNaN(bet) || bet <= 0) {
                    return reply('❌ Masukkan jumlah taruhan! Contoh: *.joindice 500*');
                }
                if (bet < config.diceMinBet) return reply(`❌ Taruhan minimal ${config.diceMinBet} KOIN`);
                if (bet > config.diceMaxBet) return reply(`❌ Taruhan maksimal ${config.diceMaxBet} KOIN`);

                // Check balance
                if ((user.casinoChips || 0) < bet) {
                    return reply('❌ Saldo koin kasino Anda tidak cukup!');
                }

                room.players.push({ phone: phoneNumber, bet: bet, choice: null });
                user.casinoChips -= bet;
                await user.save();

                const totalPot = room.players.reduce((s, p) => s + p.bet, 0);
                let playersList = room.players.map(p => `@${p.phone} (${p.bet.toLocaleString()})`).join('\n');

                return reply(
                    `🎲 *PEMAIN BERGABUNG* 🎲\n\n` +
                    `Total Pemain: ${room.players.length}/6\n` +
                    `Total Pot: *${totalPot.toLocaleString()} KOIN*\n\n` +
                    `Daftar Pemain:\n${playersList}\n\n` +
                    `Ketik *.startdice* (hanya pembuat room) untuk memulai!`,
                    { mentions: room.players.map(p => `${p.phone}@s.whatsapp.net`) }
                );
            }

            // --- COMMAND: .startdice (Mulai Game) ---
            if (command === 'startdice') {
                const room = activeRooms.get(groupId);
                if (!room) return reply('❌ Tidak ada room dice yang aktif!');
                if (room.creator !== phoneNumber) return reply('❌ Hanya pembuat room yang bisa memulai game!');
                if (room.status !== 'waiting') return reply('❌ Game sudah dimulai!');
                if (room.players.length < 2) return reply('❌ Butuh minimal 2 pemain untuk memulai game!');

                room.status = 'choosing';

                const totalPot = room.players.reduce((s, p) => s + p.bet, 0);
                let playersList = room.players.map(p => `@${p.phone} (${p.bet.toLocaleString()})`).join('\n');

                let textMessage = `🎲 *GAME DICE DIMULAI* 🎲\n\n` +
                    `Total Pot: *${totalPot.toLocaleString()} KOIN*\n` +
                    `Daftar Pemain:\n${playersList}\n\n` +
                    `Silakan tentukan pilihan Anda dengan tombol di bawah!`;

                return socket.sendMessage(
                    groupId,
                    {
                        text: textMessage,
                        footer: 'Sanka Casino V2',
                        title: '🎲 Pilih Tebakan Anda',
                        interactiveButtons: [
                            {
                                name: 'single_select',
                                buttonParamsJson: JSON.stringify({
                                    title: 'Pilih Disini 🎲',
                                    sections: [
                                        {
                                            title: 'Pilihan Tebakan',
                                            rows: [
                                                {
                                                    header: '',
                                                    title: 'KECIL (9-31) 🔴',
                                                    description: 'Tebak hasil dadu kecil',
                                                    id: '.k'
                                                },
                                                {
                                                    header: '',
                                                    title: 'BESAR (32-54) 🔵',
                                                    description: 'Tebak hasil dadu besar',
                                                    id: '.b'
                                                }
                                            ]
                                        }
                                    ]
                                })
                            }
                        ],
                        mentions: room.players.map(p => `${p.phone}@s.whatsapp.net`)
                    }
                );
            }

            // --- COMMAND: K / B (Pilih Besar Kecil) ---
            if (command === 'k' || command === 'b') {
                const room = activeRooms.get(groupId);
                if (!room || room.status !== 'choosing') return; // Silent ignore

                const playerIndex = room.players.findIndex(p => p.phone === phoneNumber);
                if (playerIndex === -1) return; // Silent ignore (not in room)

                if (room.players[playerIndex].choice !== null) {
                    return reply(`❌ @${phoneNumber}, Anda sudah memilih ${room.players[playerIndex].choice === 'B' ? 'BESAR' : 'KECIL'}`, { mentions: [`${phoneNumber}@s.whatsapp.net`] });
                }

                room.players[playerIndex].choice = command.toUpperCase();

                // Check if all players have chosen
                const allChosen = room.players.every(p => p.choice !== null);

                if (allChosen) {
                    // ALL SET, THE HOUSE (BOT) DECIDES THE OUTCOME.
                    room.status = 'rolling';

                    // Calculate total pot and per-side payouts based on INDIVIDUAL bets
                    const totalPot = room.players.reduce((s, p) => s + p.bet, 0);
                    const winRate = (config.diceWinRate || 40) / 100;
                    const multiplier = config.diceMultiplier || 2;

                    // Sum up what bandar would have to pay if K wins vs B wins
                    let payoutIfKWins = 0;
                    let payoutIfBWins = 0;
                    room.players.forEach(p => {
                        const playerPayout = Math.floor(p.bet * multiplier);
                        if (p.choice === 'K') payoutIfKWins += playerPayout;
                        if (p.choice === 'B') payoutIfBWins += playerPayout;
                    });

                    let riggedTarget = '';

                    // Rigged logic: winRate chance to be generous, otherwise greedy
                    if (Math.random() < winRate) {
                        // Generous - pick the side that pays MORE to players
                        riggedTarget = payoutIfKWins >= payoutIfBWins ? 'K' : 'B';
                    } else {
                        // Greedy - pick the side that pays LESS (bandar keeps more)
                        riggedTarget = payoutIfKWins < payoutIfBWins ? 'K' : 'B';

                        // If payouts are equal, just pick random
                        if (payoutIfKWins === payoutIfBWins) {
                            riggedTarget = Math.random() < 0.5 ? 'K' : 'B';
                        }
                    }

                    // Generate 9 dice that match the riggedTarget
                    let targetMin = riggedTarget === 'K' ? 9 : 32;
                    let targetMax = riggedTarget === 'K' ? 31 : 54;

                    let finalDice = [];
                    let sum = 0;
                    do {
                        finalDice = [];
                        sum = 0;
                        for (let i = 0; i < 9; i++) {
                            const d = Math.floor(Math.random() * 6) + 1;
                            finalDice.push(d);
                            sum += d;
                        }
                    } while (sum < targetMin || sum > targetMax);

                    // Process Winnings - each player's payout based on their OWN bet
                    let winningText = ``;
                    let mentions = [];

                    for (const processPlayer of room.players) {
                        const botUserDb = await BotUser.findOne({ phoneNumber: processPlayer.phone });
                        if (!botUserDb) continue;

                        mentions.push(`${processPlayer.phone}@s.whatsapp.net`);
                        const playerPayout = Math.floor(processPlayer.bet * multiplier);

                        if (processPlayer.choice === riggedTarget) {
                            // WINNER - gets their own bet * multiplier
                            let actualPayout = playerPayout;
                            let debtDeducted = 0;

                            // Rentenir Pinjol Check
                            if ((botUserDb.pinjolDebt || 0) > 0) {
                                const deductionRate = (config.pinjolDeductionRate || 50) / 100;
                                let deductAmount = Math.ceil(actualPayout * deductionRate);
                                if (deductAmount === 0 && actualPayout > 0) deductAmount = 1;

                                debtDeducted = Math.min(deductAmount, botUserDb.pinjolDebt);
                                botUserDb.pinjolDebt -= debtDeducted;
                                actualPayout -= debtDeducted;
                            }

                            botUserDb.casinoChips += actualPayout;
                            // Track stats
                            if (!botUserDb.diceStats) botUserDb.diceStats = { games: 0, wins: 0, losses: 0, profit: 0 };
                            botUserDb.diceStats.games += 1;
                            botUserDb.diceStats.wins += 1;
                            botUserDb.diceStats.profit += (playerPayout - processPlayer.bet); // net profit
                            await botUserDb.save();

                            if (debtDeducted > 0) {
                                winningText += `✅ @${processPlayer.phone} (${processPlayer.choice} | ${processPlayer.bet.toLocaleString()}) → +${actualPayout.toLocaleString()} KOIN (🏦 -${debtDeducted.toLocaleString()} lunas pinjol)\n`;
                            } else {
                                winningText += `✅ @${processPlayer.phone} (${processPlayer.choice} | ${processPlayer.bet.toLocaleString()}) → +${playerPayout.toLocaleString()} KOIN\n`;
                            }
                        } else {
                            // LOSER - chip was already deducted
                            if (!botUserDb.diceStats) botUserDb.diceStats = { games: 0, wins: 0, losses: 0, profit: 0 };
                            botUserDb.diceStats.games += 1;
                            botUserDb.diceStats.losses += 1;
                            botUserDb.diceStats.profit -= processPlayer.bet;
                            await botUserDb.save();
                            winningText += `❌ @${processPlayer.phone} (${processPlayer.choice} | ${processPlayer.bet.toLocaleString()}) → -${processPlayer.bet.toLocaleString()} KOIN\n`;
                        }
                    }

                    const diceGridText = formatDiceGrid(finalDice);

                    const finalMessage =
                        `🎲 *HASIL 9 DICE* 🎲\n\n` +
                        `Total Pot: *${totalPot.toLocaleString()} KOIN*\n\n` +
                        `${diceGridText}\n\n` +
                        `Total Skor: *${sum}*\n` +
                        `Hasil: *${riggedTarget === 'K' ? 'KECIL (9-31)' : 'BESAR (32-54)'}*\n\n` +
                        `*RINCIAN HADIAH*\n` +
                        `${winningText}`;

                    activeRooms.delete(groupId);

                    return reply(finalMessage, { mentions });

                } else {
                    // Still waiting for others
                    return reply(`☑️ @${phoneNumber} memilih ${command.toUpperCase()}. Menunggu pemain lain...`, { mentions: [`${phoneNumber}@s.whatsapp.net`] });
                }
            }

        } catch (error) {
            console.error('Error executing dice game:', error);
            reply('❌ Terjadi kesalahan pada server game.');
        }
    }
};

// Auto-cleanup rooms older than 5 minutes + refund chips
const ROOM_TIMEOUT = 5 * 60 * 1000; // 5 minutes

setInterval(async () => {
    const now = Date.now();
    for (const [groupId, room] of activeRooms.entries()) {
        if (now - room.createdAt > ROOM_TIMEOUT && room.status !== 'rolling') {
            // Refund all players
            for (const player of room.players) {
                try {
                    const user = await BotUser.findOne({ phoneNumber: player.phone });
                    if (user) {
                        user.casinoChips += player.bet;
                        await user.save();
                    }
                } catch (e) {
                    console.error('Dice cleanup refund error:', e);
                }
            }
            activeRooms.delete(groupId);
            console.log(`[Dice] Auto-cleaned expired room in ${groupId}, refunded ${room.players.length} player(s).`);
        }
    }
}, 60 * 1000); // Check every 1 minute

// Export activeRooms for external access (e.g. resetdice)
module.exports.activeRooms = activeRooms;
