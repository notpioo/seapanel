/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                  MONGO AUTH STATE ADAPTER                    ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

const baileysModule = require('sanka-baileyss');
const baileys = baileysModule.default || baileysModule;

const initAuthCreds = baileys.initAuthCreds || baileysModule.initAuthCreds;
const BufferJSON = baileys.BufferJSON || baileysModule.BufferJSON;
const proto = baileys.proto || baileysModule.proto;

if (!initAuthCreds) {
    console.error('[FATAL] initAuthCreds missing!');
    console.log('[DEBUG] baileysModule keys:', Object.keys(baileysModule));
    if (baileysModule.default) {
        console.log('[DEBUG] baileysModule.default keys:', Object.keys(baileysModule.default));
    }
}
const { Session } = require('../models');
const Logger = require('./logger');

const logger = new Logger('MongoAuth');

const useMongoAuthState = async (sessionId) => {
    // Helper to write data to DB
    const writeData = async (data, id) => {
        try {
            await Session.findOneAndUpdate(
                { sessionId, id },
                {
                    sessionId,
                    id,
                    data: JSON.parse(JSON.stringify(data, BufferJSON.replacer))
                },
                { upsert: true, new: true }
            );
        } catch (error) {
            logger.error(`Failed to save session data ${id}:`, error);
        }
    };

    // Helper to read data from DB
    const readData = async (id) => {
        try {
            const result = await Session.findOne({ sessionId, id });
            if (result && result.data) {
                return JSON.parse(JSON.stringify(result.data), BufferJSON.reviver);
            }
            return null;
        } catch (error) {
            logger.error(`Failed to read session data ${id}:`, error);
            return null;
        }
    };

    // Helper to delete data from DB
    const removeData = async (id) => {
        try {
            await Session.deleteOne({ sessionId, id });
        } catch (error) {
            logger.error(`Failed to remove session data ${id}:`, error);
        }
    };

    // Initialize creds
    const creds = (await readData('creds')) || initAuthCreds();

    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const data = {};
                    await Promise.all(
                        ids.map(async (id) => {
                            let value = await readData(`${type}-${id}`);
                            if (type === 'app-state-sync-key' && value) {
                                value = proto.Message.AppStateSyncKeyData.fromObject(value);
                            }
                            data[id] = value;
                        })
                    );
                    return data;
                },
                set: async (data) => {
                    const tasks = [];
                    for (const category in data) {
                        for (const id in data[category]) {
                            const value = data[category][id];
                            const key = `${category}-${id}`;
                            if (value) {
                                tasks.push(writeData(value, key));
                            } else {
                                tasks.push(removeData(key));
                            }
                        }
                    }
                    await Promise.all(tasks);
                },
            },
        },
        saveCreds: () => {
            return writeData(creds, 'creds');
        },
    };
};

module.exports = useMongoAuthState;
