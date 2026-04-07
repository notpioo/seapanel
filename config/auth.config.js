/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                 AUTHENTICATION CONFIG                        ║
 * ║            Users, Roles & Access Control                     ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

module.exports = {
    // ═══════════════════════════════════════════════════════════════
    // JWT/SESSION SETTINGS
    // ═══════════════════════════════════════════════════════════════
    secret: process.env.AUTH_SECRET || 'sanka-bot-secret-key-change-this',
    sessionExpiry: 24 * 60 * 60 * 1000, // 24 hours

    // ═══════════════════════════════════════════════════════════════
    // USERS DATABASE (In Production, use real database)
    // ═══════════════════════════════════════════════════════════════
    users: [
        {
            id: 1,
            username: process.env.ADMIN_USERNAME || 'admin',
            password: process.env.ADMIN_PASSWORD || 'admin123',
            role: 'admin',
            name: 'Administrator',
        },
        {
            id: 2,
            username: process.env.USER_USERNAME || 'user',
            password: process.env.USER_PASSWORD || 'user123',
            role: 'user',
            name: 'User',
        },
    ],

    // ═══════════════════════════════════════════════════════════════
    // ROLE DEFINITIONS
    // ═══════════════════════════════════════════════════════════════
    roles: {
        admin: {
            name: 'Administrator',
            level: 100,
            permissions: ['*'], // All permissions
            allowedPages: ['dashboard', 'mining-pass', 'bank', 'qr', 'commands', 'settings', 'logs', 'users', 'wa-users', 'mining-config', 'rpg-config', 'casino-config', 'pass-config', 'tournament', 'hall-of-fame', 'rpg', 'mining', 'casino'],
        },
        user: {
            name: 'User',
            level: 10,
            permissions: ['view_dashboard', 'view_commands'],
            allowedPages: ['dashboard', 'mining-pass', 'bank', 'commands', 'tournament', 'hall-of-fame', 'rpg', 'mining', 'casino'],
        },
    },

    // ═══════════════════════════════════════════════════════════════
    // PAGE PERMISSIONS
    // ═══════════════════════════════════════════════════════════════
    pagePermissions: {
        dashboard: ['admin', 'user'],
        qr: ['admin'], // QR Scanner is now Admin Only
        commands: ['admin', 'user'], // Commands list is public/user accessible
        settings: ['admin'],
        logs: ['admin'],
        users: ['admin'],
        'wa-users': ['admin'],
        'mining-config': ['admin'],
        'rpg-config': ['admin'],
        tournament: ['admin', 'user'],
        'hall-of-fame': ['admin', 'user'],
        rpg: ['admin', 'user'],
        mining: ['admin', 'user'],
        casino: ['admin', 'user'],
        'casino-config': ['admin'],
        'casino-slot': ['admin', 'user'],
        'mining-pass': ['admin', 'user'],
        'pass-config': ['admin'],
    },
};
