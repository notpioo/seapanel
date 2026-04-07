
const mongoose = require('mongoose');

const rpgRecipeSchema = new mongoose.Schema({
    resultItemId: { type: String, required: true },
    ingredients: [{
        itemId: { type: String, required: true },
        amount: { type: Number, required: true, min: 1 }
    }],
    category: {
        type: String,
        enum: ['Material', 'Weapon', 'Relic'],
        default: 'Material'
    },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.RPGRecipe || mongoose.model('RPGRecipe', rpgRecipeSchema);
