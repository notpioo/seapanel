/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                      USER MODEL                              ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        minlength: 3,
        maxlength: 30,
    },
    password: {
        type: String,
        required: true,
        minlength: 6,
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 50,
    },
    role: {
        type: String,
        enum: ['admin', 'user'],
        default: 'user',
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    lastLogin: {
        type: Date,
        default: null,
    },
    linkedPhoneNumber: {
        type: String,
        default: null,
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

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Update timestamp on save
userSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Don't return password in JSON
userSchema.methods.toJSON = function () {
    const user = this.toObject();
    delete user.password;
    return user;
};

// Static method to find by credentials
userSchema.statics.findByCredentials = async function (username, password) {
    const user = await this.findOne({ username: username.toLowerCase(), isActive: true });
    if (!user) return null;

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return null;

    return user;
};

// Static method to initialize default admin
userSchema.statics.initializeDefaultUsers = async function () {
    const adminExists = await this.findOne({ username: 'admin' });

    if (!adminExists) {
        await this.create({
            username: 'admin',
            password: process.env.ADMIN_PASSWORD || 'admin123',
            name: 'Administrator',
            role: 'admin',
        });
        console.log('[Database] Default admin user created');
    }

    const userExists = await this.findOne({ username: 'user' });

    if (!userExists) {
        await this.create({
            username: 'user',
            password: process.env.USER_PASSWORD || 'user123',
            name: 'User',
            role: 'user',
        });
        console.log('[Database] Default user created');
    }
};

const User = mongoose.model('User', userSchema);

module.exports = User;
