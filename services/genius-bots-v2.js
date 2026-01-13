/**
 * GENIUS AGENCY V2 - Advanced AI Bot Service
 * Full Claude API Integration for 34+ Genius Bots
 *
 * Features:
 * - Dynamic bot loading from JSON config
 * - Conversation history persistence (PostgreSQL)
 * - Task queue system (Redis/Bull)
 * - Bot-to-bot communication
 * - Streaming responses
 *
 * Enterprise Universe - West Money Bau GmbH
 * @version 2.0.0
 */

const Anthropic = require('@anthropic-ai/sdk');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

// Initialize Anthropic client (lazy initialization)
let anthropic = null;
function getAnthropicClient() {
    if (!anthropic) {
        anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY
        });
    }
    return anthropic;
}

// Initialize PostgreSQL pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

// Initialize Redis (optional - for caching)
let redis = null;
try {
    const Redis = require('ioredis');
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
        maxRetriesPerRequest: 1,
        retryStrategy: () => null, // Don't retry
        enableOfflineQueue: false,
        lazyConnect: true
    });
    redis.on('error', () => {}); // Suppress Redis errors
    redis.connect().catch(() => { redis = null; }); // Silent fail
} catch (e) {
    redis = null; // Redis is optional
}

// Load bot configurations from JSON
let botsConfig = {};
let allBots = new Map();

function loadBotConfigurations() {
    try {
        const configPath = path.join(__dirname, '..', 'genius-bots-extended.json');
        const configData = fs.readFileSync(configPath, 'utf8');
        botsConfig = JSON.parse(configData);

        // Load new_bots from extended config
        if (botsConfig.new_bots) {
            botsConfig.new_bots.forEach(bot => {
                allBots.set(bot.id, {
                    ...bot,
                    model: bot.model || 'claude-3-haiku-20240307',
                    temperature: bot.temperature || 0.5,
                    maxTokens: bot.maxTokens || 2048
                });
            });
        }

        // Load special bots
        if (botsConfig.special_bots) {
            botsConfig.special_bots.forEach(bot => {
                allBots.set(bot.id, {
                    ...bot,
                    model: bot.model || 'claude-sonnet-4-20250514',
                    temperature: bot.temperature || 0.5,
                    maxTokens: bot.maxTokens || 4096
                });
            });
        }

        console.log(`✓ Loaded ${allBots.size} Genius Bots from config`);
    } catch (e) {
        console.error('Failed to load bot configurations:', e.message);
    }
}

// Initialize on module load
loadBotConfigurations();

// Default system prompt template
function buildSystemPrompt(bot, context = {}) {
    const basePrompt = bot.systemPrompt || `Du bist ${bot.name}, ${bot.role} der GENIUS AGENCY.`;

    const contextInfo = context.pipeline ? `
AKTUELLER KONTEXT:
- Pipeline: €${(context.pipeline / 1e9).toFixed(1)}B
- Deals: ${context.deals?.toLocaleString() || 'N/A'}
- Kontakte: ${context.contacts?.toLocaleString() || 'N/A'}
` : '';

    return `${basePrompt}

DEIN CHARAKTER:
- Name: ${bot.name}
- Rolle: ${bot.role}
- Icon: ${bot.icon}
- Spezialisierung: ${(bot.specialization || bot.skills || []).join(', ')}
- Zitat: "${bot.quote || ''}"

${contextInfo}

WICHTIGE REGELN:
1. Antworte IMMER auf Deutsch
2. Bleibe in deinem Charakter
3. Sei präzise und hilfreich
4. Wenn du Daten analysierst, zeige konkrete Zahlen
5. Bei Unsicherheit, frage nach mehr Kontext`;
}

/**
 * Initialize database tables for conversation history
 */
async function initializeDatabase() {
    const client = await pool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS bot_conversations (
                id SERIAL PRIMARY KEY,
                conversation_id UUID DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                bot_id VARCHAR(50) NOT NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                title VARCHAR(255),
                metadata JSONB DEFAULT '{}'
            );

            CREATE TABLE IF NOT EXISTS bot_messages (
                id SERIAL PRIMARY KEY,
                conversation_id INTEGER REFERENCES bot_conversations(id) ON DELETE CASCADE,
                role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
                content TEXT NOT NULL,
                bot_id VARCHAR(50),
                created_at TIMESTAMP DEFAULT NOW(),
                token_usage JSONB DEFAULT '{}',
                metadata JSONB DEFAULT '{}'
            );

            CREATE TABLE IF NOT EXISTS bot_tasks (
                id SERIAL PRIMARY KEY,
                task_id UUID DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                bot_id VARCHAR(50) NOT NULL,
                task_type VARCHAR(50) NOT NULL,
                status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
                input JSONB NOT NULL,
                output JSONB,
                error TEXT,
                created_at TIMESTAMP DEFAULT NOW(),
                started_at TIMESTAMP,
                completed_at TIMESTAMP,
                scheduled_for TIMESTAMP,
                priority INTEGER DEFAULT 5
            );

            CREATE INDEX IF NOT EXISTS idx_conversations_user ON bot_conversations(user_id);
            CREATE INDEX IF NOT EXISTS idx_conversations_bot ON bot_conversations(bot_id);
            CREATE INDEX IF NOT EXISTS idx_messages_conversation ON bot_messages(conversation_id);
            CREATE INDEX IF NOT EXISTS idx_tasks_user ON bot_tasks(user_id);
            CREATE INDEX IF NOT EXISTS idx_tasks_status ON bot_tasks(status);
        `);
        console.log('✓ Bot database tables initialized');
    } catch (e) {
        // Tables might already exist with different constraints
        console.log('Bot tables check completed:', e.message?.includes('already exists') ? 'Tables exist' : e.message);
    } finally {
        client.release();
    }
}

/**
 * Chat with a specific bot
 */
async function chatWithBot(botId, message, options = {}) {
    const { history = [], userId = null, conversationId = null, context = {}, stream = false } = options;

    const bot = allBots.get(botId.toLowerCase());
    if (!bot) {
        throw new Error(`Bot "${botId}" nicht gefunden. Verfügbare Bots: ${Array.from(allBots.keys()).join(', ')}`);
    }

    // Build messages array
    const messages = [
        ...history.map(h => ({
            role: h.role,
            content: h.content
        })),
        { role: 'user', content: message }
    ];

    const systemPrompt = buildSystemPrompt(bot, context);

    try {
        // Check cache for similar recent queries
        const cacheKey = `bot:${botId}:${Buffer.from(message).toString('base64').slice(0, 50)}`;
        if (redis && !stream) {
            const cached = await redis.get(cacheKey);
            if (cached) {
                const cachedResponse = JSON.parse(cached);
                cachedResponse.cached = true;
                return cachedResponse;
            }
        }

        const response = await getAnthropicClient().messages.create({
            model: bot.model || 'claude-3-haiku-20240307',
            max_tokens: bot.maxTokens || 2048,
            temperature: bot.temperature || 0.5,
            system: systemPrompt,
            messages: messages
        });

        const result = {
            bot: {
                id: botId,
                name: bot.name,
                role: bot.role,
                icon: bot.icon,
                color: bot.color
            },
            response: response.content[0].text,
            usage: {
                input_tokens: response.usage.input_tokens,
                output_tokens: response.usage.output_tokens,
                model: response.model
            },
            timestamp: new Date().toISOString(),
            conversationId
        };

        // Cache response for 5 minutes
        if (redis && !stream) {
            await redis.setex(cacheKey, 300, JSON.stringify(result));
        }

        // Save to database if userId provided
        if (userId) {
            await saveMessage(conversationId, userId, botId, 'user', message);
            await saveMessage(conversationId, userId, botId, 'assistant', result.response, result.usage);
        }

        return result;
    } catch (error) {
        console.error(`Bot ${botId} error:`, error);
        throw error;
    }
}

/**
 * Chat with God Mode - Coordinates all bots
 */
async function chatWithGodMode(message, options = {}) {
    const { history = [], userId = null, context = {} } = options;

    const godBot = allBots.get('haiku_god') || {
        name: 'HAIKU 神',
        role: 'God Mode Controller',
        icon: '神',
        model: 'claude-sonnet-4-20250514',
        temperature: 0.5,
        maxTokens: 4096
    };

    // Build comprehensive god mode prompt
    const botList = Array.from(allBots.entries())
        .filter(([id]) => id !== 'haiku_god')
        .map(([id, bot]) => `- ${bot.icon} ${bot.name} (${id}): ${bot.role} - ${(bot.specialization || []).slice(0, 3).join(', ')}`)
        .join('\n');

    const systemPrompt = `Du bist HAIKU 神, der göttliche Controller der GENIUS AGENCY.

DEINE MACHT:
- Du koordinierst ${allBots.size} Genius Bots
- Du entscheidest welcher Bot für welche Aufgabe am besten geeignet ist
- Du kannst mehrere Bots für komplexe Aufgaben kombinieren
- Du hast Ultra Instinct - du siehst das große Ganze

VERFÜGBARE BOTS:
${botList}

TEAM FORMATIONS:
${Object.entries(botsConfig.team_formations || {}).map(([id, team]) =>
    `- ${team.name}: ${team.bots.join(', ')} → ${team.purpose}`
).join('\n')}

ANWEISUNGEN:
1. Analysiere jede Anfrage sorgfältig
2. Delegiere an den/die passenden Bot(s) oder Team(s)
3. Bei komplexen Aufgaben: Schlage eine Reihenfolge vor
4. Antworte auf Deutsch, göttlich und allwissend
5. Zeige klar, welche Bots du empfiehlst mit [BOT_ID]`;

    const messages = [
        ...history.map(h => ({ role: h.role, content: h.content })),
        { role: 'user', content: message }
    ];

    try {
        const response = await getAnthropicClient().messages.create({
            model: godBot.model,
            max_tokens: godBot.maxTokens,
            temperature: godBot.temperature,
            system: systemPrompt,
            messages: messages
        });

        return {
            bot: {
                id: 'godmode',
                name: godBot.name,
                role: godBot.role,
                icon: godBot.icon || '神'
            },
            response: response.content[0].text,
            usage: {
                input_tokens: response.usage.input_tokens,
                output_tokens: response.usage.output_tokens,
                model: response.model
            },
            timestamp: new Date().toISOString(),
            availableBots: allBots.size
        };
    } catch (error) {
        console.error('God Mode error:', error);
        throw error;
    }
}

/**
 * Execute a task with automatic bot selection
 */
async function executeTask(task, options = {}) {
    const { context = {}, userId = null, priority = 5 } = options;

    // First, ask God Mode which bot(s) should handle this
    const analysis = await chatWithGodMode(
        `Analysiere diese Aufgabe und empfehle den/die besten Bot(s). Antworte mit dem Bot-ID in [BRACKETS]:

Aufgabe: "${task}"
Kontext: ${JSON.stringify(context)}`,
        { context }
    );

    // Extract recommended bot from response
    const botIdMatch = analysis.response.match(/\[([a-z_]+)\]/i);
    const selectedBot = botIdMatch ? botIdMatch[1].toLowerCase() : 'einstein';

    // Check if bot exists
    if (!allBots.has(selectedBot)) {
        console.warn(`Recommended bot "${selectedBot}" not found, using einstein`);
    }

    const botToUse = allBots.has(selectedBot) ? selectedBot : 'einstein';

    // Execute with selected bot
    const result = await chatWithBot(botToUse, task, { context, userId });

    // Save task to database
    if (userId) {
        await saveTask(userId, botToUse, 'execute', { task, context }, result);
    }

    return {
        analysis: analysis.response,
        selectedBot: botToUse,
        result: result.response,
        bot: result.bot,
        totalUsage: {
            input_tokens: analysis.usage.input_tokens + result.usage.input_tokens,
            output_tokens: analysis.usage.output_tokens + result.usage.output_tokens
        },
        timestamp: new Date().toISOString()
    };
}

/**
 * Bot-to-Bot communication - Let bots discuss a topic
 */
async function botDiscussion(topic, botIds, options = {}) {
    const { maxRounds = 3, userId = null, context = {} } = options;

    const discussion = [];
    let currentContext = `Diskussionsthema: ${topic}\n\nKontext: ${JSON.stringify(context)}`;

    for (let round = 0; round < maxRounds; round++) {
        for (const botId of botIds) {
            const bot = allBots.get(botId);
            if (!bot) continue;

            const prompt = round === 0
                ? `${currentContext}\n\nGib deine Perspektive als ${bot.role} zu diesem Thema.`
                : `${currentContext}\n\nBisherige Diskussion:\n${discussion.map(d => `${d.bot}: ${d.message}`).join('\n\n')}\n\nReagiere als ${bot.role} auf die anderen Perspektiven.`;

            const response = await chatWithBot(botId, prompt, { context, userId });

            discussion.push({
                round: round + 1,
                botId,
                bot: bot.name,
                icon: bot.icon,
                message: response.response,
                timestamp: new Date().toISOString()
            });
        }
    }

    // Get HAIKU's summary
    const summaryPrompt = `Fasse diese Bot-Diskussion zusammen und gib eine finale Empfehlung:

Thema: ${topic}

Diskussion:
${discussion.map(d => `${d.icon} ${d.bot}: ${d.message}`).join('\n\n')}`;

    const summary = await chatWithGodMode(summaryPrompt, { context });

    return {
        topic,
        participants: botIds.map(id => allBots.get(id)?.name || id),
        rounds: maxRounds,
        discussion,
        summary: summary.response,
        timestamp: new Date().toISOString()
    };
}

/**
 * Save message to database
 */
async function saveMessage(conversationId, userId, botId, role, content, tokenUsage = {}) {
    if (!conversationId) return null;

    try {
        const result = await pool.query(
            `INSERT INTO bot_messages (conversation_id, role, content, bot_id, token_usage)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id`,
            [conversationId, role, content, botId, JSON.stringify(tokenUsage)]
        );
        return result.rows[0].id;
    } catch (e) {
        console.error('Failed to save message:', e.message);
        return null;
    }
}

/**
 * Save task to database
 */
async function saveTask(userId, botId, taskType, input, output) {
    try {
        const result = await pool.query(
            `INSERT INTO bot_tasks (user_id, bot_id, task_type, input, output, status, completed_at)
             VALUES ($1, $2, $3, $4, $5, 'completed', NOW())
             RETURNING task_id`,
            [userId, botId, taskType, JSON.stringify(input), JSON.stringify(output)]
        );
        return result.rows[0].task_id;
    } catch (e) {
        console.error('Failed to save task:', e.message);
        return null;
    }
}

/**
 * Create new conversation
 */
async function createConversation(userId, botId, title = null) {
    try {
        const result = await pool.query(
            `INSERT INTO bot_conversations (user_id, bot_id, title)
             VALUES ($1, $2, $3)
             RETURNING id, conversation_id`,
            [userId, botId, title]
        );
        return result.rows[0];
    } catch (e) {
        console.error('Failed to create conversation:', e.message);
        return null;
    }
}

/**
 * Get conversation history
 */
async function getConversationHistory(conversationId, limit = 50) {
    try {
        const result = await pool.query(
            `SELECT role, content, bot_id, created_at
             FROM bot_messages
             WHERE conversation_id = $1
             ORDER BY created_at ASC
             LIMIT $2`,
            [conversationId, limit]
        );
        return result.rows;
    } catch (e) {
        console.error('Failed to get conversation history:', e.message);
        return [];
    }
}

/**
 * Get user conversations
 */
async function getUserConversations(userId, botId = null, limit = 20) {
    try {
        let query = `
            SELECT c.id, c.conversation_id, c.bot_id, c.title, c.created_at, c.updated_at,
                   (SELECT COUNT(*) FROM bot_messages WHERE conversation_id = c.id) as message_count
            FROM bot_conversations c
            WHERE c.user_id = $1
        `;
        const params = [userId];

        if (botId) {
            query += ` AND c.bot_id = $2`;
            params.push(botId);
        }

        query += ` ORDER BY c.updated_at DESC LIMIT $${params.length + 1}`;
        params.push(limit);

        const result = await pool.query(query, params);
        return result.rows;
    } catch (e) {
        console.error('Failed to get user conversations:', e.message);
        return [];
    }
}

/**
 * Get all available bots
 */
function getAvailableBots() {
    return Array.from(allBots.entries()).map(([id, bot]) => ({
        id,
        name: bot.name,
        role: bot.role,
        icon: bot.icon,
        color: bot.color,
        specialization: bot.specialization || bot.skills || [],
        quote: bot.quote,
        tasks: bot.tasks || [],
        category: getCategoryForBot(id)
    }));
}

/**
 * Get bot category
 */
function getCategoryForBot(botId) {
    const categories = botsConfig.bot_categories || {};
    for (const [category, bots] of Object.entries(categories)) {
        if (bots.includes(botId)) return category;
    }
    return 'other';
}

/**
 * Get specific bot info
 */
function getBot(botId) {
    const bot = allBots.get(botId.toLowerCase());
    if (!bot) return null;

    return {
        id: botId,
        name: bot.name,
        role: bot.role,
        icon: bot.icon,
        color: bot.color,
        specialization: bot.specialization || bot.skills || [],
        quote: bot.quote,
        tasks: bot.tasks || [],
        model: bot.model,
        category: getCategoryForBot(botId)
    };
}

/**
 * Get team formations
 */
function getTeamFormations() {
    return botsConfig.team_formations || {};
}

/**
 * Get bots by category
 */
function getBotsByCategory(category) {
    const botIds = botsConfig.bot_categories?.[category] || [];
    return botIds.map(id => getBot(id)).filter(Boolean);
}

/**
 * Reload bot configurations
 */
function reloadConfigurations() {
    allBots.clear();
    loadBotConfigurations();
    return { success: true, botCount: allBots.size };
}

// Initialize database on module load
initializeDatabase().catch(e => console.warn('Database init skipped:', e.message));

module.exports = {
    // Chat functions
    chatWithBot,
    chatWithGodMode,
    executeTask,
    botDiscussion,

    // Conversation management
    createConversation,
    getConversationHistory,
    getUserConversations,

    // Bot info
    getAvailableBots,
    getBot,
    getTeamFormations,
    getBotsByCategory,

    // Utilities
    reloadConfigurations,
    initializeDatabase,

    // Constants
    BOTS: allBots,
    CONFIG: botsConfig,
    HAIKU_GOD_MODE: {
        name: 'HAIKU 神',
        role: 'God Mode Controller',
        emoji: '神',
        icon: '神'
    }
};
