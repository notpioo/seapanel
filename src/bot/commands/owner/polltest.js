/**
 * Poll Test - Create a test poll
 */
module.exports = {
    name: 'polltest',
    category: 'owner',
    description: 'Create a test poll',
    usage: '.polltest',
    ownerOnly: true,

    async execute({ socket, message, jid, reply }) {
        const pollMsg = await socket.sendMessage(jid, {
            poll: {
                name: 'Test Decrypt Poll',
                values: ['Option 1', 'Option 2', 'Option 3'],
                selectableCount: 1,
            }
        });

        // Debug output to see what is returned
        console.log('Poll message object returned:', JSON.stringify(pollMsg));

        if (pollMsg && pollMsg.key && pollMsg.key.id) {
            socket.lastPollTestId = pollMsg.key.id;
        } else {
            console.warn('PollMsg does not have key.id!', pollMsg);
            return reply('❌ *Gagal membuat poll!*\nObjek pesan tidak mereturn key dari WA.');
        }

        await reply(`✅ *Poll created!*\n\nSilakan pilih salah satu opsi dari poll di atas, lalu gunakan command:\n*.pollcheck* untuk melihat hasil decrypt.`);
    }
};
