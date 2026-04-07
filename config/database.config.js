/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                    DATABASE CONFIGURATION                    ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

module.exports = {
    // MongoDB Connection
    mongoUri: process.env.MONGODB_URI || 'mongodb+srv://sea:Avionika27@seapanel.smo7cqy.mongodb.net/sankabot?retryWrites=true&w=majority',

    // Database name
    dbName: 'sankabot',

    // Connection options
    options: {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
    },
};
