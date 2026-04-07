
const { RPGPlayer, RPGItem } = require('../../../models');

const fmt = (n) => new Intl.NumberFormat('en-US').format(n);

module.exports = {
    name: 'selljunk',
    description: 'Jual semua item sampah (Junk) untuk jadi Gold',
    category: 'games',
    usage: '.selljunk',
    aliases: ['jualsampah', 'sellalljunk'],

    execute: async ({ reply, sender }) => {
        try {
            const player = await RPGPlayer.findOne({ phoneNumber: sender });
            if (!player || !player.inventory || player.inventory.size === 0) {
                return reply('Tas kamu kosong. Tidak ada yang bisa dijual.');
            }

            // Ambil semua item untuk lookup type & price
            const items = await RPGItem.find();
            const itemMap = {};
            // Map items for fast lookup by ID
            items.forEach(i => itemMap[i.itemId] = i);

            let totalGold = 0;
            let soldItems = [];
            let soldCount = 0;

            // Iterasi Inventory
            // Kita perlu array keys dulu karena kita akan delete item dari Map saat iterasi
            const inventoryKeys = Array.from(player.inventory.keys());

            for (const itemId of inventoryKeys) {
                const qty = player.inventory.get(itemId);
                if (qty <= 0) continue;

                const itemData = itemMap[itemId];

                // HANYA JUAL JIKA TYPE === 'junk'
                if (itemData && itemData.type === 'junk') {
                    const price = itemData.price || 0;
                    const earnings = price * qty;

                    if (earnings > 0) {
                        soldItems.push(`${itemData.name} x${qty} (${fmt(earnings)} G)`);
                    } else {
                        soldItems.push(`${itemData.name} x${qty} (Dibuang)`);
                    }

                    totalGold += earnings;
                    soldCount += qty;

                    // Hapus dari inventory
                    player.inventory.delete(itemId);
                }
            }

            if (soldCount === 0) {
                return reply('Kamu tidak punya item *Junk* yang bisa dijual.\nItem Material & Equipment aman tersimpan.');
            }

            player.gold += totalGold;
            await player.save();

            let txt = `💰 *SELL JUNK SUKSES*\n──────────────────\n`;
            txt += soldItems.join('\n') + '\n';
            txt += `──────────────────\n`;
            txt += `Total Terjual: ${soldCount} items\n`;
            txt += `Pendapatan: *+${fmt(totalGold)} Gold*\n`;
            txt += `Sisa Gold: ${fmt(player.gold)}`;

            return reply(txt);

        } catch (error) {
            console.error('SELLJUNK Error:', error);
            return reply('Terjadi kesalahan saat menjual item.');
        }
    }
};
