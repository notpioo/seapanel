const { User } = require('../../../models');

module.exports = {
    name: 'connect',
    description: 'Connect WhatsApp account to Web Dashboard',
    category: 'general',
    usage: '.connect <code>',
    execute: async ({ reply, args, sender }) => {
        try {
            const code = args[0];
            if (!code) return reply('Please provide the verification code from the Web Dashboard.\nExample: *.connect 1234*');

            // Access global verification codes
            if (!global.verificationCodes || !global.verificationCodes[code]) {
                return reply('❌ Invalid or expired verification code.');
            }

            const username = global.verificationCodes[code];
            const phoneNumber = sender.replace('@s.whatsapp.net', '').replace('@c.us', '');

            // Update Web User
            const user = await User.findOne({ username });
            if (!user) return reply('❌ Error: Web user not found.');

            user.linkedPhoneNumber = phoneNumber;
            await user.save();

            // Clear code
            delete global.verificationCodes[code];

            await reply(`✅ Successfully connected to Web Account: *${username}*\nPlease refresh your Web Dashboard.`);

        } catch (error) {
            console.error('Connect error:', error);
            await reply('Failed to connect accounts.');
        }
    }
};
