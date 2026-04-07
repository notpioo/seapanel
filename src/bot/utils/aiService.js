/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║                    AI SERVICE (QWEN)                          ║
 * ║          Handles communication with Qwen API                 ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

const Logger = require('../../utils/logger');
const logger = new Logger('AIService');

// Dashscope OpenAI-compatible endpoint
const QWEN_API_URL = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions';

class AIService {
    constructor() {
        this.apiKey = process.env.QWEN_API_KEY || '';
        this.cooldowns = new Map(); // groupJid -> last response timestamp
    }

    /**
     * Check if API key is configured
     */
    isConfigured() {
        return !!this.apiKey;
    }

    /**
     * Check if group is on cooldown
     */
    isOnCooldown(groupJid, cooldownSeconds = 3) {
        const lastTime = this.cooldowns.get(groupJid);
        if (!lastTime) return false;
        return (Date.now() - lastTime) < (cooldownSeconds * 1000);
    }

    /**
     * Set cooldown for a group
     */
    setCooldown(groupJid) {
        this.cooldowns.set(groupJid, Date.now());
    }

    /**
     * Build messages array from chat history + current message
     */
    buildMessages(systemPrompt, chatHistory, currentMessage, senderName) {
        const messages = [];

        // System prompt
        messages.push({
            role: 'system',
            content: systemPrompt,
        });

        // Add chat history for context
        for (const msg of chatHistory) {
            if (msg.role === 'user') {
                messages.push({
                    role: 'user',
                    content: `[${msg.senderName}]: ${msg.content}`,
                });
            } else {
                messages.push({
                    role: 'assistant',
                    content: msg.content,
                });
            }
        }

        // Current message
        messages.push({
            role: 'user',
            content: `[${senderName}]: ${currentMessage}`,
        });

        return messages;
    }

    /**
     * Send chat to Qwen API and get response
     */
    async chat(model, systemPrompt, chatHistory, userMessage, senderName) {
        if (!this.isConfigured()) {
            throw new Error('QWEN_API_KEY belum dikonfigurasi di .env');
        }

        const messages = this.buildMessages(systemPrompt, chatHistory, userMessage, senderName);

        try {
            const response = await fetch(QWEN_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({
                    model: model || 'qwen3.5-plus',
                    messages,
                    max_tokens: 1024,
                    temperature: 0.7,
                    top_p: 0.9,
                }),
            });

            if (!response.ok) {
                const errorBody = await response.text();
                logger.error(`Qwen API error ${response.status}: ${errorBody}`);
                throw new Error(`Qwen API error: ${response.status}`);
            }

            const data = await response.json();

            if (!data.choices || !data.choices[0]?.message?.content) {
                throw new Error('Invalid response from Qwen API');
            }

            const aiReply = data.choices[0].message.content.trim();

            // Log token usage if available
            if (data.usage) {
                logger.debug(`Tokens used - prompt: ${data.usage.prompt_tokens}, completion: ${data.usage.completion_tokens}`);
            }

            return aiReply;
        } catch (error) {
            if (error.message.includes('Qwen API error')) {
                throw error;
            }
            logger.error('AI Service error:', error.message);
            throw new Error(`Gagal menghubungi AI: ${error.message}`);
        }
    }
}

// Singleton instance
const aiService = new AIService();

module.exports = aiService;
