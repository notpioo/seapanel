const express = require('express');
const { RPGDungeon } = require('../../models');

function getDungeonConfigPage(dungeon, message, error) {
    const tiers = dungeon ? dungeon.tiers : [];

    const tiersHtml = tiers.map((t, i) => `
        <tr>
            <td>${t.startFloor}</td>
            <td>${t.enemyName}</td>
            <td>${t.bossName}</td>
            <td>
                <form method="POST" action="/dungeon-config/tier/delete" style="display:inline">
                    <input type="hidden" name="startFloor" value="${t.startFloor}">
                    <button type="submit" class="btn btn-danger btn-sm" onclick="return confirm('Hapus tier ini?')">Hapus</button>
                </form>
            </td>
        </tr>
    `).join('');

    return `
    <style>
        .dc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        .dc-card { background: #1a1a2e; border: 1px solid #333; border-radius: 12px; padding: 24px; }
        .dc-card h3 { color: #ffd700; margin: 0 0 16px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .form-group { margin-bottom: 14px; }
        .form-group label { display: block; font-size: 12px; color: #888; margin-bottom: 6px; }
        .form-group input { width: 100%; padding: 8px 12px; background: #0d0d1a; border: 1px solid #333; border-radius: 6px; color: #fff; font-size: 13px; box-sizing: border-box; }
        .form-group textarea { width: 100%; padding: 8px 12px; background: #0d0d1a; border: 1px solid #333; border-radius: 6px; color: #fff; font-size: 13px; resize: vertical; box-sizing: border-box; }
        .btn { padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; }
        .btn-primary { background: #ffd700; color: #000; font-weight: 700; }
        .btn-danger  { background: #e53e3e; color: #fff; }
        .btn-sm { padding: 4px 10px; font-size: 12px; }
        .data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .data-table th { background: #0d0d1a; color: #888; padding: 8px 12px; text-align: left; font-size: 11px; }
        .data-table td { padding: 8px 12px; border-bottom: 1px solid #222; color: #ddd; }
        .data-table tr:hover td { background: #1e1e35; }
        .alert { padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; font-size: 13px; }
        .alert-success { background: #1a3a2a; border: 1px solid #2d6a4f; color: #74c69d; }
        .alert-error   { background: #3a1a1a; border: 1px solid #6a2d2d; color: #fc8181; }
        .badge-active   { background: #2d6a4f; color: #74c69d; padding: 2px 8px; border-radius: 10px; font-size: 11px; }
        .badge-inactive { background: #555; color: #aaa; padding: 2px 8px; border-radius: 10px; font-size: 11px; }
        .section-title { font-size: 18px; color: #ffd700; margin: 0 0 20px 0; }
        .formula-note { font-size: 11px; color: #666; margin-top: 4px; }
        @media(max-width:768px){ .dc-grid{grid-template-columns:1fr;} .form-row{grid-template-columns:1fr;} }
    </style>

    <h2 class="section-title">🗼 Dungeon Configuration</h2>

    ${message ? `<div class="alert alert-success">${message}</div>` : ''}
    ${error   ? `<div class="alert alert-error">${error}</div>` : ''}

    ${dungeon ? `
    <!-- DUNGEON SETTINGS -->
    <div class="dc-card" style="margin-bottom:24px">
        <h3>⚙️ Pengaturan Dungeon</h3>
        <form method="POST" action="/dungeon-config/update">
            <div class="form-row">
                <div class="form-group">
                    <label>Dungeon ID</label>
                    <input type="text" name="dungeonId" value="${dungeon.dungeonId}" readonly style="opacity:0.5">
                </div>
                <div class="form-group">
                    <label>Nama Dungeon</label>
                    <input type="text" name="name" value="${dungeon.name}" required>
                </div>
            </div>
            <div class="form-group">
                <label>Deskripsi</label>
                <textarea name="description" rows="2">${dungeon.description}</textarea>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Min Level</label>
                    <input type="number" name="minLevel" value="${dungeon.minLevel}" min="1">
                </div>
                <div class="form-group">
                    <label>Status</label>
                    <select name="isActive" style="width:100%;padding:8px 12px;background:#0d0d1a;border:1px solid #333;border-radius:6px;color:#fff;font-size:13px">
                        <option value="true"  ${dungeon.isActive ? 'selected' : ''}>Aktif</option>
                        <option value="false" ${!dungeon.isActive ? 'selected' : ''}>Nonaktif</option>
                    </select>
                </div>
            </div>

            <h3 style="margin-top:16px">📊 Scaling Musuh per Floor</h3>
            <p class="formula-note">Formula: HP = baseHP + (floor-1) × hpPerFloor | ATK = baseATK + (floor-1) × atkPerFloor</p>
            <div class="form-row">
                <div class="form-group"><label>Base HP (Floor 1)</label><input type="number" name="baseHP" value="${dungeon.baseHP}"></div>
                <div class="form-group"><label>HP per Floor</label><input type="number" name="hpPerFloor" value="${dungeon.hpPerFloor}"></div>
                <div class="form-group"><label>Base ATK (Floor 1)</label><input type="number" name="baseATK" value="${dungeon.baseATK}"></div>
                <div class="form-group"><label>ATK per Floor</label><input type="number" name="atkPerFloor" value="${dungeon.atkPerFloor}"></div>
            </div>

            <h3 style="margin-top:8px">💀 Boss Multiplier (setiap 5 floor)</h3>
            <div class="form-row">
                <div class="form-group"><label>Boss HP Multiplier</label><input type="number" name="bossHPMult" value="${dungeon.bossHPMult}" step="0.1"></div>
                <div class="form-group"><label>Boss ATK Multiplier</label><input type="number" name="bossATKMult" value="${dungeon.bossATKMult}" step="0.1"></div>
            </div>

            <h3 style="margin-top:8px">🎁 Reward per Floor</h3>
            <div class="form-row">
                <div class="form-group"><label>Base EXP</label><input type="number" name="baseExp" value="${dungeon.baseExp}"></div>
                <div class="form-group"><label>EXP per Floor</label><input type="number" name="expPerFloor" value="${dungeon.expPerFloor}"></div>
                <div class="form-group"><label>Base Gold</label><input type="number" name="baseGold" value="${dungeon.baseGold}"></div>
                <div class="form-group"><label>Gold per Floor</label><input type="number" name="goldPerFloor" value="${dungeon.goldPerFloor}"></div>
                <div class="form-group"><label>Boss EXP Multiplier</label><input type="number" name="bossExpMult" value="${dungeon.bossExpMult}" step="0.1"></div>
                <div class="form-group"><label>Boss Gold Multiplier</label><input type="number" name="bossGoldMult" value="${dungeon.bossGoldMult}" step="0.1"></div>
            </div>

            <h3 style="margin-top:8px">📦 Drop Items (format: itemId:rate)</h3>
            <div class="form-row">
                <div class="form-group"><label>Normal Floor Drop</label><input type="text" name="normalDrop" value="${dungeon.normalDrop}" placeholder="dungeon_crystal:20"></div>
                <div class="form-group"><label>Boss Floor Drop</label><input type="text" name="bossDrop" value="${dungeon.bossDrop}" placeholder="dungeon_shard:60,dungeon_crystal:100"></div>
            </div>

            <button type="submit" class="btn btn-primary">💾 Simpan Perubahan</button>
        </form>
    </div>

    <!-- TIERS -->
    <div class="dc-grid">
        <div class="dc-card">
            <h3>🎭 Tier Musuh</h3>
            <p class="formula-note" style="margin-bottom:12px">Tier menentukan nama musuh berdasarkan floor. Tier dengan startFloor terbesar yang ≤ floor saat ini akan dipakai.</p>
            <table class="data-table">
                <thead><tr><th>Start Floor</th><th>Musuh Biasa</th><th>Boss</th><th>Aksi</th></tr></thead>
                <tbody>${tiersHtml || '<tr><td colspan="4" style="color:#555;text-align:center">Belum ada tier</td></tr>'}</tbody>
            </table>
        </div>
        <div class="dc-card">
            <h3>➕ Tambah Tier</h3>
            <form method="POST" action="/dungeon-config/tier/add">
                <div class="form-group"><label>Start Floor</label><input type="number" name="startFloor" min="1" placeholder="1" required></div>
                <div class="form-group"><label>Nama Musuh Biasa</label><input type="text" name="enemyName" placeholder="Goblin Penjaga" required></div>
                <div class="form-group"><label>Nama Boss (setiap 5 floor)</label><input type="text" name="bossName" placeholder="Goblin Pemimpin" required></div>
                <button type="submit" class="btn btn-primary">+ Tambah Tier</button>
            </form>

            <!-- Preview -->
            <div style="margin-top:20px">
                <h3>🔮 Preview Scaling</h3>
                <p class="formula-note" style="margin-bottom:8px">Contoh stats musuh di beberapa floor:</p>
                <table class="data-table">
                    <thead><tr><th>Floor</th><th>HP</th><th>ATK</th><th>EXP</th><th>Gold</th></tr></thead>
                    <tbody>
                        ${[1,5,10,25,50,100,200].map(f => {
                            const isBoss = f % 5 === 0;
                            const hp   = Math.round((dungeon.baseHP  + (f-1) * dungeon.hpPerFloor)  * (isBoss ? dungeon.bossHPMult  : 1));
                            const atk  = Math.round((dungeon.baseATK + (f-1) * dungeon.atkPerFloor) * (isBoss ? dungeon.bossATKMult : 1));
                            const exp  = Math.round((dungeon.baseExp  + (f-1) * dungeon.expPerFloor)  * (isBoss ? dungeon.bossExpMult  : 1));
                            const gold = Math.round((dungeon.baseGold + (f-1) * dungeon.goldPerFloor) * (isBoss ? dungeon.bossGoldMult : 1));
                            return `<tr>
                                <td>${f}${isBoss ? ' 👹' : ''}</td>
                                <td>${hp}</td><td>${atk}</td><td>${exp}</td><td>${gold}</td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    ` : `
    <!-- NO DUNGEON YET -->
    <div class="dc-card">
        <h3>➕ Buat Dungeon</h3>
        <form method="POST" action="/dungeon-config/create">
            <div class="form-row">
                <div class="form-group"><label>Dungeon ID (unik, tanpa spasi)</label><input type="text" name="dungeonId" placeholder="menara_iblis" required></div>
                <div class="form-group"><label>Nama Dungeon</label><input type="text" name="name" placeholder="Menara Iblis" required></div>
            </div>
            <div class="form-group"><label>Deskripsi</label><textarea name="description" rows="2" placeholder="Menara gelap tanpa batas..."></textarea></div>
            <div class="form-group"><label>Min Level</label><input type="number" name="minLevel" value="5" min="1"></div>
            <button type="submit" class="btn btn-primary">🗼 Buat Dungeon</button>
        </form>
    </div>
    `}
    `;
}

module.exports = {
    setupRoutes: (app, requireAuth) => {

        // GET page
        app.get('/dungeon-config', requireAuth(['admin']), async (req, res) => {
            try {
                const dungeon = await RPGDungeon.findOne();
                const page = getDungeonConfigPage(dungeon, req.query.message, req.query.error);
                const { getSidebar } = require('../views/sidebar');
                const { getCSS } = require('../views/styles');
                const session = req.session;
                const roleConfig = { allowedPages: ['*'] };
                res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Dungeon Config</title><style>${getCSS()}</style></head><body>
                    <div class="layout">${getSidebar('dungeon-config', session, roleConfig)}
                    <main class="main-content"><div class="content-area">${page}</div></main></div></body></html>`);
            } catch (e) {
                res.redirect('/dungeon-config?error=' + encodeURIComponent(e.message));
            }
        });

        // CREATE dungeon
        app.post('/dungeon-config/create', requireAuth(['admin']), async (req, res) => {
            try {
                const { dungeonId, name, description, minLevel } = req.body;
                await RPGDungeon.create({ dungeonId, name, description, minLevel: Number(minLevel) || 5 });
                res.redirect('/dungeon-config?message=Dungeon berhasil dibuat!');
            } catch (e) {
                res.redirect('/dungeon-config?error=' + encodeURIComponent(e.message));
            }
        });

        // UPDATE dungeon settings
        app.post('/dungeon-config/update', requireAuth(['admin']), async (req, res) => {
            try {
                const { name, description, minLevel, isActive,
                        baseHP, hpPerFloor, baseATK, atkPerFloor,
                        bossHPMult, bossATKMult,
                        baseExp, expPerFloor, baseGold, goldPerFloor,
                        bossExpMult, bossGoldMult,
                        normalDrop, bossDrop } = req.body;

                await RPGDungeon.findOneAndUpdate({}, {
                    name, description,
                    minLevel: Number(minLevel),
                    isActive: isActive === 'true',
                    baseHP: Number(baseHP), hpPerFloor: Number(hpPerFloor),
                    baseATK: Number(baseATK), atkPerFloor: Number(atkPerFloor),
                    bossHPMult: Number(bossHPMult), bossATKMult: Number(bossATKMult),
                    baseExp: Number(baseExp), expPerFloor: Number(expPerFloor),
                    baseGold: Number(baseGold), goldPerFloor: Number(goldPerFloor),
                    bossExpMult: Number(bossExpMult), bossGoldMult: Number(bossGoldMult),
                    normalDrop: normalDrop || '', bossDrop: bossDrop || '',
                });
                res.redirect('/dungeon-config?message=Pengaturan berhasil disimpan!');
            } catch (e) {
                res.redirect('/dungeon-config?error=' + encodeURIComponent(e.message));
            }
        });

        // ADD tier
        app.post('/dungeon-config/tier/add', requireAuth(['admin']), async (req, res) => {
            try {
                const { startFloor, enemyName, bossName } = req.body;
                await RPGDungeon.findOneAndUpdate({}, {
                    $push: { tiers: { startFloor: Number(startFloor), enemyName, bossName } }
                });
                res.redirect('/dungeon-config?message=Tier berhasil ditambahkan!');
            } catch (e) {
                res.redirect('/dungeon-config?error=' + encodeURIComponent(e.message));
            }
        });

        // DELETE tier
        app.post('/dungeon-config/tier/delete', requireAuth(['admin']), async (req, res) => {
            try {
                const startFloor = Number(req.body.startFloor);
                await RPGDungeon.findOneAndUpdate({}, {
                    $pull: { tiers: { startFloor } }
                });
                res.redirect('/dungeon-config?message=Tier berhasil dihapus!');
            } catch (e) {
                res.redirect('/dungeon-config?error=' + encodeURIComponent(e.message));
            }
        });
    }
};
