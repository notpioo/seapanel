const express = require('express');
const { MiningConfig, PlayerMining, User } = require('../../models');
const Logger = require('../../utils/logger');
const logger = new Logger('MiningRoutes');
const { PET_LIST, RARITY_CONFIG, getStatDescription } = require('../../bot/utils/petHelper');

const activeMiners = new Set(); // To prevent race conditions

module.exports = {
    setupRoutes: (app, requireAuth) => {
        // Mining Config Routes

        app.post('/mining-config/update', requireAuth(['admin']), async (req, res) => {
            try {
                const {
                    cooldownSeconds, baseXpPerMine, baseDropMin, baseDropMax,
                    gemChance, gemDropMin, gemDropMax,
                    enchantStoneChance, enchantStoneDropMin, enchantStoneDropMax
                } = req.body;
                let config = await MiningConfig.findOne({ configId: 'main' });
                if (!config) {
                    config = new MiningConfig({ configId: 'main' });
                }

                config.cooldownSeconds = parseInt(cooldownSeconds) || 30;
                config.baseXpPerMine = parseInt(baseXpPerMine) || 10;
                config.baseDropMin = parseInt(baseDropMin) || 1;
                config.baseDropMax = parseInt(baseDropMax) || 3;
                config.gemChance = parseFloat(gemChance) || 15;
                config.gemDropMin = parseInt(gemDropMin) || 1;
                config.gemDropMax = parseInt(gemDropMax) || 3;
                config.enchantStoneChance = parseFloat(enchantStoneChance) || 10;
                config.enchantStoneDropMin = parseInt(enchantStoneDropMin) || 1;
                config.enchantStoneDropMax = parseInt(enchantStoneDropMax) || 1;

                await config.save();

                res.redirect('/mining-config?message=Settings updated!');
            } catch (error) {
                logger.error('Failed to update mining config:', error);
                res.redirect('/mining-config?error=Update failed');
            }
        });

        // Add Resource
        app.post('/mining-config/drop-event/update', requireAuth(['admin']), async (req, res) => {
            try {
                const { dropEventName, dropEventEmoji, dropEventChance, dropEventDesc } = req.body;
                let config = await MiningConfig.findOne({ configId: 'main' });
                if (!config) config = new MiningConfig({ configId: 'main' });

                config.dropEventConfig = {
                    name: (dropEventName || 'Cookies').trim(),
                    emoji: (dropEventEmoji || '🍪').trim(),
                    dropChance: parseFloat(dropEventChance) || 5,
                    description: (dropEventDesc || 'Event item spesial!').trim()
                };

                MiningConfig.clearConfigCache?.();
                await config.save();
                res.redirect('/mining-config?message=Drop Event Config disimpan!');
            } catch (error) {
                logger.error('Failed to update drop event config:', error);
                res.redirect('/mining-config?error=Gagal menyimpan event config');
            }
        });

        // Add Resource
        app.post('/mining-config/resource/add', requireAuth(['admin']), async (req, res) => {
            try {
                const { name, rarity, sellPrice, xpGain, dropWeight } = req.body;
                const config = await MiningConfig.getConfig();
                config.resources.push({
                    name,
                    rarity,
                    sellPrice: parseInt(sellPrice),
                    xpGain: parseInt(xpGain),
                    dropWeight: parseInt(dropWeight) || 50
                });
                await config.save();
                res.redirect('/mining-config?message=Resource added!');
            } catch (error) {
                res.redirect('/mining-config?error=Failed to add resource');
            }
        });

        // Delete Resource
        app.post('/mining-config/resource/delete', requireAuth(['admin']), async (req, res) => {
            try {
                const { name } = req.body;
                const config = await MiningConfig.getConfig();
                config.resources = config.resources.filter(r => r.name !== name);
                await config.save();
                res.redirect('/mining-config?message=Resource deleted!');
            } catch (error) {
                res.redirect('/mining-config?error=Failed to delete');
            }
        });

        // Add Floor
        app.post('/mining-config/floor/add', requireAuth(['admin']), async (req, res) => {
            try {
                const { number, name, emoji, requiredLevel, resources } = req.body;
                const config = await MiningConfig.getConfig();
                let resourceList = Array.isArray(resources) ? resources : (resources ? resources.split(',').map(r => r.trim()) : []);
                config.floors.push({
                    number: parseInt(number),
                    name,
                    emoji,
                    requiredLevel: parseInt(requiredLevel),
                    resources: resourceList
                });
                config.floors.sort((a, b) => a.number - b.number);
                await config.save();
                res.redirect('/mining-config?message=Floor added!');
            } catch (error) {
                res.redirect('/mining-config?error=Failed to add floor');
            }
        });

        // Delete Floor
        app.post('/mining-config/floor/delete', requireAuth(['admin']), async (req, res) => {
            try {
                const { number } = req.body;
                const config = await MiningConfig.getConfig();
                config.floors = config.floors.filter(f => f.number !== parseInt(number));
                await config.save();
                res.redirect('/mining-config?message=Floor deleted!');
            } catch (error) {
                res.redirect('/mining-config?error=Failed to delete floor');
            }
        });

        // Add Pickaxe Level
        app.post('/mining-config/pickaxe/add', requireAuth(['admin']), async (req, res) => {
            try {
                const { level, name, emoji, upgradeCost, dropMultiplier, requiredItems } = req.body;
                const config = await MiningConfig.getConfig();

                // Parse required items from checkboxes
                let parsedItems = [];
                if (req.body.reqItemNames) {
                    const namesArray = Array.isArray(req.body.reqItemNames) ? req.body.reqItemNames : [req.body.reqItemNames];
                    parsedItems = namesArray.map(itemName => {
                        const amountField = `reqItemAmounts_${itemName}`;
                        const amount = parseInt(req.body[amountField]) || 1;
                        return { name: itemName, amount };
                    }).filter(i => i.name);
                }

                config.pickaxeLevels.push({
                    level: parseInt(level),
                    name,
                    emoji,
                    upgradeCost: parseInt(upgradeCost),
                    dropMultiplier: parseFloat(dropMultiplier),
                    requiredItems: parsedItems
                });
                config.pickaxeLevels.sort((a, b) => a.level - b.level);
                await config.save();
                res.redirect('/mining-config?message=Pickaxe level added!');
            } catch (error) {
                res.redirect('/mining-config?error=Failed to add pickaxe');
            }
        });

        // Delete Pickaxe Level
        app.post('/mining-config/pickaxe/delete', requireAuth(['admin']), async (req, res) => {
            try {
                const { level } = req.body;
                const config = await MiningConfig.getConfig();
                config.pickaxeLevels = config.pickaxeLevels.filter(p => p.level !== parseInt(level));
                await config.save();
                res.redirect('/mining-config?message=Pickaxe deleted!');
            } catch (error) {
                res.redirect('/mining-config?error=Failed to delete');
            }
        });

        // Edit Resource
        app.post('/mining-config/resource/edit', requireAuth(['admin']), async (req, res) => {
            try {
                const { originalName, name, rarity, sellPrice, xpGain, dropWeight } = req.body;
                const config = await MiningConfig.getConfig();
                const idx = config.resources.findIndex(r => r.name === originalName);
                if (idx !== -1) {
                    config.resources[idx] = {
                        name,
                        rarity,
                        sellPrice: parseInt(sellPrice),
                        xpGain: parseInt(xpGain),
                        dropWeight: parseInt(dropWeight) || 50
                    };
                    await config.save();
                }
                res.redirect('/mining-config?message=Resource updated!');
            } catch (error) {
                res.redirect('/mining-config?error=Failed to update');
            }
        });

        // Edit Floor
        app.post('/mining-config/floor/edit', requireAuth(['admin']), async (req, res) => {
            try {
                const { originalNumber, number, name, emoji, requiredLevel, resources } = req.body;
                const config = await MiningConfig.getConfig();
                const idx = config.floors.findIndex(f => f.number === parseInt(originalNumber));
                if (idx !== -1) {
                    // Handle both array (checkboxes) and string (comma-separated)
                    let resourceList = Array.isArray(resources) ? resources : (resources ? resources.split(',').map(r => r.trim()) : []);
                    config.floors[idx] = {
                        number: parseInt(number),
                        name,
                        emoji,
                        requiredLevel: parseInt(requiredLevel),
                        resources: resourceList
                    };
                    config.floors.sort((a, b) => a.number - b.number);
                    await config.save();
                }
                res.redirect('/mining-config?message=Floor updated!');
            } catch (error) {
                res.redirect('/mining-config?error=Failed to update');
            }
        });

        // Edit Pickaxe
        app.post('/mining-config/pickaxe/edit', requireAuth(['admin']), async (req, res) => {
            try {
                const { originalLevel, level, name, emoji, upgradeCost, dropMultiplier, requiredItems } = req.body;
                const config = await MiningConfig.getConfig();
                const idx = config.pickaxeLevels.findIndex(p => p.level === parseInt(originalLevel));

                // Parse required items from checkboxes
                let parsedItems = [];
                if (req.body.reqItemNames) {
                    const namesArray = Array.isArray(req.body.reqItemNames) ? req.body.reqItemNames : [req.body.reqItemNames];
                    parsedItems = namesArray.map(itemName => {
                        const amountField = `reqItemAmounts_${itemName}`;
                        const amount = parseInt(req.body[amountField]) || 1;
                        return { name: itemName, amount };
                    }).filter(i => i.name);
                }

                if (idx !== -1) {
                    config.pickaxeLevels[idx] = {
                        level: parseInt(level),
                        name,
                        emoji,
                        upgradeCost: parseInt(upgradeCost),
                        dropMultiplier: parseFloat(dropMultiplier),
                        requiredItems: parsedItems
                    };
                    config.pickaxeLevels.sort((a, b) => a.level - b.level);
                    await config.save();
                }
                res.redirect('/mining-config?message=Pickaxe updated!');
            } catch (error) {
                res.redirect('/mining-config?error=Failed to update');
            }
        });

        // === PICKAXE & BP PROGRESSION CONFIG ===
        app.post('/mining-config/progression/update', requireAuth(['admin']), async (req, res) => {
            try {
                const config = await MiningConfig.getConfig();

                // Pickaxe formula params
                const pickCfg = {
                    maxLevel:     Math.min(250, Math.max(1,   parseInt(req.body.pick_maxLevel)    || 250)),
                    baseCost:     Math.max(1,               parseInt(req.body.pick_baseCost)    || 200),
                    costExp:      Math.max(0.1,             parseFloat(req.body.pick_costExp)   || 1.8),
                    baseMult:     Math.max(0.1,             parseFloat(req.body.pick_baseMult)  || 1.0),
                    multPerLevel: Math.max(0,               parseFloat(req.body.pick_multPerLevel) || 0.02)
                };
                config.pickaxeConfig = pickCfg;

                // Regenerate pickaxe levels array from new formula
                config.pickaxeLevels = MiningConfig.generatePickaxeLevelsWith(pickCfg);

                // BP formula params
                config.bpConfig = {
                    maxLevel:         Math.min(250, Math.max(1,   parseInt(req.body.bp_maxLevel)         || 250)),
                    baseCapacity:     Math.max(1,               parseInt(req.body.bp_baseCapacity)     || 50),
                    capacityPerLevel: Math.max(0,               parseInt(req.body.bp_capacityPerLevel) || 20),
                    baseCost:         Math.max(1,               parseInt(req.body.bp_baseCost)         || 500),
                    costExp:          Math.max(0.1,             parseFloat(req.body.bp_costExp)        || 1.5)
                };

                // Rebirth requirements
                if (!config.rebirthConfig) config.rebirthConfig = {};
                config.rebirthConfig.minPickaxe = Math.max(1, parseInt(req.body.minPickaxe) || 200);
                config.rebirthConfig.minBP      = Math.max(1, parseInt(req.body.minBP)      || 200);

                MiningConfig.clearConfigCache?.();
                await config.save();
                res.redirect('/mining-config?message=Progression config saved! Pickaxe levels regenerated.');
            } catch (error) {
                logger.error('Progression config update error:', error);
                res.redirect('/mining-config?error=Failed to save progression config');
            }
        });

        // === LEVEL XP REQUIREMENTS ROUTES ===
        app.post('/mining-config/level/add', requireAuth(['admin']), async (req, res) => {
            try {
                const { level, xpRequired } = req.body;
                const config = await MiningConfig.getConfig();
                if (!config.levelXpRequirements) {
                    config.levelXpRequirements = new Map();
                }
                config.levelXpRequirements.set(level.toString(), parseInt(xpRequired));
                await config.save();
                res.redirect('/mining-config?message=Level requirement added!');
            } catch (error) {
                console.error('Add level error:', error);
                res.redirect('/mining-config?error=Failed to add level');
            }
        });

        app.post('/mining-config/level/delete', requireAuth(['admin']), async (req, res) => {
            try {
                const { level } = req.body;
                const config = await MiningConfig.getConfig();
                if (config.levelXpRequirements) {
                    config.levelXpRequirements.delete(level.toString());
                    await config.save();
                }
                res.redirect('/mining-config?message=Level deleted!');
            } catch (error) {
                res.redirect('/mining-config?error=Failed to delete');
            }
        });

        app.post('/mining-config/level/edit', requireAuth(['admin']), async (req, res) => {
            try {
                const { originalLevel, level, xpRequired } = req.body;
                const config = await MiningConfig.getConfig();
                if (config.levelXpRequirements) {
                    // Delete old entry if level changed
                    if (originalLevel !== level) {
                        config.levelXpRequirements.delete(originalLevel.toString());
                    }
                    config.levelXpRequirements.set(level.toString(), parseInt(xpRequired));
                    await config.save();
                }
                res.redirect('/mining-config?message=Level updated!');
            } catch (error) {
                res.redirect('/mining-config?error=Failed to update');
            }
        });

        // === SHOP ITEMS ROUTES ===
        app.post('/mining-config/shop/add', requireAuth(['admin']), async (req, res) => {
            try {
                const { id, name, emoji, description, price, currency, boostType, multiplier, durationMinutes, isGlobal } = req.body;
                const config = await MiningConfig.getConfig();
                if (!config.shopItems) config.shopItems = [];
                config.shopItems.push({
                    id, name, emoji, description,
                    price: parseInt(price),
                    currency: currency || 'gems',
                    boostType,
                    multiplier: parseFloat(multiplier),
                    durationMinutes: parseInt(durationMinutes),
                    isGlobal: isGlobal === 'on' || isGlobal === 'true'
                });
                await config.save();
                res.redirect('/mining-config?tab=shop&message=Item added!');
            } catch (error) {
                res.redirect('/mining-config?tab=shop&error=Failed to add');
            }
        });

        app.post('/mining-config/shop/edit', requireAuth(['admin']), async (req, res) => {
            try {
                const { originalId, id, name, emoji, description, price, currency, boostType, multiplier, durationMinutes, isGlobal } = req.body;
                const config = await MiningConfig.getConfig();
                const idx = config.shopItems.findIndex(i => i.id === originalId);
                if (idx !== -1) {
                    config.shopItems[idx] = {
                        id, name, emoji, description,
                        price: parseInt(price),
                        currency: currency || 'gems',
                        boostType,
                        multiplier: parseFloat(multiplier),
                        durationMinutes: parseInt(durationMinutes),
                        isGlobal: isGlobal === 'on' || isGlobal === 'true'
                    };
                    await config.save();
                }
                res.redirect('/mining-config?tab=shop&message=Item updated!');
            } catch (error) {
                res.redirect('/mining-config?tab=shop&error=Failed to update');
            }
        });

        app.post('/mining-config/shop/delete', requireAuth(['admin']), async (req, res) => {
            try {
                const { id } = req.body;
                const config = await MiningConfig.getConfig();
                config.shopItems = (config.shopItems || []).filter(i => i.id !== id);
                await config.save();
                res.redirect('/mining-config?tab=shop&message=Item deleted!');
            } catch (error) {
                res.redirect('/mining-config?tab=shop&error=Failed to delete');
            }
        });

        // === PLAYER ROUTES ===
        app.post('/mining-config/player/edit', requireAuth(['admin']), async (req, res) => {
            try {
                const { phoneNumber, minecon, gems, pickaxeLevel, backpackLevel, rebirthCount, rebirthPoints, level } = req.body;
                await PlayerMining.findOneAndUpdate(
                    { phoneNumber },
                    {
                        minecon:       Math.max(0,   parseInt(minecon)       || 0),
                        gems:          Math.max(0,   parseInt(gems)          || 0),
                        pickaxeLevel:  Math.min(250, Math.max(1, parseInt(pickaxeLevel)  || 1)),
                        backpackLevel: Math.min(250, Math.max(1, parseInt(backpackLevel) || 1)),
                        rebirthCount:  Math.max(0,   parseInt(rebirthCount)  || 0),
                        rebirthPoints: Math.max(0,   parseInt(rebirthPoints) || 0),
                        level:         Math.max(1,   parseInt(level)         || 1)
                    }
                );
                MiningConfig.clearConfigCache?.();
                res.redirect('/mining-config?tab=users&message=Player berhasil diupdate!');
            } catch (error) {
                logger.error('Failed to edit player:', error);
                res.redirect('/mining-config?tab=users&error=Gagal update player');
            }
        });

        app.post('/mining-config/player/reset', requireAuth(['admin']), async (req, res) => {
            try {
                const { phoneNumber } = req.body;
                await PlayerMining.findOneAndUpdate(
                    { phoneNumber },
                    { level: 1, xp: 0, minecon: 0, gems: 0, pickaxeLevel: 1, currentFloor: 1, inventory: new Map(), activeBoosts: [] }
                );
                res.redirect('/mining-config?tab=users&message=Player reset!');
            } catch (error) {
                res.redirect('/mining-config?tab=users&error=Failed to reset');
            }
        });

        app.post('/mining-config/player/delete', requireAuth(['admin']), async (req, res) => {
            try {
                const { phoneNumber } = req.body;
                await PlayerMining.findOneAndDelete({ phoneNumber });
                res.redirect('/mining-config?tab=users&message=Player deleted!');
            } catch (error) {
                res.redirect('/mining-config?tab=users&error=Failed to delete');
            }
        });

        // === GLOBAL BOOST ROUTES ===
        app.post('/mining-config/boost/delete', requireAuth(['admin']), async (req, res) => {
            try {
                const { index } = req.body;
                const config = await MiningConfig.getConfig();
                config.globalBoosts.splice(parseInt(index), 1);
                await config.save();
                res.redirect('/mining-config?tab=boosts&message=Boost removed!');
            } catch (error) {
                res.redirect('/mining-config?tab=boosts&error=Failed to remove');
            }
        });

        // ==========================================
        // WEB PLAY API ROUTES
        // ==========================================

        app.post('/api/mining/mine', requireAuth(['admin', 'user']), async (req, res) => {
            // Check if mining web is enabled
            const BotSettings = require('../../models/BotSettings');
            const botSettings = await BotSettings.getSettings();
            if (!botSettings.miningWebEnabled) {
                return res.json({ success: false, error: 'Mining via Web Panel sedang dinonaktifkan sementara. Gunakan bot (.mine)!' });
            }

            let identifier = req.session.username || req.session.id;
            try {
                const fullUser = await User.findOne({ username: req.session.username });
                if (fullUser && fullUser.linkedPhoneNumber) identifier = fullUser.linkedPhoneNumber;

                // Anti-spam / Race condition memory lock
                if (activeMiners.has(identifier)) {
                    return res.json({ success: false, error: 'Please wait, another mining action is currently in progress.' });
                }
                activeMiners.add(identifier);

                const player = await PlayerMining.getPlayer(identifier);
                const config = await MiningConfig.getConfig();

                const now = Date.now();
                const lastMine = player.lastMineTime ? new Date(player.lastMineTime).getTime() : 0;
                const cooldownMs = config.cooldownSeconds * 1000;

                if (now - lastMine < cooldownMs) {
                    const remaining = Math.ceil((cooldownMs - (now - lastMine)) / 1000);
                    return res.json({ success: false, cooldown: true, remaining });
                }

                // Location (auto by rebirth)
                const location = player.getLocation(config);
                if (!location || !location.resources || location.resources.length === 0) {
                    return res.json({ success: false, error: 'Location not found' });
                }

                const pickaxe = config.pickaxeLevels.find(p => p.level === (player.pickaxeLevel || 1)) || { dropMultiplier: 1 };
                const rebirthBonus = player.getRebirthBonuses();

                // Boosts
                const luckyBoost = player.getBoostMultiplier('lucky');
                let globalDropMulti = 1;
                let sponsorBonusMulti = 1;
                for (const gb of (config.globalBoosts || [])) {
                    if (new Date(gb.expiresAt) > now) {
                        globalDropMulti *= gb.dropMultiplier || 1;
                        const isDirectBuy = gb.activatedBy === identifier && (!gb.contributors || gb.contributors.length <= 1);
                        if (isDirectBuy) sponsorBonusMulti *= 1.2;
                        else if (gb.contributors?.some(c => c.phoneNumber === identifier)) sponsorBonusMulti *= 1.1;
                    }
                }

                const baseDrops = Math.floor(Math.random() * ((config.baseDropMax || 3) - (config.baseDropMin || 1) + 1)) + (config.baseDropMin || 1);
                const totalDrops = Math.max(1, Math.floor(
                    baseDrops * pickaxe.dropMultiplier * luckyBoost * globalDropMulti * sponsorBonusMulti * rebirthBonus.dropMultiplier
                ));

                const weightedResources = [];
                for (const resName of location.resources) {
                    const resource = config.resources.find(r => r.name.toLowerCase() === resName.toLowerCase());
                    if (resource) weightedResources.push({ name: resName, resource, weight: resource.dropWeight || 50 });
                }
                const totalWeight = weightedResources.reduce((sum, r) => sum + r.weight, 0);

                const rawDrops = {};
                for (let i = 0; i < totalDrops; i++) {
                    let random = Math.random() * totalWeight;
                    for (const wr of weightedResources) {
                        random -= wr.weight;
                        if (random <= 0) {
                            const itemKey = wr.name.toLowerCase();
                            rawDrops[itemKey] = (rawDrops[itemKey] || 0) + 1;
                            break;
                        }
                    }
                }

                // BP cap check
                const bpCapacity = player.getBackpackCapacity(config);
                const { added, lost } = player.addToInventoryWithCap(rawDrops, bpCapacity);
                const drops = added;

                // Gem drop
                let gemsEarned = 0;
                const effectiveGemChance = (config.gemChance || 12) + rebirthBonus.gemChanceBonus;
                if (Math.random() * 100 < effectiveGemChance) {
                    gemsEarned = Math.floor(Math.random() * ((config.gemDropMax || 3) - (config.gemDropMin || 1) + 1)) + (config.gemDropMin || 1);
                    player.gems += gemsEarned;
                    player.stats.totalGemsEarned = (player.stats.totalGemsEarned || 0) + gemsEarned;
                }

                player.lastMineTime = new Date();
                player.stats.totalMined = (player.stats.totalMined || 0) + totalDrops;
                await player.save();

                const totalLost = Object.values(lost).reduce((s, v) => s + v, 0);
                let dropsHtmlText = Object.entries(drops).map(([i, q]) => `+${q} ${i}`).join(', ');
                if (totalLost > 0) dropsHtmlText += ` (${totalLost} hilang, BP penuh)`;

                res.json({
                    success: true,
                    drops,
                    dropsHtmlText,
                    gemsEarned,
                    totalLost,
                    newMinecon: player.minecon,
                    newGems: player.gems,
                    location: location.name,
                    bpLevel: player.backpackLevel,
                    bpCapacity,
                    cooldownRemaining: config.cooldownSeconds
                });

            } catch (err) {
                logger.error('Web Mine Error:', err);
                res.status(500).json({ success: false, error: 'Server error' });
            } finally {
                activeMiners.delete(identifier);
            }
        });

        app.post('/api/mining/sell-all', requireAuth(['admin', 'user']), async (req, res) => {
            try {
                let identifier = req.session.username || req.session.id;
                const fullUser = await User.findOne({ username: req.session.username });
                if (fullUser && fullUser.linkedPhoneNumber) identifier = fullUser.linkedPhoneNumber;

                const player = await PlayerMining.getPlayer(identifier);
                const config = await MiningConfig.getConfig();

                let totalEarned = 0;
                let itemsSold = {};
                for (const [resName, qty] of player.inventory.entries()) {
                    if (qty <= 0) continue;
                    const resDef = config.resources.find(r => r.name.toLowerCase() === resName.toLowerCase());
                    if (resDef && (resDef.rarity.toLowerCase() === 'common' || resDef.rarity.toLowerCase() === 'uncommon')) {
                        const earned = qty * resDef.sellPrice;
                        totalEarned += earned;
                        itemsSold[resName] = qty;
                        player.removeFromInventory(resName, qty);
                    }
                }

                if (totalEarned > 0) {
                    player.minecon += totalEarned;
                    player.stats.totalMineconEarned = (player.stats.totalMineconEarned || 0) + totalEarned;
                    await player.save();
                    res.json({ success: true, gained: totalEarned, itemsSold });
                } else {
                    res.json({ success: false, error: 'Tidak ada batuan Common/Uncommon untuk dijual.' });
                }
            } catch (err) {
                logger.error('Web Sell-All Error:', err);
                res.status(500).json({ success: false, error: 'Server error' });
            }
        });

        // Enchant Ability - Add/Edit
        app.post('/mining-config/enchant/ability/add', requireAuth(['admin']), async (req, res) => {
            try {
                const { id, name, emoji, rarity, dropWeight, sellPriceBonus, xpGainBonus, extraDrop, rareDropChance, gemChance, enchantStoneChance, doubleDrop } = req.body;
                const config = await MiningConfig.getConfig();

                // Process effects
                const effects = {};
                if (sellPriceBonus) effects.sellPriceBonus = parseFloat(sellPriceBonus);
                if (xpGainBonus) effects.xpGainBonus = parseFloat(xpGainBonus);
                if (extraDrop) effects.extraDrop = parseInt(extraDrop);
                if (rareDropChance) effects.rareDropChance = parseFloat(rareDropChance);
                if (gemChance) effects.gemChance = parseFloat(gemChance);
                if (enchantStoneChance) effects.enchantStoneChance = parseFloat(enchantStoneChance);
                if (doubleDrop) effects.doubleDrop = parseFloat(doubleDrop);

                // Update if exists, otherwise append
                const existingIdx = config.enchantAbilities.findIndex(a => a.id === id);
                if (existingIdx !== -1) {
                    config.enchantAbilities[existingIdx] = {
                        id, name, emoji: emoji || '🔮', rarity: rarity || 'common',
                        dropWeight: parseInt(dropWeight) || 50,
                        effects
                    };
                } else {
                    config.enchantAbilities.push({
                        id, name, emoji: emoji || '🔮', rarity: rarity || 'common',
                        dropWeight: parseInt(dropWeight) || 50,
                        effects
                    });
                }

                await config.save();
                res.redirect('/mining-config?message=Ability saved successfully!');
            } catch (error) {
                logger.error('Failed to save ability:', error);
                res.redirect('/mining-config?error=Failed to save ability');
            }
        });

        // Enchant Ability - Delete
        app.post('/mining-config/enchant/ability/delete', requireAuth(['admin']), async (req, res) => {
            try {
                const { id } = req.body;
                const config = await MiningConfig.getConfig();
                config.enchantAbilities = config.enchantAbilities.filter(a => a.id !== id);
                config.markModified('enchantAbilities');
                await config.save();
                res.redirect('/mining-config?message=Ability deleted!');
            } catch (error) {
                logger.error('Failed to delete ability:', error);
                res.redirect('/mining-config?error=Failed to delete ability');
            }
        });

        // Enchant Slots Update
        app.post('/mining-config/enchant/slots/update', requireAuth(['admin']), async (req, res) => {
            try {
                const config = await MiningConfig.getConfig();

                // Assuming payload like: unlockPrice1, rerollCost1, unlockPrice2, rerollCost2, etc.
                for (let i = 1; i <= 4; i++) {
                    const priceKey = `unlockPrice${i}`;
                    const costKey = `rerollCost${i}`;
                    const slotNode = config.enchantSlots.find(s => s.slotNumber === i);

                    if (slotNode) {
                        if (req.body[priceKey] !== undefined) slotNode.unlockPrice = parseInt(req.body[priceKey]);
                        if (req.body[costKey] !== undefined) slotNode.rerollCost = parseInt(req.body[costKey]);
                    } else if (req.body[priceKey] !== undefined) {
                        config.enchantSlots.push({
                            slotNumber: i,
                            unlockPrice: parseInt(req.body[priceKey]),
                            rerollCost: parseInt(req.body[costKey] || i)
                        });
                    }
                }

                await config.save();
                res.redirect('/mining-config?message=Enchant slots updated!');
            } catch (error) {
                logger.error('Failed to update enchant slots:', error);
                res.redirect('/mining-config?error=Failed to update slots');
            }
        });

        // Update Guild Settings
        app.post('/mining-config/guild/update', requireAuth(['admin']), async (req, res) => {
            try {
                const config = await MiningConfig.getConfig();

                if (!config.guildSettings) config.guildSettings = {};
                config.guildSettings.questRefreshHours = parseFloat(req.body.questRefreshHours) || 24;

                // Parse the array of ranks
                const ranks = ['F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'];
                config.guildSettings.ranks = ranks.map(rankName => {
                    const reqXp = req.body[`reqXp_${rankName}`] || 0;
                    const questCount = req.body[`questCount_${rankName}`] || 3;
                    const minQ = req.body[`minQ_${rankName}`] || 10;
                    const maxQ = req.body[`maxQ_${rankName}`] || 100;
                    const mult = req.body[`mult_${rankName}`] || 1;
                    const gemRMin = req.body[`gemRMin_${rankName}`] || 0;
                    const gemRMax = req.body[`gemRMax_${rankName}`] || 2;
                    const xpMin = req.body[`xpMin_${rankName}`] || 10;
                    const xpMax = req.body[`xpMax_${rankName}`] || 50;
                    const shardRMin = req.body[`shardRMin_${rankName}`] || 0;
                    const shardRMax = req.body[`shardRMax_${rankName}`] || 0;

                    // Parse allowed resources
                    let allowed = req.body[`allowedRes_${rankName}`];
                    allowed = Array.isArray(allowed) ? allowed : (allowed ? [allowed] : []);

                    return {
                        name: rankName,
                        requiredXp: parseInt(reqXp),
                        questCount: parseInt(questCount),
                        allowedResources: allowed,
                        minQuantity: parseInt(minQ),
                        maxQuantity: parseInt(maxQ),
                        rewardMultiplier: parseFloat(mult),
                        gemRewardMin: parseInt(gemRMin),
                        gemRewardMax: parseInt(gemRMax),
                        xpRewardMin: parseInt(xpMin),
                        xpRewardMax: parseInt(xpMax),
                        shardRewardMin: parseInt(shardRMin),
                        shardRewardMax: parseInt(shardRMax)
                    };
                });

                await config.save();
                res.redirect('/mining-config?message=Guild settings updated!');
            } catch (error) {
                logger.error('Failed to update guild settings:', error);
                res.redirect('/mining-config?error=Failed to update guild settings');
            }
        });

        // Reset All Player Quests
        app.post('/mining-config/guild/reset-quests', requireAuth(['admin']), async (req, res) => {
            try {
                const PlayerMining = require('../../models/PlayerMining');
                await PlayerMining.updateMany({}, {
                    $set: {
                        "quest.lastQuestRefresh": null,
                        "quest.activeQuests": []
                    }
                });
                res.redirect('/mining-config?message=All player daily quests will regenerate on their next check!');
            } catch (error) {
                logger.error('Failed to reset player quests:', error);
                res.redirect('/mining-config?error=Failed to reset player quests');
            }
        });

        // Update Bounty Board Settings
        app.post('/mining-config/bounty/update', requireAuth(['admin']), async (req, res) => {
            try {
                const config = await MiningConfig.getConfig();
                const b = req.body;

                if (!config.guildSettings.bountySettings) {
                    config.guildSettings.bountySettings = {};
                }

                const bs = config.guildSettings.bountySettings;
                const tiers = ['easy', 'medium', 'hard', 'legendary'];

                tiers.forEach(t => {
                    bs[t + 'Count'] = parseInt(b[t + 'Count']) || 0;
                    bs[t + 'QtyMin'] = parseInt(b[t + 'QtyMin']) || 10;
                    bs[t + 'QtyMax'] = parseInt(b[t + 'QtyMax']) || 80;
                    bs[t + 'RewardMult'] = parseFloat(b[t + 'RewardMult']) || 1;
                    bs[t + 'XpMin'] = parseInt(b[t + 'XpMin']) || 10;
                    bs[t + 'XpMax'] = parseInt(b[t + 'XpMax']) || 50;
                    bs[t + 'GemMin'] = parseInt(b[t + 'GemMin']) || 0;
                    bs[t + 'GemMax'] = parseInt(b[t + 'GemMax']) || 0;
                    bs[t + 'EstoneMin'] = parseInt(b[t + 'EstoneMin']) || 0;
                    bs[t + 'EstoneMax'] = parseInt(b[t + 'EstoneMax']) || 0;
                });

                config.markModified('guildSettings.bountySettings');
                await config.save();
                MiningConfig.clearConfigCache();
                res.redirect('/mining-config?message=Bounty settings updated!');
            } catch (error) {
                logger.error('Failed to update bounty settings:', error);
                res.redirect('/mining-config?error=Failed to update bounty settings');
            }
        });

        // Reset Today's Bounty Board
        app.post('/mining-config/bounty/reset', requireAuth(['admin']), async (req, res) => {
            try {
                const GuildBounty = require('../../models/GuildBounty');
                // Get today's date string in WIB (UTC+7)
                const now = new Date();
                const wib = new Date(now.getTime() + (7 * 60 * 60 * 1000));
                const today = wib.toISOString().split('T')[0];

                await GuildBounty.deleteOne({ date: today });
                res.redirect('/mining-config?message=Today\'s Bounty Board resets successfully. It will be recreated on the next .mquest request!');
            } catch (error) {
                logger.error('Failed to reset bounty board:', error);
                res.redirect('/mining-config?error=Failed to reset bounty board');
            }
        });

    },
    getMiningConfigPage: async () => {
        try {
        const mc = await MiningConfig.getConfig();
        // Guard: ensure arrays that may not exist in older DB documents
        mc.floors            = mc.floors            || [];
        mc.locations         = mc.locations         || [];
        mc.resources         = mc.resources         || [];
        mc.pickaxeLevels     = mc.pickaxeLevels     || [];
        mc.shopItems         = mc.shopItems         || [];
        mc.globalBoosts      = mc.globalBoosts      || [];

        const players = await PlayerMining.find(
            {},
            { phoneNumber: 1, rebirthCount: 1, minecon: 1, gems: 1, pickaxeLevel: 1, backpackLevel: 1, rebirthPoints: 1, level: 1, xp: 1 }
        ).sort({ rebirthCount: -1, minecon: -1 }).limit(50).lean();

        // Clean expired global boosts tanpa memblokir rendering halaman (save asinkron di belakang)
        if (mc.globalBoosts && mc.globalBoosts.length > 0) {
            const hasExpired = mc.globalBoosts.some(b => new Date(b.expiresAt) <= new Date());
            if (hasExpired) {
                mc.globalBoosts = mc.globalBoosts.filter(b => new Date(b.expiresAt) > new Date());
                mc.save().catch(e => console.error('Gagal menyimpan mc.globalBoosts:', e));
            }
        }

        return `
                <style>
                    .mining-tabs { display: flex; gap: 8px; margin-bottom: 24px; flex-wrap: wrap; }
                    .mining-tab { padding: 10px 16px; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 8px; cursor: pointer; font-weight: 500; transition:all 0.2s; text-decoration: none; color: var(--text-secondary); }
                    .mining-tab:hover { background: var(--bg-tertiary); color: var(--text-primary); }
                    .mining-tab.active { background: var(--text-primary); color: var(--bg-primary); border-color: var(--text-primary); }
                    .tab-section { display: none; }
                    .tab-section.active { display: block; }
                    .content, .header { padding-left: 60px !important; padding-right: 60px !important; }
                    .header { border-bottom: 1px solid var(--border); background: var(--bg-primary); }
                    .mb-4 { margin-bottom: 24px; }
                    @media (max-width: 768px) { .content, .header { padding-left: 20px !important; padding-right: 20px !important; } }
                </style>
    
                        <header class="header"><h1 class="header-title">⛏️ Mining Game Manager</h1></header>
                        <div class="content">
                            <!-- Tab Navigation -->
                            <div class="mining-tabs">
                                <a class="mining-tab active" data-tab="config" onclick="showTab('config')">⚙️ Config</a>
                                <a class="mining-tab" data-tab="guild" onclick="showTab('guild')">📋 Quest</a>
                                <a class="mining-tab" data-tab="shop" onclick="showTab('shop')">🛒 Shop (${(mc.shopItems || []).length})</a>
                                <a class="mining-tab" data-tab="users" onclick="showTab('users')">👥 Players (${players.length})</a>
                                <a class="mining-tab" data-tab="boosts" onclick="showTab('boosts')">🚀 Boosts (${(mc.globalBoosts || []).length})</a>
                                <a class="mining-tab" data-tab="pets" onclick="showTab('pets')">🐾 Pets</a>
                            </div>

                            <!-- TAB: Config (original content) -->
                            <div class="tab-section active" id="tab-config">
                                <!-- General Settings -->
                                <div class="card" style="margin-bottom: 24px;">
                                    <div class="card-header"><div><div class="card-title">⚙️ General Settings</div></div></div>
                                    <form action="/mining-config/update" method="POST" style="padding: 24px;">
                                        <div class="grid grid-4">
                                            <div class="form-group">
                                                <label class="form-label">Cooldown (sec)</label>
                                                <input type="number" name="cooldownSeconds" value="${mc.cooldownSeconds}" class="form-input">
                                            </div>
                                            <div class="form-group">
                                                <label class="form-label">Min Drop</label>
                                                <input type="number" name="baseDropMin" value="${mc.baseDropMin}" class="form-input">
                                            </div>
                                            <div class="form-group">
                                                <label class="form-label">Max Drop</label>
                                                <input type="number" name="baseDropMax" value="${mc.baseDropMax}" class="form-input">
                                            </div>
                                            <div class="form-group">
                                                <label class="form-label">Gem Chance (%)</label>
                                                <input type="number" name="gemChance" value="${mc.gemChance || 15}" step="0.1" class="form-input">
                                            </div>
                                            <div class="form-group">
                                                <label class="form-label">Gem Min Drop</label>
                                                <input type="number" name="gemDropMin" value="${mc.gemDropMin || 1}" class="form-input">
                                            </div>
                                            <div class="form-group">
                                                <label class="form-label">Gem Max Drop</label>
                                                <input type="number" name="gemDropMax" value="${mc.gemDropMax || 3}" class="form-input">
                                            </div>
                                        </div>

                                        <button type="submit" class="btn btn-primary">💾 Save Settings</button>
                                    </form>
                                </div>

                                <!-- Pickaxe & BP Progression Config -->
                                <div class="card" style="margin-bottom: 24px;">
                                    <div class="card-header">
                                        <div>
                                            <div class="card-title">⛏️ Pickaxe & BP Progression</div>
                                            <div class="card-subtitle">Formula upgrade Pickaxe dan Backpack. Simpan akan regenerate semua 250 level Pickaxe otomatis.</div>
                                        </div>
                                    </div>
                                    <form action="/mining-config/progression/update" method="POST" style="padding: 24px;">

                                        <!-- PICKAXE FORMULA -->
                                        <div style="font-size:14px;font-weight:700;margin-bottom:14px;color:var(--text-primary);">⛏️ Pickaxe Formula &nbsp;<code style="font-size:11px;font-weight:400;color:var(--text-secondary);">Biaya = floor(baseCost × lvl ^ costExp) &nbsp;|&nbsp; Drop = baseMult + (lvl-1) × multPerLevel</code></div>
                                        <div class="grid grid-5" style="background:var(--bg-tertiary);padding:16px;border-radius:8px;border:1px solid var(--border);margin-bottom:20px;">
                                            <div class="form-group">
                                                <label class="form-label">Max Level</label>
                                                <input type="number" name="pick_maxLevel" value="${mc.pickaxeConfig?.maxLevel ?? 250}" min="1" max="250" class="form-input">
                                            </div>
                                            <div class="form-group">
                                                <label class="form-label">Base Cost (MC)</label>
                                                <input type="number" name="pick_baseCost" value="${mc.pickaxeConfig?.baseCost ?? 200}" min="1" class="form-input">
                                                <small style="color:var(--text-secondary);">e.g. 200</small>
                                            </div>
                                            <div class="form-group">
                                                <label class="form-label">Cost Exponent</label>
                                                <input type="number" name="pick_costExp" value="${mc.pickaxeConfig?.costExp ?? 1.8}" min="0.1" step="0.05" class="form-input">
                                                <small style="color:var(--text-secondary);">e.g. 1.8 (makin besar = makin curam)</small>
                                            </div>
                                            <div class="form-group">
                                                <label class="form-label">Base Multiplier</label>
                                                <input type="number" name="pick_baseMult" value="${mc.pickaxeConfig?.baseMult ?? 1.0}" min="0.1" step="0.01" class="form-input">
                                                <small style="color:var(--text-secondary);">Drop bonus di Lv.1</small>
                                            </div>
                                            <div class="form-group">
                                                <label class="form-label">Mult per Level</label>
                                                <input type="number" name="pick_multPerLevel" value="${mc.pickaxeConfig?.multPerLevel ?? 0.02}" min="0" step="0.005" class="form-input">
                                                <small style="color:var(--text-secondary);">+drop per level (e.g. 0.02)</small>
                                            </div>
                                        </div>

                                        <!-- BP FORMULA -->
                                        <div style="font-size:14px;font-weight:700;margin-bottom:14px;color:var(--text-primary);">📦 Backpack (BP) Formula &nbsp;<code style="font-size:11px;font-weight:400;color:var(--text-secondary);">Kapasitas = baseCapacity + (lvl-1) × capPerLevel &nbsp;|&nbsp; Biaya = floor(baseCost × lvl ^ costExp)</code></div>
                                        <div class="grid grid-5" style="background:var(--bg-tertiary);padding:16px;border-radius:8px;border:1px solid var(--border);margin-bottom:20px;">
                                            <div class="form-group">
                                                <label class="form-label">Max Level</label>
                                                <input type="number" name="bp_maxLevel" value="${mc.bpConfig?.maxLevel ?? 250}" min="1" max="250" class="form-input">
                                            </div>
                                            <div class="form-group">
                                                <label class="form-label">Base Capacity</label>
                                                <input type="number" name="bp_baseCapacity" value="${mc.bpConfig?.baseCapacity ?? 50}" min="1" class="form-input">
                                                <small style="color:var(--text-secondary);">Kapasitas di Lv.1</small>
                                            </div>
                                            <div class="form-group">
                                                <label class="form-label">Capacity per Level</label>
                                                <input type="number" name="bp_capacityPerLevel" value="${mc.bpConfig?.capacityPerLevel ?? 20}" min="0" class="form-input">
                                                <small style="color:var(--text-secondary);">+kapasitas per level</small>
                                            </div>
                                            <div class="form-group">
                                                <label class="form-label">Base Cost (MC)</label>
                                                <input type="number" name="bp_baseCost" value="${mc.bpConfig?.baseCost ?? 500}" min="1" class="form-input">
                                                <small style="color:var(--text-secondary);">e.g. 500</small>
                                            </div>
                                            <div class="form-group">
                                                <label class="form-label">Cost Exponent</label>
                                                <input type="number" name="bp_costExp" value="${mc.bpConfig?.costExp ?? 1.5}" min="0.1" step="0.05" class="form-input">
                                                <small style="color:var(--text-secondary);">e.g. 1.5</small>
                                            </div>
                                        </div>

                                        <!-- REBIRTH REQUIREMENTS -->
                                        <div style="font-size:14px;font-weight:700;margin-bottom:14px;color:var(--text-primary);">🔄 Syarat Rebirth</div>
                                        <div class="grid grid-4" style="background:var(--bg-tertiary);padding:16px;border-radius:8px;border:1px solid var(--border);margin-bottom:20px;">
                                            <div class="form-group">
                                                <label class="form-label">Min Pickaxe Level</label>
                                                <input type="number" name="minPickaxe" value="${mc.rebirthConfig?.minPickaxe ?? 200}" min="1" max="250" class="form-input">
                                                <small style="color:var(--text-secondary);">Pickaxe harus ≥ level ini</small>
                                            </div>
                                            <div class="form-group">
                                                <label class="form-label">Min BP Level</label>
                                                <input type="number" name="minBP" value="${mc.rebirthConfig?.minBP ?? 200}" min="1" max="250" class="form-input">
                                                <small style="color:var(--text-secondary);">BP harus ≥ level ini</small>
                                            </div>
                                            <div class="form-group" style="align-self:end;">
                                                <div style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.25);border-radius:8px;padding:10px 14px;font-size:12px;">
                                                    <div style="font-weight:600;margin-bottom:4px;">📊 Contoh Pickaxe Lv.1 & Lv.250</div>
                                                    <div>Lv.1 cost: <strong>0 MC</strong></div>
                                                    <div>Lv.50 cost: <strong>${Math.floor((mc.pickaxeConfig?.baseCost ?? 200) * Math.pow(50, mc.pickaxeConfig?.costExp ?? 1.8)).toLocaleString()} MC</strong></div>
                                                    <div>Lv.250 drop: <strong>x${(((mc.pickaxeConfig?.baseMult ?? 1.0) + 249 * (mc.pickaxeConfig?.multPerLevel ?? 0.02))).toFixed(2)}</strong></div>
                                                </div>
                                            </div>
                                            <div class="form-group" style="align-self:end;">
                                                <div style="background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.25);border-radius:8px;padding:10px 14px;font-size:12px;">
                                                    <div style="font-weight:600;margin-bottom:4px;">📊 Contoh BP Lv.1 & Lv.250</div>
                                                    <div>Lv.1 cap: <strong>${mc.bpConfig?.baseCapacity ?? 50}/ore</strong></div>
                                                    <div>Lv.100 cost: <strong>${Math.floor((mc.bpConfig?.baseCost ?? 500) * Math.pow(100, mc.bpConfig?.costExp ?? 1.5)).toLocaleString()} MC</strong></div>
                                                    <div>Lv.250 cap: <strong>${((mc.bpConfig?.baseCapacity ?? 50) + 249 * (mc.bpConfig?.capacityPerLevel ?? 20)).toLocaleString()}/ore</strong></div>
                                                </div>
                                            </div>
                                        </div>

                                        <button type="submit" class="btn btn-primary">💾 Save & Regenerate Pickaxe Levels</button>
                                    </form>
                                </div>

                                <!-- Drop Event Config -->
                                ${ (() => {
                                    const devt = mc.activeDropEvent;
                                    const devtActive = devt && devt.active && devt.remainingStock > 0 && new Date(devt.expiresAt) > new Date();
                                    const devtStatusBadge = devtActive
                                        ? `<span style="background:#22c55e22;color:#22c55e;border:1px solid #22c55e44;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;">🟢 EVENT AKTIF</span>`
                                        : `<span style="background:#ef444422;color:#ef4444;border:1px solid #ef444444;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;">⚫ TIDAK ADA EVENT</span>`;
                                    const devtStatusBar = devtActive ? `
                                        <div style="padding:16px 24px;background:rgba(34,197,94,0.05);border-bottom:1px solid var(--border);">
                                            <div style="display:flex;gap:24px;flex-wrap:wrap;align-items:center;">
                                                <div><span style="font-size:11px;color:var(--text-muted);display:block;">NAMA EVENT</span><strong>${devt.emoji} ${devt.name}</strong></div>
                                                <div><span style="font-size:11px;color:var(--text-muted);display:block;">STOK TERSISA</span><strong style="color:#22c55e;">${devt.remainingStock} / ${devt.totalStock}</strong></div>
                                                <div><span style="font-size:11px;color:var(--text-muted);display:block;">BERAKHIR</span><strong>${new Date(devt.expiresAt).toLocaleTimeString('id-ID')}</strong></div>
                                                <div><span style="font-size:11px;color:var(--text-muted);display:block;">DROP CHANCE</span><strong>${devt.dropChance}%</strong></div>
                                            </div>
                                        </div>` : '';
                                    return `
                                <div class="card" style="margin-bottom: 24px;">
                                    <div class="card-header">
                                        <div>
                                            <div class="card-title">🎪 Drop Event Config</div>
                                            <div class="card-subtitle" style="font-size:12px;color:var(--text-muted);margin-top:2px;">Konfigurasi nama, emoji & chance untuk event drop item spesial</div>
                                        </div>
                                        ${devtStatusBadge}
                                    </div>
                                    ${devtStatusBar}
                                    <form action="/mining-config/drop-event/update" method="POST" style="padding: 24px;">
                                        <div class="grid grid-4">
                                            <div class="form-group">
                                                <label class="form-label">Nama Item Event</label>
                                                <input type="text" name="dropEventName" value="${mc.dropEventConfig?.name || 'Cookies'}" class="form-input" placeholder="contoh: Cookies, Chicken, Crystal" required>
                                                <span style="font-size:11px;color:var(--text-muted);">Tampil di bot & notifikasi drop</span>
                                            </div>
                                            <div class="form-group">
                                                <label class="form-label">Emoji</label>
                                                <input type="text" name="dropEventEmoji" value="${mc.dropEventConfig?.emoji || '🍪'}" class="form-input" placeholder="🍪" required>
                                                <span style="font-size:11px;color:var(--text-muted);">Satu karakter emoji</span>
                                            </div>
                                            <div class="form-group">
                                                <label class="form-label">Drop Chance (%)</label>
                                                <input type="number" name="dropEventChance" value="${mc.dropEventConfig?.dropChance || 5}" min="1" max="100" step="0.5" class="form-input" required>
                                                <span style="font-size:11px;color:var(--text-muted);">Persentase per tambang</span>
                                            </div>
                                            <div class="form-group">
                                                <label class="form-label">Deskripsi</label>
                                                <input type="text" name="dropEventDesc" value="${mc.dropEventConfig?.description || 'Event item spesial!'}" class="form-input">
                                                <span style="font-size:11px;color:var(--text-muted);">Ditampilkan di .mevent</span>
                                            </div>
                                        </div>
                                        <div style="display:flex;gap:12px;align-items:center;margin-top:8px;flex-wrap:wrap;">
                                            <button type="submit" class="btn btn-primary">💾 Save Event Config</button>
                                            <span style="font-size:12px;color:var(--text-muted);">Config ini dipakai saat kamu jalankan <code>.mdrop start [jml] [mnt]</code></span>
                                        </div>
                                    </form>
                                </div>`;
                                })() }

                                <!-- Resources -->
                                <div class="card" style="margin-bottom: 24px;">
                                    <div class="card-header">
                                        <div><div class="card-title">💎 Resources (${mc.resources.length})</div></div>
                                        <button onclick="document.getElementById('addResourceForm').style.display='block'" class="btn btn-secondary">+ Add</button>
                                    </div>
                                    <div id="addResourceForm" style="display:none; padding: 16px; background: var(--bg-tertiary); border-bottom: 1px solid var(--border);">
                                        <form action="/mining-config/resource/add" method="POST">
                                            <div class="grid grid-4" style="gap: 12px; align-items: end;">
                                                <input type="text" name="name" placeholder="Name (e.g. Ruby)" class="form-input" required>
                                                    <select name="rarity" class="form-input">
                                                        <option value="common">Common</option>
                                                        <option value="uncommon">Uncommon</option>
                                                        <option value="rare">Rare</option>
                                                        <option value="epic">Epic</option>
                                                        <option value="legendary">Legendary</option>
                                                        <option value="mythical">Mythical</option>
                                                        <option value="divine">Divine</option>
                                                        <option value="ultimate">Ultimate</option>
                                                        <option value="exclusive">Exclusive</option>
                                                    </select>
                                                    <input type="number" name="sellPrice" placeholder="Sell Price" class="form-input" required>
                                                        <input type="number" name="dropWeight" placeholder="Drop Weight (50=normal)" class="form-input" value="50">
                                                            </div>
                                                            <div style="margin-top: 12px;">
                                                                <button type="submit" class="btn btn-primary">Add Resource</button>
                                                                <button type="button" onclick="document.getElementById('addResourceForm').style.display='none'" class="btn btn-secondary">Cancel</button>
                                                            </div>
                                                        </form>
                                                    </div>
                                                    <div class="table-container">
                                                        <table class="table">
                                                            <thead><tr><th>Resource</th><th>Rarity</th><th>Sell</th><th>Drop%</th><th>Action</th></tr></thead>
                                                            <tbody>
                                                                ${mc.resources.map(r => `
                                    <tr>
                                        <td>${r.name}</td>
                                        <td><span class="badge badge-${r.rarity === 'legendary' ? 'warning' : 'success'}">${r.rarity}</span></td>
                                        <td>💰 ${r.sellPrice}</td>
                                        <td>${r.dropWeight || 50}</td>
                                        <td>
                                            <button onclick="openEditRes('${r.name}','${r.rarity}',${r.sellPrice},${r.dropWeight || 50})" class="btn btn-secondary" style="padding:4px 10px;font-size:12px;">✏️</button>
                                            <form action="/mining-config/resource/delete" method="POST" style="display:inline;" onsubmit="return confirm('Delete ${r.name}?')">
                                                <input type="hidden" name="name" value="${r.name}">
                                                <button type="submit" class="btn btn-secondary" style="padding:4px 10px;font-size:12px;">🗑️</button>
                                            </form>
                                        </td>
                                    </tr>
                                `).join('')}}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                            </div>
    
                                            <!-- 25 Zona Mining dengan Material -->
                                            ${ (() => {
                                                const rarityColor = {
                                                    common:    '#9ca3af',
                                                    uncommon:  '#22c55e',
                                                    rare:      '#3b82f6',
                                                    epic:      '#a855f7',
                                                    legendary: '#f59e0b',
                                                    mythical:  '#ec4899',
                                                    divine:    '#f97316',
                                                    ultimate:  '#ef4444',
                                                    exclusive: '#8b5cf6'
                                                };
                                                const resourceMap = Object.fromEntries((mc.resources || []).map(r => [r.name, r]));
                                                const fmt = n => n >= 1000000 ? (n/1000000).toFixed(2)+'M' : n >= 1000 ? (n/1000).toFixed(0)+'K' : n+'';

                                                const zoneCards = (mc.locations || []).map((loc, idx) => {
                                                    const zoneNum = idx + 1;
                                                    const nextLoc = mc.locations[idx + 1];
                                                    const rangeLabel = nextLoc ? `R${loc.minRebirth} – R${nextLoc.minRebirth - 1}` : `R${loc.minRebirth}+`;
                                                    const ores = (loc.resources || []).map(name => resourceMap[name]).filter(Boolean);
                                                    const oreRows = ores.map(ore => {
                                                        const col = rarityColor[ore.rarity] || '#9ca3af';
                                                        return `<tr>
                                                            <td style="padding:5px 8px;font-size:13px;">${ore.name}</td>
                                                            <td style="padding:5px 8px;"><span style="background:${col}22;color:${col};border:1px solid ${col}44;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;white-space:nowrap;">${ore.rarity}</span></td>
                                                            <td style="padding:5px 8px;font-size:13px;text-align:right;font-weight:600;">💰 ${fmt(ore.sellPrice)}</td>
                                                            <td style="padding:5px 8px;font-size:11px;color:var(--text-muted);text-align:right;">${ore.dropWeight}w</td>
                                                        </tr>`;
                                                    }).join('');
                                                    return `
                                                    <div style="border:1px solid var(--border);border-radius:12px;overflow:hidden;background:var(--bg-primary);">
                                                        <div style="padding:10px 14px;background:var(--bg-tertiary);display:flex;align-items:center;justify-content:space-between;gap:8px;">
                                                            <div style="font-weight:700;font-size:13px;">Z${zoneNum} ${loc.emoji} ${loc.name}</div>
                                                            <span style="background:rgba(59,130,246,0.12);color:#3b82f6;border:1px solid rgba(59,130,246,0.3);padding:2px 9px;border-radius:10px;font-size:11px;font-weight:700;white-space:nowrap;">${rangeLabel}</span>
                                                        </div>
                                                        <div style="padding:4px 0;">
                                                            <table style="width:100%;border-collapse:collapse;">${oreRows}</table>
                                                        </div>
                                                    </div>`;
                                                }).join('');

                                                return `
                                                <div class="card" style="margin-bottom:24px;">
                                                    <div class="card-header">
                                                        <div>
                                                            <div class="card-title">🗺️ 25 Zona Mining & Material (${mc.locations.length} zona, ${mc.resources.length} ore)</div>
                                                            <div class="card-subtitle">Zona berubah otomatis sesuai jumlah rebirth player</div>
                                                        </div>
                                                    </div>
                                                    <div style="padding:16px;display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px;">
                                                        ${zoneCards}
                                                    </div>
                                                </div>`;
                                            })() }
    
                                                            <!-- Edit Modals -->
                                                            <div id="editResModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:1000;align-items:center;justify-content:center;" onclick="if(event.target===this)this.style.display='none'">
                                                                <div style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:16px;padding:24px;width:90%;max-width:450px;">
                                                                    <div style="font-size:18px;font-weight:600;margin-bottom:20px;">✏️ Edit Resource</div>
                                                                    <form action="/mining-config/resource/edit" method="POST">
                                                                        <input type="hidden" name="originalName" id="editResOrig">
                                                                            <div class="form-group"><label class="form-label">Name</label><input type="text" name="name" id="editResName" class="form-input" required></div>
                                                                            <div class="form-group"><label class="form-label">Rarity</label><select name="rarity" id="editResRarity" class="form-input"><option value="common">Common</option><option value="uncommon">Uncommon</option><option value="rare">Rare</option><option value="epic">Epic</option><option value="legendary">Legendary</option><option value="mythical">Mythical</option><option value="divine">Divine</option><option value="ultimate">Ultimate</option><option value="exclusive">Exclusive</option></select></div>
                                                                            <div class="form-group"><label class="form-label">Sell Price</label><input type="number" name="sellPrice" id="editResPrice" class="form-input" required></div>
                                                                            <div class="form-group"><label class="form-label">Drop Weight</label><input type="number" name="dropWeight" id="editResWeight" class="form-input" required><small style="color:var(--text-secondary);">Higher = more common (e.g. 50=normal, 5=rare, 1=legendary)</small></div>
                                                                            <div style="display:flex;gap:8px;margin-top:16px;"><button type="submit" class="btn btn-primary">Save</button><button type="button" onclick="document.getElementById('editResModal').style.display='none'" class="btn btn-secondary">Cancel</button></div>
                                                                    </form>
                                                                </div>
                                                            </div>
                                                            <script>
                                                                function openEditRes(n,r,p,w){document.getElementById('editResOrig').value=n;document.getElementById('editResName').value=n;document.getElementById('editResRarity').value=r;document.getElementById('editResPrice').value=p;document.getElementById('editResWeight').value=w;document.getElementById('editResModal').style.display='flex';}
                                                                function openEditShop(id,n,e,d,p,c,t,m,dm,g){
                                                                    document.getElementById('editShopOrig').value = id;
                                                                document.getElementById('editShopId').value=id;
                                                                document.getElementById('editShopName').value=n;
                                                                document.getElementById('editShopEmoji').value=e;
                                                                document.getElementById('editShopDesc').value=d;
                                                                document.getElementById('editShopPrice').value=p;
                                                                document.getElementById('editShopCurr').value=c;
                                                                document.getElementById('editShopType').value=t;
                                                                document.getElementById('editShopMulti').value=m;
                                                                document.getElementById('editShopDur').value=dm;
                                                                document.getElementById('editShopGlobal').checked=g;
                                                                document.getElementById('editShopModal').style.display='flex';
            }
                                                                function openEditPlayer(phone,minecon,gems,pick,bp,rebirth,rp,level,xp){
                                                                    document.getElementById('editPlayerPhoneInput').value = phone;
                                                                    document.getElementById('editPlayerPhone').textContent  = '📱 ' + phone;
                                                                    document.getElementById('epMinecon').value  = minecon;
                                                                    document.getElementById('epGems').value    = gems;
                                                                    document.getElementById('epPickaxe').value = pick;
                                                                    document.getElementById('epBP').value      = bp;
                                                                    document.getElementById('epRebirth').value = rebirth;
                                                                    document.getElementById('epRP').value      = rp;
                                                                    document.getElementById('epLevel').value   = level;
                                                                    document.getElementById('editPlayerModal').style.display = 'flex';
                                                                }
                                                                // Tab switching
                                                                function showTab(tabId) {
                                                                    document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
                                                                    document.querySelectorAll('.mining-tab').forEach(t => t.classList.remove('active'));
                                                                    const sec = document.getElementById('tab-' + tabId);
                                                                    const btn = document.querySelector('.mining-tab[data-tab="' + tabId + '"]');
                                                                    if (sec) sec.classList.add('active');
                                                                    if (btn) btn.classList.add('active');
                                                                }
                                                                // Auto-switch tab from URL param
                                                                (function() {
                                                                    const params = new URLSearchParams(window.location.search);
                                                                    const tab = params.get('tab');
                                                                    if (tab) showTab(tab);
                                                                })();
                                                            </script>
    
                                                        </div><!-- Close tab-config -->


                                                        <!-- TAB: Guild -->
                                                        <div class="tab-section" id="tab-guild">
                                                            <style>
                                                                .guild-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:24px; flex-wrap:wrap; gap:16px; max-width: 900px; margin-left: auto; margin-right: auto; }
                                                                .guild-header-left { display:flex; align-items:center; gap:14px; }
                                                                .guild-header-icon { width:48px; height:48px; border-radius:14px; display:flex; align-items:center; justify-content:center; font-size:24px; background:linear-gradient(135deg, rgba(245,158,11,0.15), rgba(234,88,12,0.08)); border:1px solid rgba(245,158,11,0.2); }
                                                                .guild-header-text h2 { font-size:18px; font-weight:700; margin:0; color:var(--text-primary); }
                                                                .guild-header-text p { font-size:12px; color:var(--text-secondary); margin:2px 0 0; }
                                                                .guild-ranks-grid { display:flex; flex-direction:column; gap:24px; max-width: 900px; margin: 0 auto; }
                                                                .guild-rank-card { background:var(--bg-secondary); border:1px solid var(--border); border-radius:14px; overflow:hidden; transition:all 0.2s; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
                                                                .guild-rank-card:hover { border-color:rgba(255,255,255,0.12); transform:translateY(-1px); box-shadow:0 10px 25px -5px rgba(0,0,0,0.2); }
                                                                .rank-card-head { display:flex; align-items:center; justify-content:space-between; padding:16px 20px; border-bottom:1px solid var(--border); background:rgba(0,0,0,0.1); }
                                                                .rank-badge { font-size:13px; font-weight:800; padding:4px 14px; border-radius:20px; letter-spacing:1px; }
                                                                .rank-badge-F { background:rgba(148,163,184,0.15); color:#94a3b8; border:1px solid rgba(148,163,184,0.25); }
                                                                .rank-badge-E { background:rgba(34,197,94,0.12); color:#4ade80; border:1px solid rgba(34,197,94,0.2); }
                                                                .rank-badge-D { background:rgba(59,130,246,0.12); color:#60a5fa; border:1px solid rgba(59,130,246,0.2); }
                                                                .rank-badge-C { background:rgba(168,85,247,0.12); color:#c084fc; border:1px solid rgba(168,85,247,0.2); }
                                                                .rank-badge-B { background:rgba(236,72,153,0.12); color:#f472b6; border:1px solid rgba(236,72,153,0.2); }
                                                                .rank-badge-A { background:rgba(245,158,11,0.12); color:#fbbf24; border:1px solid rgba(245,158,11,0.2); }
                                                                .rank-badge-S { background:rgba(239,68,68,0.12); color:#f87171; border:1px solid rgba(239,68,68,0.25); }
                                                                .rank-badge-SS { background:linear-gradient(135deg, rgba(239,68,68,0.15), rgba(245,158,11,0.15)); color:#fb923c; border:1px solid rgba(251,146,60,0.3); }
                                                                .rank-badge-SSS { background:linear-gradient(135deg, rgba(234,179,8,0.2), rgba(245,158,11,0.15)); color:#facc15; border:1px solid rgba(250,204,21,0.35); text-shadow:0 0 8px rgba(250,204,21,0.3); }
                                                                .rank-xp-tag { font-size:12px; color:var(--text-secondary); display:flex; align-items:center; gap:6px; }
                                                                .rank-xp-tag span { font-weight:600; color:var(--text-primary); }
                                                                .rank-card-body { padding:20px; display:flex; flex-direction:column; gap:16px; }
                                                                .rank-field-row { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
                                                                .rank-field { display:flex; flex-direction:column; gap:6px; }
                                                                .rank-field label { font-size:11px; font-weight:600; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.5px; }
                                                                .rank-field input { background:var(--bg-primary); border:1px solid var(--border); color:var(--text-primary); border-radius:8px; padding:9px 12px; font-size:13px; width:100%; box-sizing:border-box; transition:border-color 0.15s; }
                                                                .rank-field input:focus { outline:none; border-color:rgba(245,158,11,0.5); }
                                                                .rank-range { display:flex; align-items:center; gap:8px; }
                                                                .rank-range input { flex:1; }
                                                                .rank-range-sep { color:var(--text-secondary); font-size:14px; font-weight:600; }
                                                                .rank-res-section { border-top:1px solid var(--border); padding-top:16px; margin-top:8px; }
                                                                .rank-res-label { font-size:11px; font-weight:600; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:10px; display:flex; align-items:center; justify-content:space-between; }
                                                                .rank-res-grid { display:grid; grid-template-columns:repeat(4, 1fr); gap:6px; max-height:160px; overflow-y:auto; background:var(--bg-primary); padding:12px; border-radius:8px; border:1px solid var(--border); }
                                                                .rank-res-grid::-webkit-scrollbar { width:6px; }
                                                                .rank-res-grid::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1); border-radius:3px; }
                                                                .rank-res-item { display:flex; align-items:center; gap:6px; padding:4px 8px; border-radius:6px; cursor:pointer; transition:background 0.15s; font-size:12px; color:var(--text-secondary); }
                                                                .rank-res-item:hover { background:rgba(255,255,255,0.04); }
                                                                .rank-res-item input[type="checkbox"] { width:14px; height:14px; accent-color:#f59e0b; cursor:pointer; }
                                                                .rank-res-item input:checked + span { color:var(--text-primary); font-weight: 500; }
                                                                .guild-save-bar { margin-top:24px; padding:20px; background:var(--bg-secondary); border-radius:12px; border:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; max-width: 900px; margin-left: auto; margin-right: auto; }
                                                                .guild-save-hint { font-size:13px; color:var(--text-secondary); }
                                                            </style>

                                                            <form action="/mining-config/guild/update" method="POST">
                                                                <div class="guild-header">
                                                                    <div class="guild-header-left">
                                                                        <div class="guild-header-icon">📋</div>
                                                                        <div class="guild-header-text">
                                                                            <h2>Daily Quest Settings</h2>
                                                                            <p>Configure rank requirements, quest count, rewards, and shard drops for each quest rank tier</p>
                                                                        </div>
                                                                    </div>
                                                                    <div style="display:flex; align-items:center; gap:16px;">
                                                                        <div class="rank-field" style="background:var(--bg-secondary); padding:10px 16px; border-radius:10px; border:1px solid var(--border); margin:0;">
                                                                            <label>⏱️ Quest Refresh Interval (Hours)</label>
                                                                            <div style="display:flex; align-items:center; gap:8px;">
                                                                                <input type="number" name="questRefreshHours" value="${(mc.guildSettings && mc.guildSettings.questRefreshHours) || 24}" min="1" max="168" style="width:80px; padding:6px 10px;">
                                                                                <span style="font-size:12px; color:var(--text-secondary);">hours</span>
                                                                            </div>
                                                                        </div>
                                                                        <button type="submit" class="btn btn-primary" style="padding: 12px 20px;">💾 Save All Ranks</button>
                                                                    </div>
                                                                </div>

                                                                <div class="guild-ranks-grid">
                                                                    ${(() => {
                const rankColors = { F: '#94a3b8', E: '#4ade80', D: '#60a5fa', C: '#c084fc', B: '#f472b6', A: '#fbbf24', S: '#f87171', SS: '#fb923c', SSS: '#facc15' };
                return ['F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'].map(rankName => {
                    const rd = ((mc.guildSettings && mc.guildSettings.ranks) ? mc.guildSettings.ranks.find(r => r.name === rankName) : null) || {};
                    return `
                        <div class="guild-rank-card" style="border-top:2px solid ${rankColors[rankName]}22;">
                            <div class="rank-card-head">
                                <span class="rank-badge rank-badge-${rankName}">RANK ${rankName}</span>
                                <div class="rank-xp-tag">⭐ Req: <span><input type="number" name="reqXp_${rankName}" value="${rd.requiredXp || 0}" style="width:65px;padding:3px 6px;font-size:12px;background:var(--bg-primary);border:1px solid var(--border);color:${rankColors[rankName]};border-radius:6px;font-weight:700;text-align:center;"> XP</span></div>
                            </div>
                            <div class="rank-card-body">
                                <div class="rank-field-row">
                                    <div class="rank-field">
                                        <label>📋 Daily Quests</label>
                                        <input type="number" name="questCount_${rankName}" value="${rd.questCount || 3}" min="1" max="10">
                                    </div>
                                    <div class="rank-field">
                                        <label>✨ Reward Multiplier</label>
                                        <input type="number" name="mult_${rankName}" value="${rd.rewardMultiplier || 1}" step="0.1">
                                    </div>
                                </div>
                                <div class="rank-field">
                                    <label>📦 Quest Quantity Range</label>
                                    <div class="rank-range">
                                        <input type="number" name="minQ_${rankName}" value="${rd.minQuantity || 10}">
                                        <span class="rank-range-sep">—</span>
                                        <input type="number" name="maxQ_${rankName}" value="${rd.maxQuantity || 100}">
                                    </div>
                                </div>
                                <div class="rank-field">
                                    <label>🏅 Guild XP Reward Range</label>
                                    <div class="rank-range">
                                        <input type="number" name="xpMin_${rankName}" value="${rd.xpRewardMin || 10}">
                                        <span class="rank-range-sep">—</span>
                                        <input type="number" name="xpMax_${rankName}" value="${rd.xpRewardMax || 50}">
                                    </div>
                                </div>
                                <div class="rank-field">
                                    <label>💎 Gem Reward Range</label>
                                    <div class="rank-range">
                                        <input type="number" name="gemRMin_${rankName}" value="${rd.gemRewardMin || 0}">
                                        <span class="rank-range-sep">—</span>
                                        <input type="number" name="gemRMax_${rankName}" value="${rd.gemRewardMax || 2}">
                                    </div>
                                </div>
                                <div class="rank-field">
                                    <label>💠 Shard Reward Range</label>
                                    <div class="rank-range">
                                        <input type="number" name="shardRMin_${rankName}" value="${rd.shardRewardMin || 0}" min="0">
                                        <span class="rank-range-sep">—</span>
                                        <input type="number" name="shardRMax_${rankName}" value="${rd.shardRewardMax || 0}" min="0">
                                    </div>
                                </div>
                                <div class="rank-res-section">
                                    <div class="rank-res-label">
                                        <span>⛏️ Allowed Resources</span>
                                        <span style="font-size:9px;font-weight:400;opacity:0.6;">${(rd.allowedResources || []).length}/${mc.resources.length} selected</span>
                                    </div>
                                    <div class="rank-res-grid">
                                        ${mc.resources.map(r => {
                        const isChecked = rd.allowedResources && rd.allowedResources.includes(r.name) ? 'checked' : '';
                        return `<label class="rank-res-item"><input type="checkbox" name="allowedRes_${rankName}" value="${r.name}" ${isChecked}><span>${r.emoji || ''} ${r.name}</span></label>`;
                    }).join('')}
                                    </div>
                                </div>
                            </div>
                        </div>`;
                }).join('');
            })()}
                                                                </div>

                                                                <div class="guild-save-bar">
                                                                    <div class="guild-save-hint">💡 Changes apply to all ranks at once. Quest generation uses these settings.</div>
                                                                    <div style="display:flex; gap:12px;">
                                                                        <button type="submit" class="btn btn-primary">💾 Save Quest Settings</button>
                                                                        <button type="button" onclick="if(confirm('This will wipe all active personal quests securely so the bot generates new ones for everyone. Proceed?')) { document.getElementById('resetIndividualQuestsForm').submit(); }" class="btn btn-secondary" style="background:var(--bg-tertiary); border-color:rgba(239,68,68,0.5); color:#f87171;">🔄 Force Regenerate Quests</button>
                                                                    </div>
                                                                </div>
                                                            </form>
                                                            <form id="resetIndividualQuestsForm" action="/mining-config/guild/reset-quests" method="POST" style="display:none;"></form>

                                                        </div>

                                                        <!-- TAB: Shop Items -->
                                                        <div class="tab-section" id="tab-shop">
                                                            <!-- Info banner -->
                                                            <div style="background:var(--bg-tertiary);border:1px solid var(--border);border-radius:10px;padding:14px 18px;margin-bottom:18px;font-size:13px;color:var(--text-secondary);">
                                                                <b style="color:var(--text-primary);">💡 Tipe Boost Global:</b>
                                                                &nbsp; ⚡ <b>speed</b> = cooldown lebih cepat &nbsp;|&nbsp;
                                                                💰 <b>sell_price</b> = harga jual naik &nbsp;|&nbsp;
                                                                📦 <b>backpack</b> = kapasitas BP naik &nbsp;|&nbsp;
                                                                🎲 <b>drop</b> = drop rate naik
                                                            </div>
                                                            <div class="card">
                                                                <div class="card-header">
                                                                    <div><div class="card-title">🛒 Shop Items (${(mc.shopItems || []).length})</div></div>
                                                                    <button onclick="document.getElementById('addShopForm').style.display=document.getElementById('addShopForm').style.display==='none'?'block':'none'" class="btn btn-secondary">+ Add Item</button>
                                                                </div>
                                                                <div id="addShopForm" style="display:none;padding:20px;background:var(--bg-tertiary);border-bottom:1px solid var(--border);">
                                                                    <form action="/mining-config/shop/add" method="POST">
                                                                        <div class="grid grid-4" style="gap:12px;margin-bottom:12px;">
                                                                            <div class="form-group"><label class="form-label">ID (unik)</label><input type="text" name="id" placeholder="speed_x2" class="form-input" required></div>
                                                                            <div class="form-group"><label class="form-label">Nama</label><input type="text" name="name" placeholder="Speed Boost x2" class="form-input" required></div>
                                                                            <div class="form-group"><label class="form-label">Emoji</label><input type="text" name="emoji" placeholder="⚡" class="form-input" required></div>
                                                                            <div class="form-group"><label class="form-label">Deskripsi</label><input type="text" name="description" placeholder="Cooldown 2× untuk semua" class="form-input" required></div>
                                                                        </div>
                                                                        <div class="grid grid-5" style="gap:12px;margin-bottom:12px;">
                                                                            <div class="form-group"><label class="form-label">Harga</label><input type="number" name="price" placeholder="50" class="form-input" required></div>
                                                                            <div class="form-group"><label class="form-label">Mata Uang</label><select name="currency" class="form-input"><option value="gems">Gems 💎</option><option value="minecon">Minecon 🪙</option></select></div>
                                                                            <div class="form-group"><label class="form-label">Tipe Boost</label>
                                                                                <select name="boostType" class="form-input" required>
                                                                                    <option value="speed">⚡ speed</option>
                                                                                    <option value="sell_price">💰 sell_price</option>
                                                                                    <option value="backpack">📦 backpack</option>
                                                                                    <option value="drop">🎲 drop</option>
                                                                                </select>
                                                                            </div>
                                                                            <div class="form-group"><label class="form-label">Multiplier (×)</label><input type="number" name="multiplier" placeholder="2" step="0.1" min="1" class="form-input" required></div>
                                                                            <div class="form-group"><label class="form-label">Durasi (menit)</label><input type="number" name="durationMinutes" placeholder="30" class="form-input" required></div>
                                                                        </div>
                                                                        <div style="margin-bottom:12px;"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;"><input type="checkbox" name="isGlobal" checked> <span>Global Boost (berpengaruh ke SEMUA pemain)</span></label></div>
                                                                        <div style="display:flex;gap:8px;">
                                                                            <button type="submit" class="btn btn-primary">✅ Add Item</button>
                                                                            <button type="button" onclick="document.getElementById('addShopForm').style.display='none'" class="btn btn-secondary">Batal</button>
                                                                        </div>
                                                                    </form>
                                                                </div>
                                                                <div class="table-container responsive-table">
                                                                    <table class="table">
                                                                        <thead><tr><th>#</th><th>Item</th><th>Harga</th><th>Tipe</th><th>Multiplier</th><th>Durasi</th><th>Scope</th><th>Aksi</th></tr></thead>
                                                                        <tbody>
                                                                        ${(mc.shopItems || []).length === 0
                                                                            ? '<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--text-secondary);">🚧 Belum ada item di shop</td></tr>'
                                                                            : (mc.shopItems || []).map((i, idx) => {
                                                                                const typeIcon = i.boostType==='speed'?'⚡':i.boostType==='sell_price'?'💰':i.boostType==='backpack'?'📦':i.boostType==='drop'?'🎲':'🌟';
                                                                                const typeBg   = i.boostType==='speed'?'#3b82f622':i.boostType==='sell_price'?'#22c55e22':i.boostType==='backpack'?'#a855f722':'#f59e0b22';
                                                                                const typeCol  = i.boostType==='speed'?'#60a5fa':i.boostType==='sell_price'?'#4ade80':i.boostType==='backpack'?'#c084fc':'#fbbf24';
                                                                                return `<tr>
                                                                                    <td data-label="#" style="color:var(--text-secondary);font-size:12px;">[${idx+1}]</td>
                                                                                    <td data-label="Item"><b>${i.emoji}</b> ${i.name}</td>
                                                                                    <td data-label="Harga">${i.currency==='gems'?'💎':'🪙'} ${i.price}</td>
                                                                                    <td data-label="Tipe"><span style="background:${typeBg};color:${typeCol};padding:2px 8px;border-radius:99px;font-size:12px;font-weight:600;">${typeIcon} ${i.boostType}</span></td>
                                                                                    <td data-label="Multiplier" style="font-weight:700;">×${i.multiplier}</td>
                                                                                    <td data-label="Durasi">${i.durationMinutes} mnt</td>
                                                                                    <td data-label="Scope"><span class="badge badge-${i.isGlobal?'warning':'success'}">${i.isGlobal?'Global':'Personal'}</span></td>
                                                                                    <td data-label="Aksi" style="white-space:nowrap;display:flex;gap:4px;">
                                                                                        <button onclick="openEditShop('${i.id}','${i.name}','${i.emoji}','${i.description}',${i.price},'${i.currency}','${i.boostType}',${i.multiplier},${i.durationMinutes},${i.isGlobal})" class="btn btn-secondary" style="padding:4px 10px;font-size:12px;">✏️ Edit</button>
                                                                                        <form action="/mining-config/shop/delete" method="POST" style="display:inline;" onsubmit="return confirm('Hapus item ini?')"><input type="hidden" name="id" value="${i.id}"><button type="submit" class="btn btn-secondary" style="padding:4px 10px;font-size:12px;">🗑️</button></form>
                                                                                    </td>
                                                                                </tr>`;}).join('')
                                                                        }
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            </div>
                                                        </div>
    
                                                                                    <div id="editShopModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:1000;align-items:center;justify-content:center;" onclick="if(event.target===this)this.style.display='none'">
                                                                                        <div style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:16px;padding:24px;width:90%;max-width:560px;">
                                                                                            <div style="font-size:18px;font-weight:600;margin-bottom:20px;">✏️ Edit Shop Item</div>
                                                                                            <form action="/mining-config/shop/edit" method="POST">
                                                                                                <input type="hidden" name="originalId" id="editShopOrig">
                                                                                                <div class="grid grid-2" style="gap:12px;margin-bottom:12px;">
                                                                                                    <div class="form-group"><label class="form-label">ID</label><input type="text" name="id" id="editShopId" class="form-input" required></div>
                                                                                                    <div class="form-group"><label class="form-label">Nama</label><input type="text" name="name" id="editShopName" class="form-input" required></div>
                                                                                                </div>
                                                                                                <div class="grid grid-2" style="gap:12px;margin-bottom:12px;">
                                                                                                    <div class="form-group"><label class="form-label">Emoji</label><input type="text" name="emoji" id="editShopEmoji" class="form-input" required></div>
                                                                                                    <div class="form-group"><label class="form-label">Deskripsi</label><input type="text" name="description" id="editShopDesc" class="form-input" required></div>
                                                                                                </div>
                                                                                                <div class="grid grid-2" style="gap:12px;margin-bottom:12px;">
                                                                                                    <div class="form-group"><label class="form-label">Harga</label><input type="number" name="price" id="editShopPrice" class="form-input" required></div>
                                                                                                    <div class="form-group"><label class="form-label">Mata Uang</label><select name="currency" id="editShopCurr" class="form-input"><option value="gems">Gems 💎</option><option value="minecon">Minecon 🪙</option></select></div>
                                                                                                </div>
                                                                                                <div class="grid grid-3" style="gap:12px;margin-bottom:12px;">
                                                                                                    <div class="form-group"><label class="form-label">Tipe Boost</label>
                                                                                                        <select name="boostType" id="editShopType" class="form-input" required>
                                                                                                            <option value="speed">⚡ speed</option>
                                                                                                            <option value="sell_price">💰 sell_price</option>
                                                                                                            <option value="backpack">📦 backpack</option>
                                                                                                            <option value="drop">🎲 drop</option>
                                                                                                        </select>
                                                                                                    </div>
                                                                                                    <div class="form-group"><label class="form-label">Multiplier (×)</label><input type="number" name="multiplier" id="editShopMulti" step="0.1" min="1" class="form-input" required></div>
                                                                                                    <div class="form-group"><label class="form-label">Durasi (menit)</label><input type="number" name="durationMinutes" id="editShopDur" class="form-input" required></div>
                                                                                                </div>
                                                                                                <div class="form-group" style="margin-bottom:16px;"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;"><input type="checkbox" name="isGlobal" id="editShopGlobal"> Global Boost (berpengaruh ke semua pemain)</label></div>
                                                                                                <div style="display:flex;gap:8px;"><button type="submit" class="btn btn-primary">💾 Simpan</button><button type="button" onclick="document.getElementById('editShopModal').style.display='none'" class="btn btn-secondary">Batal</button></div>
                                                                                            </form>
                                                                                        </div>
                                                                                    </div>
    
                                                                                    <!-- TAB: Players -->
                                                                                    <div class="tab-section" id="tab-users">
                                                                                        <div class="card">
                                                                                            <div class="card-header"><div><div class="card-title">👥 Mining Players (${players.length})</div></div></div>
                                                                                            <div class="table-container responsive-table">
                                                                                                <table class="table">
                                                                                                    <thead><tr><th>Phone</th><th>Rebirth</th><th>Pick Lv</th><th>BP Lv</th><th>🪙 Minecon</th><th>💎 Gems</th><th>RP</th><th>🐾 Pets</th><th>💠 Shards</th><th>📋 Quest</th><th>Aksi</th></tr></thead>
                                                                                                    <tbody>
                                                                                                    ${players.map(p => `<tr>
                                                                                                        <td data-label="Phone" style="font-size:12px;word-break:break-all;">${p.phoneNumber}</td>
                                                                                                        <td data-label="Rebirth"><b>R${p.rebirthCount||0}</b></td>
                                                                                                        <td data-label="Pick Lv">Lv.${p.pickaxeLevel||1}</td>
                                                                                                        <td data-label="BP Lv">Lv.${p.backpackLevel||1}</td>
                                                                                                        <td data-label="Minecon">🪙 ${(p.minecon||0).toLocaleString()}</td>
                                                                                                        <td data-label="Gems">💎 ${(p.gems||0).toLocaleString()}</td>
                                                                                                        <td data-label="RP">${p.rebirthPoints||0} RP</td>
                                                                                                        <td data-label="Pets" style="font-weight:600;">${(p.pets||[]).length}</td>
                                                                                                        <td data-label="Shards">💠 ${(p.petShards||0).toLocaleString()}</td>
                                                                                                        <td data-label="Quest" style="font-size:12px;">${(p.quest&&p.quest.rank)||'F'} <span style="opacity:0.5;">(${(p.quest&&p.quest.completedTotal)||0})</span></td>
                                                                                                        <td data-label="Aksi" style="white-space:nowrap;display:flex;gap:4px;flex-wrap:wrap;">
                                                                                                            <button onclick="openEditPlayer('${p.phoneNumber}',${p.minecon||0},${p.gems||0},${p.pickaxeLevel||1},${p.backpackLevel||1},${p.rebirthCount||0},${p.rebirthPoints||0},${p.level||1},${p.xp||0})" class="btn btn-secondary" style="padding:4px 10px;font-size:12px;" title="Edit">✏️ Edit</button>
                                                                                                            <form action="/mining-config/player/reset" method="POST" style="display:inline;" onsubmit="return confirm('Reset player ini? Semua progress akan direset.')"><input type="hidden" name="phoneNumber" value="${p.phoneNumber}"><button type="submit" class="btn btn-secondary" style="padding:4px 10px;font-size:12px;" title="Reset">🔄 Reset</button></form>
                                                                                                            <form action="/mining-config/player/delete" method="POST" style="display:inline;" onsubmit="return confirm('HAPUS player ini? Tidak bisa diundo!')"><input type="hidden" name="phoneNumber" value="${p.phoneNumber}"><button type="submit" class="btn btn-secondary" style="padding:4px 10px;font-size:12px;" title="Hapus">🗑️</button></form>
                                                                                                        </td>
                                                                                                    </tr>`).join('')}
                                                                                                    </tbody>
                                                                                                </table>
                                                                                            </div>
                                                                                        </div>

                                                                                        <!-- Edit Player Modal -->
                                                                                        <div id="editPlayerModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:1000;align-items:center;justify-content:center;" onclick="if(event.target===this)this.style.display='none'">
                                                                                            <div style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:16px;padding:28px;width:90%;max-width:540px;">
                                                                                                <div style="font-size:18px;font-weight:700;margin-bottom:6px;">✏️ Edit Player</div>
                                                                                                <div id="editPlayerPhone" style="font-size:13px;color:var(--text-secondary);margin-bottom:20px;"></div>
                                                                                                <form action="/mining-config/player/edit" method="POST">
                                                                                                    <input type="hidden" name="phoneNumber" id="editPlayerPhoneInput">
                                                                                                    <div class="grid grid-2" style="gap:14px;margin-bottom:14px;">
                                                                                                        <div class="form-group"><label class="form-label">🪙 Minecon (MC)</label><input type="number" name="minecon" id="epMinecon" class="form-input" min="0"></div>
                                                                                                        <div class="form-group"><label class="form-label">💎 Gems</label><input type="number" name="gems" id="epGems" class="form-input" min="0"></div>
                                                                                                    </div>
                                                                                                    <div class="grid grid-2" style="gap:14px;margin-bottom:14px;">
                                                                                                        <div class="form-group"><label class="form-label">⛏️ Pickaxe Level (1–250)</label><input type="number" name="pickaxeLevel" id="epPickaxe" class="form-input" min="1" max="250"></div>
                                                                                                        <div class="form-group"><label class="form-label">📦 BP Level (1–250)</label><input type="number" name="backpackLevel" id="epBP" class="form-input" min="1" max="250"></div>
                                                                                                    </div>
                                                                                                    <div class="grid grid-3" style="gap:14px;margin-bottom:14px;">
                                                                                                        <div class="form-group"><label class="form-label">🔄 Rebirth Count</label><input type="number" name="rebirthCount" id="epRebirth" class="form-input" min="0"></div>
                                                                                                        <div class="form-group"><label class="form-label">⚡ Rebirth Points</label><input type="number" name="rebirthPoints" id="epRP" class="form-input" min="0"></div>
                                                                                                        <div class="form-group"><label class="form-label">🏅 Level</label><input type="number" name="level" id="epLevel" class="form-input" min="1"></div>
                                                                                                    </div>
                                                                                                    <div style="display:flex;gap:10px;margin-top:6px;">
                                                                                                        <button type="submit" class="btn btn-primary">💾 Simpan</button>
                                                                                                        <button type="button" onclick="document.getElementById('editPlayerModal').style.display='none'" class="btn btn-secondary">Batal</button>
                                                                                                    </div>
                                                                                                </form>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
    
                                                                                    <!-- TAB: Boosts -->
                                                                                    <div class="tab-section" id="tab-boosts">
                                                                                        <div class="card">
                                                                                            <div class="card-header"><div><div class="card-title">🚀 Active Global Boosts (${(mc.globalBoosts || []).length})</div></div></div>
                                                                                            ${(mc.globalBoosts || []).length === 0
                                                                                                ? '<div style="padding:40px;text-align:center;color:var(--text-secondary);">✅ Tidak ada global boost yang aktif saat ini</div>'
                                                                                                : `<div class="table-container responsive-table"><table class="table">
                                                                                                        <thead><tr><th>Tipe</th><th>Efek</th><th>Multiplier</th><th>Sisa Waktu</th><th>Expires</th><th>Aktivator</th><th>Aksi</th></tr></thead>
                                                                                                        <tbody>
                                                                                                        ${(mc.globalBoosts || []).map((b, i) => {
                                                                                                            const typeIcon  = b.type==='speed'?'⚡':b.type==='sell_price'?'💰':b.type==='backpack'?'📦':b.type==='drop'?'🎲':'🌟';
                                                                                                            const typeLabel = b.type==='speed'?'Mining Speed':b.type==='sell_price'?'Harga Jual':b.type==='backpack'?'Kapasitas BP':b.type==='drop'?'Drop Rate':b.type;
                                                                                                            const multi     = b.speedMultiplier>1?b.speedMultiplier:b.sellMultiplier>1?b.sellMultiplier:b.bpMultiplier>1?b.bpMultiplier:b.dropMultiplier>1?b.dropMultiplier:1;
                                                                                                            const msLeft    = new Date(b.expiresAt) - new Date();
                                                                                                            const minsLeft  = Math.max(0, Math.ceil(msLeft/60000));
                                                                                                            return `<tr>
                                                                                                                <td data-label="Tipe">${typeIcon} <b>${b.type}</b></td>
                                                                                                                <td data-label="Efek">${typeLabel}</td>
                                                                                                                <td data-label="Multiplier" style="font-weight:700;color:#60a5fa;">×${multi}</td>
                                                                                                                <td data-label="Sisa Waktu"><span style="color:${minsLeft<5?'#ef4444':'#4ade80'};font-weight:600;">⏳ ${minsLeft} mnt</span></td>
                                                                                                                <td data-label="Expires" style="font-size:12px;color:var(--text-secondary);">${new Date(b.expiresAt).toLocaleString('id-ID')}</td>
                                                                                                                <td data-label="Aktivator" style="font-size:12px;">${b.activatedBy||'-'}</td>
                                                                                                                <td data-label="Aksi"><form action="/mining-config/boost/delete" method="POST" style="display:inline;" onsubmit="return confirm('Hapus boost ini?')"><input type="hidden" name="index" value="${i}"><button type="submit" class="btn btn-secondary" style="padding:4px 10px;font-size:12px;">🗑️ Hapus</button></form></td>
                                                                                                            </tr>`;
                                                                                                        }).join('')}
                                                                                                        </tbody>
                                                                                                    </table></div>`
                                                                                            }
                                                                                        </div>
                                                                                    </div>
    
                                                                                    <!-- TAB: Pets Catalog -->
                                                                                    <div class="tab-section" id="tab-pets">
                                                                                        <div class="card">
                                                                                            <div class="card-header">
                                                                                                <div><div class="card-title">🐾 Pet System</div><div style="font-size:13px;color:var(--text-secondary);">Total ${PET_LIST.length} pet tersedia | Auto-aktif saat dimiliki | Max Lv.10</div></div>
                                                                                            </div>
                                                                                            <div style="padding:16px 20px 20px;">
                                                                                                <!-- Player pet summary -->
                                                                                                ${players.some(p => (p.pets||[]).length > 0) ? `
                                                                                                <div style="margin-bottom:20px;">
                                                                                                    <div style="font-weight:700;margin-bottom:10px;">📊 Kepemilikan Pet Per Player</div>
                                                                                                    <div class="table-container responsive-table">
                                                                                                    <table class="table">
                                                                                                        <thead><tr><th>Phone</th><th>Total Pet</th><th>💠 Shards</th><th>Pet Dimiliki</th></tr></thead>
                                                                                                        <tbody>
                                                                                                        ${players.filter(p => (p.pets||[]).length > 0 || (p.petShards||0) > 0).map(p => {
                                                                                                            const petList = (p.pets||[]).map(op => {
                                                                                                                const def = PET_LIST.find(x => x.id === op.id);
                                                                                                                return def ? `${def.emoji}${def.name}(Lv.${op.level})` : op.id;
                                                                                                            }).join(', ');
                                                                                                            return `<tr>
                                                                                                                <td data-label="Phone" style="font-size:12px;">${p.phoneNumber}</td>
                                                                                                                <td data-label="Total Pet" style="font-weight:700;">${(p.pets||[]).length}</td>
                                                                                                                <td data-label="Shards">💠 ${(p.petShards||0).toLocaleString()}</td>
                                                                                                                <td data-label="Pet" style="font-size:11px;color:var(--text-secondary);">${petList || '-'}</td>
                                                                                                            </tr>`;
                                                                                                        }).join('')}
                                                                                                        </tbody>
                                                                                                    </table>
                                                                                                    </div>
                                                                                                </div>` : '<div style="padding:10px 0 18px;color:var(--text-secondary);font-size:13px;">Belum ada player yang memiliki pet.</div>'}
                                                                                                <!-- Pet catalog by rarity -->
                                                                                                <div style="font-weight:700;margin-bottom:12px;">📖 Katalog Pet (${PET_LIST.length} total)</div>
                                                                                                ${['legendary','mythical','epic','rare','uncommon','common'].map(rarity => {
                                                                                                    const rar = RARITY_CONFIG[rarity];
                                                                                                    const petsInTier = PET_LIST.filter(p => p.rarity === rarity);
                                                                                                    return `<div style="margin-bottom:14px;border:1px solid var(--border);border-radius:10px;overflow:hidden;">
                                                                                                        <div style="background:var(--bg-secondary);padding:8px 14px;font-weight:700;display:flex;align-items:center;gap:8px;">
                                                                                                            <span>${rar.badge}</span>
                                                                                                            <span style="font-size:12px;color:var(--text-secondary);">Chance: ${rar.chance}% | Upgrade: ${rar.upgradeCost} shard/lv | Dupe: ${rar.shards} shard</span>
                                                                                                        </div>
                                                                                                        <div style="padding:10px 14px;display:flex;flex-wrap:wrap;gap:8px;">
                                                                                                        ${petsInTier.map(p => {
                                                                                                            const perLv  = getStatDescription(p, 1);
                                                                                                            const maxBon = getStatDescription(p, 10);
                                                                                                            return `<div style="background:var(--bg-primary);border:1px solid var(--border);border-radius:8px;padding:8px 12px;min-width:190px;max-width:240px;">
                                                                                                            <div style="font-size:17px;display:flex;align-items:center;gap:6px;">${p.emoji} <b>${p.name}</b> <code style="font-size:11px;background:var(--bg-secondary);padding:1px 5px;border-radius:4px;">${p.shortcode}</code></div>
                                                                                                            <div style="font-size:12px;color:#60a5fa;margin-top:5px;font-weight:600;">${perLv} <span style="color:var(--text-secondary);font-weight:400;">/ lv</span></div>
                                                                                                            <div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">Max Lv.10 → ${maxBon}</div>
                                                                                                        </div>`;
                                                                                                        }).join('')}
                                                                                                        </div>
                                                                                                    </div>`;
                                                                                                }).join('')}
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>

                                                                                </div><!-- Close content -->
                                                                                `;
        } catch (error) {
            logger.error('Failed to render Mining Config page:', error);
            return `
                <div style="padding:60px;text-align:center;">
                    <h2 style="color:#ef4444;">⚠️ Error Loading Mining Config</h2>
                    <p style="color:var(--text-secondary);margin-top:12px;">${error.message || 'Unknown error occurred'}</p>
                    <a href="/mining-config" class="btn btn-primary" style="margin-top:20px;display:inline-block;padding:10px 20px;text-decoration:none;">🔄 Retry</a>
                </div>`;
        }
    }
};
