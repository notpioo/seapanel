/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                    SESSION MODEL                             ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    id: { type: String, required: true }, // e.g., 'creds', 'app-state-sync-key-...'
    data: { type: Object, required: true }, // The actual session data
    sessionId: { type: String, required: true }, // To support multiple sessions if needed
});

// Compound index for fast lookup
sessionSchema.index({ sessionId: 1, id: 1 }, { unique: true });

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;
