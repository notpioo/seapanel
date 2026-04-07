/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║              WHATSAPP USER MODEL (Member Login)              ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

const mongoose = require('mongoose');

const waUserSchema = new mongoose.Schema({
    phoneNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        // Format: 6281234567890
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 50,
    },
    role: {
        type: String,
        enum: ['member', 'referee'],
        default: 'member',
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    loginOTP: {
        type: String,
        default: null,
    },
    otpExpiry: {
        type: Date,
        default: null,
    },
    lastLogin: {
        type: Date,
        default: null,
    },
    // Tournament Stats (Future: Hall of Fame)
    stats: {
        tournamentsPlayed: { type: Number, default: 0 },
        tournamentsWon: { type: Number, default: 0 },
        totalMatches: { type: Number, default: 0 },
        totalWins: { type: Number, default: 0 },
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

// Update timestamp on save
waUserSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

// Don't return OTP in JSON (security)
waUserSchema.methods.toJSON = function () {
    const user = this.toObject();
    delete user.loginOTP;
    delete user.otpExpiry;
    return user;
};

// Static: Generate OTP
waUserSchema.statics.generateOTP = function () {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit
};

// Static: Find or Create by Phone
waUserSchema.statics.findOrCreate = async function (phoneNumber, name = 'Member') {
    let user = await this.findOne({ phoneNumber });

    if (!user) {
        user = await this.create({
            phoneNumber,
            name,
            role: 'member',
        });
        console.log(`[WAUser] New member created: ${phoneNumber}`);
    }

    return user;
};

// Static: Validate OTP
waUserSchema.statics.validateOTP = async function (phoneNumber, otp) {
    const user = await this.findOne({
        phoneNumber,
        loginOTP: otp,
        otpExpiry: { $gt: Date.now() },
        isActive: true,
    });

    if (!user) return null;

    // Clear OTP after use (single-use)
    user.loginOTP = null;
    user.otpExpiry = null;
    user.lastLogin = new Date();
    await user.save();

    return user;
};

const WAUser = mongoose.model('WAUser', waUserSchema);

module.exports = WAUser;
