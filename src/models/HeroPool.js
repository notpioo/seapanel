const mongoose = require('mongoose');

const heroPoolSchema = new mongoose.Schema({
    role: { type: String, required: true, unique: true }, // e.g., "Tank", "Mage", "Fighter"
    heroes: { type: [String], default: [] } // e.g., ["Tigreal", "Khufra", "Atlas"]
});

// Static: Get all roles
heroPoolSchema.statics.getAllRoles = function () {
    return this.find().sort({ role: 1 }).lean();
};

// Static: Get heroes by role (case-insensitive)
heroPoolSchema.statics.getByRole = function (roleName) {
    return this.findOne({ role: { $regex: new RegExp(`^${roleName}$`, 'i') } });
};

// Static: Get a random role
heroPoolSchema.statics.getRandomRole = async function () {
    const roles = await this.find().lean();
    if (!roles || roles.length === 0) return null;
    return roles[Math.floor(Math.random() * roles.length)];
};

// Static: Get a random hero from a specific role
heroPoolSchema.statics.getRandomHeroFromRole = async function (roleName) {
    const pool = await this.getByRole(roleName);
    if (!pool || pool.heroes.length === 0) return null;
    const hero = pool.heroes[Math.floor(Math.random() * pool.heroes.length)];
    return { hero, role: pool.role };
};

// Static: Get a random hero from any role
heroPoolSchema.statics.getRandomHeroFromAll = async function () {
    const roles = await this.find().lean();
    if (!roles || roles.length === 0) return null;

    // Flatten all heroes with their role
    const allHeroes = [];
    roles.forEach(r => {
        r.heroes.forEach(h => allHeroes.push({ hero: h, role: r.role }));
    });

    if (allHeroes.length === 0) return null;
    return allHeroes[Math.floor(Math.random() * allHeroes.length)];
};

module.exports = mongoose.model('HeroPool', heroPoolSchema);
