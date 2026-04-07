const express = require('express');
const { BotUser } = require('../../models');
const Logger = require('../../utils/logger');
const logger = new Logger('WAUsersRoutes');

module.exports = {
    setupRoutes: (app, requireAuth) => {
        app.post('/wa-users/update', requireAuth(['admin']), async (req, res) => {
            try {
                const { phoneNumber, isPremium, limit, balance } = req.body;

                await BotUser.findOneAndUpdate(
                    { phoneNumber },
                    {
                        isPremium: isPremium === 'true',
                        limit: parseInt(limit) || 0,
                        balance: parseInt(balance) || 0
                    }
                );

                res.redirect('/wa-users');
            } catch (error) {
                logger.error('Failed to update WA user:', error);
                res.redirect('/wa-users?error=Update failed');
            }
        });

    },

    getWAUsersPage: async () => {
        let users = [];
        try {
            users = await BotUser.find({}).sort({ updatedAt: -1 }).limit(50);
        } catch (e) {
            logger.error('Failed to fetch bot users', e);
        }

        return `
    <header class="header">
        <h1 class="header-title">WhatsApp Users</h1>
    </header>

                    <div class="content">
                        <div class="card">
                            <div class="card-header">
                                <div>
                                    <div class="card-title">User Database</div>
                                    <div class="card-subtitle">Showing last 50 active users</div>
                                </div>
                            </div>
                            <div style="overflow-x: auto;">
                                <table class="table">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Phone</th>
                                            <th>Status</th>
                                            <th>Limit</th>
                                            <th>Balance</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${users.map(u => `
                                <tr>
                                    <td>${u.pushName || 'User'}</td>
                                    <td>${u.phoneNumber}</td>
                                    <td>
                                        ${u.isPremium ?
                '<span class="badge badge-success">Premium</span>' :
                '<span class="badge" style="background:var(--bg-tertiary);color:var(--text-secondary)">Basic</span>'}
                                    </td>
                                    <td>${u.limit}</td>
                                    <td>${u.balance}</td>
                                    <td>
                                        <button onclick="editUser('${u.phoneNumber}', ${u.isPremium}, ${u.limit}, ${u.balance})" class="btn btn-secondary" style="padding: 4px 10px; font-size: 12px;">Edit</button>
                                    </td>
                                </tr>
                            `).join('')}
                                        ${users.length === 0 ? '<tr><td colspan="6" style="text-align:center; padding: 20px;">No users found yet.</td></tr>' : ''}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <!--Edit User Modal-- >
                    <div id="editModal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:1000; align-items:center; justify-content:center;">
                        <div class="card" style="width: 100%; max-width: 400px;">
                            <div class="card-header">
                                <div class="card-title">Edit User</div>
                                <button onclick="closeModal()" style="background:none; border:none; color:white; font-size: 20px; cursor:pointer;">&times;</button>
                            </div>
                            <form action="/wa-users/update" method="POST">
                                <input type="hidden" name="phoneNumber" id="editPhone">

                                    <div class="form-group">
                                        <label class="form-label">Phone</label>
                                        <input type="text" id="displayPhone" class="form-input" disabled style="opacity: 0.7;">
                                    </div>

                                    <div class="form-group">
                                        <label class="form-label">Plan</label>
                                        <select name="isPremium" id="editPremium" class="form-input">
                                            <option value="false">Basic</option>
                                            <option value="true">Premium</option>
                                        </select>
                                    </div>

                                    <div class="form-group">
                                        <label class="form-label">Limit</label>
                                        <input type="number" name="limit" id="editLimit" class="form-input">
                                    </div>

                                    <div class="form-group">
                                        <label class="form-label">Balance</label>
                                        <input type="number" name="balance" id="editBalance" class="form-input">
                                    </div>

                                    <div style="display:flex; justify-content:flex-end; gap: 10px; margin-top: 20px;">
                                        <button type="button" onclick="closeModal()" class="btn btn-secondary">Cancel</button>
                                        <button type="submit" class="btn btn-primary">Save Changes</button>
                                    </div>
                            </form>
                        </div>
                    </div>

                    <script>
                        function editUser(phone, isPremium, limit, balance) {
                            document.getElementById('editModal').style.display = 'flex';
                        document.getElementById('editPhone').value = phone;
                        document.getElementById('displayPhone').value = phone;
                        document.getElementById('editPremium').value = isPremium.toString();
                        document.getElementById('editLimit').value = limit;
                        document.getElementById('editBalance').value = balance;
            }
                        function closeModal() {
                            document.getElementById('editModal').style.display = 'none';
            }
                    </script>
`;
    }
};
