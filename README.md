# 🤖 Sanka Bot Deployer

WhatsApp Bot dengan Web Panel menggunakan **Sanka-Baileys**. Deploy dengan mudah ke Railway!

![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)
![License](https://img.shields.io/badge/license-MIT-blue)

## ✨ Features

- 📱 **Web Panel QR Scanner** - Scan QR code dari browser
- 🔧 **Centralized Config** - Semua pengaturan di 1 file (`config/bot.config.js`)
- 🐳 **Docker Ready** - Siap deploy ke Railway
- ⚡ **Real-time Status** - Update status via Socket.IO
- 🛡️ **Anti-Spam** - Proteksi dari spam
- 🎯 **Rate Limiting** - Cooldown per command
- 📊 **Logging** - Log dengan warna & file

## 📁 Struktur Folder

```
Sanka-Bot-Deployer/
├── config/
│   └── bot.config.js       # 🔧 SEMUA PENGATURAN BOT DI SINI
├── src/
│   ├── bot/
│   │   ├── client.js       # WhatsApp client
│   │   ├── commands/       # Folder commands
│   │   │   ├── general/    # Commands umum
│   │   │   │   ├── help.js
│   │   │   │   ├── ping.js
│   │   │   │   └── info.js
│   │   │   ├── owner/      # Commands owner only
│   │   │   │   ├── restart.js
│   │   │   │   └── broadcast.js
│   │   │   └── loader.js   # Auto-load commands
│   │   └── handlers/
│   │       └── message.js  # Message handler
│   ├── server/
│   │   └── app.js          # Web server & panel
│   ├── utils/
│   │   └── logger.js       # Logger utility
│   └── index.js            # Entry point
├── sessions/               # WhatsApp sessions (auto-generated)
├── logs/                   # Log files
├── Dockerfile              # Docker config
├── railway.toml            # Railway config
├── package.json
├── .env.example
└── README.md
```

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone <repo-url>
cd Sanka-Bot-Deployer
npm install
```

### 2. Configure

Edit file `config/bot.config.js` atau buat `.env` dari `.env.example`:

```bash
cp .env.example .env
```

### 3. Run

```bash
npm start
```

Buka `http://localhost:3000` untuk scan QR code.

## 🐳 Deploy ke Railway

### Cara 1: Dari GitHub

1. Push code ke GitHub
2. Buka [Railway](https://railway.app)
3. Click "New Project" → "Deploy from GitHub repo"
4. Pilih repository
5. Railway akan auto-detect Dockerfile

### Cara 2: Railway CLI

```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

### Environment Variables di Railway

Set variables ini di Railway Dashboard:

| Variable | Description | Example |
|----------|-------------|---------|
| `BOT_NAME` | Nama bot | `My Bot` |
| `BOT_PREFIX` | Prefix command | `.` |
| `OWNER_NUMBER` | Nomor owner | `6281234567890` |

## 📝 Menambah Command

Buat file baru di folder `src/bot/commands/<category>/`:

```javascript
// src/bot/commands/general/mycommand.js

module.exports = {
  name: 'mycommand',
  aliases: ['mc'],
  category: 'general',
  description: 'Deskripsi command',
  usage: '.mycommand <args>',
  ownerOnly: false,

  async execute({ socket, message, args, reply, sender, jid, isGroup, isOwner, config }) {
    // Logic command di sini
    await reply('Hello World!');
  },
};
```

## ⚙️ Konfigurasi

Semua pengaturan ada di `config/bot.config.js`:

```javascript
module.exports = {
  bot: {
    name: 'Sanka Bot',
    prefix: '.',
    ownerNumber: '6281234567890',
  },
  
  features: {
    maintenanceMode: false,
    autoRead: false,
    autoTyping: true,
  },
  
  antiSpam: {
    enabled: true,
    maxMessages: 5,
    timeWindow: 10,
  },
  
  // ... lihat file untuk opsi lengkap
};
```

## 📋 Default Commands

| Command | Description | Owner Only |
|---------|-------------|------------|
| `.help` | Daftar semua commands | ❌ |
| `.ping` | Cek response time | ❌ |
| `.info` | Info bot & sistem | ❌ |
| `.restart` | Restart bot | ✅ |
| `.broadcast` | Broadcast message | ✅ |

## 🛠️ Development

```bash
# Install dev dependencies
npm install

# Run with auto-reload
npm run dev

# Run lint
npm run lint
```

## 📄 License

MIT License - Lihat [LICENSE](LICENSE)

## 🙏 Credits

- [Sanka-Baileys](https://github.com/SankaVollereii/Sanka-Baileys) - WhatsApp Web API
- [Express.js](https://expressjs.com/) - Web framework
- [Socket.IO](https://socket.io/) - Real-time communication

---

Made with ❤️ by Sanka Bot Deployer
