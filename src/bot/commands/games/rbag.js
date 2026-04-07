
const { RPGPlayer, RPGItem } = require('../../../models');

module.exports = {
    name: 'rbag',
    description: 'Lihat isi tas RPG kamu',
    category: 'games',
    usage: '.rbag',

    execute: async ({ reply, sender }) => {
        try {
            const player = await RPGPlayer.findOne({ phoneNumber: sender });
            if (!player || !player.inventory || player.inventory.size === 0) {
                return reply('🎒 *RPG Bag*\n\nTas kamu masih kosong.\nPergi berpetualang (.battle) untuk mendapatkan item!');
            }

            // Ambil semua item dari database untuk lookup nama
            const allItems = await RPGItem.find();
            const itemsMap = {};
            allItems.forEach(i => itemsMap[i.itemId] = i);

            let txt = `🎒 *RPG Bag*\n──────────────────\n`;
            let count = 0;

            // Iterasi Inventory Map
            // Mongoose Map -> .get(key)
            for (let [itemId, qty] of player.inventory) {
                if (qty > 0) {
                    const itemData = itemsMap[itemId];
                    const name = itemData ? itemData.name : itemId;
                    const type = itemData ? itemData.type : 'Unknown';
                    const icon = type === 'material' ? '📦' : (type === 'junk' ? '🗑️' : '✨');

                    txt += `${icon} *${name}* x${qty}\n`;
                    count++;
                }
            }

            if (count === 0) {
                return reply('🎒 *RPG Bag*\n\nTas kamu kosong melompong.');
            }

            txt += `──────────────────\n`;
            txt += `Total jenis item: ${count}`;

            return reply(txt);
        } catch (error) {
            console.error('RBAG Error:', error);
            return reply('Gagal membuka tas. Coba lagi nanti.');
        }
    }
};
