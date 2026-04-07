
const { RPGRecipe, RPGItem } = require('../../../models');

module.exports = {
    name: 'recipe',
    description: 'Lihat daftar resep crafting',
    category: 'games',
    usage: '.recipe',

    execute: async ({ reply }) => {
        try {
            const recipes = await RPGRecipe.find();
            const items = await RPGItem.find();

            // Map items for fast lookup by ID
            const itemMap = {};
            items.forEach(i => itemMap[i.itemId] = i);

            if (recipes.length === 0) {
                return reply('📜 *Crafting Recipes*\n\nBelum ada resep yang tersedia.');
            }

            let txt = `📜 *Crafting Recipes*\n═══════════════════\n\n`;

            recipes.forEach((r, idx) => {
                const resultItem = itemMap[r.resultItemId];
                const resultName = resultItem ? resultItem.name : r.resultItemId;
                const resultEmoji = r.category === 'Weapon' ? '⚔️' : (r.category === 'Relic' ? '🏺' : '📦');

                txt += `${idx + 1}. ${resultEmoji} *${resultName}* [${r.category}]\n`;

                // Bahan-bahan
                r.ingredients.forEach(ing => {
                    const ingItem = itemMap[ing.itemId];
                    const ingName = ingItem ? ingItem.name : ing.itemId;
                    txt += `   └ ▫️ ${ingName}: x${ing.amount}\n`;
                });
                txt += '\n';
            });

            txt += `═══════════════════\n`;
            txt += `Ketik *.craft <nomor>* untuk membuat item!`;

            return reply(txt);
        } catch (error) {
            console.error('RECIPE Error:', error);
            return reply('Gagal memuat resep crafting.');
        }
    }
};
