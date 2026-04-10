/**
 * Dungeon Seed Script
 * Membuat 1 dungeon "Menara Iblis" dengan floor infinite
 * + item dungeon-exclusive ke RPGItem
 * + recipe baru dari item dungeon
 */

require('dotenv').config();
const db = require('../src/utils/database');
const { RPGDungeon, RPGItem, RPGRecipe } = require('../src/models');

const dungeonData = {
    dungeonId:    'menara_iblis',
    name:         'Menara Iblis',
    description:  'Menara gelap tanpa batas. Tiap 5 floor ada Boss! Makin tinggi, makin brutal.',
    minLevel:     5,

    // Tier musuh berdasarkan floor
    tiers: [
        { startFloor: 1,   enemyName: 'Goblin Penjaga',    bossName: 'Goblin Pemimpin'      },
        { startFloor: 21,  enemyName: 'Elemental Batu',    bossName: 'Golem Kuno'           },
        { startFloor: 51,  enemyName: 'Iblis Bayangan',    bossName: 'Iblis Agung'          },
        { startFloor: 101, enemyName: 'Predator Void',     bossName: 'Penguasa Void'        },
        { startFloor: 201, enemyName: 'Kekacauan Purba',   bossName: 'Titan Kekacauan'      },
    ],

    // Scaling linear per floor
    baseHP:      120,
    baseATK:     10,
    hpPerFloor:  22,
    atkPerFloor: 2,

    // Boss setiap 5 floor
    bossHPMult:  2.5,
    bossATKMult: 1.8,

    // Reward
    baseExp:      50,
    baseGold:     30,
    expPerFloor:  15,
    goldPerFloor: 8,
    bossExpMult:  3,
    bossGoldMult: 3,

    // Drop items
    normalDrop: 'dungeon_crystal:20',
    bossDrop:   'dungeon_shard:60,dungeon_crystal:100',

    isActive: true,
};

const newItems = [
    { itemId: 'dungeon_crystal', name: 'Kristal Menara',    description: 'Kristal misterius dari dalam menara',       price: 50,  type: 'material', atk: 0,  hp: 0   },
    { itemId: 'dungeon_shard',   name: 'Pecahan Iblis',     description: 'Pecahan berenergi dari bos menara',          price: 200, type: 'material', atk: 0,  hp: 0   },
    { itemId: 'dungeon_core',    name: 'Inti Menara',       description: 'Inti gelap dari bos floor tinggi (50+)',     price: 600, type: 'material', atk: 0,  hp: 0   },
    { itemId: 'tower_blade',     name: 'Tower Blade',       description: 'Senjata tempa dari kristal menara',          price: 2500, type: 'weapon',  atk: 200, hp: 0  },
    { itemId: 'abyss_armor',     name: 'Abyss Armor',      description: 'Zirah dari kedalaman menara iblis',           price: 2000, type: 'relic',   atk: 0,  hp: 600 },
];

const newRecipes = [
    {
        resultItemId: 'tower_blade',
        category: 'Weapon',
        ingredients: [
            { itemId: 'dungeon_crystal', amount: 15 },
            { itemId: 'dungeon_shard',   amount: 5  },
            { itemId: 'void_blade',      amount: 1  },
        ]
    },
    {
        resultItemId: 'abyss_armor',
        category: 'Relic',
        ingredients: [
            { itemId: 'dungeon_crystal', amount: 15 },
            { itemId: 'dungeon_shard',   amount: 5  },
            { itemId: 'shadow_cloak',    amount: 1  },
        ]
    },
    {
        resultItemId: 'dungeon_core',
        category: 'Material',
        ingredients: [
            { itemId: 'dungeon_crystal', amount: 10 },
            { itemId: 'dungeon_shard',   amount: 3  },
        ]
    },
];

async function seed() {
    await db.connect();
    console.log('\n🗼 Seeding dungeon data...\n');

    // 1. Dungeon
    await RPGDungeon.deleteMany({});
    await RPGDungeon.create(dungeonData);
    console.log('✅ Dungeon "Menara Iblis" berhasil dibuat');

    // 2. New items (upsert — jangan hapus item lama)
    for (const item of newItems) {
        await RPGItem.findOneAndUpdate(
            { itemId: item.itemId },
            item,
            { upsert: true, new: true }
        );
    }
    console.log(`✅ ${newItems.length} item dungeon berhasil ditambahkan`);

    // 3. New recipes (upsert)
    for (const recipe of newRecipes) {
        await RPGRecipe.findOneAndUpdate(
            { resultItemId: recipe.resultItemId },
            recipe,
            { upsert: true, new: true }
        );
    }
    console.log(`✅ ${newRecipes.length} recipe dungeon berhasil ditambahkan`);

    // Verifikasi preview scaling
    const dungeon = await RPGDungeon.findOne();
    console.log('\n📊 Preview scaling:');
    [1, 5, 10, 25, 50, 100, 200].forEach(f => {
        const s = dungeon.getFloorStats(f);
        console.log(`  Floor ${String(f).padStart(3)}: ${s.isBoss ? '[BOSS]' : '      '} HP:${s.hp} ATK:${s.atk} EXP:${s.exp} Gold:${s.gold} — ${s.enemyName}`);
    });

    console.log('\n🎉 Dungeon seed selesai!');
    process.exit(0);
}

seed().catch(e => {
    console.error('❌ Error:', e.message);
    process.exit(1);
});
