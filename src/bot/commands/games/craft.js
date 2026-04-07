
const { RPGPlayer, RPGRecipe, RPGItem } = require('../../../models');

module.exports = {
    name: 'craft',
    description: 'Membuat item dari bahan-bahan',
    category: 'games',
    usage: '.craft <nama item>',
    aliases: ['bikin', 'create'],

    execute: async ({ reply, sender, args }) => {
        if (args.length === 0) {
            return reply('Format salah. Ketik *.craft <nama item>*\nContoh: .craft Iron Sword\nLihat resep: .recipe');
        }

        const query = args.join(' ').toLowerCase();

        try {
            const player = await RPGPlayer.findOne({ phoneNumber: sender });
            if (!player) return reply('Kamu belum punya akun RPG. Ketik .rpg dulu.');

            // 1. Ambil Data
            const recipes = await RPGRecipe.find();
            const items = await RPGItem.find();

            // 2. Cari Item Target berdasarkan Nama
            // Prioritas: Exact match dulu, baru partial match
            let targetItem = items.find(i => i.name.toLowerCase() === query);
            if (!targetItem) {
                targetItem = items.find(i => i.name.toLowerCase().includes(query));
            }

            if (!targetItem) {
                return reply(`Item "${args.join(' ')}" tidak ditemukan di database.`);
            }

            // 3. Cari Resep untuk Item tersebut
            const recipe = recipes.find(r => r.resultItemId === targetItem.itemId);

            if (!recipe) {
                return reply(`Item *${targetItem.name}* tidak memiliki resep crafting (biarpun itemnya ada, resepnya belum dibuat admin).`);
            }

            // 4. Cek Bahan
            const missing = [];

            for (const ing of recipe.ingredients) {
                const playerQty = player.inventory.get(ing.itemId) || 0;
                // Ambil nama bahan untuk pesan error
                const ingItemData = items.find(i => i.itemId === ing.itemId);
                const ingName = ingItemData ? ingItemData.name : ing.itemId;

                if (playerQty < ing.amount) {
                    missing.push(`${ingName} (${playerQty}/${ing.amount})`);
                }
            }

            if (missing.length > 0) {
                return reply(`⚠️ *Bahan Tidak Cukup!*\nKamu kekurangan:\n- ${missing.join('\n- ')}`);
            }

            // 5. Eksekusi Crafting (Kurangi Bahan, Tambah Hasil)
            for (const ing of recipe.ingredients) {
                const currentQty = player.inventory.get(ing.itemId);
                const newQty = currentQty - ing.amount;
                if (newQty <= 0) {
                    player.inventory.delete(ing.itemId);
                } else {
                    player.inventory.set(ing.itemId, newQty);
                }
            }

            // Tambah Item Hasil
            const currentResultQty = player.inventory.get(recipe.resultItemId) || 0;
            player.inventory.set(recipe.resultItemId, currentResultQty + 1);

            await player.save();

            const resultTypeIcon = recipe.category === 'Weapon' ? '⚔️' : (recipe.category === 'Relic' ? '🏺' : '📦');
            return reply(`🔨 *CRAFTING SUKSES!*\n\nKamu berhasil membuat:\n${resultTypeIcon} *${targetItem.name}* x1\n\nCek inventory: .rbag`);

        } catch (error) {
            console.error('CRAFT Error:', error);
            return reply('Terjadi kesalahan saat crafting.');
        }
    }
};
