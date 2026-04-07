/**
 * Poll Check - Check result of the test poll
 */
module.exports = {
    name: 'pollcheck',
    category: 'owner',
    description: 'Check result of test poll',
    usage: '.pollcheck',
    ownerOnly: true,

    async execute({ socket, reply }) {
        if (!socket.lastPollTestId) {
            return reply('❌ *Belum ada poll yang dibuat!*\nGunakan `.polltest` terlebih dahulu.');
        }

        const pollId = socket.lastPollTestId;
        const result = socket.pollResults.get(pollId);

        if (!result) {
            return reply(`⚠️ *Belum ada hasil vote*\nAtau bot belum menerima update decrypt polling.\n(ID: ${pollId})`);
        }

        let text = `📊 *HASIL DECRYPT POLLING*\n\n`;
        
        result.forEach(v => {
            text += `*${v.name}* : ${v.voters.length} vote\n`;
            if (v.voters.length > 0) {
                text += `👥 Pemilih: ${v.voters.map(j => `@${j.split('@')[0]}`).join(', ')}\n`;
            }
            text += '\n';
        });

        // Mention all voters
        const mentions = [];
        result.forEach(v => {
            v.voters.forEach(j => {
                if (!mentions.includes(j)) mentions.push(j);
            });
        });

        return reply(text, { mentions });
    }
};
