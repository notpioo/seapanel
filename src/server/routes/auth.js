
const express = require('express');
const { User, Session, AuthToken } = require('../../models');
const authConfig = require('../../../config/auth.config');
const Logger = require('../../utils/logger');
const logger = new Logger('AuthRoutes');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const config = require('../../../config/bot.config');

module.exports = {
    setupRoutes: (app, sessionHelpers, getCSS) => {
        const { getSession, createSession, destroySession, findUser } = sessionHelpers;

        app.get('/auth/magic', async (req, res) => {
            try {
                const { token } = req.query;
                if (!token) return res.send('Invalid token.');

                const authToken = await AuthToken.findOne({ token });
                if (!authToken) return res.send('Token expired or invalid.');

                // Render a confirmation page
                res.send(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Magic Login | ${config.bot.name}</title>
                        <style>
                            body { font-family: 'Inter', sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #0f172a; color: white; margin: 0; }
                            .box { background: #1e293b; padding: 30px; border-radius: 12px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1); width: 90%; max-width: 400px; }
                            h2 { margin-top: 0; color: #38bdf8; }
                            p { color: #cbd5e1; margin-bottom: 25px; }
                            button { background: #0284c7; color: white; border: none; padding: 12px 24px; border-radius: 6px; font-size: 16px; font-weight: bold; cursor: pointer; transition: background 0.2s; width: 100%; }
                            button:hover { background: #0369a1; }
                        </style>
                    </head>
                    <body>
                        <div class="box">
                            <h2>✨ Login Authentication</h2>
                            <p>Hi <b>${authToken.name}</b>, click the button below to complete your login securely.</p>
                            <form action="/auth/magic" method="POST">
                                <input type="hidden" name="token" value="${token}">
                                <button type="submit">Verify & Login</button>
                            </form>
                        </div>
                    </body>
                    </html>
                `);
            } catch (error) {
                logger.error('Magic link preview error:', error);
                res.send('Error loading page.');
            }
        });

        app.post('/auth/magic', async (req, res) => {
            try {
                const { token } = req.body;
                if (!token) return res.send('Invalid token.');

                const authToken = await AuthToken.findOne({ token });
                if (!authToken) return res.send('Token expired or invalid.');

                // Link to 'User' Collection if they registered via Web Form
                let userObj;
                let registeredUser = await User.findOne({ linkedPhoneNumber: authToken.userId });

                if (registeredUser) {
                    // Sync Admin Role to Registered Account
                    if (authToken.role.toLowerCase() === 'admin' && registeredUser.role !== 'admin') {
                        registeredUser.role = 'admin';
                        await registeredUser.save();
                    }

                    userObj = {
                        id: registeredUser._id || registeredUser.id,
                        username: registeredUser.username,
                        role: registeredUser.role,
                        name: authToken.name !== 'Player' ? authToken.name : (registeredUser.name || 'Player')
                    };
                } else {
                    // Fallback to purely WA-based temporary session
                    userObj = {
                        id: authToken.userId,
                        username: authToken.userId,
                        role: authToken.role.toLowerCase(),
                        name: authToken.name
                    };
                }

                const sessionToken = createSession(userObj);
                res.setHeader('Set-Cookie', `token=${sessionToken}; Path=/; HttpOnly; Max-Age=${authConfig.sessionExpiry / 1000}`);

                // NOT deleting the token anymore so it can be reused multiple times 
                // within the 1-hour expiry window defined in MongoDB TTL.

                res.redirect('/');
            } catch (error) {
                logger.error('Magic login confirm error:', error);
                res.send('Login failed.');
            }
        });
        const renderLoginPage = module.exports.renderLoginPage;
        const renderRegisterPage = module.exports.renderRegisterPage;

        app.get('/login', (req, res) => {
            const token = req.cookies.token;
            if (getSession(token)) {
                return res.redirect('/');
            }
            res.send(renderLoginPage(null, getCSS));
        });

        app.post('/login', async (req, res) => {
            const { username, password } = req.body;

            const user = await findUser(username, password);
            if (!user) {
                return res.send(renderLoginPage('Invalid username or password', getCSS));
            }

            // Update last login if Mongo user
            if (user.save) {
                user.lastLogin = new Date();
                await user.save().catch(e => logger.error('Failed to update last login', e));
            }

            logger.info(`User login: ${username}`);

            // Create session
            const token = createSession(user);
            res.setHeader('Set-Cookie', `token=${token}; Path=/; HttpOnly; Max-Age=${authConfig.sessionExpiry / 1000}`);
            res.redirect('/');
        });

        app.get('/register', (req, res) => {
            const token = req.cookies.token;
            if (getSession(token)) {
                return res.redirect('/');
            }
            res.send(renderRegisterPage(null, null, getCSS));
        });

        app.post('/register', async (req, res) => {
            try {
                let { username, password, confirmPassword, phoneNumber } = req.body;

                // Validation
                if (!username || !password || !confirmPassword || !phoneNumber) {
                    return res.send(renderRegisterPage('All fields are required', null, getCSS));
                }

                if (username.length < 3 || username.length > 20) {
                    return res.send(renderRegisterPage('Username must be 3-20 characters', null, getCSS));
                }

                if (!/^[a-zA-Z0-9]+$/.test(username)) {
                    return res.send(renderRegisterPage('Username can only contain letters and numbers', null, getCSS));
                }

                // Password Validation
                if (password.length < 6) {
                    return res.send(renderRegisterPage('Password must be at least 6 characters', null, getCSS));
                }

                if (password !== confirmPassword) {
                    return res.send(renderRegisterPage('Passwords do not match', null, getCSS));
                }

                // Phone Number Normalization & Validation
                phoneNumber = phoneNumber.replace(/[\s-]/g, '');
                if (phoneNumber.startsWith('08')) {
                    phoneNumber = '62' + phoneNumber.substring(1);
                } else if (!phoneNumber.startsWith('62')) {
                    // Assume user entered 8xxx without 0 or 62 (unlikely but safe to handle or reject)
                    // Better to strict check
                }

                if (!/^628\d{8,15}$/.test(phoneNumber)) {
                    return res.send(renderRegisterPage('Invalid WhatsApp number. Use format: 08xxx or 628xxx', null, getCSS));
                }

                // Check if user exists
                const existingUser = await User.findOne({ username: username.toLowerCase() });
                if (existingUser) {
                    return res.send(renderRegisterPage('Username already taken', null, getCSS));
                }

                // Check if phone number is already linked
                const existingPhone = await User.findOne({ linkedPhoneNumber: phoneNumber });
                if (existingPhone) {
                    return res.send(renderRegisterPage('This WhatsApp number is already linked to another account', null, getCSS));
                }

                // Create new user
                const newUser = new User({
                    username: username.toLowerCase(),
                    password: password, // Will be hashed by model
                    name: username.charAt(0).toUpperCase() + username.slice(1), // Auto-fill name from username
                    linkedPhoneNumber: phoneNumber,
                    role: 'user',
                    isActive: true,
                    createdAt: new Date()
                });

                await newUser.save();
                logger.info(`New user registered: ${username} (linked: ${phoneNumber})`);

                // Auto-login after register
                const token = createSession(newUser); // Fixed: this.createSession -> createSession arg
                res.setHeader('Set-Cookie', `token=${token}; Path=/; HttpOnly; Max-Age=${authConfig.sessionExpiry / 1000}`);
                res.redirect('/');

            } catch (error) {
                logger.error('Register error:', error);
                return res.send(renderRegisterPage('Registration failed. Please try again.', null, getCSS));
            }
        });

        app.get('/logout', (req, res) => {
            const token = req.cookies.token;
            destroySession(token);
            res.setHeader('Set-Cookie', 'token=; Path=/; HttpOnly; Max-Age=0');
            res.redirect('/login');
        });
    },

    renderLoginPage: (error = null, getCSS) => {
        const templatePath = path.join(__dirname, '../views', 'login.html'); // Adjusted path: '../views' if auth.js is in routes/
        let html = fs.readFileSync(templatePath, 'utf-8');

        html = html.replace(/\{\{BOT_NAME\}\}/g, config.bot.name);
        html = html.replace(/\{\{PAGE_TITLE\}\}/g, config.webPanel.title);

        const cssContent = getCSS();
        if (html.includes('/*CSS_INJECT_HERE*/')) {
            html = html.replace('/*CSS_INJECT_HERE*/', cssContent);
        } else {
            console.warn('[WARN] Login template missing CSS placeholder /*CSS_INJECT_HERE*/');
            html = html.replace(/\{\{CSS\}\}/g, () => cssContent);
        }

        html = html.replace(/\{\{ERROR_MESSAGE\}\}/g, error ? `<div class="login-error">${error}</div>` : '');

        return html;
    },

    renderRegisterPage: (error = null, success = null, getCSS) => {
        const templatePath = path.join(__dirname, '../views', 'register.html'); // Adjusted path
        let html = fs.readFileSync(templatePath, 'utf-8');

        html = html.replace(/\{\{BOT_NAME\}\}/g, config.bot.name);
        html = html.replace(/\{\{PAGE_TITLE\}\}/g, config.webPanel.title);

        const cssContent = getCSS();
        if (html.includes('/*CSS_INJECT_HERE*/')) {
            html = html.replace('/*CSS_INJECT_HERE*/', cssContent);
        } else {
            console.warn('[WARN] Register template missing CSS placeholder /*CSS_INJECT_HERE*/');
            html = html.replace(/\{\{CSS\}\}/g, () => cssContent);
        }

        html = html.replace(/\{\{ERROR_MESSAGE\}\}/g, error ? `<div class="login-error">${error}</div>` : '');
        html = html.replace(/\{\{SUCCESS_MESSAGE\}\}/g, success ? `<div class="login-success">${success}</div>` : '');

        return html;
    }
};
