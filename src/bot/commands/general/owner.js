module.exports = {
    name: 'owner',
    aliases: ['creator', 'admin'],
    category: 'general',
    description: 'Kirim kontak owner bot',
    usage: '.owner',
    ownerOnly: false,

    execute: async ({ socket, message, jid, reply, config }) => {
        const raw = config?.bot?.ownerNumber;
        const owners = Array.isArray(raw) ? raw : [raw];
        const cleanOwners = owners
            .map(o => String(o || '').replace(/\D/g, ''))
            .filter(Boolean);

        if (cleanOwners.length === 0) {
            return reply('❌ Owner belum dikonfigurasi.');
        }

        const contacts = cleanOwners.map((num, idx) => {
            const displayName = cleanOwners.length === 1 ? 'Owner' : `Owner ${idx + 1}`;
            const waid = num;
            const tel = `+${num}`;
            const vcard = [
                'BEGIN:VCARD',
                'VERSION:3.0',
                `FN:${displayName}`,
                `TEL;type=CELL;type=VOICE;waid=${waid}:${tel}`,
                'END:VCARD'
            ].join('\n');
            return { vcard };
        });

        try {
            const send = global.__sankaSendMessage || socket.sendMessage.bind(socket);
            await send(jid, {
                contacts: {
                    displayName: cleanOwners.length === 1 ? 'Owner' : 'Owners',
                    contacts
                }
            }, { quoted: message });
            return;
        } catch (e) {
            const lines = cleanOwners.map((n, i) => {
                const label = cleanOwners.length === 1 ? 'Owner' : `Owner ${i + 1}`;
                return `• ${label}: https://wa.me/${n}`;
            });
            return reply(`👑 *OWNER BOT*\n\n${lines.join('\n')}`);
        }
    }
};

