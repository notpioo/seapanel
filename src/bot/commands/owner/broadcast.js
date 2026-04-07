/**
 * Broadcast Command - Send message to all chats (Owner only)
 */

module.exports = {
    name: 'broadcast',
    aliases: ['bc'],
    category: 'owner',
    description: 'Broadcast pesan ke semua chat (Owner only)',
    usage: '.broadcast <pesan>',
    ownerOnly: true,

    async execute({ socket, reply, text }) {
        if (!text) {
            return reply('❌ *Masukkan pesan yang ingin di-broadcast!*\n\n💡 Contoh: .broadcast Halo semua!');
        }

        await reply('📢 *Broadcasting message...*');

        try {
            // Get all chats
            const chats = await socket.groupFetchAllParticipating();
            const groupIds = Object.keys(chats);

            let successCount = 0;
            let failCount = 0;

            for (const groupId of groupIds) {
                try {
                    await socket.sendMessage(groupId, { text: `📢 *BROADCAST*\n\n${text}` });
                    successCount++;
                    // Delay to prevent rate limiting
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (err) {
                    failCount++;
                }
            }

            return reply(`✅ *Broadcast selesai!*\n\n📤 Berhasil: ${successCount}\n❌ Gagal: ${failCount}`);
        } catch (error) {
            return reply('❌ *Gagal melakukan broadcast!*');
        }
    },
};
