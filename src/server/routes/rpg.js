const express = require('express');
const { RPGHero, RPGChapter, RPGConfig, RPGEnemy, RPGItem, RPGRecipe, RPGDungeon } = require('../../models');

module.exports = {
    setupRoutes: (app, requireAuth) => {
        // -- HERO CRUD --
        app.post('/rpg-config/hero/add', requireAuth(['admin']), async (req, res) => {
            try {
                const { heroId, name, rarity, hp, atk, desc } = req.body;
                await RPGHero.create({ heroId, name, rarity, hp: Number(hp), atk: Number(atk), desc: desc || '' });
                res.redirect('/rpg-config?tab=heroes&message=Hero added!');
            } catch (error) {
                res.redirect('/rpg-config?tab=heroes&error=' + encodeURIComponent(error.message));
            }
        });

        app.post('/rpg-config/hero/edit', requireAuth(['admin']), async (req, res) => {
            try {
                const { heroId, name, rarity, hp, atk, desc } = req.body;
                await RPGHero.findOneAndUpdate({ heroId }, { name, rarity, hp: Number(hp), atk: Number(atk), desc });
                res.redirect('/rpg-config?tab=heroes&message=Hero updated!');
            } catch (error) {
                res.redirect('/rpg-config?tab=heroes&error=Failed to update');
            }
        });

        app.post('/rpg-config/hero/delete', requireAuth(['admin']), async (req, res) => {
            try {
                await RPGHero.findOneAndDelete({ heroId: req.body.heroId });
                res.redirect('/rpg-config?tab=heroes&message=Hero deleted!');
            } catch (error) {
                res.redirect('/rpg-config?tab=heroes&error=Failed to delete');
            }
        });

        // -- CHAPTER CRUD --
        app.post('/rpg-config/chapter/add', requireAuth(['admin']), async (req, res) => {
            try {
                const { chapterNumber, name, clearRewardHeroId } = req.body;
                await RPGChapter.create({ chapterNumber: Number(chapterNumber), name, clearRewardHeroId: clearRewardHeroId || null, stages: [] });
                res.redirect('/rpg-config?tab=chapters&message=Chapter added!');
            } catch (error) {
                res.redirect('/rpg-config?tab=chapters&error=' + encodeURIComponent(error.message));
            }
        });

        app.post('/rpg-config/chapter/delete', requireAuth(['admin']), async (req, res) => {
            try {
                await RPGChapter.findOneAndDelete({ chapterNumber: Number(req.body.chapterNumber) });
                res.redirect('/rpg-config?tab=chapters&message=Chapter deleted!');
            } catch (error) {
                res.redirect('/rpg-config?tab=chapters&error=Failed to delete');
            }
        });

        // -- ITEM LIBRARY CRUD --
        app.post('/rpg-config/item/add', requireAuth(['admin']), async (req, res) => {
            try {
                const { itemId, name, description, price, type, atk, hp } = req.body;
                await RPGItem.create({
                    itemId, name,
                    description,
                    type,
                    price: Number(price) || 0,
                    atk: Number(atk) || 0,
                    hp: Number(hp) || 0
                });
                res.redirect('/rpg-config?tab=items&message=Item added!');
            } catch (error) {
                res.redirect('/rpg-config?tab=items&error=' + encodeURIComponent(error.message));
            }
        });

        app.post('/rpg-config/item/edit', requireAuth(['admin']), async (req, res) => {
            try {
                const { originalItemId, itemId, name, description, price, type, atk, hp } = req.body;

                if (originalItemId !== itemId) {
                    const exists = await RPGItem.findOne({ itemId });
                    if (exists) throw new Error('Item ID already exists');
                }

                await RPGItem.findOneAndUpdate({ itemId: originalItemId }, {
                    itemId, name,
                    description,
                    type,
                    price: Number(price) || 0,
                    atk: Number(atk) || 0,
                    hp: Number(hp) || 0
                });
                res.redirect('/rpg-config?tab=items&message=Item updated!');
            } catch (error) {
                res.redirect('/rpg-config?tab=items&error=' + encodeURIComponent(error.message));
            }
        });

        app.post('/rpg-config/item/delete', requireAuth(['admin']), async (req, res) => {
            try {
                await RPGItem.findOneAndDelete({ itemId: req.body.itemId });
                res.redirect('/rpg-config?tab=items&message=Item deleted!');
            } catch (error) {
                res.redirect('/rpg-config?tab=items&error=Failed to delete');
            }
        });

        // -- ENEMY LIBRARY CRUD --
        app.post('/rpg-config/enemy/add', requireAuth(['admin']), async (req, res) => {
            try {
                const { enemyId, name, hp, atk, exp, gold, drop, isBoss } = req.body;
                await RPGEnemy.create({
                    enemyId, name,
                    hp: Number(hp), atk: Number(atk),
                    exp: Number(exp), gold: Number(gold),
                    drop: drop || '', isBoss: isBoss === 'on'
                });
                res.redirect('/rpg-config?tab=enemies&message=Enemy added!');
            } catch (error) {
                res.redirect('/rpg-config?tab=enemies&error=' + encodeURIComponent(error.message));
            }
        });

        app.post('/rpg-config/enemy/edit', requireAuth(['admin']), async (req, res) => {
            try {
                const { originalEnemyId, enemyId, name, hp, atk, exp, gold, drop, isBoss } = req.body;

                // If ID Changed, check conflict
                if (originalEnemyId !== enemyId) {
                    const exists = await RPGEnemy.findOne({ enemyId });
                    if (exists) throw new Error('Enemy ID already exists');
                }

                await RPGEnemy.findOneAndUpdate({ enemyId: originalEnemyId }, {
                    enemyId, name,
                    hp: Number(hp), atk: Number(atk),
                    exp: Number(exp), gold: Number(gold),
                    drop: drop || '', isBoss: isBoss === 'on'
                });
                res.redirect('/rpg-config?tab=enemies&message=Enemy updated!');
            } catch (error) {
                res.redirect('/rpg-config?tab=enemies&error=' + encodeURIComponent(error.message));
            }
        });

        app.post('/rpg-config/enemy/delete', requireAuth(['admin']), async (req, res) => {
            try {
                await RPGEnemy.findOneAndDelete({ enemyId: req.body.enemyId });
                res.redirect('/rpg-config?tab=enemies&message=Enemy deleted from library!');
            } catch (error) {
                res.redirect('/rpg-config?tab=enemies&error=Failed to delete');
            }
        });

        // -- STAGE CRUD (nested in chapter) -- UPDATED
        app.post('/rpg-config/stage/add', requireAuth(['admin']), async (req, res) => {
            try {
                const { chapterNumber, stageNumber, name, enemyId, level, isBoss } = req.body;
                const chapter = await RPGChapter.findOne({ chapterNumber: Number(chapterNumber) });
                if (!chapter) throw new Error('Chapter not found');

                // Fetch Enemy Base Stats
                const enemyData = await RPGEnemy.findOne({ enemyId });
                if (!enemyData) throw new Error('Enemy not found');

                const lvl = Number(level) || 1;
                const newStage = {
                    stageNumber: Number(stageNumber),
                    name,
                    enemyId,
                    level: lvl,
                    enemy: enemyData.name,
                    hp: Math.floor(enemyData.hp * lvl),
                    atk: Math.floor(enemyData.atk * lvl),
                    exp: Math.floor(enemyData.exp * lvl),
                    gold: Math.floor(enemyData.gold * lvl),
                    drop: enemyData.drop || '',
                    isBoss: isBoss === 'on'
                };

                chapter.stages.push(newStage);
                chapter.stages.sort((a, b) => a.stageNumber - b.stageNumber);
                await chapter.save();
                res.redirect('/rpg-config?tab=chapters&message=Stage added!');
            } catch (error) {
                res.redirect('/rpg-config?tab=chapters&error=' + encodeURIComponent(error.message));
            }
        });

        app.post('/rpg-config/stage/delete', requireAuth(['admin']), async (req, res) => {
            try {
                const { chapterNumber, stageNumber } = req.body;
                const chapter = await RPGChapter.findOne({ chapterNumber: Number(chapterNumber) });
                if (!chapter) throw new Error('Chapter not found');
                chapter.stages = chapter.stages.filter(s => s.stageNumber !== Number(stageNumber));
                await chapter.save();
                res.redirect('/rpg-config?tab=chapters&message=Stage deleted!');
            } catch (error) {
                res.redirect('/rpg-config?tab=chapters&error=Failed to delete');
            }
        });

        app.post('/rpg-config/stage/edit', requireAuth(['admin']), async (req, res) => {
            try {
                const { chapterNumber, originalStageNumber, stageNumber, name, enemyId, level, isBoss } = req.body;
                const chapter = await RPGChapter.findOne({ chapterNumber: Number(chapterNumber) });
                if (!chapter) throw new Error('Chapter not found');

                const stageIndex = chapter.stages.findIndex(s => s.stageNumber === Number(originalStageNumber));
                if (stageIndex === -1) throw new Error('Stage not found');

                // Fetch Enemy Base Stats
                const enemyData = await RPGEnemy.findOne({ enemyId });
                if (!enemyData) throw new Error('Enemy not found');

                const lvl = Number(level) || 1;

                chapter.stages[stageIndex] = {
                    stageNumber: Number(stageNumber),
                    name,
                    enemyId,
                    level: lvl,
                    enemy: enemyData.name,
                    hp: Math.floor(enemyData.hp * lvl),
                    atk: Math.floor(enemyData.atk * lvl),
                    exp: Math.floor(enemyData.exp * lvl),
                    gold: Math.floor(enemyData.gold * lvl),
                    drop: enemyData.drop || '',
                    isBoss: isBoss === 'on'
                };

                // Sort stages again in case number changed
                chapter.stages.sort((a, b) => a.stageNumber - b.stageNumber);
                await chapter.save();
                res.redirect('/rpg-config?tab=chapters&message=Stage updated!');
            } catch (error) {
                res.redirect('/rpg-config?tab=chapters&error=' + encodeURIComponent(error.message));
            }
        });

        // -- RECIPE CRUD --
        app.post('/rpg-config/recipe/add', requireAuth(['admin']), async (req, res) => {
            try {
                // ingredients input format: "wood:5, iron:1"
                const { resultItemId, ingredientsRaw, category } = req.body;

                const ingredients = ingredientsRaw.split(',').map(s => {
                    const [id, amt] = s.split(':').map(x => x.trim());
                    return { itemId: id, amount: parseInt(amt) || 1 };
                }).filter(x => x.itemId);

                await RPGRecipe.create({
                    resultItemId,
                    ingredients,
                    category: category || 'Material'
                });
                res.redirect('/rpg-config?tab=recipes&message=Recipe added!');
            } catch (error) {
                res.redirect('/rpg-config?tab=recipes&error=' + encodeURIComponent(error.message));
            }
        });

        app.post('/rpg-config/recipe/delete', requireAuth(['admin']), async (req, res) => {
            try {
                await RPGRecipe.findByIdAndDelete(req.body.id);
                res.redirect('/rpg-config?tab=recipes&message=Recipe deleted!');
            } catch (error) {
                res.redirect('/rpg-config?tab=recipes&error=Failed to delete');
            }
        });

        // -- DUNGEON CRUD --
        app.post('/rpg-config/dungeon/add', requireAuth(['admin']), async (req, res) => {
            try {
                const { dungeonId, name, minLevel, ticketItemId, ticketCount, goldCost, bossId, expReward, goldReward } = req.body;

                await RPGDungeon.create({
                    dungeonId, name,
                    minLevel: Number(minLevel) || 1,
                    ticketItemId: ticketItemId || null,
                    ticketCount: Number(ticketCount) || 0,
                    goldCost: Number(goldCost) || 0,
                    bossId,
                    expReward: Number(expReward) || 0,
                    goldReward: Number(goldReward) || 0
                });
                res.redirect('/rpg-config?tab=dungeons&message=Dungeon added!');
            } catch (error) {
                res.redirect('/rpg-config?tab=dungeons&error=' + encodeURIComponent(error.message));
            }
        });

        app.post('/rpg-config/dungeon/delete', requireAuth(['admin']), async (req, res) => {
            try {
                const { dungeonId } = req.body;
                await RPGDungeon.findOneAndDelete({ dungeonId });
                res.redirect('/rpg-config?tab=dungeons&message=Dungeon deleted!');
            } catch (error) {
                res.redirect('/rpg-config?tab=dungeons&error=' + encodeURIComponent(error.message));
            }
        });

        // -- RPG CONFIG UPDATE --
        app.post('/rpg-config/settings/update', requireAuth(['admin']), async (req, res) => {
            try {
                const { gachaPrice, baseHP, baseATK, hpPerLevel, atkPerLevel, rateSSR, rateSR, rateR, rateC } = req.body;
                const cfg = await RPGConfig.getConfig();
                cfg.gachaPrice = Number(gachaPrice);
                cfg.baseHP = Number(baseHP);
                cfg.baseATK = Number(baseATK);
                cfg.hpPerLevel = Number(hpPerLevel);
                cfg.atkPerLevel = Number(atkPerLevel);
                cfg.gachaRates = { SSR: Number(rateSSR), SR: Number(rateSR), R: Number(rateR), C: Number(rateC) };
                await cfg.save();
                res.redirect('/rpg-config?tab=config&message=Config updated!');
            } catch (error) {
                res.redirect('/rpg-config?tab=config&error=Failed to update');
            }
        });

    },

    getRPGConfigPage: async () => {
        const rpgConfig = await RPGConfig.getConfig();
        const heroes = await RPGHero.find().sort({ rarity: -1, name: 1 }).lean();
        const recipes = await RPGRecipe.find({}).sort({ category: 1, resultItemId: 1 });
        const chapters = await RPGChapter.find().sort({ chapterNumber: 1 }).lean();
        const dungeons = await RPGDungeon.find().sort({ minLevel: 1 }).lean();
        const allItems = await RPGItem.find().sort({ name: 1 }).lean();
        const allEnemies = await RPGEnemy.find().sort({ name: 1 }).lean();

        const rarityOrder = { UR: -1, SSR: 0, SR: 1, R: 2, C: 3 };
        heroes.sort((a, b) => (rarityOrder[a.rarity] || 99) - (rarityOrder[b.rarity] || 99));

        const rarityColor = { UR: '#ef4444', SSR: '#f59e0b', SR: '#a855f7', R: '#3b82f6', C: '#6b7280' };

        // Hero Rows
        const heroRows = heroes.map(h => `
            <tr>
                <td><code>${h.heroId}</code></td>
                <td>${h.name}</td>
                <td><span style="color:${rarityColor[h.rarity] || '#fff'};font-weight:700">${h.rarity}</span></td>
                <td>${h.hp}</td>
                <td>${h.atk}</td>
                <td>${h.desc || '-'}</td>
                <td>
                    <form method="POST" action="/rpg-config/hero/delete" style="display:inline" onsubmit="return confirm('Delete this hero?')">
                        <input type="hidden" name="heroId" value="${h.heroId}">
                        <button type="submit" class="btn btn-sm" style="background:#ef4444;color:#fff;border:none;padding:4px 10px;border-radius:4px;cursor:pointer">Delete</button>
                    </form>
                </td>
            </tr>
        `).join('');

        // Item Rows for Library Tab
        const items = await RPGItem.find().sort({ type: 1, name: 1 }).lean();
        const itemRows = items.map(i => `
            <tr>
                <td><code>${i.itemId}</code></td>
                <td>${i.name}</td>
                <td><span class="badge" style="background:${i.type === 'junk' ? '#64748b' : '#3b82f6'};color:#fff;padding:2px 6px;border-radius:4px;font-size:11px">${i.type.toUpperCase()}</span></td>
                <td>${i.price} G</td>
                <td>${i.description || '-'}</td>
                <td>
                    <button onclick="openEditItem('${i.itemId}', '${i.name}', '${i.description || ''}', ${i.price}, '${i.type}', ${i.atk}, ${i.hp})" class="btn btn-sm" style="background:#3b82f6;color:#fff;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;margin-right:4px">Edit</button>
                    <form method="POST" action="/rpg-config/item/delete" style="display:inline" onsubmit="return confirm('Delete item ${i.name}?')">
                        <input type="hidden" name="itemId" value="${i.itemId}">
                        <button type="submit" class="btn btn-sm" style="background:#ef4444;color:#fff;border:none;padding:4px 10px;border-radius:4px;cursor:pointer">Del</button>
                    </form>
                </td>
            </tr>
        `).join('');

        // Enemy Rows for Library Tab
        const enemies = await RPGEnemy.find().sort({ hp: 1 }).lean();
        const enemyRows = enemies.map(e => `
            <tr>
                <td><code>${e.enemyId}</code></td>
                <td>${e.name} ${e.isBoss ? '👑' : ''}</td>
                <td>H:${e.hp} A:${e.atk}</td>
                <td>XP:${e.exp} G:${e.gold}</td>
                <td>${e.drop || '-'}</td>
                <td>
                    <button onclick="openEditEnemy('${e.enemyId}', '${e.name}', ${e.hp}, ${e.atk}, ${e.exp}, ${e.gold}, '${e.drop || ''}', ${e.isBoss})" class="btn btn-sm" style="background:#3b82f6;color:#fff;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;margin-right:4px">Edit</button>
                    <form method="POST" action="/rpg-config/enemy/delete" style="display:inline" onsubmit="return confirm('Delete enemy ${e.name}?')">
                        <input type="hidden" name="enemyId" value="${e.enemyId}">
                        <button type="submit" class="btn btn-sm" style="background:#ef4444;color:#fff;border:none;padding:4px 10px;border-radius:4px;cursor:pointer">Del</button>
                    </form>
                </td>
            </tr>
        `).join('');

        // Chapter Rows
        const chapterRows = chapters.map(ch => {
            const stageList = ch.stages.map(s => `
                <div style="display:flex;align-items:center;justify-content:space-between;padding:10px;background:rgba(255,255,255,0.02);border-radius:6px;margin-bottom:8px;border:1px solid rgba(255,255,255,0.05)">
                    <div style="display:flex;flex-direction:column;gap:4px">
                        <span style="font-weight:600;color:#e2e8f0">Stage ${s.stageNumber}: ${s.name} ${s.isBoss ? '<span style="background:#f59e0b;color:#000;font-size:10px;padding:1px 4px;border-radius:4px;font-weight:700">BOSS</span>' : ''}</span>
                        <div style="font-size:12px;color:#94a3b8">
                            <span style="color:#ef4444">⚔️ ${s.enemy} (Lv.${s.level || 1})</span> • 
                            <span>❤️ ${s.hp}</span> • 
                            <span>⚔️ ${s.atk}</span>
                        </div>
                        <div style="font-size:11px;color:#64748b">
                            Reward: ${s.exp} XP • ${s.gold} Gold ${s.drop ? '• 🎁 ' + s.drop : ''}
                        </div>
                    </div>
                    <div style="display:flex;gap:4px">
                    <button onclick="openEditStage(${ch.chapterNumber}, ${s.stageNumber}, '${s.name}', '${s.enemyId || ''}', ${s.level || 1}, ${s.isBoss})" class="btn btn-sm" style="background:#3b82f6;color:#fff;border:none;padding:4px 10px;border-radius:4px;cursor:pointer">Edit</button>
                        <form method="POST" action="/rpg-config/stage/delete" style="display:inline" onsubmit="return confirm('Delete Stage ${s.stageNumber}?')">
                            <input type="hidden" name="chapterNumber" value="${ch.chapterNumber}">
                            <input type="hidden" name="stageNumber" value="${s.stageNumber}">
                            <button type="submit" class="btn btn-sm" style="background:#ef4444;color:#fff;border:none;padding:6px 10px;border-radius:4px;cursor:pointer;font-size:12px">🗑️</button>
                        </form>
                    </div>
                </div>
            `).join('');

            return `
            <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:16px;margin-bottom:12px">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,0.05)">
                    <div style="display:flex;align-items:center;gap:12px">
                        <h3 style="margin:0;font-size:16px;color:#f8fafc">Chapter ${ch.chapterNumber}: ${ch.name}</h3>
                        ${ch.clearRewardHeroId ? `<span style="font-size:11px;background:#a855f7;color:#fff;padding:2px 6px;border-radius:4px">Reward: ${ch.clearRewardHeroId}</span>` : ''}
                    </div>
                    <form method="POST" action="/rpg-config/chapter/delete" style="display:inline" onsubmit="return confirm('Delete chapter ${ch.chapterNumber}?')">
                        <input type="hidden" name="chapterNumber" value="${ch.chapterNumber}">
                        <button type="submit" style="background:transparent;color:#ef4444;border:1px solid #ef4444;padding:4px 10px;border-radius:4px;cursor:pointer;font-size:12px">Delete Chapter</button>
                    </form>
                </div>

                <div style="font-size:13px">${stageList || '<div style="padding:20px;text-align:center;color:#64748b;background:rgba(0,0,0,0.2);border-radius:6px">No stages yet</div>'}</div>
                
                <details style="margin-top:10px">
                    <summary style="cursor:pointer;color:#a855f7;font-size:13px;font-weight:600;padding:8px 0">+ Add New Stage</summary>
                    <form method="POST" action="/rpg-config/stage/add" style="background:rgba(0,0,0,0.2);padding:12px;border-radius:6px;margin-top:8px">
                        <input type="hidden" name="chapterNumber" value="${ch.chapterNumber}">
                        <div style="display:grid;grid-template-columns:1fr 4fr;gap:8px;margin-bottom:8px">
                            <input name="stageNumber" type="number" placeholder="#" required class="form-input-sm">
                            <input name="name" placeholder="Stage Name" required class="form-input-sm">
                        </div>
                        <div style="display:grid;grid-template-columns:3fr 1fr auto;gap:8px;align-items:end;margin-bottom:8px">
                            <label style="color:#ccc;font-size:11px">Select Enemy
                                <select name="enemyId" required class="form-input-sm" style="margin-top:4px">
                                    <option value="" disabled selected>-- Select Enemy --</option>
                                    ${enemies.map(e => `<option value="${e.enemyId}" style="color:#000">[${e.enemyId}] ${e.name} (Base HP:${e.hp})</option>`).join('')}
                                </select>
                            </label>
                            <label style="color:#ccc;font-size:11px">Level
                                <input name="level" type="number" min="1" value="1" required class="form-input-sm" style="margin-top:4px">
                            </label>
                            <label style="font-size:12px;color:#ccc;display:flex;align-items:center;gap:4px;margin-bottom:6px"><input type="checkbox" name="isBoss"> Boss</label>
                        </div>
                        <button type="submit" style="width:100%;background:#a855f7;color:#fff;border:none;padding:8px;border-radius:4px;cursor:pointer;margin-top:8px;font-weight:600">Save Stage</button>
                    </form>
                </details>
            </div>
            `;
        }).join('');

        // -- DUNGEON ROWS --
        const bossOptions = allEnemies.map(e => `<option value="${e.enemyId}" style="color:#000">${e.name}</option>`).join('');
        const ticketOptions = `<option value="" style="color:#000">No Ticket (Free)</option>` +
            allItems.map(i => `<option value="${i.itemId}" style="color:#000">${i.name}</option>`).join('');

        const dungeonRows = dungeons.map(d => `
            <tr style="border-bottom:1px solid rgba(255,255,255,0.05)">
                <td style="padding:8px;color:#94a3b8"><code>${d.dungeonId}</code></td>
                <td style="padding:8px"><div style="font-weight:600">${d.name}</div><div style="font-size:11px;color:#64748b">${d.description || ''}</div></td>
                <td style="padding:8px"><span style="background:#3b82f6;color:#fff;padding:2px 6px;border-radius:4px;font-size:11px">Lv.${d.minLevel}</span></td>
                <td style="padding:8px">${d.ticketItemId ? `<span style="color:#eab308">🎫 ${d.ticketItemId} x${d.ticketCount}</span>` : (d.goldCost > 0 ? `<span style="color:#eab308">💰 ${d.goldCost} G</span>` : '<span style="color:#4ade80">FREE</span>')}</td>
                <td style="padding:8px">😈 ${d.bossId}</td>
                <td style="padding:8px">
                     <form method="POST" action="/rpg-config/dungeon/delete" style="display:inline" onsubmit="return confirm('Delete dungeon ${d.name}?')">
                        <input type="hidden" name="dungeonId" value="${d.dungeonId}">
                        <button type="submit" class="btn btn-sm" style="background:#ef4444;color:#fff;border:none;padding:4px 10px;border-radius:4px;cursor:pointer">Del</button>
                    </form>
                </td>
            </tr>
        `).join('');

        return `
        <style>
            .form-input-sm { padding:6px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:4px; color:#fff; font-size:13px; width:100%; box-sizing:border-box; }
            .form-input-sm:focus { border-color:#a855f7; outline:none; }
        </style>
        <div class="content" style="padding:24px">
            <h1 style="font-size:24px;font-weight:700;margin-bottom:20px">RPG Manager</h1>

            <div style="display:flex;gap:8px;margin-bottom:20px">
                <button onclick="showTab('heroes')" class="rpg-tab active" id="tab-heroes" style="padding:8px 16px;border-radius:6px;border:1px solid rgba(255,255,255,0.1);background:rgba(168,85,247,0.2);color:#fff;cursor:pointer;font-weight:600">Heroes</button>
                <button onclick="showTab('items')" class="rpg-tab" id="tab-items" style="padding:8px 16px;border-radius:6px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:#fff;cursor:pointer;font-weight:600">Items/Mats</button>
                <button onclick="showTab('recipes')" class="rpg-tab" id="tab-recipes" style="padding:8px 16px;border-radius:6px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:#fff;cursor:pointer;font-weight:600">Recipes</button>
                <button onclick="showTab('enemies')" class="rpg-tab" id="tab-enemies" style="padding:8px 16px;border-radius:6px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:#fff;cursor:pointer;font-weight:600">Enemies</button>
                <button onclick="showTab('chapters')" class="rpg-tab" id="tab-chapters" style="padding:8px 16px;border-radius:6px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:#fff;cursor:pointer;font-weight:600">Chapters</button>
                <button onclick="showTab('dungeons')" class="rpg-tab" id="tab-dungeons" style="padding:8px 16px;border-radius:6px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:#fff;cursor:pointer;font-weight:600">Dungeons</button>
                <button onclick="showTab('config')" class="rpg-tab" id="tab-config" style="padding:8px 16px;border-radius:6px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:#fff;cursor:pointer;font-weight:600">Config</button>
            </div>

            <!-- HEROES TAB -->
            <div id="panel-heroes">
                <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:16px;margin-bottom:16px">
                    <h3 style="margin:0 0 12px 0;font-size:14px;color:#a855f7">Add New Hero</h3>
                    <form method="POST" action="/rpg-config/hero/add" style="display:grid;grid-template-columns:1fr 2fr 1fr 1fr 1fr 2fr auto;gap:12px;align-items:end">
                        <label style="color:#ccc;font-size:11px">Hero ID
                            <input name="heroId" placeholder="e.g. r_ninja" required class="form-input-sm" style="margin-top:4px">
                        </label>
                        <label style="color:#ccc;font-size:11px">Name
                            <input name="name" placeholder="Hero Name" required class="form-input-sm" style="margin-top:4px">
                        </label>
                        <label style="color:#ccc;font-size:11px">Rarity
                            <select name="rarity" required class="form-input-sm" style="margin-top:4px">
                                <option value="C" style="color:#000">C</option>
                                <option value="R" style="color:#000">R</option>
                                <option value="SR" style="color:#000">SR</option>
                                <option value="SSR" style="color:#000">SSR</option>
                                <option value="UR" style="color:#000">UR</option>
                            </select>
                        </label>
                        <label style="color:#ccc;font-size:11px">HP Base
                            <input name="hp" type="number" placeholder="0" required class="form-input-sm" style="margin-top:4px">
                        </label>
                        <label style="color:#ccc;font-size:11px">ATK Base
                            <input name="atk" type="number" placeholder="0" required class="form-input-sm" style="margin-top:4px">
                        </label>
                        <label style="color:#ccc;font-size:11px">Description
                            <input name="desc" placeholder="Short desc" class="form-input-sm" style="margin-top:4px">
                        </label>
                        <button type="submit" style="background:#a855f7;color:#fff;border:none;padding:8px;border-radius:4px;cursor:pointer;font-weight:600;height:35px;margin-bottom:1px">Add</button>
                    </form>
                </div>
                <div style="overflow-x:auto">
                    <table style="width:100%;border-collapse:collapse;font-size:13px">
                        <thead><tr style="border-bottom:1px solid rgba(255,255,255,0.1);text-align:left">
                            <th style="padding:8px">ID</th><th style="padding:8px">Name</th><th style="padding:8px">Rarity</th><th style="padding:8px">HP</th><th style="padding:8px">ATK</th><th style="padding:8px">Desc</th><th style="padding:8px">Action</th>
                        </tr></thead>
                        <tbody>${heroRows || '<tr><td colspan="7" style="padding:20px;text-align:center;color:#666">No heroes yet.</td></tr>'}</tbody>
                    </table>
                </div>
            </div>

            <!-- ITEMS TAB -->
            <div id="panel-items" style="display:none">
                <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:16px;margin-bottom:16px">
                    <h3 style="margin:0 0 12px 0;font-size:14px;color:#a855f7">Add Material/Item</h3>
                    <form method="POST" action="/rpg-config/item/add" style="display:grid;grid-template-columns:1fr 2fr 1fr 2fr auto;gap:12px;align-items:end">
                        <!-- Row 1: Basic Info -->
                        <label style="color:#ccc;font-size:11px">Item ID
                            <input name="itemId" placeholder="e.g. iron_sword" required class="form-input-sm" style="margin-top:4px">
                        </label>
                        <label style="color:#ccc;font-size:11px">Name
                            <input name="name" placeholder="Item Name" required class="form-input-sm" style="margin-top:4px">
                        </label>
                        <label style="color:#ccc;font-size:11px">Type
                            <select name="type" required class="form-input-sm" onchange="toggleItemFieldsAdd(this)" style="margin-top:4px">
                                <option value="material" style="color:#000">Material</option>
                                <option value="junk" style="color:#000">Junk</option>
                                <option value="weapon" style="color:#000">Weapon</option>
                                <option value="relic" style="color:#000">Relic</option>
                                <option value="consumable" style="color:#000">Consumable</option>
                            </select>
                        </label>
                        <label style="color:#ccc;font-size:11px">Description
                            <input name="description" placeholder="Description" class="form-input-sm" style="margin-top:4px">
                        </label>
                        <button type="submit" style="background:#a855f7;color:#fff;border:none;padding:8px;border-radius:4px;cursor:pointer;font-weight:600;min-width:60px;height:35px;margin-bottom:1px">Add</button>

                        <!-- Row 2: Conditional Stats (Will wrap automatically if grid columns are set) -->
                        <!-- But wait, if we use 5 cols, these will fall into row 2 col 1, col 2, etc. -->
                        
                        <div id="addItemPriceWrapper" style="display:none">
                            <label style="color:#ccc;font-size:11px;color:#cbd5e1">Sell Price (G)
                                <input name="price" type="number" value="0" class="form-input-sm" style="margin-top:4px">
                            </label>
                        </div>
                        <div id="addItemAtkWrapper" style="display:none">
                            <label style="color:#ccc;font-size:11px;color:#ef4444">ATK Bonus
                                <input name="atk" type="number" value="0" class="form-input-sm" style="margin-top:4px">
                            </label>
                        </div>
                        <div id="addItemHpWrapper" style="display:none">
                            <label style="color:#ccc;font-size:11px;color:#3b82f6">HP Bonus
                                <input name="hp" type="number" value="0" class="form-input-sm" style="margin-top:4px">
                            </label>
                        </div>
                    </form>
                </div>
                <div style="overflow-x:auto">
                    <table style="width:100%;border-collapse:collapse;font-size:13px">
                        <thead><tr style="border-bottom:1px solid rgba(255,255,255,0.1);text-align:left">
                            <th style="padding:8px">ID</th><th style="padding:8px">Name</th><th style="padding:8px">Type</th><th style="padding:8px">Sell Price</th><th style="padding:8px">Desc</th><th style="padding:8px">Action</th>
                        </tr></thead>
                        <tbody>${itemRows || '<tr><td colspan="6" style="padding:20px;text-align:center;color:#666">No items in library.</td></tr>'}</tbody>
                    </table>
                </div>
            </div>

            <!-- RECIPES TAB -->
            <div id="panel-recipes" style="display:none">
                <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:16px;margin-bottom:16px">
                    <h3 style="margin:0 0 12px 0;font-size:14px;color:#a855f7">Add Crafting Recipe</h3>
                    <form method="POST" action="/rpg-config/recipe/add" style="display:grid;grid-template-columns:2fr 3fr 1fr auto;gap:8px;align-items:end">
                        <label style="color:#ccc;font-size:11px">Result Item
                            <select name="resultItemId" required class="form-input-sm" style="margin-top:4px">
                                ${items.map(i => `<option value="${i.itemId}" style="color:#000">${i.name} (${i.itemId})</option>`).join('')}
                            </select>
                        </label>
                        <label class="form-label" style="grid-column: span 2">Ingredients (Item & Qty)
                            <input type="hidden" name="ingredientsRaw" id="addRecipeIngInput">
                            <div id="addRecipeIngContainer" style="margin-top:4px; max-height: 200px; overflow-y:auto; padding-right:4px;"></div>
                        </label>
                        <label style="color:#ccc;font-size:11px">Category
                            <select name="category" class="form-input-sm" style="margin-top:4px">
                                <option value="Material" style="color:#000">Material</option>
                                <option value="Weapon" style="color:#000">Weapon</option>
                                <option value="Relic" style="color:#000">Relic</option>
                            </select>
                        </label>
                        <button type="submit" style="background:#a855f7;color:#fff;border:none;padding:8px;border-radius:4px;cursor:pointer;font-weight:600;min-width:60px">Add</button>
                    </form>
                    <div style="font-size:10px;color:#666;margin-top:4px">Available Item IDs: ${items.map(i => i.itemId).join(', ')}</div>
                </div>

                <div style="overflow-x:auto">
                    <table style="width:100%;border-collapse:collapse;font-size:13px">
                        <thead><tr style="border-bottom:1px solid rgba(255,255,255,0.1);text-align:left">
                            <th style="padding:8px">Result</th><th style="padding:8px">Ingredients</th><th style="padding:8px">Category</th><th style="padding:8px">Action</th>
                        </tr></thead>
                        <tbody>
                            ${recipes.map(r => `
                                <tr style="border-bottom:1px solid rgba(255,255,255,0.05)">
                                    <td style="padding:8px;color:#ffd700;font-weight:600">${r.resultItemId}</td>
                                    <td style="padding:8px;color:#cbd5e1;font-size:12px">
                                        ${r.ingredients.map(i => `<span style="background:rgba(255,255,255,0.1);padding:1px 4px;border-radius:3px">${i.itemId} x${i.amount}</span>`).join(' ')}
                                    </td>
                                    <td style="padding:8px"><span class="badge" style="background:${r.category === 'Weapon' ? '#ef4444' : (r.category === 'Relic' ? '#3b82f6' : '#6b7280')};color:#fff;padding:2px 6px;border-radius:4px;font-size:10px">${r.category}</span></td>
                                    <td style="padding:8px">
                                        <form method="POST" action="/rpg-config/recipe/delete" style="display:inline" onsubmit="return confirm('Delete recipe for ${r.resultItemId}?')">
                                            <input type="hidden" name="id" value="${r._id}">
                                            <button type="submit" class="btn btn-sm" style="background:#ef4444;color:#fff;border:none;padding:4px 10px;border-radius:4px;cursor:pointer">Del</button>
                                        </form>
                                    </td>
                                </tr>
                            `).join('')}
                            ${recipes.length === 0 ? '<tr><td colspan="4" style="padding:20px;text-align:center;color:#666">No crafting recipes defined.</td></tr>' : ''}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- ENEMIES TAB -->
            <div id="panel-enemies" style="display:none">
                <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:16px;margin-bottom:16px">
                    <h3 style="margin:0 0 12px 0;font-size:14px;color:#a855f7">Add Base Enemy</h3>
                    <form method="POST" action="/rpg-config/enemy/add">
                        <div style="display:grid;grid-template-columns:1fr 2fr 1fr 1fr 1fr 1fr auto;gap:12px;align-items:end;margin-bottom:12px">
                            <label style="color:#ccc;font-size:11px">ID
                                <input name="enemyId" placeholder="e.g. slime" required class="form-input-sm" style="margin-top:4px">
                            </label>
                            <label style="color:#ccc;font-size:11px">Name
                                <input name="name" placeholder="Name" required class="form-input-sm" style="margin-top:4px">
                            </label>
                            <label style="color:#ccc;font-size:11px">HP
                                <input name="hp" type="number" placeholder="0" required class="form-input-sm" style="margin-top:4px">
                            </label>
                            <label style="color:#ccc;font-size:11px">ATK
                                <input name="atk" type="number" placeholder="0" required class="form-input-sm" style="margin-top:4px">
                            </label>
                            <label style="color:#ccc;font-size:11px">XP
                                <input name="exp" type="number" placeholder="0" required class="form-input-sm" style="margin-top:4px">
                            </label>
                            <label style="color:#ccc;font-size:11px">Gold
                                <input name="gold" type="number" placeholder="0" required class="form-input-sm" style="margin-top:4px">
                            </label>
                            <label style="display:flex;align-items:center;gap:4px;font-size:12px;color:#ccc;margin-bottom:6px;cursor:pointer">
                                <input type="checkbox" name="isBoss"> Boss
                            </label>
                        </div>
                        <div style="margin-bottom:8px">
                            <label style="font-size:12px;color:#ccc;display:block;margin-bottom:4px">Drops:</label>
                            <input type="hidden" name="drop" id="addEnemyDropInput">
                            <div id="addEnemyDropContainer"></div>
                        </div>
                        <button type="submit" style="background:#a855f7;color:#fff;border:none;padding:8px;border-radius:4px;cursor:pointer;font-weight:600;width:100%;height:35px">Add Enemy</button>
                    </form>
                </div>
                <div style="overflow-x:auto">
                    <table style="width:100%;border-collapse:collapse;font-size:13px">
                        <thead><tr style="border-bottom:1px solid rgba(255,255,255,0.1);text-align:left">
                            <th style="padding:8px">ID</th><th style="padding:8px">Name</th><th style="padding:8px">Stats (Base)</th><th style="padding:8px">Reward (Base)</th><th style="padding:8px">Drop</th><th style="padding:8px">Action</th>
                        </tr></thead>
                        <tbody>${enemyRows || '<tr><td colspan="6" style="padding:20px;text-align:center;color:#666">No enemies in library.</td></tr>'}</tbody>
                    </table>
                </div>
            </div>

            <!-- CHAPTERS TAB -->
            <div id="panel-chapters" style="display:none">
                <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:16px;margin-bottom:16px">
                    <h3 style="margin:0 0 12px 0;font-size:14px;color:#a855f7">Add New Chapter</h3>
                    <form method="POST" action="/rpg-config/chapter/add" style="display:grid;grid-template-columns:1fr 2fr 1fr auto;gap:12px;align-items:end">
                        <label style="color:#ccc;font-size:11px">Chap #
                            <input name="chapterNumber" type="number" placeholder="1" required class="form-input-sm" style="margin-top:4px">
                        </label>
                        <label style="color:#ccc;font-size:11px">Chapter Name
                            <input name="name" placeholder="The Beginning" required class="form-input-sm" style="margin-top:4px">
                        </label>
                        <label style="color:#ccc;font-size:11px">Reward Hero
                            <input name="clearRewardHeroId" placeholder="Hero ID" class="form-input-sm" style="margin-top:4px">
                        </label>
                        <button type="submit" style="background:#a855f7;color:#fff;border:none;padding:8px 16px;border-radius:4px;cursor:pointer;font-weight:600;height:35px;margin-bottom:1px">Add</button>
                    </form>
                </div>
                ${chapterRows || '<div style="text-align:center;color:#666;padding:40px">No chapters.</div>'}
            </div>

            <!-- DUNGEONS TAB -->
            <div id="panel-dungeons" style="display:none">
                <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:16px;margin-bottom:16px">
                    <h3 style="margin:0 0 12px 0;font-size:14px;color:#a855f7">Add Special Dungeon</h3>
                    <form method="POST" action="/rpg-config/dungeon/add" style="display:grid;grid-template-columns:1fr 2fr 1fr 2fr 2fr 2fr auto;gap:12px;align-items:end">
                         <label style="color:#ccc;font-size:11px">ID
                            <input name="dungeonId" placeholder="e.g. gold_mine" required class="form-input-sm" style="margin-top:4px">
                        </label>
                        <label style="color:#ccc;font-size:11px">Name
                            <input name="name" placeholder="Display Name" required class="form-input-sm" style="margin-top:4px">
                        </label>
                        <label style="color:#ccc;font-size:11px">Min Lvl
                            <input name="minLevel" type="number" placeholder="1" class="form-input-sm" style="margin-top:4px">
                        </label>
                        <label style="color:#ccc;font-size:11px">Ticket/Key
                            <select name="ticketItemId" class="form-input-sm" style="margin-top:4px">
                                ${ticketOptions}
                            </select>
                        </label>
                         <label style="color:#ccc;font-size:11px">Qty / Gold Cost
                            <div style="display:flex;gap:4px;margin-top:4px">
                                <input name="ticketCount" type="number" placeholder="Qty" class="form-input-sm">
                                <input name="goldCost" type="number" placeholder="G" class="form-input-sm">
                            </div>
                        </label>
                        <label style="color:#ccc;font-size:11px">Boss
                            <select name="bossId" required class="form-input-sm" style="margin-top:4px">
                                <option value="" disabled selected>-- Boss --</option>
                                ${bossOptions}
                            </select>
                        </label>
                        <button type="submit" style="background:#a855f7;color:#fff;border:none;padding:8px 8px;border-radius:4px;cursor:pointer;font-weight:600;height:35px;margin-bottom:1px">Add</button>
                    </form>
                </div>
                <div style="overflow-x:auto">
                    <table style="width:100%;border-collapse:collapse;font-size:13px">
                        <thead><tr style="border-bottom:1px solid rgba(255,255,255,0.1);text-align:left;color:#94a3b8">
                            <th style="padding:8px">ID</th><th style="padding:8px">Name</th><th style="padding:8px">Level</th><th style="padding:8px">Cost</th><th style="padding:8px">Boss</th><th style="padding:8px">Action</th>
                        </tr></thead>
                        <tbody>${dungeonRows || '<tr><td colspan="6" style="padding:20px;text-align:center;color:#666">No special dungeons.</td></tr>'}</tbody>
                    </table>
                </div>
            </div>

            <!-- CONFIG TAB -->
            <div id="panel-config" style="display:none">
                <form method="POST" action="/rpg-config/settings/update" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:20px">
                    <h3 style="margin:0 0 16px 0;font-size:14px;color:#a855f7">Game Settings</h3>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
                        <label style="color:#ccc;font-size:13px">Gacha Price (Gold)<input name="gachaPrice" type="number" value="${rpgConfig.gachaPrice}" class="form-input-sm" style="margin-top:4px"></label>
                        <label style="color:#ccc;font-size:13px">Base HP<input name="baseHP" type="number" value="${rpgConfig.baseHP}" class="form-input-sm" style="margin-top:4px"></label>
                        <label style="color:#ccc;font-size:13px">Base ATK<input name="baseATK" type="number" value="${rpgConfig.baseATK}" class="form-input-sm" style="margin-top:4px"></label>
                        <label style="color:#ccc;font-size:13px">HP per Level<input name="hpPerLevel" type="number" value="${rpgConfig.hpPerLevel}" class="form-input-sm" style="margin-top:4px"></label>
                        <label style="color:#ccc;font-size:13px">ATK per Level<input name="atkPerLevel" type="number" value="${rpgConfig.atkPerLevel}" class="form-input-sm" style="margin-top:4px"></label>
                    </div>
                    <button type="submit" style="margin-top:20px;background:#a855f7;color:#fff;border:none;padding:10px 24px;border-radius:6px;cursor:pointer;font-weight:600;font-size:14px">Save Config</button>
                </form>
            </div>
        </div>

        <!-- EDIT ITEM MODAL -->
        <div id="editItemModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:1000;align-items:center;justify-content:center;" onclick="if(event.target===this)this.style.display='none'">
            <div style="background:#1e293b;border:1px solid #334155;border-radius:12px;padding:24px;width:90%;max-width:500px;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1)">
                <div style="font-size:18px;font-weight:600;color:#f8fafc;margin-bottom:20px;display:flex;justify-content:space-between">
                    <span>✏️ Edit Item</span>
                    <button onclick="document.getElementById('editItemModal').style.display='none'" style="background:none;border:none;color:#94a3b8;cursor:pointer;font-size:20px">×</button>
                </div>
                <form action="/rpg-config/item/edit" method="POST">
                    <input type="hidden" name="originalItemId" id="editItemOriginalId">
                    <div class="form-group"><label class="form-label">Item ID</label><input type="text" name="itemId" id="editItemId" class="form-input" required></div>
                    <div class="form-group"><label class="form-label">Name</label><input type="text" name="name" id="editItemName" class="form-input" required></div>
                        <div class="form-group" style="margin:0"><label class="form-label">Type</label>
                            <select name="type" id="editItemType" class="form-input" onchange="toggleItemFieldsEdit(this)">
                                <option value="material" style="color:#000">Material</option>
                                <option value="junk" style="color:#000">Junk</option>
                                <option value="weapon" style="color:#000">Weapon</option>
                                <option value="relic" style="color:#000">Relic</option>
                                <option value="consumable" style="color:#000">Consumable</option>
                            </select>
                        </div>
                        <div class="form-group" style="margin:0" id="editItemPriceWrapper"><label class="form-label">Sell Price</label><input type="number" name="price" id="editItemPrice" class="form-input"></div>
                    </div>
                    <!-- STATS ROW -->
                    <div id="editItemStatsRow" style="display:none;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
                        <div class="form-group" style="margin:0"><label class="form-label">ATK Bonus</label><input type="number" name="atk" id="editItemAtk" class="form-input"></div>
                        <div class="form-group" style="margin:0"><label class="form-label">HP Bonus</label><input type="number" name="hp" id="editItemHp" class="form-input"></div>
                    </div>
                    <div class="form-group"><label class="form-label">Description</label><input type="text" name="description" id="editItemDesc" class="form-input"></div>
                    <div style="display:flex;gap:10px;">
                        <button type="submit" class="btn btn-primary" style="flex:1">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- EDIT ENEMY MODAL -->
        <div id="editEnemyModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:1000;align-items:center;justify-content:center;" onclick="if(event.target===this)this.style.display='none'">
            <div style="background:#1e293b;border:1px solid #334155;border-radius:12px;padding:24px;width:90%;max-width:500px;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1)">
                <div style="font-size:18px;font-weight:600;color:#f8fafc;margin-bottom:20px;display:flex;justify-content:space-between">
                    <span>✏️ Edit Enemy</span>
                    <button onclick="document.getElementById('editEnemyModal').style.display='none'" style="background:none;border:none;color:#94a3b8;cursor:pointer;font-size:20px">×</button>
                </div>
                <form action="/rpg-config/enemy/edit" method="POST">
                    <input type="hidden" name="originalEnemyId" id="editEnemyOriginalId">
                    <div class="form-group"><label class="form-label">Enemy ID</label><input type="text" name="enemyId" id="editEnemyId" class="form-input" required></div>
                    <div class="form-group"><label class="form-label">Name</label><input type="text" name="name" id="editEnemyName" class="form-input" required></div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
                        <div class="form-group" style="margin:0"><label class="form-label">HP (Base)</label><input type="number" name="hp" id="editEnemyHp" class="form-input" required></div>
                        <div class="form-group" style="margin:0"><label class="form-label">ATK (Base)</label><input type="number" name="atk" id="editEnemyAtk" class="form-input" required></div>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
                        <div class="form-group" style="margin:0"><label class="form-label">XP (Base)</label><input type="number" name="exp" id="editEnemyExp" class="form-input" required></div>
                        <div class="form-group" style="margin:0"><label class="form-label">Gold (Base)</label><input type="number" name="gold" id="editEnemyGold" class="form-input" required></div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Drop Item</label>
                        <input type="hidden" name="drop" id="editEnemyDropInput">
                        <div id="editEnemyDropContainer"></div>
                    </div>
                    <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-bottom:20px;color:#e2e8f0;font-weight:500">
                        <input type="checkbox" name="isBoss" id="editEnemyIsBoss" style="width:16px;height:16px"> Is Boss?
                    </label>
                    <div style="display:flex;gap:10px;">
                        <button type="submit" class="btn btn-primary" style="flex:1">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- EDIT STAGE MODAL -->
        <div id="editStageModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:1000;align-items:center;justify-content:center;" onclick="if(event.target===this)this.style.display='none'">
            <div style="background:#1e293b;border:1px solid #334155;border-radius:12px;padding:24px;width:90%;max-width:500px;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1)">
                <div style="font-size:18px;font-weight:600;color:#f8fafc;margin-bottom:20px;display:flex;justify-content:space-between">
                    <span>✏️ Edit Stage</span>
                    <button onclick="document.getElementById('editStageModal').style.display='none'" style="background:none;border:none;color:#94a3b8;cursor:pointer;font-size:20px">×</button>
                </div>
                <form action="/rpg-config/stage/edit" method="POST">
                    <input type="hidden" name="chapterNumber" id="editStageChapterNum">
                    <input type="hidden" name="originalStageNumber" id="editStageOriginalNum">
                    <div class="form-group"><label class="form-label">Stage #</label><input type="number" name="stageNumber" id="editStageNum" class="form-input" required></div>
                    <div class="form-group"><label class="form-label">Name</label><input type="text" name="name" id="editStageName" class="form-input" required></div>
                    
                    <!-- NEW FIELDS -->
                    <div style="display:grid;grid-template-columns:2fr 1fr;gap:12px;margin-bottom:12px">
                        <div class="form-group" style="margin:0">
                            <label class="form-label">Select Enemy</label>
                            <select name="enemyId" id="editStageEnemyId" class="form-input" required>
                                <option value="" disabled>-- Select Enemy --</option>
                                ${enemies.map(e => `<option value="${e.enemyId}" style="color:#000">${e.name}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group" style="margin:0">
                            <label class="form-label">Level</label>
                            <input type="number" name="level" id="editStageLevel" min="1" class="form-input" required>
                        </div>
                    </div>

                    <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-bottom:20px;color:#e2e8f0;font-weight:500">
                        <input type="checkbox" name="isBoss" id="editStageIsBoss" style="width:16px;height:16px"> Is Boss?
                    </label>
                    <div style="display:flex;gap:10px;">
                        <button type="submit" class="btn btn-primary" style="flex:1">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>

        <script>
        function showTab(tab) {
            document.querySelectorAll('[id^=panel-]').forEach(p => p.style.display = 'none');
            document.querySelectorAll('.rpg-tab').forEach(t => {
                t.style.background = 'rgba(255,255,255,0.05)';
                t.classList.remove('active');
            });
            document.getElementById('panel-' + tab).style.display = 'block';
            document.getElementById('tab-' + tab).style.background = 'rgba(168,85,247,0.2)';
            document.getElementById('tab-' + tab).classList.add('active');
            
            document.getElementById('tab-' + tab).classList.add('active');
            
            // Update URL query param without reload
            const url = new URL(window.location);
            url.searchParams.set('tab', tab);
            window.history.pushState({}, '', url);
        }

        // Init Tab from URL
        window.addEventListener('load', () => {
            const params = new URLSearchParams(window.location.search);
            const tab = params.get('tab');
            if (tab && document.getElementById('panel-' + tab)) {
                showTab(tab);
            }
        });

        function toggleItemFieldsAdd(sel) {
            const val = sel.value;
            const isGear = ['weapon','relic'].includes(val);
            const showPrice = isGear || val === 'junk' || val === 'consumable';
            
            document.getElementById('addItemPriceWrapper').style.display = showPrice ? 'block' : 'none';
            document.getElementById('addItemAtkWrapper').style.display = isGear ? 'block' : 'none';
            document.getElementById('addItemHpWrapper').style.display = isGear ? 'block' : 'none';
        }

        function toggleItemFieldsEdit(selOrVal) {
            const val = (typeof selOrVal === 'string') ? selOrVal : selOrVal.value;
            const isGear = ['weapon','relic'].includes(val);
            const showPrice = isGear || val === 'junk' || val === 'consumable';
            
            document.getElementById('editItemPriceWrapper').style.display = showPrice ? 'block' : 'none'; // Or visibility hidden to keep layout?
            // In Modal Grid: 
            // Row 1: Type | Price
            // Row 2: ATK | HP (New)
            
            // If Price Hidden: Row 1 Cell 2 Empty. OK.
            if(showPrice) document.getElementById('editItemPriceWrapper').style.visibility = 'visible';
            else document.getElementById('editItemPriceWrapper').style.visibility = 'hidden';

            const statsRow = document.getElementById('editItemStatsRow');
            statsRow.style.display = isGear ? 'grid' : 'none';
        }

        function openEditItem(id, name, desc, price, type, atk, hp) {
            document.getElementById('editItemOriginalId').value = id;
            document.getElementById('editItemId').value = id;
            document.getElementById('editItemName').value = name;
            document.getElementById('editItemDesc').value = desc;
            document.getElementById('editItemPrice').value = price;
            document.getElementById('editItemType').value = type;
            document.getElementById('editItemAtk').value = atk || 0;
            document.getElementById('editItemHp').value = hp || 0;
            
            toggleItemFieldsEdit(type);

            document.getElementById('editItemModal').style.display = 'flex';
        }
        
        
        function openEditEnemy(id, name, hp, atk, exp, gold, drop, isBoss) {
            document.getElementById('editEnemyOriginalId').value = id;
            document.getElementById('editEnemyId').value = id;
            document.getElementById('editEnemyName').value = name;
            document.getElementById('editEnemyHp').value = hp;
            document.getElementById('editEnemyAtk').value = atk;
            document.getElementById('editEnemyExp').value = exp;
            document.getElementById('editEnemyGold').value = gold;
            document.getElementById('editEnemyDropInput').value = drop; // Set hidden input
            document.getElementById('editEnemyIsBoss').checked = isBoss;
            
            // Refresh picker
            if(document.getElementById('editEnemyDropContainer').refreshPicker) {
                document.getElementById('editEnemyDropContainer').refreshPicker(drop || '');
            }

            document.getElementById('editEnemyModal').style.display = 'flex';
        }

        function openEditStage(chapNum, stageNum, name, enemyId, level, isBoss) {
            document.getElementById('editStageChapterNum').value = chapNum;
            document.getElementById('editStageOriginalNum').value = stageNum;
            document.getElementById('editStageNum').value = stageNum;
            document.getElementById('editStageName').value = name;
            document.getElementById('editStageEnemyId').value = enemyId;
            document.getElementById('editStageLevel').value = level;
            document.getElementById('editStageIsBoss').checked = isBoss;

            document.getElementById('editStageModal').style.display = 'flex';
        }



        // Auto open tab from URL param
        const urlTab = new URLSearchParams(window.location.search).get('tab');
        if (urlTab) showTab(urlTab);

        // --- SMART DROP PICKER ---
        const rpgItems = ${JSON.stringify(items)}; // Injected from server

        function initDropPicker(containerId, hiddenInputId, initialValue) {
            const container = document.getElementById(containerId);
            const hiddenInput = document.getElementById(hiddenInputId);
            
            // Helper to parsing "item:rate,item2:rate" -> [{id, rate}]
            const parseDrops = (str) => {
                if (!str) return [];
                return str.split(',').map(s => {
                    const [id, r] = s.split(':');
                    return { id: id.trim(), rate: parseInt(r) || 100 };
                }).filter(d => d.id);
            };

            let drops = parseDrops(initialValue);

            const updateHiddenInput = () => {
                hiddenInput.value = drops.map(d => \`\${d.id}:\${d.rate}\`).join(',');
            };

            const render = () => {
                container.innerHTML = '';
                
                // Existing drops
                drops.forEach((drop, index) => {
                    const row = document.createElement('div');
                    row.style.cssText = 'display:flex;gap:4px;margin-bottom:4px;align-items:center';
                    
                    // Item Select
                    const select = document.createElement('select');
                    select.className = 'form-input-sm';
                    select.style.flex = '2';
                    
                    rpgItems.forEach(item => {
                        const opt = document.createElement('option');
                        opt.value = item.itemId;
                        opt.text = item.name;
                        opt.style.color = '#000'; // Fix text color in option
                        if (item.itemId === drop.id) opt.selected = true;
                        select.appendChild(opt);
                    });
                    
                    select.onchange = (e) => {
                        drops[index].id = e.target.value;
                        updateHiddenInput();
                    };

                    // Rate Input
                    const rateInput = document.createElement('input');
                    rateInput.type = 'number';
                    rateInput.className = 'form-input-sm';
                    rateInput.style.flex = '1';
                    rateInput.placeholder = '%';
                    rateInput.value = drop.rate;
                    rateInput.min = 1;
                    rateInput.max = 100;
                    
                    rateInput.oninput = (e) => {
                        drops[index].rate = parseInt(e.target.value) || 0;
                        updateHiddenInput();
                    };

                    // Delete Button
                    const delBtn = document.createElement('button');
                    delBtn.type = 'button';
                    delBtn.innerText = '×';
                    delBtn.style.cssText = 'background:#ef4444;color:#fff;border:none;border-radius:4px;width:24px;cursor:pointer';
                    delBtn.onclick = () => {
                        drops.splice(index, 1);
                        updateHiddenInput();
                        render();
                    };

                    row.appendChild(select);
                    row.appendChild(rateInput);
                    row.appendChild(delBtn);
                    container.appendChild(row);
                });

                // Add Button
                if (rpgItems.length > 0) {
                    const addBtn = document.createElement('button');
                    addBtn.type = 'button';
                    addBtn.innerText = '+ Add Drop';
                    addBtn.style.cssText = 'background:rgba(255,255,255,0.1);color:#a855f7;border:1px dashed #a855f7;border-radius:4px;font-size:11px;padding:4px;width:100%;cursor:pointer';
                    addBtn.onclick = () => {
                        drops.push({ id: rpgItems[0].itemId, rate: 50 });
                        updateHiddenInput();
                        render();
                    };
                    container.appendChild(addBtn);
                } else {
                    container.innerHTML = '<div style="font-size:11px;color:#666">No items in library</div>';
                }
            };

            render();
            // Initial update to ensure hidden input is synced
            updateHiddenInput();
            
            // Store render function on container for refresh calls
            container.refreshPicker = (newVal) => {
                drops = parseDrops(newVal);
                render();
                updateHiddenInput();
            };
        }

        function initIngredientPicker(containerId, hiddenInputId, initialValue) {
            const container = document.getElementById(containerId);
            const hiddenInput = document.getElementById(hiddenInputId);
            if(!container || !hiddenInput) return;
            
            // Helper to parsing "item:qty,item2:qty" -> [{id, qty}]
            const parseIngredients = (str) => {
                if (!str) return [];
                return str.split(',').map(s => {
                    const [id, q] = s.split(':');
                    return { id: id.trim(), qty: parseInt(q) || 1 };
                }).filter(d => d.id);
            };

            let ingredients = parseIngredients(initialValue);

            const updateHiddenInput = () => {
                hiddenInput.value = ingredients.map(d => \`\${d.id}:\${d.qty}\`).join(',');
            };

            const render = () => {
                container.innerHTML = '';
                
                // Existing ingredients
                ingredients.forEach((ing, index) => {
                    const row = document.createElement('div');
                    row.style.cssText = 'display:flex;gap:4px;margin-bottom:4px;align-items:center';
                    
                    // Item Select
                    const select = document.createElement('select');
                    select.className = 'form-input-sm';
                    select.style.flex = '3';
                    
                    rpgItems.forEach(item => {
                        const opt = document.createElement('option');
                        opt.value = item.itemId;
                        opt.text = item.name + ' (' + item.itemId + ')';
                        opt.style.color = '#000';
                        if (item.itemId === ing.id) opt.selected = true;
                        select.appendChild(opt);
                    });
                    
                    select.onchange = (e) => {
                        ingredients[index].id = e.target.value;
                        updateHiddenInput();
                    };

                    // Qty Input
                    const qtyInput = document.createElement('input');
                    qtyInput.type = 'number';
                    qtyInput.className = 'form-input-sm';
                    qtyInput.style.flex = '1';
                    qtyInput.placeholder = 'Qty';
                    qtyInput.value = ing.qty;
                    qtyInput.min = 1;
                    
                    qtyInput.oninput = (e) => {
                        ingredients[index].qty = parseInt(e.target.value) || 1;
                        updateHiddenInput();
                    };

                    // Delete Button
                    const delBtn = document.createElement('button');
                    delBtn.type = 'button';
                    delBtn.innerText = '×';
                    delBtn.style.cssText = 'background:#ef4444;color:#fff;border:none;border-radius:4px;width:24px;cursor:pointer';
                    delBtn.onclick = () => {
                        ingredients.splice(index, 1);
                        updateHiddenInput();
                        render();
                    };

                    row.appendChild(select);
                    row.appendChild(qtyInput);
                    row.appendChild(delBtn);
                    container.appendChild(row);
                });

                // Add Button
                if (rpgItems.length > 0) {
                    const addBtn = document.createElement('button');
                    addBtn.type = 'button';
                    addBtn.innerText = '+ Add Ingredient';
                    addBtn.style.cssText = 'background:rgba(255,255,255,0.1);color:#a855f7;border:1px dashed #a855f7;border-radius:4px;font-size:11px;padding:4px;width:100%;cursor:pointer';
                    addBtn.onclick = () => {
                        ingredients.push({ id: rpgItems[0].itemId, qty: 1 });
                        updateHiddenInput();
                        render();
                    };
                    container.appendChild(addBtn);
                } else {
                    container.innerHTML = '<div style="font-size:11px;color:#666">No items in library</div>';
                }
            };

            render();
            updateHiddenInput();
        }

        // Init Pickers
        initDropPicker('addEnemyDropContainer', 'addEnemyDropInput', '');
        initDropPicker('editEnemyDropContainer', 'editEnemyDropInput', '');
        initIngredientPicker('addRecipeIngContainer', 'addRecipeIngInput', '');

        </script>
        `;
    }
};
