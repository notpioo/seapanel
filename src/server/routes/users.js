const express = require('express');
const { User } = require('../../models');
const authConfig = require('../../../config/auth.config');
const Logger = require('../../utils/logger');
const logger = new Logger('UsersRoutes');

module.exports = {
    setupRoutes: (app, requireAuth) => {
        // No POST routes for Users yet
    },

    getUsersPage: async () => {
            let users = [];
            try {
                users = await User.find({}, '-password').sort({ createdAt: -1 });
            } catch (e) {
                logger.error('Failed to fetch users from DB', e);
                users = authConfig.users;
            }
    
            return `
        <header class="header">
            <h1 class="header-title">Users</h1>
        </header>
    
        <div class="content">
            <div class="card">
                <div class="card-header">
                    <div>
                        <div class="card-title">User Management</div>
                        <div class="card-subtitle">Manage panel users</div>
                    </div>
                </div>
                <table class="table">
                    <thead>
                        <tr>
                            <th>Username</th>
                            <th>Name</th>
                            <th>Role</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${users.map(u => `
                                <tr>
                                    <td>${u.username}</td>
                                    <td>${u.name}</td>
                                    <td><span class="badge badge-${u.role}">${u.role}</span></td>
                                    <td>
                                        ${u.isActive !== false ?
                    '<span class="badge badge-success">Active</span>' :
                    '<span class="badge badge-warning">Inactive</span>'}
                                    </td>
                                </tr>
                            `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    }
};
