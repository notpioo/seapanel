function getCommandsPage() {
    const categories = [
        {
            name: 'General',
            icon: '📋',
            commands: [
                { name: 'help', desc: 'Menampilkan daftar menu' },
                { name: 'ping', desc: 'Cek kecepatan respon bot' },
                { name: 'info', desc: 'Info status bot' },
                { name: 'profile', desc: 'Cek profil akun kamu' },
                { name: 'register', desc: 'Daftar akun baru' }
            ]
        },
        {
            name: 'RPG Adventure',
            icon: '⚔️',
            commands: [
                { name: 'battle', desc: 'Bertarung lawan monster' },
                { name: 'dungeon', desc: 'Jelajah dungeon' },
                { name: 'gacha', desc: 'Summon hero baru' },
                { name: 'heroes', desc: 'Lihat koleksi hero' },
                { name: 'leaderboard', desc: 'Ranking pemain global' },
                { name: 'craft', desc: 'Membuat item baru' },
                { name: 'recipe', desc: 'Lihat resep crafting' },
                { name: 'rbag', desc: 'Lihat inventory RPG' }
            ]
        },
        {
            name: 'Mining Tycoon',
            icon: '⛏️',
            commands: [
                { name: 'mine', desc: 'Tambang resource' },
                { name: 'mining', desc: 'Cek status mining' },
                { name: 'minv', desc: 'Lihat inventory mining' },
                { name: 'mshop', desc: 'Toko item mining' },
                { name: 'mupgrade', desc: 'Upgrade pickaxe' },
                { name: 'mfloor', desc: 'Pindah lantai tambang' },
                { name: 'msell', desc: 'Jual hasil tambang' }
            ]
        },
        {
            name: 'Tournament',
            icon: '🏆',
            commands: [
                { name: 'join', desc: 'Daftar ke turnamen aktif' },
                { name: 'peserta', desc: 'Lihat list peserta' },
                { name: 'klasemen', desc: 'Lihat klasemen grup' },
                { name: 'jadwal', desc: 'Cek jadwal pertandingan' }
            ]
        }
    ];

    const cardsHtml = categories.map(cat => `
                                    < div class="card" style="margin-bottom: 24px;" >
                                        <div class="card-header">
                                            <div>
                                                <div class="card-title">${cat.icon} ${cat.name}</div>
                                                <div class="card-subtitle">${cat.commands.length} commands available</div>
                                            </div>
                                        </div>
                                        <div class="table-responsive">
                                            <table class="table">
                                                <thead><tr><th style="width: 140px;">Command</th><th>Description</th><th style="width: 80px; text-align: center;">Type</th></tr></thead>
                                                <tbody>
                                                    ${cat.commands.map(c => `
                                <tr>
                                    <td><code class="cmd-badge">${config.bot.prefix}${c.name}</code></td>
                                    <td style="color: var(--text-secondary); font-size: 14px;">${c.desc}</td>
                                    <td style="text-align: center;"><span class="badge badge-success">User</span></td>
                                </tr>
                            `).join('')}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div >
                                    `).join('');

    return `
                                    < header class="header" >
                                        <h1 class="header-title">Commands</h1>
                                        <div class="header-subtitle">List of all available commands for regular users</div>
                                    </header >
                                    <div class="content">
                                        <style>
                                            .cmd-badge {
                                                background: var(--bg-tertiary);
                                            padding: 6px 10px;
                                            border-radius: 6px;
                                            color: var(--accent);
                                            font-family: 'JetBrains Mono', monospace;
                                            font-weight: 500;
                                            font-size: 13px;
                                            border: 1px solid var(--border);
                    }
                                            .table td {padding: 18px 24px; vertical-align: middle; border-bottom: 1px solid var(--border); }
                                            .table tr:last-child td {border - bottom: none; }
                                        </style>
                                        ${cardsHtml}
                                    </div>
                                    `;
}

module.exports = { getCommandsPage };
