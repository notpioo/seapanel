/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                    COMMAND LOADER                            ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

const fs = require('fs');
const path = require('path');
const Logger = require('../../utils/logger');

const logger = new Logger('CommandLoader');

/**
 * Command Loader Class
 * Loads all commands from the commands directory
 */
class CommandLoader {
    constructor() {
        this.commands = new Map();
        this.aliases = new Map();
        this.loadCommands();
    }

    /**
     * Load all commands from commands directory
     */
    loadCommands() {
        const commandsPath = path.join(__dirname);
        this._scanDirectory(commandsPath);
    }

    /**
     * Recursively scan directory for command files
     */
    _scanDirectory(dirPath) {
        const entries = fs.readdirSync(dirPath);

        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                // Recursively scan subdirectories
                this._scanDirectory(fullPath);
                continue;
            }

            // Skip non-JS or the loader itself
            if (!entry.endsWith('.js') || fullPath === __filename) continue;

            try {
                const command = require(fullPath);

                // Validate command structure
                if (!command.name || !command.execute) {
                    logger.warn(`Invalid command file: ${entry}`);
                    continue;
                }

                // Register command
                this.commands.set(command.name.toLowerCase(), command);

                // Register aliases
                if (command.aliases && Array.isArray(command.aliases)) {
                    for (const alias of command.aliases) {
                        this.aliases.set(alias.toLowerCase(), command.name.toLowerCase());
                    }
                }

                logger.debug(`Loaded command: ${command.name}`);
            } catch (error) {
                logger.error(`Error loading command ${entry}:`, error);
            }
        }

        logger.info(`Loaded ${this.commands.size} commands`);
    }

    /**
     * Get a command by name or alias
     */
    getCommand(name) {
        const lowerName = name.toLowerCase();

        // Check direct command
        if (this.commands.has(lowerName)) {
            return this.commands.get(lowerName);
        }

        // Check alias
        if (this.aliases.has(lowerName)) {
            const commandName = this.aliases.get(lowerName);
            return this.commands.get(commandName);
        }

        return null;
    }

    /**
     * Get all commands
     */
    getAllCommands() {
        return Array.from(this.commands.values());
    }

    /**
     * Get commands by category
     */
    getCommandsByCategory(category) {
        return this.getAllCommands()
            .filter(cmd => cmd.category === category);
    }

    /**
     * Get all categories
     */
    getCategories() {
        const categories = new Set();
        this.getAllCommands().forEach(cmd => {
            if (cmd.category) {
                categories.add(cmd.category);
            }
        });
        return Array.from(categories);
    }
}

module.exports = CommandLoader;
