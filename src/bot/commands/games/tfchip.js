/**
 * .tfchip - Transfer casino chips to another player
 * Usage: .tfchip @mention jumlah
 *        .tfchip nomor jumlah
 */
const { BotUser } = require('../../../models');

module.exports = {
    name: 'tfchip',
    aliases: ['transferchip', 'kirimchip'],
    description: 'Transfer koin kasino ke pemain lain',
    category: 'games',
    usage: '.tfchip @mention/nomor jumlah',

    execute: async ({ reply, sender, message, args, isGroup, socket, jid }) => {
        try {
            const senderPhone = sender.replace('@s.whatsapp.net', '').replace('@c.us', '');

            // Check if user is replying to a message
            const quotedParticipant = message.message?.extendedTextMessage?.contextInfo?.participant;
            const isReply = !!quotedParticipant;

            if (args.length < 1 || (!isReply && args.length < 2)) {
                return reply(
                    `📤 *TRANSFER KOIN KASINO*\n\n` +
                    `Cara pakai:\n` +
                    `*.tfchip @mention jumlah*\n` +
                    `*.tfchip 628xxx jumlah*\n` +
                    `*Atau Balas (Reply) obrolan target lalu ketik: .tfchip jumlah*\n\n` +
                    `Contoh: .tfchip 6281234567890 500`
                );
            }

            // Parse target: from reply, from mention, or from args
            let targetPhone = null;

            // Check if there's a mention in the message
            const mentions = message.message?.extendedTextMessage?.contextInfo?.mentionedJid ? [...message.message.extendedTextMessage.contextInfo.mentionedJid] : [];

            // --- DEWA LID SYNC (Background) ---
            if (isGroup) {
                try {
                    const metadata = await socket.groupMetadata(jid);
                    // Silently map EVERYONE's LID to their phone number in the background!
                    metadata.participants.forEach(p => {
                        if (p.id && p.lid && p.id.includes('@s.whatsapp.net') && p.lid.includes('@lid')) {
                            const pPhone = p.id.replace('@s.whatsapp.net', '');
                            const pLid = p.lid.replace('@lid', '');
                            // Fire and forget
                            BotUser.updateOne(
                                { phoneNumber: pPhone },
                                { $set: { lid: pLid } }
                            ).catch(() => { });
                        }
                    });

                    // Resolve immediately for this specific mention if it's an LID
                    if (mentions.length > 0 && mentions[0].includes('@lid')) {
                        const participant = metadata.participants.find(p => p.lid === mentions[0]);
                        if (participant && participant.id) {
                            mentions[0] = participant.id; // Map back to actual phone number internally
                        } else {
                            // Fallback if metadata doesn't have the LID mapping but it is a group
                            console.log(`[TFCHIP] Could not find LID mapping in group metadata for ${mentions[0]}`);
                        }
                    }
                } catch (e) {
                    console.error('LID Sync Error:', e);
                }
            }

            if (isReply) {
                targetPhone = quotedParticipant.replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@lid', '');
            } else if (mentions.length > 0) {
                targetPhone = mentions[0].replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@lid', '');
            } else {
                // Parse phone number from first arg (strip non-digits)
                targetPhone = args[0].replace(/\D/g, '');
            }

            if (!targetPhone || targetPhone.length < 8) {
                return reply('❌ Nomor tujuan tidak valid!');
            }

            // Amount is always the last arg
            const amount = parseInt(args[args.length - 1]);
            if (!amount || isNaN(amount) || amount <= 0) {
                return reply('❌ Masukkan jumlah koin yang valid!');
            }

            // Can't transfer to self
            if (targetPhone === senderPhone) {
                return reply('❌ Tidak bisa transfer ke diri sendiri!');
            }

            // Find sender
            const senderUser = await BotUser.findOne({ phoneNumber: senderPhone });
            if (!senderUser) {
                return reply('❌ Anda belum terdaftar, ketik .dailycsn dulu.');
            }

            // Minimum transfer
            if (amount < 100) {
                return reply('❌ Minimal transfer adalah *100 KOIN*.');
            }

            // Rentenir restriction
            if ((senderUser.pinjolDebt || 0) > 0) {
                return reply(`🚫 *DITAHAN RENTENIR*\nAnda tidak diizinkan mentransfer uang saat masih memiliki hutang Pinjol sebesar *${senderUser.pinjolDebt.toLocaleString()} KOIN*.\n\nLunasi dulu dengan ketik *.bayarpinjol*`);
            }

            if ((senderUser.casinoChips || 0) < amount) {
                return reply(`❌ Saldo koin kasino Anda tidak cukup! Saldo: *${(senderUser.casinoChips || 0).toLocaleString()} KOIN*`);
            }

            // Clean up the targetPhone string if it contained @lid somehow
            const cleanTargetPhone = targetPhone.replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@lid', '');

            // Find target (DEWA LOOKUP: Search by Phone OR LID)
            const targetUser = await BotUser.findOne({
                $or: [
                    { phoneNumber: cleanTargetPhone },
                    { lid: cleanTargetPhone },
                    { lid: `${cleanTargetPhone}@lid` } // Just in case it was saved with @lid suffix initially before our update
                ]
            });

            if (!targetUser) {
                // If STILL not found, tell user to ask target to send any message first to register DB LID
                return reply(`❌ Pemain dengan nomor/ID *${cleanTargetPhone}* tidak ditemukan di database.\n⚠️ *Tips:* Suruh pemain yang mau ditransfer untuk ketik *.menu* sekali di grup ini agar bot bisa mengenali ID-nya!`);
            }

            // Calculate fee (3.5%)
            const fee = Math.floor(amount * 0.035);
            const received = amount - fee;

            // Process transfer
            senderUser.casinoChips -= amount;
            targetUser.casinoChips = (targetUser.casinoChips || 0) + received;

            await senderUser.save();
            await targetUser.save();

            // Set final mention target
            const finalTargetId = targetUser.phoneNumber ? `${targetUser.phoneNumber}@s.whatsapp.net` : `${cleanTargetPhone}@s.whatsapp.net`;

            await reply(
                `📤 *TRANSFER KOIN BERHASIL* ✅\n` +
                `━━━━━━━━━━━━━━━━━━━\n\n` +
                `Dari: @${senderPhone}\n` +
                `Ke: @${targetUser.phoneNumber}\n\n` +
                `💸 Jumlah: *${amount.toLocaleString()} KOIN*\n` +
                `📊 Pajak (3.5%): *-${fee.toLocaleString()} KOIN*\n` +
                `✅ Diterima: *${received.toLocaleString()} KOIN*\n\n` +
                `💰 Saldo Anda: *${senderUser.casinoChips.toLocaleString()} KOIN*\n` +
                `💰 Saldo Penerima: *${targetUser.casinoChips.toLocaleString()} KOIN*`,
                { mentions: [`${senderPhone}@s.whatsapp.net`, finalTargetId] }
            );

        } catch (error) {
            console.error('Error in tfchip command:', error);
            await reply('❌ Gagal melakukan transfer koin.');
        }
    }
};
