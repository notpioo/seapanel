/**
 * Help Command - Display all available commands
 */

const config = require('../../../../config/bot.config');
const CommandLoader = require('../loader');

module.exports = {
    name: 'help',
    aliases: ['menu', 'commands', 'h'],
    category: 'general',
    description: 'Menampilkan daftar semua command yang tersedia',
    usage: '.help [command]',
    ownerOnly: false,

    async execute({ reply, args, config: botConfig }) {
        const loader = new CommandLoader();

        if (args[0]) {
            // Show specific command help
            const command = loader.getCommand(args[0]);
            if (!command) {
                return reply(`❌ Command *${args[0]}* tidak ditemukan.`);
            }

            let helpText = `╔══════════════════════════╗\n`;
            helpText += `║      *COMMAND INFO*      ║\n`;
            helpText += `╚══════════════════════════╝\n\n`;
            helpText += `📌 *Nama:* ${command.name}\n`;
            helpText += `📝 *Deskripsi:* ${command.description || 'Tidak ada deskripsi'}\n`;
            helpText += `💡 *Penggunaan:* ${command.usage || `${botConfig.bot.prefix}${command.name}`}\n`;
            helpText += `🏷️ *Kategori:* ${command.category || 'Uncategorized'}\n`;
            helpText += `👑 *Owner Only:* ${command.ownerOnly ? 'Ya' : 'Tidak'}\n`;

            if (command.aliases && command.aliases.length > 0) {
                helpText += `🔗 *Aliases:* ${command.aliases.join(', ')}\n`;
            }

            return reply(helpText);
        }

        // Show all commands grouped by category
        const categories = loader.getCategories();
        const prefix = botConfig.bot.prefix;

        let menuText = `╔══════════════════════════════════════╗\n`;
        menuText += `║         *${botConfig.bot.name.toUpperCase()}*          ║\n`;
        menuText += `╠══════════════════════════════════════╣\n`;
        menuText += `║   Prefix: ${prefix}                         ║\n`;
        menuText += `╚══════════════════════════════════════╝\n\n`;

        if (categories.length === 0) {
            menuText += `📋 *Tidak ada command yang tersedia*`;
        } else {
            for (const category of categories) {
                const commands = loader.getCommandsByCategory(category);
                const categoryIcon = getCategoryIcon(category);

                menuText += `${categoryIcon} *${category.toUpperCase()}*\n`;
                menuText += `━━━━━━━━━━━━━━━━━━━━\n`;

                for (const cmd of commands) {
                    menuText += `  ▸ *${prefix}${cmd.name}*`;
                    if (cmd.description) {
                        menuText += ` - ${cmd.description}`;
                    }
                    menuText += `\n`;
                }
                menuText += `\n`;
            }
        }

        menuText += `\n💡 Ketik *${prefix}help <command>* untuk info detail`;

        return reply(menuText);
    },
};

/**
 * Get icon for category
 */
function getCategoryIcon(category) {
    const icons = {
        general: '📋',
        admin: '👑',
        owner: '🔒',
        fun: '🎮',
        utility: '🔧',
        group: '👥',
        media: '🎵',
        tools: '🛠️',
    };
    return icons[category.toLowerCase()] || '📌';
}
