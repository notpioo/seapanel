
const config = require('../../../config/bot.config');

module.exports = {
    getSidebar: (activePage, session, roleConfig) => {
        // Define menu categories with icons and coming-soon flags
        const menuCategories = [
            {
                id: 'main',
                title: 'MAIN',
                items: [
                    { id: 'dashboard', label: 'Dashboard', href: '/', icon: '📊' },
                    { id: 'mining-pass', label: 'Mining Pass', href: '/mining-pass', icon: '⛏️' },
                    { id: 'bank', label: 'Bank', href: '/bank', icon: '🏛️' },
                ]
            },
            {
                id: 'nomercy',
                title: 'NOMERCY',
                items: [
                    { id: 'tournament', label: 'Tournament', href: '/tournament', icon: '🏆' },
                    { id: 'hall-of-fame', label: 'Hall of Fame', href: '/hall-of-fame', icon: '🏅' },
                ]
            },
            {
                id: 'minigames',
                title: 'MINIGAMES',
                items: [
                    { id: 'rpg', label: 'RPG', href: '/rpg', icon: '⚔️' },
                    { id: 'mining', label: 'Mining', href: '/mining', icon: '⛏️' },
                    { id: 'casino', label: 'Casino', href: '/casino', icon: '🎰' },
                ]
            },
        ];

        // Admin-only categories (appended for admins)
        const adminCategories = [
            {
                id: 'config',
                title: 'CONFIGURATION',
                items: [
                    { id: 'qr', label: 'Scan Connect', href: '/qr', icon: '📱' },
                    { id: 'commands', label: 'Commands', href: '/commands', icon: '📋' },
                    { id: 'settings', label: 'Bot Settings', href: '/settings', icon: '⚙️' },
                    { id: 'mining-config', label: 'Mining Config', href: '/mining-config', icon: '🔧' },
                    { id: 'rpg-config', label: 'RPG Config', href: '/rpg-config', icon: '🎮' },
                    { id: 'casino-config', label: 'Casino Config', href: '/casino-config', icon: '🎰' },
                    { id: 'pass-config', label: 'Pass Config', href: '/pass-config', icon: '🌟' },
                ]
            },
            {
                id: 'data',
                title: 'DATABASE',
                items: [
                    { id: 'users', label: 'Web Users', href: '/users', icon: '👥' },
                    { id: 'wa-users', label: 'WhatsApp Users', href: '/wa-users', icon: '💬' },
                ]
            },
            {
                id: 'system',
                title: 'SYSTEM',
                items: [
                    { id: 'logs', label: 'System Logs', href: '/logs', icon: '📄' },
                ]
            }
        ];

        // Combine categories — admin gets everything
        const allCategories = [...menuCategories, ...adminCategories];

        // Filter based on permissions
        const userPages = roleConfig.allowedPages;
        const validCategories = allCategories.map(cat => {
            const validItems = cat.items.filter(item => userPages.includes(item.id) || userPages.includes('*'));
            return { ...cat, items: validItems };
        }).filter(cat => cat.items.length > 0);

        // Generate HTML
        const navHtml = validCategories.map(cat => `
            <div class="nav-section">
                <div class="nav-section-title">${cat.title}</div>
                ${cat.items.map(item => `
                    <a href="${item.soon ? '#' : item.href}" class="nav-item ${activePage === item.id ? 'active' : ''} ${item.soon ? 'nav-item-disabled' : ''}">
                        <span class="nav-item-icon">${item.icon}</span>
                        <span>${item.label}</span>
                        ${item.soon ? '<span class="nav-soon-badge">SOON</span>' : ''}
                    </a>
                `).join('')}
            </div>
        `).join('');

        return `
        <aside class="sidebar">
            <div class="sidebar-header">
                <div class="sidebar-logo">
                    <div class="sidebar-logo-text">${config.webPanel.title.toUpperCase()}</div>
                </div>
            </div>
            
            <nav class="sidebar-nav">
                ${navHtml}
            </nav>

            <div class="sidebar-footer">
                <div class="user-info">
                    <div class="user-avatar">${session.name.charAt(0).toUpperCase()}</div>
                    <div class="user-details">
                        <div class="user-name">${session.name}</div>
                        <div class="user-role">${session.role}</div>
                    </div>
                </div>
                <a href="/logout" class="btn-logout">🚪 Logout</a>
            </div>
        </aside>
    `;
    }
};
