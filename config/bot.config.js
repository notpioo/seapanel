/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                    BOT CONFIGURATION                         ║
 * ║         Semua pengaturan bot terpusat di file ini           ║
 * ╚══════════════════════════════════════════════════════════════╝
 * 
 * @author Sanka Bot Deployer
 * @version 1.0.0
 */

module.exports = {
    // ═══════════════════════════════════════════════════════════════
    // BOT INFORMATION
    // ═══════════════════════════════════════════════════════════════
    bot: {
        name: process.env.BOT_NAME || 'NoMercy',
        prefix: process.env.BOT_PREFIX || '.',
        ownerNumber: (() => {
            const raw = process.env.OWNER_NUMBER || '6281234567890';
            if (Array.isArray(raw)) return raw;
            const parts = String(raw)
                .split(',')
                .map(s => s.trim())
                .filter(Boolean);
            return parts.length <= 1 ? (parts[0] || '6281234567890') : parts;
        })(),
        description: 'WhatsApp Bot powered by Sanka-Baileys',
        version: '1.0.0',
    },

    // ═══════════════════════════════════════════════════════════════
    // SERVER SETTINGS
    // ═══════════════════════════════════════════════════════════════
    server: {
        port: parseInt(process.env.PORT) || 3000,
        host: process.env.HOST || '0.0.0.0',
        baseUrl: process.env.BASE_URL || 'http://localhost:3000',
    },

    // ═══════════════════════════════════════════════════════════════
    // SESSION SETTINGS
    // ═══════════════════════════════════════════════════════════════
    session: {
        // Folder untuk menyimpan session WhatsApp
        folderPath: './sessions',
        // Nama session
        sessionName: process.env.SESSION_NAME || 'sanka-session',
    },

    // ═══════════════════════════════════════════════════════════════
    // WHATSAPP CONNECTION SETTINGS
    // ═══════════════════════════════════════════════════════════════
    connection: {
        // Browser yang ditampilkan di WhatsApp
        browserName: process.env.BROWSER_NAME || 'Sanka Bot',
        // Print QR di terminal (selain di web panel)
        printQRInTerminal: process.env.PRINT_QR === 'true' || false,
        // Auto reconnect jika koneksi terputus
        autoReconnect: true,
        // Retry delay dalam ms
        retryDelay: 5000,
        // Max retry attempts
        maxRetries: 10,
    },

    // ═══════════════════════════════════════════════════════════════
    // MESSAGE SETTINGS
    // ═══════════════════════════════════════════════════════════════
    messages: {
        // Pesan saat bot online
        onlineMessage: '🤖 Bot sedang online!',
        // Pesan saat command tidak ditemukan
        notFoundMessage: '❌ Command tidak ditemukan. Ketik {prefix}help untuk bantuan.',
        // Pesan saat hanya owner yang bisa menggunakan command
        ownerOnlyMessage: '⛔ Command ini hanya untuk owner!',
        // Pesan saat bot sedang maintenance
        maintenanceMessage: '🔧 Bot sedang dalam maintenance, mohon tunggu.',
    },

    // ═══════════════════════════════════════════════════════════════
    // FEATURE TOGGLES
    // ═══════════════════════════════════════════════════════════════
    features: {
        // Mode maintenance (semua command dinonaktifkan kecuali owner)
        maintenanceMode: process.env.MAINTENANCE_MODE === 'true' || false,
        // Log semua pesan masuk (set false untuk speed)
        logMessages: process.env.LOG_MESSAGES === 'true' || false,
        // Auto read message
        autoRead: process.env.AUTO_READ === 'true' || false,
        // Auto typing indicator (DISABLED for faster response)
        autoTyping: false,
        // Enable group commands
        enableGroupCommands: true,
        // Enable private commands
        enablePrivateCommands: true,
    },

    // ═══════════════════════════════════════════════════════════════
    // RATE LIMIT SETTINGS
    // ═══════════════════════════════════════════════════════════════
    rateLimit: {
        // Enable rate limiting
        enabled: process.env.RATE_LIMIT_ENABLED === 'true' || true,
        // Max commands per minute per user
        maxCommandsPerMinute: parseInt(process.env.RATE_LIMIT_MAX) || 10,
        // Cooldown message
        cooldownMessage: '⏳ Mohon tunggu sebentar sebelum menggunakan command lagi.',
    },

    // ═══════════════════════════════════════════════════════════════
    // LOGGING SETTINGS
    // ═══════════════════════════════════════════════════════════════
    logging: {
        // Log level: 'debug' | 'info' | 'warn' | 'error'
        level: process.env.LOG_LEVEL || 'info',
        // Log to file
        saveToFile: process.env.LOG_TO_FILE === 'true' || false,
        // Log folder
        logFolder: './logs',
    },

    // ═══════════════════════════════════════════════════════════════
    // WEB PANEL SETTINGS
    // ═══════════════════════════════════════════════════════════════
    webPanel: {
        // Enable web panel
        enabled: true,
        // Panel title
        title: 'NoMercy',
        // Enable authentication (recommended for production)
        authEnabled: process.env.PANEL_AUTH_ENABLED === 'true' || false,
        // Panel username
        username: process.env.PANEL_USERNAME || 'admin',
        // Panel password
        password: process.env.PANEL_PASSWORD || 'admin123',
    },

    // ═══════════════════════════════════════════════════════════════
    // COMMAND COOLDOWNS (in seconds)
    // ═══════════════════════════════════════════════════════════════
    cooldowns: {
        default: 1, // Reduced for faster response
        // Custom cooldowns per command
        commands: {
            // 'commandName': cooldownInSeconds,
            ping: 1,
            sticker: 3,
            menu: 1,
        },
    },

    // ═══════════════════════════════════════════════════════════════
    // ANTI-SPAM SETTINGS
    // ═══════════════════════════════════════════════════════════════
    antiSpam: {
        enabled: false, // Disabled for speed (enable if needed)
        // Max messages dalam timeWindow
        maxMessages: 10,
        // Time window dalam seconds
        timeWindow: 10,
        // Ban duration dalam minutes
        banDuration: 5,
        // Warn message
        warnMessage: '⚠️ Jangan spam! Anda akan di-ban sementara.',
    },

    // ═══════════════════════════════════════════════════════════════
    // AUTO RESPONSE SETTINGS
    // ═══════════════════════════════════════════════════════════════
    autoResponse: {
        enabled: process.env.AUTO_RESPONSE_ENABLED === 'true' || false,
        // Responses format: { trigger: response }
        responses: {
            'halo': 'Halo juga! 👋',
            'hai': 'Hai! Ada yang bisa dibantu? 😊',
            'ping': 'Pong! 🏓',
        },
    },

    // ═══════════════════════════════════════════════════════════════
    // WELCOME & GOODBYE SETTINGS
    // ═══════════════════════════════════════════════════════════════
    groupSettings: {
        // Welcome message for new members
        welcomeEnabled: process.env.WELCOME_ENABLED === 'true' || true,
        welcomeMessage: 'Selamat datang di grup, @{user}! 🎉',
        // Goodbye message for leaving members
        goodbyeEnabled: process.env.GOODBYE_ENABLED === 'true' || true,
        goodbyeMessage: 'Sampai jumpa, @{user}! 👋',
    },
};
