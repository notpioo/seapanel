/**
 * RPG Content Seed Script
 * Mengisi konten RPG: Musuh, Item, Hero, Recipe, Chapter & Stage
 * 5 Chapter x 25 Stage = 125 Stage total
 */

require('dotenv').config();
const db = require('../src/utils/database');
const { RPGEnemy, RPGItem, RPGHero, RPGRecipe, RPGChapter } = require('../src/models');

// ═══════════════════════════════════════════════════════════
// ENEMIES (25 musuh: 4 biasa + 1 boss per chapter)
// ═══════════════════════════════════════════════════════════
const enemies = [
    // Chapter 1 - Hutan
    { enemyId: 'slime',        name: 'Slime',         hp: 80,  atk: 8,  exp: 0, gold: 0, drop: 'slimeball:30',     isBoss: false },
    { enemyId: 'bat',          name: 'Kelelawar',     hp: 90,  atk: 9,  exp: 0, gold: 0, drop: 'bat_wing:25',      isBoss: false },
    { enemyId: 'wolf',         name: 'Serigala',      hp: 110, atk: 12, exp: 0, gold: 0, drop: 'wolf_fang:20',     isBoss: false },
    { enemyId: 'goblin',       name: 'Goblin',        hp: 120, atk: 13, exp: 0, gold: 0, drop: 'goblin_ear:20',    isBoss: false },
    { enemyId: 'goblin_chief', name: 'Kepala Goblin', hp: 420, atk: 22, exp: 0, gold: 0, drop: 'goblin_ear:100,goblin_crown:60', isBoss: true },

    // Chapter 2 - Reruntuhan
    { enemyId: 'skeleton',    name: 'Skeleton',     hp: 220, atk: 22, exp: 0, gold: 0, drop: 'bone_shard:28',     isBoss: false },
    { enemyId: 'zombie',      name: 'Zombie',       hp: 250, atk: 20, exp: 0, gold: 0, drop: 'zombie_flesh:25',   isBoss: false },
    { enemyId: 'dark_knight', name: 'Dark Knight',  hp: 280, atk: 25, exp: 0, gold: 0, drop: 'iron_fragment:20',  isBoss: false },
    { enemyId: 'wraith',      name: 'Wraith',       hp: 260, atk: 27, exp: 0, gold: 0, drop: 'dark_essence:15',   isBoss: false },
    { enemyId: 'lich',        name: 'Lich',         hp: 900, atk: 38, exp: 0, gold: 0, drop: 'dark_essence:100,lich_core:60', isBoss: true },

    // Chapter 3 - Vulkanik
    { enemyId: 'fire_imp',      name: 'Fire Imp',      hp: 380, atk: 38, exp: 0, gold: 0, drop: 'fire_shard:25',     isBoss: false },
    { enemyId: 'magma_golem',   name: 'Magma Golem',   hp: 440, atk: 34, exp: 0, gold: 0, drop: 'lava_core:20',      isBoss: false },
    { enemyId: 'flame_serpent', name: 'Flame Serpent', hp: 400, atk: 40, exp: 0, gold: 0, drop: 'serpent_scale:18',  isBoss: false },
    { enemyId: 'lava_demon',    name: 'Lava Demon',    hp: 420, atk: 42, exp: 0, gold: 0, drop: 'demon_horn:15',     isBoss: false },
    { enemyId: 'inferno_lord',  name: 'Inferno Lord',  hp: 1500, atk: 55, exp: 0, gold: 0, drop: 'demon_horn:100,inferno_gem:60', isBoss: true },

    // Chapter 4 - Abyssal
    { enemyId: 'deep_crawler',  name: 'Deep Crawler',  hp: 580, atk: 55, exp: 0, gold: 0, drop: 'claw_fragment:25',   isBoss: false },
    { enemyId: 'sea_witch',     name: 'Sea Witch',     hp: 560, atk: 58, exp: 0, gold: 0, drop: 'witch_tear:20',      isBoss: false },
    { enemyId: 'kraken_spawn',  name: 'Kraken Spawn',  hp: 620, atk: 56, exp: 0, gold: 0, drop: 'tentacle_shard:18',  isBoss: false },
    { enemyId: 'abyssal_shark', name: 'Abyssal Shark', hp: 600, atk: 60, exp: 0, gold: 0, drop: 'shark_tooth:15',     isBoss: false },
    { enemyId: 'kraken',        name: 'Kraken',        hp: 2200, atk: 75, exp: 0, gold: 0, drop: 'kraken_ink:100,shark_tooth:80', isBoss: true },

    // Chapter 5 - Shadow Realm
    { enemyId: 'shadow_fiend',    name: 'Shadow Fiend',    hp: 820,  atk: 78,  exp: 0, gold: 0, drop: 'shadow_dust:25',    isBoss: false },
    { enemyId: 'void_mage',       name: 'Void Mage',       hp: 800,  atk: 82,  exp: 0, gold: 0, drop: 'void_crystal:20',   isBoss: false },
    { enemyId: 'chaos_knight',    name: 'Chaos Knight',    hp: 880,  atk: 80,  exp: 0, gold: 0, drop: 'chaos_shard:18',    isBoss: false },
    { enemyId: 'dark_dragon',     name: 'Dark Dragon',     hp: 860,  atk: 85,  exp: 0, gold: 0, drop: 'dragon_scale:12',   isBoss: false },
    { enemyId: 'shadow_overlord', name: 'Shadow Overlord', hp: 3200, atk: 100, exp: 0, gold: 0, drop: 'shadow_core:100,dragon_scale:80', isBoss: true },
];

// ═══════════════════════════════════════════════════════════
// ITEMS (Material, Weapon, Relic)
// ═══════════════════════════════════════════════════════════
const items = [
    // Materials (drop dari musuh)
    { itemId: 'slimeball',       name: 'Slimeball',        description: 'Lendir dari slime',         price: 5,   type: 'material', atk: 0, hp: 0 },
    { itemId: 'bat_wing',        name: 'Sayap Kelelawar',  description: 'Sayap kelelawar kering',    price: 8,   type: 'material', atk: 0, hp: 0 },
    { itemId: 'wolf_fang',       name: 'Taring Serigala',  description: 'Taring tajam serigala',     price: 12,  type: 'material', atk: 0, hp: 0 },
    { itemId: 'goblin_ear',      name: 'Telinga Goblin',   description: 'Telinga goblin',            price: 10,  type: 'material', atk: 0, hp: 0 },
    { itemId: 'goblin_crown',    name: 'Mahkota Goblin',   description: 'Mahkota goblin chief',      price: 80,  type: 'material', atk: 0, hp: 0 },
    { itemId: 'bone_shard',      name: 'Serpihan Tulang',  description: 'Tulang skeleton',           price: 15,  type: 'material', atk: 0, hp: 0 },
    { itemId: 'zombie_flesh',    name: 'Daging Zombie',    description: 'Daging zombie busuk',       price: 12,  type: 'material', atk: 0, hp: 0 },
    { itemId: 'iron_fragment',   name: 'Serpihan Besi',    description: 'Besi dari dark knight',     price: 20,  type: 'material', atk: 0, hp: 0 },
    { itemId: 'dark_essence',    name: 'Esensi Gelap',     description: 'Esensi dari wraith/lich',   price: 35,  type: 'material', atk: 0, hp: 0 },
    { itemId: 'lich_core',       name: 'Inti Lich',        description: 'Inti kekuatan lich',        price: 150, type: 'material', atk: 0, hp: 0 },
    { itemId: 'fire_shard',      name: 'Serpihan Api',     description: 'Kristal api dari imp',      price: 25,  type: 'material', atk: 0, hp: 0 },
    { itemId: 'lava_core',       name: 'Inti Lava',        description: 'Inti lava dari golem',      price: 40,  type: 'material', atk: 0, hp: 0 },
    { itemId: 'serpent_scale',   name: 'Sisik Ular',       description: 'Sisik flame serpent',       price: 35,  type: 'material', atk: 0, hp: 0 },
    { itemId: 'demon_horn',      name: 'Tanduk Iblis',     description: 'Tanduk lava demon',         price: 50,  type: 'material', atk: 0, hp: 0 },
    { itemId: 'inferno_gem',     name: 'Permata Inferno',  description: 'Permata dari inferno lord', price: 200, type: 'material', atk: 0, hp: 0 },
    { itemId: 'claw_fragment',   name: 'Cakar Abyss',      description: 'Cakar deep crawler',        price: 45,  type: 'material', atk: 0, hp: 0 },
    { itemId: 'witch_tear',      name: 'Air Mata Penyihir',description: 'Tetes air mata sea witch',  price: 55,  type: 'material', atk: 0, hp: 0 },
    { itemId: 'tentacle_shard',  name: 'Serpihan Tentakel',description: 'Potongan tentakel kraken',  price: 50,  type: 'material', atk: 0, hp: 0 },
    { itemId: 'shark_tooth',     name: 'Gigi Hiu',         description: 'Gigi abyssal shark',        price: 60,  type: 'material', atk: 0, hp: 0 },
    { itemId: 'kraken_ink',      name: 'Tinta Kraken',     description: 'Tinta gelap dari Kraken',   price: 250, type: 'material', atk: 0, hp: 0 },
    { itemId: 'shadow_dust',     name: 'Debu Bayangan',    description: 'Debu shadow fiend',         price: 65,  type: 'material', atk: 0, hp: 0 },
    { itemId: 'void_crystal',    name: 'Kristal Void',     description: 'Kristal dari void mage',    price: 80,  type: 'material', atk: 0, hp: 0 },
    { itemId: 'chaos_shard',     name: 'Serpihan Kekacauan',description:'Serpihan chaos knight',     price: 75,  type: 'material', atk: 0, hp: 0 },
    { itemId: 'dragon_scale',    name: 'Sisik Naga',       description: 'Sisik dark dragon',         price: 120, type: 'material', atk: 0, hp: 0 },
    { itemId: 'shadow_core',     name: 'Inti Bayangan',    description: 'Inti shadow overlord',      price: 400, type: 'material', atk: 0, hp: 0 },

    // Weapons (bisa di-craft)
    { itemId: 'rusty_sword',   name: 'Pedang Berkarat',  description: 'Pedang tua tapi masih tajam',    price: 100,  type: 'weapon', atk: 15,  hp: 0 },
    { itemId: 'iron_blade',    name: 'Bilah Besi',       description: 'Pedang besi solid',              price: 300,  type: 'weapon', atk: 35,  hp: 0 },
    { itemId: 'flame_sword',   name: 'Pedang Api',       description: 'Menyala dengan api vulkanik',    price: 700,  type: 'weapon', atk: 70,  hp: 0 },
    { itemId: 'trident',       name: 'Trisula Abyssal',  description: 'Trisula dari kedalaman laut',    price: 1200, type: 'weapon', atk: 100, hp: 0 },
    { itemId: 'void_blade',    name: 'Blade of Void',    description: 'Senjata dari dimensi kegelapan', price: 2000, type: 'weapon', atk: 150, hp: 0 },

    // Relics (bisa di-craft)
    { itemId: 'leather_armor', name: 'Baju Kulit',       description: 'Pelindung kulit dasar',          price: 80,   type: 'relic', atk: 0, hp: 60  },
    { itemId: 'iron_shield',   name: 'Perisai Besi',     description: 'Perisai besi kuat',              price: 220,  type: 'relic', atk: 0, hp: 120 },
    { itemId: 'fire_amulet',   name: 'Jimat Api',        description: 'Amulet terbuat dari api',        price: 500,  type: 'relic', atk: 0, hp: 200 },
    { itemId: 'abyssal_ring',  name: 'Cincin Abyssal',   description: 'Cincin dari kedalaman abyss',    price: 900,  type: 'relic', atk: 0, hp: 280 },
    { itemId: 'shadow_cloak',  name: 'Jubah Bayangan',   description: 'Jubah dari Shadow Realm',        price: 1500, type: 'relic', atk: 0, hp: 400 },
];

// ═══════════════════════════════════════════════════════════
// HEROES (C/R/SR/SSR/UR + clear reward)
// ═══════════════════════════════════════════════════════════
const heroes = [
    // C Rarity (gacha pool)
    { heroId: 'polo',    name: 'Polo',    rarity: 'C',   hp: 30,  atk: 3,  desc: 'Pejuang biasa hutan' },
    { heroId: 'grunt',   name: 'Grunt',   rarity: 'C',   hp: 35,  atk: 2,  desc: 'Petarung tangguh berbadan besar' },
    { heroId: 'scout',   name: 'Scout',   rarity: 'C',   hp: 20,  atk: 5,  desc: 'Pengintai lincah dan cepat' },
    { heroId: 'archer',  name: 'Archer',  rarity: 'C',   hp: 25,  atk: 4,  desc: 'Pemanah dengan bidikan tepat' },

    // R Rarity (gacha pool)
    { heroId: 'mage',    name: 'Mage',    rarity: 'R',   hp: 40,  atk: 8,  desc: 'Penyihir dengan mantra kuat' },
    { heroId: 'knight',  name: 'Knight',  rarity: 'R',   hp: 70,  atk: 5,  desc: 'Ksatria berbaju baja penuh' },
    { heroId: 'ranger',  name: 'Ranger',  rarity: 'R',   hp: 45,  atk: 7,  desc: 'Penjaga hutan yang terampil' },
    { heroId: 'cleric',  name: 'Cleric',  rarity: 'R',   hp: 80,  atk: 3,  desc: 'Penyembuh dengan aura terang' },

    // SR Rarity (gacha pool)
    { heroId: 'dark_mage',  name: 'Dark Mage',  rarity: 'SR',  hp: 60,  atk: 15, desc: 'Penyihir gelap yang menguasai kutukan' },
    { heroId: 'paladin',    name: 'Paladin',    rarity: 'SR',  hp: 120, atk: 10, desc: 'Ksatria suci pelindung keadilan' },
    { heroId: 'assassin',   name: 'Assassin',   rarity: 'SR',  hp: 50,  atk: 18, desc: 'Pembunuh bayaran yang mematikan' },

    // SSR Rarity (gacha pool)
    { heroId: 'dragon_knight',  name: 'Dragon Knight',  rarity: 'SSR', hp: 150, atk: 25, desc: 'Ksatria penunggang naga perkasa' },
    { heroId: 'phoenix_sage',   name: 'Phoenix Sage',   rarity: 'SSR', hp: 180, atk: 20, desc: 'Sage yang bangkit dari abu phoenix' },
    { heroId: 'storm_caller',   name: 'Storm Caller',   rarity: 'SSR', hp: 120, atk: 30, desc: 'Pemanggil badai yang menghancurkan' },

    // UR Rarity (gacha pool)
    { heroId: 'celestial_guardian', name: 'Celestial Guardian', rarity: 'UR', hp: 300, atk: 40, desc: 'Penjaga langit dari dimensi lain' },
    { heroId: 'void_emperor',       name: 'Void Emperor',       rarity: 'UR', hp: 250, atk: 50, desc: 'Kaisar kekosongan yang tak tertandingi' },

    // Chapter Clear Reward Heroes (tidak masuk gacha)
    { heroId: 'forest_ranger', name: 'Forest Ranger', rarity: 'R',   hp: 55,  atk: 6,  desc: '⭐ Hadiah clear Chapter 1 - Penjaga hutan sakti' },
    { heroId: 'bone_reaper',   name: 'Bone Reaper',   rarity: 'SR',  hp: 90,  atk: 12, desc: '⭐ Hadiah clear Chapter 2 - Pemanen tulang dari reruntuhan' },
    { heroId: 'ember_knight',  name: 'Ember Knight',  rarity: 'SR',  hp: 100, atk: 14, desc: '⭐ Hadiah clear Chapter 3 - Ksatria api dari gunung berapi' },
    { heroId: 'tide_caller',   name: 'Tide Caller',   rarity: 'SSR', hp: 160, atk: 22, desc: '⭐ Hadiah clear Chapter 4 - Pemanggil ombak dari abyss' },
    { heroId: 'void_sentinel', name: 'Void Sentinel', rarity: 'UR',  hp: 280, atk: 45, desc: '⭐ Hadiah clear Chapter 5 - Penjaga kekosongan tertinggi' },
];

// ═══════════════════════════════════════════════════════════
// RECIPES
// ═══════════════════════════════════════════════════════════
const recipes = [
    // Weapons
    {
        resultItemId: 'iron_blade',
        category: 'Weapon',
        ingredients: [{ itemId: 'rusty_sword', amount: 1 }, { itemId: 'wolf_fang', amount: 3 }, { itemId: 'bone_shard', amount: 2 }]
    },
    {
        resultItemId: 'flame_sword',
        category: 'Weapon',
        ingredients: [{ itemId: 'iron_blade', amount: 1 }, { itemId: 'lava_core', amount: 5 }, { itemId: 'serpent_scale', amount: 3 }]
    },
    {
        resultItemId: 'trident',
        category: 'Weapon',
        ingredients: [{ itemId: 'iron_blade', amount: 1 }, { itemId: 'shark_tooth', amount: 5 }, { itemId: 'witch_tear', amount: 3 }]
    },
    {
        resultItemId: 'void_blade',
        category: 'Weapon',
        ingredients: [{ itemId: 'flame_sword', amount: 1 }, { itemId: 'trident', amount: 1 }, { itemId: 'shadow_core', amount: 5 }]
    },
    // Relics
    {
        resultItemId: 'iron_shield',
        category: 'Relic',
        ingredients: [{ itemId: 'leather_armor', amount: 1 }, { itemId: 'iron_fragment', amount: 5 }]
    },
    {
        resultItemId: 'fire_amulet',
        category: 'Relic',
        ingredients: [{ itemId: 'iron_shield', amount: 1 }, { itemId: 'fire_shard', amount: 5 }, { itemId: 'demon_horn', amount: 2 }]
    },
    {
        resultItemId: 'abyssal_ring',
        category: 'Relic',
        ingredients: [{ itemId: 'fire_amulet', amount: 1 }, { itemId: 'kraken_ink', amount: 3 }, { itemId: 'tentacle_shard', amount: 5 }]
    },
    {
        resultItemId: 'shadow_cloak',
        category: 'Relic',
        ingredients: [{ itemId: 'abyssal_ring', amount: 1 }, { itemId: 'void_crystal', amount: 5 }, { itemId: 'shadow_dust', amount: 8 }]
    },
];

// ═══════════════════════════════════════════════════════════
// CHAPTERS & STAGES (5 chapter x 25 stage)
// Format: [stageNum, stageName, enemyDisplay, enemyId, hp, atk, exp, gold, drop, isBoss]
// ═══════════════════════════════════════════════════════════

// Balancing notes:
// Player base: HP=100+(level*20), ATK=10+(level*2)
// Level 1: HP=120, ATK=12
// Level 7: HP=240, ATK=24
// Level 14: HP=380, ATK=38
// Level 22: HP=540, ATK=54
// Level 30: HP=700, ATK=70
// Level 40: HP=900, ATK=90
// Battle max 20 turns, damage random ±10%

const ch1Stages = [
    [1,  "Pintu Masuk Hutan",      "Slime",         "slime",        80,  8,  40,  20,  "slimeball:30",               false],
    [2,  "Semak Belukar",           "Kelelawar",     "bat",          90,  9,  45,  22,  "bat_wing:25",                false],
    [3,  "Sungai Kecil",            "Slime",         "slime",        88,  9,  42,  21,  "slimeball:28",               false],
    [4,  "Jalan Berlumpur",         "Serigala",      "wolf",         105, 11, 55,  28,  "wolf_fang:20",               false],
    [5,  "Gua Kelelawar",           "Kelelawar",     "bat",          98,  10, 50,  25,  "bat_wing:22",                false],
    [6,  "Ladang Goblin",           "Goblin",        "goblin",       115, 12, 60,  33,  "goblin_ear:20",              false],
    [7,  "Hutan Lebat",             "Slime",         "slime",        110, 11, 55,  27,  "slimeball:25",               false],
    [8,  "Bukit Berbatu",           "Serigala",      "wolf",         125, 13, 65,  36,  "wolf_fang:18",               false],
    [9,  "Sarang Kelelawar",        "Kelelawar",     "bat",          120, 12, 60,  30,  "bat_wing:20",                false],
    [10, "Kamp Goblin",             "Goblin",        "goblin",       135, 14, 70,  42,  "goblin_ear:18",              false],
    [11, "Lereng Curam",            "Serigala",      "wolf",         145, 15, 78,  48,  "wolf_fang:16",               false],
    [12, "Reruntuhan Lama",         "Goblin",        "goblin",       155, 16, 83,  52,  "goblin_ear:16",              false],
    [13, "Hutan Gelap",             "Kelelawar",     "bat",          145, 15, 78,  46,  "bat_wing:18",                false],
    [14, "Medan Terjal",            "Serigala",      "wolf",         162, 17, 88,  55,  "wolf_fang:15",               false],
    [15, "Perkemahan Goblin",       "Goblin",        "goblin",       172, 18, 93,  60,  "goblin_ear:15",              false],
    [16, "Hutan Misteri",           "Serigala",      "wolf",         180, 19, 98,  64,  "wolf_fang:14",               false],
    [17, "Benteng Goblin",          "Goblin",        "goblin",       190, 20, 105, 70,  "goblin_ear:14",              false],
    [18, "Jurang Hutan",            "Serigala",      "wolf",         200, 21, 110, 74,  "wolf_fang:13",               false],
    [19, "Gerbang Hitam",           "Goblin",        "goblin",       210, 22, 115, 80,  "goblin_ear:13",              false],
    [20, "Pasukan Depan",           "Serigala",      "wolf",         218, 23, 120, 84,  "wolf_fang:12",               false],
    [21, "Pertahanan Ketat",        "Goblin",        "goblin",       228, 24, 125, 90,  "goblin_ear:12",              false],
    [22, "Barisan Serigala",        "Serigala",      "wolf",         238, 25, 130, 95,  "wolf_fang:12",               false],
    [23, "Juru Kunci",              "Goblin",        "goblin",       248, 26, 135, 100, "goblin_ear:11",              false],
    [24, "Penjaga Terakhir",        "Serigala",      "wolf",         258, 27, 142, 108, "wolf_fang:11",               false],
    [25, "⚔️ BOSS: Kepala Goblin",  "Kepala Goblin", "goblin_chief", 420, 22, 300, 450, "goblin_ear:100,goblin_crown:60", true],
];

const ch2Stages = [
    [1,  "Gerbang Reruntuhan",      "Skeleton",      "skeleton",   220, 22, 120, 75,  "bone_shard:28",              false],
    [2,  "Lorong Gelap",            "Zombie",        "zombie",     245, 20, 128, 80,  "zombie_flesh:25",            false],
    [3,  "Ruang Senjata",           "Skeleton",      "skeleton",   232, 23, 124, 77,  "bone_shard:26",              false],
    [4,  "Penjaga Mahkota",         "Dark Knight",   "dark_knight",265, 25, 138, 88,  "iron_fragment:20",           false],
    [5,  "Koridor Hantu",           "Wraith",        "wraith",     252, 27, 132, 85,  "dark_essence:15",            false],
    [6,  "Aula Kerajaan",           "Zombie",        "zombie",     268, 22, 142, 92,  "zombie_flesh:22",            false],
    [7,  "Taman Tulang",            "Skeleton",      "skeleton",   258, 25, 138, 88,  "bone_shard:24",              false],
    [8,  "Menara Pengawas",         "Dark Knight",   "dark_knight",285, 27, 150, 98,  "iron_fragment:18",           false],
    [9,  "Ruang Roh",               "Wraith",        "wraith",     272, 29, 145, 94,  "dark_essence:14",            false],
    [10, "Gudang Kegelapan",        "Zombie",        "zombie",     290, 24, 155, 102, "zombie_flesh:20",            false],
    [11, "Sayap Barat",             "Skeleton",      "skeleton",   285, 27, 155, 102, "bone_shard:22",              false],
    [12, "Lapangan Pertempuran",    "Dark Knight",   "dark_knight",305, 29, 165, 110, "iron_fragment:16",           false],
    [13, "Ruang Ritual",            "Wraith",        "wraith",     292, 31, 158, 106, "dark_essence:13",            false],
    [14, "Penjara Bawah Tanah",     "Zombie",        "zombie",     318, 26, 172, 115, "zombie_flesh:18",            false],
    [15, "Ruang Persenjataan",      "Dark Knight",   "dark_knight",328, 31, 178, 120, "iron_fragment:15",           false],
    [16, "Kuil Terkutuk",           "Wraith",        "wraith",     312, 33, 170, 116, "dark_essence:12",            false],
    [17, "Balkon Kehancuran",       "Skeleton",      "skeleton",   322, 29, 178, 122, "bone_shard:20",              false],
    [18, "Istana Kematian",         "Dark Knight",   "dark_knight",348, 33, 190, 130, "iron_fragment:14",           false],
    [19, "Vault Kegelapan",         "Wraith",        "wraith",     332, 35, 182, 126, "dark_essence:11",            false],
    [20, "Ruang Tahta Retak",       "Zombie",        "zombie",     358, 28, 195, 134, "zombie_flesh:16",            false],
    [21, "Koridor Terakhir",        "Dark Knight",   "dark_knight",368, 35, 200, 140, "iron_fragment:12",           false],
    [22, "Altar Hitam",             "Wraith",        "wraith",     352, 37, 195, 136, "dark_essence:10",            false],
    [23, "Kamar Raja",              "Skeleton",      "skeleton",   362, 31, 200, 142, "bone_shard:18",              false],
    [24, "Pintu Lich",              "Dark Knight",   "dark_knight",388, 37, 210, 148, "iron_fragment:11",           false],
    [25, "⚔️ BOSS: Lich",           "Lich",          "lich",        900, 38, 550, 800, "dark_essence:100,lich_core:60", true],
];

const ch3Stages = [
    [1,  "Pintu Kawah",             "Fire Imp",      "fire_imp",     385, 38, 200, 130, "fire_shard:25",              false],
    [2,  "Ladang Lava",             "Magma Golem",   "magma_golem",  445, 34, 215, 140, "lava_core:20",               false],
    [3,  "Jalur Asap",              "Fire Imp",      "fire_imp",     398, 39, 205, 133, "fire_shard:23",              false],
    [4,  "Hutan Api",               "Flame Serpent", "flame_serpent",410, 41, 220, 142, "serpent_scale:18",           false],
    [5,  "Danau Lava",              "Lava Demon",    "lava_demon",   428, 43, 228, 150, "demon_horn:15",              false],
    [6,  "Gunung Api Kecil",        "Magma Golem",   "magma_golem",  462, 36, 232, 152, "lava_core:18",               false],
    [7,  "Gua Magma",               "Fire Imp",      "fire_imp",     415, 41, 220, 143, "fire_shard:21",              false],
    [8,  "Jembatan Lava",           "Flame Serpent", "flame_serpent",430, 43, 232, 152, "serpent_scale:16",           false],
    [9,  "Kubah Panas",             "Lava Demon",    "lava_demon",   448, 45, 242, 160, "demon_horn:13",              false],
    [10, "Rongga Vulkanik",         "Magma Golem",   "magma_golem",  480, 38, 252, 165, "lava_core:16",               false],
    [11, "Lorong Membara",          "Fire Imp",      "fire_imp",     435, 43, 240, 155, "fire_shard:20",              false],
    [12, "Liang Api",               "Flame Serpent", "flame_serpent",452, 45, 252, 165, "serpent_scale:14",           false],
    [13, "Kuil Api",                "Lava Demon",    "lava_demon",   468, 47, 260, 172, "demon_horn:12",              false],
    [14, "Tambang Lava",            "Magma Golem",   "magma_golem",  500, 40, 270, 178, "lava_core:14",               false],
    [15, "Kolam Magma",             "Flame Serpent", "flame_serpent",470, 47, 262, 174, "serpent_scale:13",           false],
    [16, "Istana Api",              "Lava Demon",    "lava_demon",   488, 49, 270, 180, "demon_horn:11",              false],
    [17, "Puncak Berapi",           "Magma Golem",   "magma_golem",  520, 42, 282, 188, "lava_core:12",               false],
    [18, "Ruang Pembakaran",        "Fire Imp",      "fire_imp",     458, 46, 258, 170, "fire_shard:18",              false],
    [19, "Sarang Ular Api",         "Flame Serpent", "flame_serpent",490, 49, 278, 184, "serpent_scale:12",           false],
    [20, "Gerbang Neraka",          "Lava Demon",    "lava_demon",   508, 51, 288, 192, "demon_horn:10",              false],
    [21, "Tahta Pembakaran",        "Magma Golem",   "magma_golem",  540, 44, 298, 200, "lava_core:11",               false],
    [22, "Jurang Api",              "Flame Serpent", "flame_serpent",510, 51, 290, 194, "serpent_scale:11",           false],
    [23, "Istana Terbakar",         "Lava Demon",    "lava_demon",   528, 53, 300, 202, "demon_horn:9",               false],
    [24, "Gerbang Inferno",         "Magma Golem",   "magma_golem",  558, 46, 312, 210, "lava_core:10",               false],
    [25, "⚔️ BOSS: Inferno Lord",   "Inferno Lord",  "inferno_lord", 1500,55, 800, 1100,"demon_horn:100,inferno_gem:60", true],
];

const ch4Stages = [
    [1,  "Pantai Gelap",            "Deep Crawler",  "deep_crawler", 585, 55, 290, 188, "claw_fragment:25",           false],
    [2,  "Karang Berbahaya",        "Sea Witch",     "sea_witch",    568, 59, 282, 184, "witch_tear:20",              false],
    [3,  "Palung Dangkal",          "Deep Crawler",  "deep_crawler", 600, 57, 298, 192, "claw_fragment:23",           false],
    [4,  "Sarang Tentakel",         "Kraken Spawn",  "kraken_spawn", 628, 57, 308, 200, "tentacle_shard:18",          false],
    [5,  "Gua Hiu",                 "Abyssal Shark", "abyssal_shark",610, 61, 302, 196, "shark_tooth:15",             false],
    [6,  "Dasar Laut Gelap",        "Sea Witch",     "sea_witch",    588, 61, 295, 192, "witch_tear:18",              false],
    [7,  "Lorong Bawah Air",        "Deep Crawler",  "deep_crawler", 620, 59, 312, 202, "claw_fragment:21",           false],
    [8,  "Terumbu Berbahaya",       "Kraken Spawn",  "kraken_spawn", 648, 59, 322, 210, "tentacle_shard:16",          false],
    [9,  "Perairan Hitam",          "Abyssal Shark", "abyssal_shark",630, 63, 315, 205, "shark_tooth:13",             false],
    [10, "Kedalaman Misterius",     "Sea Witch",     "sea_witch",    608, 63, 308, 200, "witch_tear:16",              false],
    [11, "Palung Terdalam",         "Deep Crawler",  "deep_crawler", 642, 61, 325, 212, "claw_fragment:20",           false],
    [12, "Hutan Rumput Laut",       "Kraken Spawn",  "kraken_spawn", 668, 61, 335, 220, "tentacle_shard:15",          false],
    [13, "Gua Penyihir Laut",       "Sea Witch",     "sea_witch",    628, 65, 322, 210, "witch_tear:14",              false],
    [14, "Medan Hiu",               "Abyssal Shark", "abyssal_shark",652, 65, 330, 216, "shark_tooth:12",             false],
    [15, "Pintu Air Kuno",          "Kraken Spawn",  "kraken_spawn", 688, 63, 348, 228, "tentacle_shard:14",          false],
    [16, "Istana Tengah Laut",      "Sea Witch",     "sea_witch",    648, 67, 335, 220, "witch_tear:13",              false],
    [17, "Labirin Abyss",           "Deep Crawler",  "deep_crawler", 665, 64, 342, 224, "claw_fragment:18",           false],
    [18, "Sarang Hiu Raksasa",      "Abyssal Shark", "abyssal_shark",672, 67, 345, 228, "shark_tooth:11",             false],
    [19, "Ruang Segel Kuno",        "Kraken Spawn",  "kraken_spawn", 708, 65, 362, 238, "tentacle_shard:13",          false],
    [20, "Mahkota Samudra",         "Sea Witch",     "sea_witch",    668, 69, 348, 230, "witch_tear:12",              false],
    [21, "Palung Abyssal",          "Deep Crawler",  "deep_crawler", 688, 66, 358, 235, "claw_fragment:17",           false],
    [22, "Kamar Tentakel",          "Kraken Spawn",  "kraken_spawn", 728, 67, 375, 248, "tentacle_shard:12",          false],
    [23, "Gerbang Kraken",          "Abyssal Shark", "abyssal_shark",695, 70, 362, 240, "shark_tooth:10",             false],
    [24, "Teluk Terlarang",         "Sea Witch",     "sea_witch",    688, 71, 368, 244, "witch_tear:11",              false],
    [25, "⚔️ BOSS: Kraken",         "Kraken",        "kraken",       2200,75, 1100,1500,"kraken_ink:100,shark_tooth:80", true],
];

const ch5Stages = [
    [1,  "Gerbang Kegelapan",       "Shadow Fiend",  "shadow_fiend", 825, 79, 400, 260, "shadow_dust:25",             false],
    [2,  "Padang Kekosongan",       "Void Mage",     "void_mage",    808, 83, 392, 255, "void_crystal:20",            false],
    [3,  "Jalan Kekacauan",         "Shadow Fiend",  "shadow_fiend", 845, 80, 410, 266, "shadow_dust:23",             false],
    [4,  "Menara Void",             "Chaos Knight",  "chaos_knight", 888, 81, 420, 272, "chaos_shard:18",             false],
    [5,  "Ngarai Naga",             "Dark Dragon",   "dark_dragon",  868, 86, 415, 270, "dragon_scale:12",            false],
    [6,  "Alam Bayangan Dalam",     "Void Mage",     "void_mage",    828, 85, 405, 263, "void_crystal:18",            false],
    [7,  "Labirin Kegelapan",       "Shadow Fiend",  "shadow_fiend", 862, 82, 420, 272, "shadow_dust:21",             false],
    [8,  "Benteng Kekacauan",       "Chaos Knight",  "chaos_knight", 908, 83, 432, 280, "chaos_shard:16",             false],
    [9,  "Hutan Hitam",             "Dark Dragon",   "dark_dragon",  888, 88, 428, 278, "dragon_scale:11",            false],
    [10, "Danau Void",              "Void Mage",     "void_mage",    848, 87, 418, 272, "void_crystal:16",            false],
    [11, "Kuil Kegelapan",          "Shadow Fiend",  "shadow_fiend", 880, 84, 432, 280, "shadow_dust:20",             false],
    [12, "Medan Kekacauan",         "Chaos Knight",  "chaos_knight", 928, 85, 445, 290, "chaos_shard:15",             false],
    [13, "Sarang Naga Hitam",       "Dark Dragon",   "dark_dragon",  908, 90, 442, 288, "dragon_scale:10",            false],
    [14, "Puncak Void",             "Void Mage",     "void_mage",    868, 89, 432, 282, "void_crystal:14",            false],
    [15, "Altar Bayangan",          "Shadow Fiend",  "shadow_fiend", 900, 86, 445, 290, "shadow_dust:18",             false],
    [16, "Ruang Kekacauan",         "Chaos Knight",  "chaos_knight", 948, 87, 458, 300, "chaos_shard:14",             false],
    [17, "Gua Naga Kuno",           "Dark Dragon",   "dark_dragon",  928, 92, 455, 298, "dragon_scale:9",             false],
    [18, "Portal Kekosongan",       "Void Mage",     "void_mage",    888, 91, 445, 292, "void_crystal:13",            false],
    [19, "Istana Bayangan",         "Shadow Fiend",  "shadow_fiend", 920, 88, 458, 300, "shadow_dust:17",             false],
    [20, "Tahta Kekacauan",         "Chaos Knight",  "chaos_knight", 968, 89, 472, 310, "chaos_shard:13",             false],
    [21, "Habitat Naga",            "Dark Dragon",   "dark_dragon",  948, 94, 468, 308, "dragon_scale:8",             false],
    [22, "Jurang Void",             "Void Mage",     "void_mage",    908, 93, 458, 302, "void_crystal:12",            false],
    [23, "Akhir Kegelapan",         "Shadow Fiend",  "shadow_fiend", 940, 90, 472, 310, "shadow_dust:16",             false],
    [24, "Gerbang Penguasa",        "Chaos Knight",  "chaos_knight", 988, 91, 488, 322, "chaos_shard:12",             false],
    [25, "⚔️ BOSS: Shadow Overlord","Shadow Overlord","shadow_overlord",3200,100,1500,2000,"shadow_core:100,dragon_scale:80", true],
];

const chapters = [
    {
        chapterNumber: 1,
        name: 'Hutan Terlupakan',
        clearRewardHeroId: 'forest_ranger',
        stagesRaw: ch1Stages
    },
    {
        chapterNumber: 2,
        name: 'Reruntuhan Kerajaan',
        clearRewardHeroId: 'bone_reaper',
        stagesRaw: ch2Stages
    },
    {
        chapterNumber: 3,
        name: 'Badlands Vulkanik',
        clearRewardHeroId: 'ember_knight',
        stagesRaw: ch3Stages
    },
    {
        chapterNumber: 4,
        name: 'Jurang Abyssal',
        clearRewardHeroId: 'tide_caller',
        stagesRaw: ch4Stages
    },
    {
        chapterNumber: 5,
        name: 'Alam Bayangan',
        clearRewardHeroId: 'void_sentinel',
        stagesRaw: ch5Stages
    },
];

// ═══════════════════════════════════════════════════════════
// SEED FUNCTION
// ═══════════════════════════════════════════════════════════
async function seed() {
    await db.connect();
    console.log('\n🌱 Mulai seeding RPG content...\n');

    // 1. Enemies
    await RPGEnemy.deleteMany({});
    await RPGEnemy.insertMany(enemies);
    console.log(`✅ ${enemies.length} enemies berhasil dimasukkan`);

    // 2. Items
    await RPGItem.deleteMany({});
    await RPGItem.insertMany(items);
    console.log(`✅ ${items.length} items berhasil dimasukkan`);

    // 3. Heroes
    await RPGHero.deleteMany({});
    await RPGHero.insertMany(heroes);
    console.log(`✅ ${heroes.length} heroes berhasil dimasukkan`);

    // 4. Recipes
    await RPGRecipe.deleteMany({});
    await RPGRecipe.insertMany(recipes);
    console.log(`✅ ${recipes.length} recipes berhasil dimasukkan`);

    // 5. Chapters & Stages
    await RPGChapter.deleteMany({});
    for (const ch of chapters) {
        const stages = ch.stagesRaw.map(s => ({
            stageNumber: s[0],
            name:        s[1],
            enemy:       s[2],
            enemyId:     s[3],
            hp:          s[4],
            atk:         s[5],
            exp:         s[6],
            gold:        s[7],
            drop:        s[8],
            isBoss:      s[9],
            level:       1,
        }));
        await RPGChapter.create({
            chapterNumber:     ch.chapterNumber,
            name:              ch.name,
            clearRewardHeroId: ch.clearRewardHeroId,
            stages,
        });
        console.log(`✅ Chapter ${ch.chapterNumber} (${ch.name}) - ${stages.length} stages`);
    }

    const totalStages = chapters.reduce((sum, c) => sum + c.stagesRaw.length, 0);
    console.log(`\n🎉 Selesai! Total: ${enemies.length} musuh, ${items.length} item, ${heroes.length} hero, ${recipes.length} recipe, ${totalStages} stage`);
    process.exit(0);
}

seed().catch(e => {
    console.error('❌ Seed error:', e.message);
    process.exit(1);
});
