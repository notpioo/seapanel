/**
 * Restart Command - Restart the bot (Owner only)
 */

const Logger = require('../../../utils/logger');
const logger = new Logger('RestartCommand');

module.exports = {
    name: 'restart',
    aliases: ['reboot'],
    category: 'owner',
    description: 'Restart bot (Owner only)',
    usage: '.restart',
    ownerOnly: true,

    async execute({ reply }) {
        await reply('🔄 *Restarting bot...*');

        logger.info('Bot restart requested by owner');

        setTimeout(() => {
            process.exit(0);
        }, 1000);
    },
};
