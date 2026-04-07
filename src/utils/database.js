/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                    DATABASE CONNECTION                       ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

const mongoose = require('mongoose');
const dbConfig = require('../../config/database.config');
const Logger = require('./logger');

const logger = new Logger('Database');

class Database {
    constructor() {
        this.isConnected = false;
    }

    async connect() {
        try {
            logger.info('Connecting to MongoDB...');

            await mongoose.connect(dbConfig.mongoUri, dbConfig.options);

            this.isConnected = true;
            logger.success('Connected to MongoDB successfully!');

            // Handle connection events
            mongoose.connection.on('error', (err) => {
                logger.error('MongoDB connection error:', err);
            });

            mongoose.connection.on('disconnected', () => {
                logger.warn('MongoDB disconnected');
                this.isConnected = false;
            });

            mongoose.connection.on('reconnected', () => {
                logger.info('MongoDB reconnected');
                this.isConnected = true;
            });

            return true;
        } catch (error) {
            logger.error('Failed to connect to MongoDB:', error.message);
            this.isConnected = false;
            return false;
        }
    }

    async disconnect() {
        try {
            await mongoose.disconnect();
            this.isConnected = false;
            logger.info('Disconnected from MongoDB');
        } catch (error) {
            logger.error('Error disconnecting from MongoDB:', error);
        }
    }

    getConnection() {
        return mongoose.connection;
    }
}

module.exports = new Database();
