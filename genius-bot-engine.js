/**
 * Genius Agency Bot Engine
 * West Money OS - Enterprise Universe
 * 
 * Main API for all 12 Genius Bots
 */

const Anthropic = require('@anthropic-ai/sdk');
const botsConfig = require('./config/genius-bots-config.json');

// Initialize Anthropic Client
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
});

class GeniusAgency {
    constructor() {
        this.bots = new Map();
        this.activeTasks = new Map();
        this.taskQueue = [];
        
        // Initialize all bots
        this.initializeBots();
    }

    initializeBots() {
        botsConfig.bots.forEach(bot => {
            this.bots.set(bot.id, {
                ...bot,
                status: 'online',
                tasksCompleted: 0,
                lastActive: new Date().toISOString()
            });
        });
        console.log(`🧠 Genius Agency initialized with ${this.bots.size} bots`);
    }

    /**
     * Get Bot by ID
     */
    getBot(botId) {
        return this.bots.get(botId);
    }

    /**
     * Get All Bots
     */
    getAllBots() {
        return Array.from(this.bots.values());
    }

    /**
     * Execute Task with Specific Bot
     */
    async executeTask(botId, taskType, input, context = {}) {
        const bot = this.getBot(botId);
        
        if (!bot) {
            throw new Error(`Bot '${botId}' not found`);
        }

        if (!bot.tasks.includes(taskType)) {
            throw new Error(`Bot '${botId}' cannot perform task '${taskType}'`);
        }

        const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        this.activeTasks.set(taskId, {
            botId,
            taskType,
            status: 'running',
            startedAt: new Date().toISOString()
        });

        try {
            console.log(`🤖 ${bot.name} executing ${taskType}...`);

            const systemPrompt = this.buildSystemPrompt(bot, taskType, context);
            const userPrompt = this.buildUserPrompt(taskType, input, context);

            const response = await anthropic.messages.create({
                model: bot.model,
                max_tokens: bot.maxTokens,
                temperature: bot.temperature,
                system: systemPrompt,
                messages: [
                    { role: 'user', content: userPrompt }
                ]
            });

            const result = {
                taskId,
                botId,
                botName: bot.name,
                taskType,
                input,
                output: response.content[0].text,
                usage: response.usage,
                completedAt: new Date().toISOString()
            };

            // Update bot stats
            bot.tasksCompleted++;
            bot.lastActive = new Date().toISOString();
            this.bots.set(botId, bot);

            // Update task status
            this.activeTasks.set(taskId, {
                ...this.activeTasks.get(taskId),
                status: 'completed',
                completedAt: result.completedAt
            });

            return result;

        } catch (error) {
            console.error(`❌ ${bot.name} task failed:`, error);
            
            this.activeTasks.set(taskId, {
                ...this.activeTasks.get(taskId),
                status: 'failed',
                error: error.message
            });

            throw error;
        }
    }

    /**
     * Build System Prompt for Bot
     */
    buildSystemPrompt(bot, taskType, context) {
        let prompt = bot.systemPrompt;
        
        prompt += `\n\n## Aktuelle Aufgabe: ${taskType}`;
        prompt += `\n## Deine Spezialisierungen: ${bot.specialization.join(', ')}`;
        
        if (context.company) {
            prompt += `\n## Unternehmen: ${context.company}`;
        }
        
        if (context.additionalContext) {
            prompt += `\n## Zusätzlicher Kontext: ${context.additionalContext}`;
        }

        prompt += `\n\n## Output Format:
        - Strukturiere deine Antwort klar und präzise
        - Verwende Bullet Points für Listen
        - Gib konkrete, actionable Empfehlungen
        - Beende mit einem kurzen Fazit`;

        return prompt;
    }

    /**
     * Build User Prompt for Task
     */
    buildUserPrompt(taskType, input, context) {
        const taskPrompts = {
            lead_scoring: `Analysiere und bewerte den folgenden Lead:\n${JSON.stringify(input, null, 2)}\n\nBewerte auf einer Skala von 1-100 und erkläre die Faktoren.`,
            revenue_forecast: `Erstelle eine Revenue-Prognose basierend auf:\n${JSON.stringify(input, null, 2)}`,
            market_analysis: `Führe eine Marktanalyse durch für:\n${JSON.stringify(input, null, 2)}`,
            competitor_tracking: `Analysiere die Wettbewerber:\n${JSON.stringify(input, null, 2)}`,
            pitch_deck_creation: `Erstelle Inhalte für ein Pitch Deck:\n${JSON.stringify(input, null, 2)}`,
            content_creation: `Erstelle Content für:\n${JSON.stringify(input, null, 2)}`,
            lead_research: `Recherchiere Informationen über:\n${JSON.stringify(input, null, 2)}`,
            loxone_configuration: `Erstelle eine LOXONE Konfiguration für:\n${JSON.stringify(input, null, 2)}`,
            trend_forecasting: `Analysiere Trends und erstelle eine Prognose für:\n${JSON.stringify(input, null, 2)}`,
            default: `Führe die Aufgabe "${taskType}" aus mit folgendem Input:\n${JSON.stringify(input, null, 2)}`
        };

        return taskPrompts[taskType] || taskPrompts.default;
    }

    /**
     * Execute Workflow (Multiple Bots in Sequence)
     */
    async executeWorkflow(workflowId, input) {
        const workflow = botsConfig.workflows[workflowId];
        
        if (!workflow) {
            throw new Error(`Workflow '${workflowId}' not found`);
        }

        console.log(`🔄 Starting workflow: ${workflow.name}`);
        
        const results = [];
        let currentInput = input;

        for (const step of workflow.steps) {
            console.log(`  → Step: ${step.bot} - ${step.task}`);
            
            const result = await this.executeTask(step.bot, step.task, currentInput);
            results.push(result);
            
            // Pass output to next step
            currentInput = {
                previousStep: result.output,
                originalInput: input
            };
        }

        return {
            workflowId,
            workflowName: workflow.name,
            steps: results,
            completedAt: new Date().toISOString()
        };
    }

    /**
     * Get Bot Statistics
     */
    getStatistics() {
        const bots = this.getAllBots();
        
        return {
            totalBots: bots.length,
            onlineBots: bots.filter(b => b.status === 'online').length,
            totalTasksCompleted: bots.reduce((sum, b) => sum + b.tasksCompleted, 0),
            activeTasks: this.activeTasks.size,
            botStats: bots.map(b => ({
                id: b.id,
                name: b.name,
                status: b.status,
                tasksCompleted: b.tasksCompleted,
                lastActive: b.lastActive
            }))
        };
    }

    /**
     * Parse @mention Commands
     */
    parseCommand(command) {
        // Pattern: @botname task description
        const mentionPattern = /@(\w+)\s+(.+)/;
        const match = command.match(mentionPattern);

        if (!match) {
            return null;
        }

        const botId = match[1].toLowerCase();
        const taskDescription = match[2];

        // Handle @all - execute with all relevant bots
        if (botId === 'all') {
            return {
                type: 'broadcast',
                bots: this.getAllBots().map(b => b.id),
                task: taskDescription
            };
        }

        const bot = this.getBot(botId);
        if (!bot) {
            return {
                type: 'error',
                message: `Bot '@${botId}' not found`
            };
        }

        return {
            type: 'single',
            botId,
            task: taskDescription
        };
    }
}

// Express.js Route Handler
function setupRoutes(app, agency) {
    // Get all bots
    app.get('/api/genius-agency/bots', (req, res) => {
        res.json(agency.getAllBots());
    });

    // Get specific bot
    app.get('/api/genius-agency/bots/:id', (req, res) => {
        const bot = agency.getBot(req.params.id);
        if (!bot) {
            return res.status(404).json({ error: 'Bot not found' });
        }
        res.json(bot);
    });

    // Execute task
    app.post('/api/genius-agency/execute', async (req, res) => {
        const { botId, taskType, input, context } = req.body;

        try {
            const result = await agency.executeTask(botId, taskType, input, context);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Execute workflow
    app.post('/api/genius-agency/workflow', async (req, res) => {
        const { workflowId, input } = req.body;

        try {
            const result = await agency.executeWorkflow(workflowId, input);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Parse and execute command
    app.post('/api/genius-agency/command', async (req, res) => {
        const { command, context } = req.body;

        const parsed = agency.parseCommand(command);
        
        if (!parsed) {
            return res.status(400).json({ error: 'Invalid command format. Use @botname task' });
        }

        if (parsed.type === 'error') {
            return res.status(404).json({ error: parsed.message });
        }

        if (parsed.type === 'single') {
            try {
                // Auto-detect task type from description
                const result = await agency.executeTask(
                    parsed.botId, 
                    'default', 
                    { description: parsed.task },
                    context
                );
                res.json(result);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        }

        // Handle broadcast to all bots
        if (parsed.type === 'broadcast') {
            res.json({ 
                message: 'Broadcast mode - executing with multiple bots',
                bots: parsed.bots 
            });
        }
    });

    // Get statistics
    app.get('/api/genius-agency/stats', (req, res) => {
        res.json(agency.getStatistics());
    });

    // Get available workflows
    app.get('/api/genius-agency/workflows', (req, res) => {
        res.json(botsConfig.workflows);
    });
}

// Create and export agency instance
const geniusAgency = new GeniusAgency();

module.exports = {
    GeniusAgency,
    geniusAgency,
    setupRoutes
};
