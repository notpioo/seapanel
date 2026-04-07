const { BotUser } = require('../../../models');

module.exports = {
    name: 'profile',
    description: 'Show user profile information',
    category: 'general',
    aliases: ['me', 'myprofile'],
    execute: async ({ reply, sender, isOwner, message }) => {
        try {
            // Get user data
            const phoneNumber = sender.replace('@s.whatsapp.net', '').replace('@c.us', '');
            let user = await BotUser.findOne({ phoneNumber });

            // If user doesn't exist yet (very rare due to auto-register), create basic
            if (!user) {
                user = await BotUser.create({
                    phoneNumber,
                    pushName: message.pushName || 'User'
                });
            }

            // Determine status
            let status = 'Basic';
            if (isOwner) status = 'Owner';
            else if (user.isPremium) status = 'Premium';

            // Format Date
            const joinDate = new Date(user.createdAt).toLocaleDateString('id-ID', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            // Format Limit
            const limitStr = isOwner ? 'Unlimited' : `${user.limit}/${user.maxLimit}`;

            // Build Caption
            const caption = [
                `│ 📝 *Username:* ${user.pushName}`,
                `│ 🏷️ *Tag:* @${phoneNumber}`,
                `│ ⭐ *Status:* ${status}`,
                `│ 🎯 *Limit:* ${limitStr}`,
                `│ 💰 *Balance:* ${user.balance}`,
                `│ 📅 *Member Since:* ${joinDate}`
            ].join('\n');

            // Send with mention
            await reply({
                text: caption,
                mentions: [sender]
            });

        } catch (error) {
            console.error('Profile error:', error);
            await reply('Failed to fetch profile.');
        }
    }
};
