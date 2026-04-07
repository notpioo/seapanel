const { User } = require('../../../models');
const config = require('../../../../config/bot.config'); // Root config directory is 4 levels up

module.exports = {
    name: 'register',
    description: 'Register a Web Dashboard account',
    category: 'general',
    usage: '.register <username> <password>',
    aliases: ['daftar', 'reg'],
    execute: async ({ reply, args, sender }) => {
        console.log(`[DEBUG] Register command called by ${sender}`);
        try {
            const username = args[0];
            const password = args[1];

            if (!username || !password) {
                return reply(`⚠️ *Usage:* ${config.bot.prefix}register <username> <password>\n\nExample: ${config.bot.prefix}register sanka 123456`);
            }

            if (password.length < 6) {
                return reply('⚠️ Password must be at least 6 characters long.');
            }

            const phoneNumber = sender.replace('@s.whatsapp.net', '').replace('@c.us', '');

            // 1. Check if Phone Number already registered
            const existingPhone = await User.findOne({ linkedPhoneNumber: phoneNumber });
            if (existingPhone) {
                return reply(`❌ Your number is already registered as account: *${existingPhone.username}*`);
            }

            // 2. Check if Username taken
            const existingUsername = await User.findOne({ username: username.toLowerCase() });
            if (existingUsername) {
                return reply('❌ Username is already taken. Please choose another one.');
            }

            // 3. Create User
            await User.create({
                username: username.toLowerCase(),
                password: password, // Will be hashed by mongoose pre-save hook
                name: username,
                role: 'user',
                linkedPhoneNumber: phoneNumber,
                isActive: true
            });

            // 4. Success Message
            // Assuming we don't know the exact deployed URL inside bot logic easily unless config'd
            // We can ask user to open the link themselves.
            await reply(
                `✅ *Registration Successful!*\n\n` +
                `👤 *Username:* ${username}\n` +
                `🔑 *Password:* ${password}\n\n` +
                `You can now login to the Web Dashboard to check your stats & limit.`
            );

        } catch (error) {
            console.error('Register error:', error);
            await reply('❌ Failed to register. Please try again later.');
        }
    }
};
