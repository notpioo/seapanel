const mongoose = require('mongoose');

const authTokenSchema = new mongoose.Schema({
    userId: { type: String, required: true }, // WhatsApp Number / Jid
    token: { type: String, required: true, unique: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    name: { type: String, default: 'Player' },
    createdAt: { type: Date, default: Date.now, expires: 3600 } // Auto-delete after 1 hour (3600 seconds)
});

module.exports = mongoose.model('AuthToken', authTokenSchema);
