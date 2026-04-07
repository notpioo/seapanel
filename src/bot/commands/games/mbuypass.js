const mpassCore = require('./mpass');

module.exports = {
    name: 'mbuypass',
    description: 'Beli Mining Pass VIP untuk mendapatkan hadiah harian',
    category: 'games',
    usage: '.mbuypass',
    execute: mpassCore.execute
};
