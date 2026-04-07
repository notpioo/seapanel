/**
 * Ping Command - Check bot response time
 */

module.exports = {
    name: 'ping',
    aliases: ['p', 'speed'],
    category: 'general',
    description: 'Cek kecepatan respon bot',
    usage: '.ping',
    ownerOnly: false,

    async execute({ reply }) {
        const start = Date.now();
        const responseTime = Date.now() - start;

        return reply(`🏓 *Pong!*\n⚡ *Response Time:* ${responseTime}ms`);
    },
};
