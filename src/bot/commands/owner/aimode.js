/**
 * AI Mode Command - Toggle AI Mode per group (Owner only)
 * Usage: .aimode on | off | status | clear | model <name> | history <n> | cooldown <n>
 */

const AIMode = require('../../../models/AIMode');

module.exports = {
    name: 'aimode',
    aliases: ['ai'],
    category: 'owner',
    description: 'Toggle AI Mode di grup (Owner only)',
    usage: '.aimode on | off | status | clear | model <nama> | history <n> | cooldown <n>',
    ownerOnly: true,

    async execute({ reply, text, jid, isGroup, sender }) {
        const args = (text || '').trim().toLowerCase().split(/\s+/);
        const action = args[0];

        if (!action || !['on', 'off', 'status', 'clear', 'model', 'history', 'cooldown'].includes(action)) {
            return reply(
                `🤖 *AI Mode Manager*\n\n` +
                `Penggunaan:\n` +
                `• *.aimode on* — Aktifkan AI Mode di grup ini\n` +
                `• *.aimode off* — Nonaktifkan AI Mode di grup ini\n` +
                `• *.aimode status* — Cek status AI Mode\n` +
                `• *.aimode clear* — Hapus riwayat chat AI\n` +
                `• *.aimode model <nama>* — Ganti model AI\n` +
                `• *.aimode history <jumlah>* — Set maks riwayat chat (5-50)\n` +
                `• *.aimode cooldown <detik>* — Set cooldown antar respons (1-30)\n\n` +
                `_AI Mode membuat bot menjawab semua chat di grup secara otomatis menggunakan AI, tanpa command._`
            );
        }

        if (!isGroup) {
            return reply('❌ AI Mode hanya bisa digunakan di grup.');
        }

        try {
            switch (action) {
                case 'on': {
                    const config = await AIMode.enableForGroup(jid, sender);
                    return reply(
                        `✅ *AI Mode AKTIF!* 🤖\n\n` +
                        `Grup ini sekarang dalam mode AI.\n` +
                        `Bot akan menjawab semua chat secara otomatis.\n` +
                        `Command lain (menu, game, dll) akan diabaikan.\n\n` +
                        `📌 Model: *${config.model}*\n` +
                        `📝 Konteks: ${config.maxHistory} pesan terakhir\n\n` +
                        `⚡ Matikan dengan: *.aimode off*`
                    );
                }

                case 'off': {
                    const config = await AIMode.getGroupConfig(jid);
                    if (!config || !config.enabled) {
                        return reply('⚠️ AI Mode sudah nonaktif di grup ini.');
                    }
                    await AIMode.disableForGroup(jid);
                    return reply(
                        `🔒 *AI Mode NONAKTIF!*\n\n` +
                        `Bot kembali ke mode normal.\n` +
                        `Command (.menu, .mine, dll) sekarang aktif kembali.\n\n` +
                        `_Riwayat chat AI tetap tersimpan. Gunakan *.aimode clear* untuk menghapus._`
                    );
                }

                case 'status': {
                    const config = await AIMode.getGroupConfig(jid);
                    if (!config) {
                        return reply(`🤖 *AI Mode Status*\n\nStatus: 🔴 *NONAKTIF*\nBelum pernah diaktifkan di grup ini.`);
                    }

                    const status = config.enabled ? '🟢 *AKTIF*' : '🔴 *NONAKTIF*';
                    const historyCount = config.chatHistory?.length || 0;

                    return reply(
                        `🤖 *AI Mode Status*\n\n` +
                        `Status: ${status}\n` +
                        `Model: *${config.model}*\n` +
                        `Riwayat chat: *${historyCount}/${config.maxHistory}* pesan\n` +
                        `Cooldown: *${config.cooldownSeconds}* detik\n` +
                        (config.enabledAt ? `Diaktifkan: ${config.enabledAt.toLocaleString('id-ID')}` : '')
                    );
                }

                case 'clear': {
                    await AIMode.clearHistory(jid);
                    return reply('🗑️ Riwayat chat AI di grup ini berhasil dihapus.\nAI akan mulai dengan konteks baru.');
                }

                case 'model': {
                    const modelName = args.slice(1).join(' ');
                    if (!modelName) {
                        return reply(
                            `📋 *Ganti Model AI*\n\n` +
                            `Penggunaan: *.aimode model <nama>*\n\n` +
                            `Contoh model Qwen:\n` +
                            `• qwen3.5-plus\n` +
                            `• qwen-turbo\n` +
                            `• qwen-plus\n` +
                            `• qwen-max`
                        );
                    }

                    await AIMode.findOneAndUpdate(
                        { groupJid: jid },
                        { $set: { model: modelName, updatedAt: new Date() } },
                        { upsert: true }
                    );

                    return reply(`✅ Model AI diubah ke: *${modelName}*`);
                }

                case 'history': {
                    const num = parseInt(args[1]);
                    if (!num || num < 5 || num > 50) {
                        return reply(
                            `📝 *Set Maks Riwayat Chat*\n\n` +
                            `Penggunaan: *.aimode history <jumlah>*\n` +
                            `Range: *5 - 50* pesan\n\n` +
                            `Makin sedikit = makin cepat respons AI\n` +
                            `Makin banyak = AI lebih paham konteks`
                        );
                    }

                    await AIMode.findOneAndUpdate(
                        { groupJid: jid },
                        { $set: { maxHistory: num, updatedAt: new Date() } },
                        { upsert: true }
                    );

                    return reply(`✅ Maks riwayat chat diubah ke: *${num}* pesan`);
                }

                case 'cooldown': {
                    const secs = parseInt(args[1]);
                    if (!secs || secs < 1 || secs > 30) {
                        return reply(
                            `⏱️ *Set Cooldown AI*\n\n` +
                            `Penggunaan: *.aimode cooldown <detik>*\n` +
                            `Range: *1 - 30* detik\n\n` +
                            `Cooldown = jeda minimum antar respons AI`
                        );
                    }

                    await AIMode.findOneAndUpdate(
                        { groupJid: jid },
                        { $set: { cooldownSeconds: secs, updatedAt: new Date() } },
                        { upsert: true }
                    );

                    return reply(`✅ Cooldown AI diubah ke: *${secs}* detik`);
                }
            }
        } catch (error) {
            console.error('[aimode] Error:', error);
            return reply('❌ Gagal mengubah AI Mode. Cek log untuk detail.');
        }
    },
};
