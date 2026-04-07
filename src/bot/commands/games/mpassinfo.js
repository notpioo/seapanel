const mpassCore = require('./mpass');

module.exports = {
    name: 'mpassinfo',
    description: 'Cek progress dan status Mining Pass kamu',
    category: 'games',
    usage: '.mpassinfo',
    execute: mpassCore.execute
};
