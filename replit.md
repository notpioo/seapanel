# Sanka Bot Deployer

WhatsApp Bot with Web Panel using Sanka-Baileys (Node.js).

## Architecture

- **Runtime**: Node.js 20+
- **Framework**: Express.js + Socket.IO
- **Database**: MongoDB (mongoose)
- **WhatsApp API**: sanka-baileyss (Baileys-based)
- **Port**: 5000 (configured via `PORT` env var)

## Project Structure

```
├── config/
│   ├── bot.config.js       # Main bot config (reads env vars)
│   ├── auth.config.js      # Auth/roles/permissions config
│   ├── database.config.js  # MongoDB connection config
│   └── db.config.js
├── src/
│   ├── index.js            # Entry point
│   ├── bot/                # WhatsApp bot client & commands
│   ├── server/             # Express web server & panel
│   │   ├── app.js          # Main web server (2243 lines)
│   │   ├── routes/         # API routes
│   │   └── views/          # Page view functions
│   ├── models/             # Mongoose models
│   └── utils/              # Logger, database utilities
├── sessions/               # WhatsApp session storage
└── logs/                   # Log files
```

## Running

```bash
npm start        # Production
npm run dev      # Development (nodemon)
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 5000 | Server port |
| `MONGODB_URI` | (atlas default) | MongoDB connection string |
| `BOT_NAME` | NoMercy | Bot display name |
| `BOT_PREFIX` | . | Command prefix |
| `OWNER_NUMBER` | 6281234567890 | Bot owner WA number |
| `PANEL_USERNAME` | admin | Web panel username |
| `PANEL_PASSWORD` | admin123 | Web panel password |

## Web Panel

Accessible at port 5000. Default credentials:
- Admin: `admin` / `admin123`
- User: `user` / `user123`

## Deployment

Configured as VM deployment (always-running) since the WhatsApp bot requires persistent WebSocket connections.
